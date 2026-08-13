import express from 'express';
import db from '../../db.js';
import { upload } from '../config/upload.js';
import { asyncHandler, formatSize, createNotification, approveBuildFile, queryWithFallback } from '../utils/helpers.js';

const router = express.Router();

async function saveDeveloperBuildRecord(id, buildName, file, uploader, platform = 'Web') {
  const cleanPlatform = (platform === 'App' || platform === 'Mobile') ? 'App' : 'Web';
  try {
    await db.query(
      `INSERT INTO developer_builds (package_id, name, file_name, file_size, platform, uploaded_by, tl_approval, admin_approval, uploaded_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'Approved', 'Approved', CURRENT_TIMESTAMP)`,
      [id, buildName, file.filename, formatSize(file.size), cleanPlatform, uploader]
    );
  } catch (err) {
    if (err.message?.includes('platform') || err.message?.includes('name')) {
      try {
        await db.query('ALTER TABLE developer_builds ADD COLUMN platform VARCHAR(50) DEFAULT "Web"');
        await db.query('ALTER TABLE developer_builds ADD COLUMN name VARCHAR(150)');
      } catch {}
      await db.query(
        `INSERT INTO developer_builds (package_id, name, file_name, file_size, platform, uploaded_by, tl_approval, admin_approval, uploaded_at) 
         VALUES (?, ?, ?, ?, ?, ?, 'Approved', 'Approved', CURRENT_TIMESTAMP)`,
        [id, buildName, file.filename, formatSize(file.size), cleanPlatform, uploader]
      );
    } else {
      throw err;
    }
  }
}

async function markPackageSubmittedToDevops(id) {
  try {
    await db.query(
      `UPDATE packages 
       SET submitted_to_devops = TRUE, dev_admin_approved = TRUE, devops_staging_uploaded = FALSE, devops_tl_approved = FALSE, devops_admin_approved = FALSE, testing_tl_approved = FALSE, final_admin_approved = FALSE 
       WHERE id = ?`,
      [id]
    );
  } catch (err) {
    if (err.message?.includes('submitted_to_devops')) {
      await db.query('ALTER TABLE packages ADD COLUMN submitted_to_devops BOOLEAN DEFAULT FALSE');
      await db.query(
        `UPDATE packages 
         SET submitted_to_devops = TRUE, dev_admin_approved = TRUE, devops_staging_uploaded = FALSE, devops_tl_approved = FALSE, devops_admin_approved = FALSE, testing_tl_approved = FALSE, final_admin_approved = FALSE 
         WHERE id = ?`,
        [id]
      );
    } else {
      throw err;
    }
  }
}

router.post('/api/packages/:id/files/build', upload.single('file'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, uploadedBy, platform } = req.body;

  const [pkgRows] = await db.query(
    'SELECT design_uploaded, design_tl_approved, design_admin_approved FROM packages WHERE id = ?',
    [id]
  );
  if (pkgRows.length === 0) {
    return res.status(404).json({ error: 'Package not found' });
  }
  const pkg = pkgRows[0];
  const [dFiles] = await db.query(
    'SELECT id FROM design_files WHERE package_id = ? AND file_name IS NOT NULL AND file_name != ""',
    [id]
  );

  if (!pkg.design_uploaded && !pkg.design_tl_approved && !pkg.design_admin_approved && dFiles.length === 0) {
    return res.status(400).json({ error: 'Requirement Failed: Cannot upload developer build ZIP until Design Team uploads design assets.' });
  }

  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  // Enforce max 15MB file size limit
  const maxSizeBytes = 15 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return res.status(400).json({ error: 'Upload failed: Maximum allowed file size for developer build zip is 15MB.' });
  }

  const cleanPlatform = (platform === 'App' || platform === 'Mobile') ? 'App' : 'Web';
  const buildName = (name && name.trim() !== '') ? name.trim() : `${cleanPlatform} Code Build (.zip)`;
  const uploader = uploadedBy || 'Developer Team Member';

  await saveDeveloperBuildRecord(id, buildName, file, uploader, cleanPlatform);
  await markPackageSubmittedToDevops(id);

  await createNotification(id, `${uploader} uploaded ${cleanPlatform} build .zip file for package {package}. Sent to DevOps Team & Project Manager.`, ['Devops Team', 'Project Manager'], uploader, 'Developer Team');
  res.json({ success: true });
}));

