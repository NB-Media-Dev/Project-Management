import express from 'express';
import db from '../../db.js';
import { upload } from '../config/upload.js';
import { asyncHandler, formatSize, createNotification } from '../utils/helpers.js';
import { checkRequirementGate, updateFigmaLink } from '../services/packageService.js';
import { handleDesignMockupsApproval, handleDesignMockupsRejection, handleFileRejection, handleDeletePackageFile } from '../services/dashboardController.js';


const router = express.Router();

const handleUpdateFigmaLink = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { figmaLink } = req.body;
  const cleanLink = await updateFigmaLink(id, figmaLink);
  res.json({ success: true, figmaLink: cleanLink });
});

router.route('/api/packages/:id/figma-link')
  .put(handleUpdateFigmaLink)
  .post(handleUpdateFigmaLink);

router.post('/api/packages/:id/files/design', upload.single('file'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, platform, uploadedBy, figmaLink } = req.body;

  const gateResult = await checkRequirementGate(id, 'design');
  if (!gateResult.ok) {
    return res.status(gateResult.status).json({ error: gateResult.error });
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
  await db.query('UPDATE packages SET design_uploaded = TRUE, design_tl_approved = FALSE, design_admin_approved = FALSE WHERE id = ?', [id]);
  await createNotification(id, `${uploader} uploaded design deliverable for task {package}. Pending Project Manager approval.`, ['Project Manager', 'Design Team'], uploader, 'Design Team');
  res.json({ success: true });
}));

const handleDesignFileItemApproval = (defaultRole, notificationText) =>
  asyncHandler(async (req, res) => {
    const { id, fileId } = req.params;
    const { approvedBy } = req.body || {};
    const uploader = approvedBy || defaultRole;
    await db.query(
      `UPDATE design_files SET tl_approval = 'Approved', tl_approved_by = ?, admin_approval = 'Approved', admin_approved_by = ? WHERE id = ? AND package_id = ?`,
      [uploader, uploader, fileId, id]
    );
    const [dFiles] = await db.query('SELECT tl_approval FROM design_files WHERE package_id = ?', [id]);
    if (dFiles.length > 0 && dFiles.every(f => f.tl_approval === 'Approved')) {
      await db.query('UPDATE packages SET design_tl_approved = TRUE, design_admin_approved = TRUE WHERE id = ?', [id]);
      await createNotification(id, notificationText(uploader), ['Developer Team'], uploader);
    }
    res.json({ success: true });
  });

router.put('/api/packages/:id/files/design/:fileId/approve-tl', handleDesignFileItemApproval(
  'Project Manager',
  (uploader) => `Project Manager (${uploader}) approved designs for package {package}. Sent to Developer Team!`
));

router.put('/api/packages/:id/approve-design-pm', handleDesignMockupsApproval(
  'Project Manager',
  (uploader) => `Project Manager (${uploader}) APPROVED all design mockups for task {package}. Sent to Developer Team to upload build .zip!`,
  ['Developer Team', 'Design Team']
));

router.put('/api/packages/:id/approve-design-tl', handleDesignMockupsApproval(
  'Project Manager',
  (uploader) => `Project Manager (${uploader}) approved all design mockups for package {package}. Sent to Developer Team!`,
  ['Developer Team']
));

router.put('/api/packages/:id/files/design/:fileId/reject-pm', handleFileRejection({
  table: 'design_files',
  defaultReason: 'Design asset requires modification.',
  resetQueries: ['UPDATE packages SET design_tl_approved = FALSE, design_admin_approved = FALSE WHERE id = ?'],
  notificationMsg: (uploader, reason) => `Project Manager (${uploader}) REJECTED design asset for package {package}. Reason: '${reason}'`,
  recipients: ['Design Team'],
}));


router.put('/api/packages/:id/reject-design-pm', handleDesignMockupsRejection(
  'Project Manager',
  'Design mockups require modification.',
  (uploader, rejectionReason) => `Project Manager (${uploader}) REJECTED designs for package {package}. Reason: '${rejectionReason}'`,
  ['Design Team']
));

router.put('/api/packages/:id/files/design/:fileId/approve-admin', handleDesignFileItemApproval(
  'Admin',
  () => `Admin approved design for package {package}. Sent to Developer Team!`
));

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
    await db.query('UPDATE packages SET design_tl_approved = FALSE, design_admin_approved = FALSE WHERE id = ?', [id]);
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


router.delete('/api/packages/:id/files/design/:fileId', handleDeletePackageFile(
  'design_files',
  'UPDATE packages SET design_uploaded = FALSE, design_tl_approved = FALSE, design_admin_approved = FALSE WHERE id = ?'
));


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
