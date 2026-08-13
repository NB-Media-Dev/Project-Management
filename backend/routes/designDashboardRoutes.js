import express from 'express';
import db from '../../db.js';
import { upload } from '../config/upload.js';
import { asyncHandler, formatSize, createNotification } from '../utils/helpers.js';

const router = express.Router();

const handleUpdateFigmaLink = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { figmaLink } = req.body;
  let cleanLink = figmaLink ? figmaLink.trim() : null;
  if (cleanLink && !cleanLink.startsWith('http://') && !cleanLink.startsWith('https://')) {
    cleanLink = 'https://' + cleanLink;
  }
  try {
    await db.query('UPDATE packages SET figma_link = ? WHERE id = ?', [cleanLink, id]);
  } catch (err) {
    if (err.message?.includes('figma_link')) {
      await db.query('ALTER TABLE packages ADD COLUMN figma_link VARCHAR(500) DEFAULT NULL');
      await db.query('UPDATE packages SET figma_link = ? WHERE id = ?', [cleanLink, id]);
    } else {
      throw err;
    }
  }
  res.json({ success: true, figmaLink: cleanLink });
});

router.put('/api/packages/:id/figma-link', handleUpdateFigmaLink);
router.post('/api/packages/:id/figma-link', handleUpdateFigmaLink);

router.post('/api/packages/:id/files/design', upload.single('file'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, platform, uploadedBy, figmaLink } = req.body;

  const [pkgRows] = await db.query(
    'SELECT content_tl_approved, content_admin_approved, content_uploaded FROM packages WHERE id = ?',
    [id]
  );
  if (pkgRows.length === 0) return res.status(404).json({ error: 'Package not found' });
  const pkg = pkgRows[0];
  const [cFiles] = await db.query(
    'SELECT id FROM content_files WHERE package_id = ? AND file_name IS NOT NULL AND file_name != ""',
    [id]
  );
  if (!pkg.content_tl_approved && !pkg.content_admin_approved && !pkg.content_uploaded && cFiles.length === 0) {
    return res.status(400).json({ error: 'Requirement Failed: Cannot upload design assets until Content Team uploads/approves requirements.' });
  }

  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  const sizeStr = formatSize(file.size);
  const uploader = uploadedBy || 'Design Team Member';

  if (figmaLink !== undefined) {
    await db.query('UPDATE packages SET figma_link = ? WHERE id = ?', [figmaLink.trim(), id]);
  }

  await db.query(
    `INSERT INTO design_files (package_id, name, file_name, file_size, platform, uploaded_by, tl_approval, admin_approval, uploaded_at) 
     VALUES (?, ?, ?, ?, ?, ?, 'Pending', 'Pending', CURRENT_TIMESTAMP)`,
    [id, name, file.filename, sizeStr, platform, uploader]
  );
  await db.query('UPDATE packages SET design_uploaded = TRUE WHERE id = ?', [id]);
  await createNotification(id, `${uploader} uploaded design deliverable for task {package}. Pending Project Manager approval.`, ['Project Manager', 'Design Team'], uploader, 'Design Team');
  res.json({ success: true });
}));

router.put('/api/packages/:id/files/design/:fileId/approve-tl', asyncHandler(async (req, res) => {
  const { id, fileId } = req.params;
  const { approvedBy } = req.body;
  const uploader = approvedBy || 'Project Manager';
  await db.query(
    `UPDATE design_files SET tl_approval = 'Approved', tl_approved_by = ?, admin_approval = 'Approved', admin_approved_by = ? WHERE id = ? AND package_id = ?`,
    [uploader, uploader, fileId, id]
  );
  const [dFiles] = await db.query('SELECT tl_approval FROM design_files WHERE package_id = ?', [id]);
  if (dFiles.length > 0 && dFiles.every(f => f.tl_approval === 'Approved')) {
    await db.query('UPDATE packages SET design_tl_approved = TRUE, design_admin_approved = TRUE WHERE id = ?', [id]);
    await createNotification(id, `Project Manager (${uploader}) approved designs for package {package}. Sent to Developer Team!`, ['Developer Team'], uploader);
  }
  res.json({ success: true });
}));

