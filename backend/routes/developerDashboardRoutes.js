import express from 'express';
import db from '../../db.js';
import { upload } from '../config/upload.js';
import { asyncHandler, formatSize, createNotification, queryWithFallback } from '../utils/helpers.js';
import { checkRequirementGate, saveDeveloperBuildRecord } from '../services/packageService.js';
import { handleBuildApproval, handleFileRejection, handleDeletePackageFile } from '../services/dashboardController.js';

const router = express.Router();


router.post('/api/packages/:id/files/build', upload.single('file'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, uploadedBy, platform } = req.body;

  const gateResult = await checkRequirementGate(id, 'developer');
  if (!gateResult.ok) {
    return res.status(gateResult.status).json({ error: gateResult.error });
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

  await createNotification(id, `${uploader} uploaded ${cleanPlatform} build .zip file for package {package}. Sent to DevOps Team & Project Manager.`, ['Devops Team', 'Project Manager'], uploader, 'Developer Team');
  res.json({ success: true });
}));

router.put('/api/packages/:id/files/build/:fileId/approve-tl', handleBuildApproval(
  'Dev TL',
  (uploader) => `Developer Team Leader (${uploader}) approved code build for package {package}. Sent to DevOps Team!`,
  ['Devops Team'],
  'Developer Team'
));

router.put('/api/packages/:id/files/build/:fileId/approve-admin', handleBuildApproval(
  'Admin',
  () => `Admin approved code build for package {package}. Sent to DevOps Team!`,
  ['Devops Team'],
  'Admin'
));

router.put('/api/packages/:id/files/build/:fileId/approve-pm', handleBuildApproval(
  'Project Manager',
  (uploader) => `Project Manager (${uploader}) APPROVED developer code build zip for package {package}.`,
  ['Developer Team', 'Devops Team'],
  'Project Manager'
));

router.put('/api/packages/:id/files/build/:fileId/reject-pm', handleFileRejection({
  table: 'developer_builds',
  defaultReason: 'Code build .zip file requires fixes.',
  resetQueries: ['UPDATE packages SET dev_admin_approved = FALSE, submitted_to_devops = FALSE WHERE id = ?'],
  notificationMsg: (uploader, reason) => `Project Manager (${uploader}) REJECTED code build .zip for package {package}. Reason: '${reason}'`,
  recipients: ['Developer Team'],
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

router.delete('/api/packages/:id/files/build/:fileId', handleDeletePackageFile(
  'developer_builds',
  'UPDATE packages SET submitted_to_devops = FALSE WHERE id = ?'
));


router.put('/api/packages/:id/submit-devops', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { submittedBy } = req.body || {};
  await db.query('UPDATE packages SET submitted_to_devops = TRUE WHERE id = ?', [id]);
  await createNotification(id, 'Developer Team submitted build for package {package}', ['Devops Team', 'Testing Team'], submittedBy || 'Developer Team', 'Developer Team');
  res.json({ success: true });
}));

export default router;
