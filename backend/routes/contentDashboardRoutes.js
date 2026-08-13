import express from 'express';
import db from '../../db.js';
import { upload } from '../config/upload.js';
import { asyncHandler, formatSize, createNotification } from '../utils/helpers.js';

const router = express.Router();

router.post('/api/packages/:id/files/content/add', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Requirement item name is required' });
  const [result] = await db.query(
    'INSERT INTO content_files (package_id, name) VALUES (?, ?)',
    [id, name.trim()]
  );
  res.json({ success: true, insertId: result.insertId });
}));

router.put('/api/packages/:id/files/content/:reqId/title', asyncHandler(async (req, res) => {
  const { id, reqId } = req.params;
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Requirement item name is required' });
  await db.query(
    'UPDATE content_files SET name = ? WHERE id = ? AND package_id = ?',
    [name.trim(), reqId, id]
  );
  res.json({ success: true });
}));

router.delete('/api/packages/:id/files/content/:reqId/row', asyncHandler(async (req, res) => {
  const { id, reqId } = req.params;
  await db.query(
    'DELETE FROM content_files WHERE id = ? AND package_id = ?',
    [reqId, id]
  );
  res.json({ success: true });
}));

router.post('/api/packages/:id/files/content/:reqId', upload.single('file'), asyncHandler(async (req, res) => {
  const { id, reqId } = req.params;
  const uploadedBy = req.body.uploadedBy || 'Content Team Member';
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  await db.query(
    `UPDATE content_files 
     SET file_name = ?, file_size = ?, uploaded_by = ?, tl_approval = 'Pending', tl_approved_by = NULL, admin_approval = 'Pending', admin_approved_by = NULL, uploaded_at = CURRENT_TIMESTAMP 
     WHERE id = ? AND package_id = ?`,
    [file.filename, formatSize(file.size), uploadedBy, reqId, id]
  );
  const [files] = await db.query('SELECT file_name FROM content_files WHERE package_id = ?', [id]);
  if (files.every((f) => f.file_name && f.file_name !== '')) {
    await db.query('UPDATE packages SET content_uploaded = TRUE WHERE id = ?', [id]);
  }
  await createNotification(id, `${uploadedBy} uploaded content document for task {package}. Sent to Design Team!`, ['Project Manager', 'Design Team'], uploadedBy, 'Content Team');
  res.json({ success: true });
}));

router.put('/api/packages/:id/files/content/:reqId/approve-tl', asyncHandler(async (req, res) => {
  const { id, reqId } = req.params;
  const { approvedBy } = req.body;
  const uploader = approvedBy || 'Project Manager';
  await db.query(
    `UPDATE content_files SET tl_approval = 'Approved', tl_approved_by = ?, admin_approval = 'Approved', admin_approved_by = ? WHERE id = ? AND package_id = ?`,
    [uploader, uploader, reqId, id]
  );
  const [cFiles] = await db.query('SELECT tl_approval FROM content_files WHERE package_id = ?', [id]);
  if (cFiles.length > 0 && cFiles.every(f => f.tl_approval === 'Approved')) {
    await db.query('UPDATE packages SET content_tl_approved = TRUE, content_admin_approved = TRUE WHERE id = ?', [id]);
    await createNotification(id, `Project Manager (${uploader}) APPROVED content document for task {package}. Sent to Design Team to upload design mockups!`, ['Design Team', 'Content Team'], uploader, 'Project Manager');
  } else {
    await createNotification(id, `Project Manager (${uploader}) APPROVED requirement doc for task {package}.`, ['Design Team', 'Content Team'], uploader, 'Project Manager');
  }
  res.json({ success: true });
}));

router.put('/api/packages/:id/files/content/:reqId/reject-pm', asyncHandler(async (req, res) => {
  const { id, reqId } = req.params;
  const { rejectedBy, reason } = req.body || {};
  const uploader = rejectedBy || 'Project Manager';
  const rejectionReason = reason ? reason.trim() : 'Requirement document requires revision.';

  await db.query(
    `UPDATE content_files SET tl_approval = 'Rejected', tl_approved_by = NULL, rejection_reason = ?, rejected_by = ? WHERE id = ? AND package_id = ?`,
    [rejectionReason, uploader, reqId, id]
  );
  await db.query('UPDATE packages SET content_tl_approved = FALSE, content_admin_approved = FALSE WHERE id = ?', [id]);
  await createNotification(
    id,
    `Project Manager (${uploader}) REJECTED requirement doc for package {package}. Reason: '${rejectionReason}'`,
    ['Content Team'],
    uploader,
    'Project Manager'
  );
  res.json({ success: true });
}));

router.put('/api/packages/:id/files/content/:reqId/approve-admin', asyncHandler(async (req, res) => {
  const { id, reqId } = req.params;
  const { approvedBy } = req.body;
  const uploader = approvedBy || 'Admin';
  await db.query(
    `UPDATE content_files SET tl_approval = 'Approved', tl_approved_by = ?, admin_approval = 'Approved', admin_approved_by = ? WHERE id = ? AND package_id = ?`,
    [uploader, uploader, reqId, id]
  );
  await db.query('UPDATE packages SET content_tl_approved = TRUE, content_admin_approved = TRUE WHERE id = ?', [id]);
  await createNotification(id, `Admin approved content for package {package}. Dispatched to Design Team & Developer Team!`, ['Design Team', 'Developer Team'], uploader, 'Admin');
  res.json({ success: true });
}));

router.delete('/api/packages/:id/files/content/:reqId', asyncHandler(async (req, res) => {
  const { id, reqId } = req.params;
  await db.query(
    `UPDATE content_files 
     SET file_name = NULL, file_size = NULL, uploaded_by = NULL, tl_approval = 'Pending', tl_approved_by = NULL, admin_approval = 'Pending', admin_approved_by = NULL 
     WHERE id = ? AND package_id = ?`,
    [reqId, id]
  );
  await db.query('UPDATE packages SET content_uploaded = FALSE, content_tl_approved = FALSE, content_admin_approved = FALSE WHERE id = ?', [id]);
  res.json({ success: true });
}));

router.put('/api/packages/:id/design-feedback/:feedbackId/resolve', asyncHandler(async (req, res) => {
  const { id, feedbackId } = req.params;
  const { resolvedBy } = req.body || {};
  await db.query('UPDATE design_feedbacks SET resolved = TRUE WHERE id = ?', [feedbackId]);
  await createNotification(id, 'Content Team addressed requirement feedback for package {package}', ['Design Team'], resolvedBy || 'Content Team', 'Content Team');
  res.json({ success: true });
}));

export default router;