router.put('/api/packages/:id/approve-design-pm', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approvedBy } = req.body || {};
  const uploader = approvedBy || 'Project Manager';

  const [pkgRows] = await db.query('SELECT content_tl_approved, content_admin_approved, content_uploaded FROM packages WHERE id = ?', [id]);
  const [cFiles] = await db.query('SELECT id FROM content_files WHERE package_id = ? AND file_name IS NOT NULL AND file_name != ""', [id]);
  
  if (pkgRows.length > 0) {
    const pkg = pkgRows[0];
    if (!pkg.content_tl_approved && !pkg.content_admin_approved && !pkg.content_uploaded && cFiles.length === 0) {
      return res.status(400).json({ error: 'Requirement Failed: Cannot approve design mockups until Content Team uploads/approves requirements.' });
    }
  }

  const [dFilesCount] = await db.query('SELECT id FROM design_files WHERE package_id = ?', [id]);
  if (dFilesCount.length < 1) {
    return res.status(400).json({ error: `Requirement failed: At least 1 design asset is required before Project Manager approval. Current: 0 assets.` });
  }

  await db.query(
    `UPDATE design_files SET tl_approval = 'Approved', tl_approved_by = ?, admin_approval = 'Approved', admin_approved_by = ?, rejection_reason = NULL, rejected_by = NULL WHERE package_id = ?`,
    [uploader, uploader, id]
  );
  await db.query('UPDATE packages SET design_tl_approved = TRUE, design_admin_approved = TRUE WHERE id = ?', [id]);
  await createNotification(id, `Project Manager (${uploader}) APPROVED all design mockups for task {package}. Sent to Developer Team to upload build .zip!`, ['Developer Team', 'Design Team'], uploader, 'Project Manager');
  res.json({ success: true });
}));

router.put('/api/packages/:id/approve-design-tl', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approvedBy } = req.body;
  const uploader = approvedBy || 'Project Manager';
  const [dFilesCount] = await db.query('SELECT id FROM design_files WHERE package_id = ?', [id]);
  if (dFilesCount.length < 1) {
    return res.status(400).json({ error: `Requirement failed: At least 1 design asset is required before Project Manager approval. Current: 0 assets.` });
  }
  await db.query(
    `UPDATE design_files SET tl_approval = 'Approved', tl_approved_by = ?, admin_approval = 'Approved', admin_approved_by = ?, rejection_reason = NULL, rejected_by = NULL WHERE package_id = ?`,
    [uploader, uploader, id]
  );
  await db.query('UPDATE packages SET design_tl_approved = TRUE, design_admin_approved = TRUE WHERE id = ?', [id]);
  await createNotification(id, `Project Manager (${uploader}) approved all design mockups for package {package}. Sent to Developer Team!`, ['Developer Team'], uploader);
  res.json({ success: true });
}));

router.put('/api/packages/:id/files/design/:fileId/reject-pm', asyncHandler(async (req, res) => {
  const { id, fileId } = req.params;
  const { rejectedBy, reason } = req.body || {};
  const uploader = rejectedBy || 'Project Manager';
  const rejectionReason = reason ? reason.trim() : 'Design asset requires modification.';

  await db.query(
    `UPDATE design_files SET tl_approval = 'Rejected', tl_approved_by = NULL, rejection_reason = ?, rejected_by = ? WHERE id = ? AND package_id = ?`,
    [rejectionReason, uploader, fileId, id]
  );
  await db.query('UPDATE packages SET design_tl_approved = FALSE, design_admin_approved = FALSE WHERE id = ?', [id]);
  await createNotification(
    id,
    `Project Manager (${uploader}) REJECTED design asset for package {package}. Reason: '${rejectionReason}'`,
    ['Design Team'],
    uploader,
    'Project Manager'
  );
  res.json({ success: true });
}));