router.put('/api/packages/:id/files/build/:fileId/approve-tl', asyncHandler(async (req, res) => {
  const { id, fileId } = req.params;
  const { approvedBy } = req.body;
  const uploader = approvedBy || 'Dev TL';
  await approveBuildFile(fileId, id, uploader);
  await createNotification(id, `Developer Team Leader (${uploader}) approved code build for package {package}. Sent to DevOps Team!`, ['Devops Team'], uploader, 'Developer Team');
  res.json({ success: true });
}));

router.put('/api/packages/:id/files/build/:fileId/approve-admin', asyncHandler(async (req, res) => {
  const { id, fileId } = req.params;
  const { approvedBy } = req.body;
  const uploader = approvedBy || 'Admin';
  await approveBuildFile(fileId, id, uploader);
  await createNotification(id, `Admin approved code build for package {package}. Sent to DevOps Team!`, ['Devops Team'], uploader, 'Admin');
  res.json({ success: true });
}));

router.put('/api/packages/:id/files/build/:fileId/approve-pm', asyncHandler(async (req, res) => {
  const { id, fileId } = req.params;
  const { approvedBy } = req.body || {};
  const uploader = approvedBy || 'Project Manager';
  await approveBuildFile(fileId, id, uploader);
  await createNotification(id, `Project Manager (${uploader}) APPROVED developer code build zip for package {package}.`, ['Developer Team', 'Devops Team'], uploader, 'Project Manager');
  res.json({ success: true });
}));

router.put('/api/packages/:id/files/build/:fileId/reject-pm', asyncHandler(async (req, res) => {
  const { id, fileId } = req.params;
  const { rejectedBy, reason } = req.body || {};
  const uploader = rejectedBy || 'Project Manager';
  const rejectionReason = reason ? reason.trim() : 'Code build .zip file requires fixes.';

  await db.query(
    `UPDATE developer_builds SET tl_approval = 'Rejected', rejection_reason = ?, rejected_by = ? WHERE id = ? AND package_id = ?`,
    [rejectionReason, uploader, fileId, id]
  );
  await db.query('UPDATE packages SET dev_admin_approved = FALSE, submitted_to_devops = FALSE WHERE id = ?', [id]);
  await createNotification(
    id,
    `Project Manager (${uploader}) REJECTED code build .zip for package {package}. Reason: '${rejectionReason}'`,
    ['Developer Team'],
    uploader,
    'Project Manager'
  );
  res.json({ success: true });
}));

router.put('/api/packages/:id/files/build/:fileId', upload.single('file'), asyncHandler(async (req, res) => {
  const { id, fileId } = req.params;
  const { name } = req.body;
  const file = req.file;
  const hasName = name && name.trim() !== '';

  if (file) {
    const sizeStr = formatSize(file.size);
    await queryWithFallback(
      () => hasName
        ? db.query(
            'UPDATE developer_builds SET name = ?, file_name = ?, file_size = ? WHERE id = ? AND package_id = ?',
            [name.trim(), file.filename, sizeStr, fileId, id]
          )
        : db.query(
            'UPDATE developer_builds SET file_name = ?, file_size = ? WHERE id = ? AND package_id = ?',
            [file.filename, sizeStr, fileId, id]
          ),
      () => db.query(
        'UPDATE developer_builds SET file_name = ?, file_size = ? WHERE id = ? AND package_id = ?',
        [file.filename, formatSize(file.size), fileId, id]
      )
    );
  } else if (hasName) {
    try {
      await db.query(
        'UPDATE developer_builds SET name = ? WHERE id = ? AND package_id = ?',
        [name.trim(), fileId, id]
      );
    } catch {}
  }
  res.json({ success: true });
}));

router.delete('/api/packages/:id/files/build/:fileId', asyncHandler(async (req, res) => {
  const { id, fileId } = req.params;
  await db.query('DELETE FROM developer_builds WHERE id = ? AND package_id = ?', [fileId, id]);
  const [remaining] = await db.query('SELECT id FROM developer_builds WHERE package_id = ?', [id]);
  if (remaining.length === 0) {
    await db.query('UPDATE packages SET submitted_to_devops = FALSE WHERE id = ?', [id]);
  }
  res.json({ success: true });
}));

router.put('/api/packages/:id/submit-devops', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { submittedBy } = req.body || {};
  await db.query('UPDATE packages SET submitted_to_devops = TRUE WHERE id = ?', [id]);
  await createNotification(id, 'Developer Team submitted build for package {package}', ['Devops Team', 'Testing Team'], submittedBy || 'Developer Team', 'Developer Team');
  res.json({ success: true });
}));

export default router;