router.put('/api/packages/:id/reject-design-pm', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectedBy, reason } = req.body || {};
  const uploader = rejectedBy || 'Project Manager';
  const rejectionReason = reason ? reason.trim() : 'Design mockups require modification.';

  await db.query(
    `UPDATE design_files SET tl_approval = 'Rejected', rejection_reason = ?, rejected_by = ? WHERE package_id = ?`,
    [rejectionReason, uploader, id]
  );
  await db.query('UPDATE packages SET design_tl_approved = FALSE, design_admin_approved = FALSE WHERE id = ?', [id]);
  await createNotification(
    id,
    `Project Manager (${uploader}) REJECTED designs for package {package}. Reason: '${rejectionReason}'`,
    ['Design Team'],
    uploader,
    'Project Manager'
  );
  res.json({ success: true });
}));

router.put('/api/packages/:id/files/design/:fileId/approve-admin', asyncHandler(async (req, res) => {
  const { id, fileId } = req.params;
  const { approvedBy } = req.body;
  const uploader = approvedBy || 'Admin';
  await db.query(
    `UPDATE design_files SET tl_approval = 'Approved', tl_approved_by = ?, admin_approval = 'Approved', admin_approved_by = ? WHERE id = ? AND package_id = ?`,
    [uploader, uploader, fileId, id]
  );
  await db.query('UPDATE packages SET design_tl_approved = TRUE, design_admin_approved = TRUE WHERE id = ?', [id]);
  await createNotification(id, `Admin approved design for package {package}. Sent to Developer Team!`, ['Developer Team'], uploader);
  res.json({ success: true });
}));

router.put('/api/packages/:id/files/design/:fileId', upload.single('file'), asyncHandler(async (req, res) => {
  const { id, fileId } = req.params;
  const { name, platform, uploadedBy } = req.body;
  const file = req.file;
  const uploader = uploadedBy || 'Design Team Member';

  if (file) {
    const sizeStr = formatSize(file.size);
    await db.query(
      `UPDATE design_files 
       SET file_name = ?, file_size = ?, uploaded_by = ?, tl_approval = 'Pending', admin_approval = 'Pending', uploaded_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND package_id = ?`,
      [file.filename, sizeStr, uploader, fileId, id]
    );
  } else if (name || platform) {
    await db.query(
      `UPDATE design_files 
       SET name = COALESCE(?, name), platform = COALESCE(?, platform), uploaded_by = ? 
       WHERE id = ? AND package_id = ?`,
      [name || null, platform || null, uploader, fileId, id]
    );
  }
  await createNotification(id, `${uploader} updated design asset for package {package}.`, ['Design Team'], uploader);
  res.json({ success: true });
}));

router.delete('/api/packages/:id/files/design/:fileId', asyncHandler(async (req, res) => {
  const { id, fileId } = req.params;
  await db.query('DELETE FROM design_files WHERE id = ? AND package_id = ?', [fileId, id]);
  const [remaining] = await db.query('SELECT id FROM design_files WHERE package_id = ?', [id]);
  if (remaining.length === 0) {
    await db.query('UPDATE packages SET design_uploaded = FALSE, design_tl_approved = FALSE, design_admin_approved = FALSE WHERE id = ?', [id]);
  }
  res.json({ success: true });
}));

router.post('/api/packages/:id/design-feedback', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, severity, reportedBy } = req.body;
  await db.query(
    'INSERT INTO design_feedbacks (package_id, title, description, severity) VALUES (?, ?, ?, ?)',
    [id, title, description, severity || 'Medium']
  );
  await createNotification(id, 'Design Team reported feedback on requirement document for package {package}', ['Content Team'], reportedBy || 'Design Team', 'Design Team');
  res.json({ success: true });
}));

export default router;
