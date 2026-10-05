import express from 'express';
import db from '../../db.js';
import { upload } from '../config/upload.js';
import { asyncHandler, formatSize, createNotification, checkDevopsStagingReady, queryWithFallback, isClassmateOrCareerMate } from '../utils/helpers.js';
import { handlePackageApproval } from '../services/dashboardController.js';

const router = express.Router();

router.put('/api/packages/:id/approve-testing-pm', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approvedBy } = req.body || {};
  const uploader = approvedBy || 'Project Manager';

  const stagingError = await checkDevopsStagingReady(id, 'Cannot approve Test pass');
  if (stagingError) {
    return res.status(400).json({ error: stagingError });
  }

  const [openBugs] = await db.query('SELECT id FROM bugs WHERE package_id = ? AND resolved = FALSE', [id]);
  if (openBugs.length > 0) {
    return res.status(400).json({ error: `Cannot approve Test pass: ${openBugs.length} unresolved bug(s) remaining for this task.` });
  }

  await db.query(
    `UPDATE packages SET testing_tl_approved = TRUE, testing_tl_approved_by = ?, testing_rejection_reason = NULL WHERE id = ?`,
    [uploader, id]
  );
  await createNotification(id, `Project Manager (${uploader}) APPROVED Test pass for package {package}. Ready for CTO Final Release Approval!`, ['Testing Team', 'CTO'], uploader, 'Project Manager');
  res.json({ success: true });
}));

router.put('/api/packages/:id/reject-testing-pm', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectedBy, reason } = req.body || {};
  const uploader = rejectedBy || 'Project Manager';
  const rejectionReason = reason ? reason.trim() : 'Test pass rejected for further testing or bug fixes.';

  const stagingError = await checkDevopsStagingReady(id, 'Cannot reject Test pass');
  if (stagingError) {
    return res.status(400).json({ error: stagingError });
  }

  await db.query(
    `UPDATE packages SET testing_tl_approved = FALSE, testing_rejection_reason = ? WHERE id = ?`,
    [rejectionReason, id]
  );
  await createNotification(
    id,
    `Project Manager (${uploader}) REJECTED Test pass for package {package}. Reason: '${rejectionReason}'`,
    ['Testing Team'],
    uploader,
    'Project Manager'
  );
  res.json({ success: true });
}));

router.put('/api/packages/:id/approve-testing-tl', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approvedBy } = req.body;
  const uploader = approvedBy || 'Tester';

  const stagingError = await checkDevopsStagingReady(id, 'Cannot approve Test pass');
  if (stagingError) {
    return res.status(400).json({ error: stagingError });
  }

  const [openBugs] = await db.query('SELECT id FROM bugs WHERE package_id = ? AND resolved = FALSE', [id]);
  if (openBugs.length > 0) {
    return res.status(400).json({ error: `Cannot approve: ${openBugs.length} unresolved bug(s) remaining.` });
  }
  await db.query(
    `UPDATE packages SET testing_tl_approved = TRUE, testing_tl_approved_by = ? WHERE id = ?`,
    [uploader, id]
  );
  await createNotification(id, `Testing Team (${uploader}) approved Test pass for task {package}. Sent to CTO for CTO Release Sign-Off!`, ['CTO'], uploader, 'Testing Team');
  res.json({ success: true });
}));

router.put('/api/packages/:id/approve-cto', handlePackageApproval({
  roleLabel: 'CTO',
  dbQuery: `UPDATE packages SET cto_approved = TRUE, cto_approved_by = ?, final_pm_approved = TRUE, final_pm_approved_by = ?, final_admin_approved = TRUE, final_admin_approved_by = ? WHERE id = ?`,
  getQueryParams: (id, uploader) => [uploader, uploader, uploader, id],
  notificationMsg: (uploader) => `CTO (${uploader}) APPROVED task {package} for live production release! DevOps team please proceed with deployment!`,
  recipients: ['Devops Team'],
  validationFn: (pkg) => {
    if (!pkg) return null;
    const isQaApproved = pkg.testing_tl_approved === 1 || pkg.testing_tl_approved === true;
    if (!isQaApproved) {
      return 'Cannot approve CTO release: Testing team has not approved the Test pass yet.';
    }
    if (isClassmateOrCareerMate(pkg.project_name)) {
      return 'CTO cannot approve Classmate or Career Mate projects. Final approval for Classmate and Career Mate must come from Project Manager.';
    }
    return null;
  },
}));

const validateFinalApproval = (pkg) => {
  if (!pkg) return null;
  const isQaApproved = pkg.testing_tl_approved === 1 || pkg.testing_tl_approved === true;
  if (!isQaApproved) {
    return 'Cannot give Final Production Approval: Testing team has not approved the Test pass yet.';
  }
  const isSpecialProject = isClassmateOrCareerMate(pkg.project_name);
  const isCtoApproved = pkg.cto_approved === 1 || pkg.cto_approved === true;
  if (!isSpecialProject && !isCtoApproved) {
    return 'Final production approval for this project must be given by the CTO.';
  }
  return null;
};

router.put('/api/packages/:id/approve-final-pm', handlePackageApproval({
  roleLabel: 'Project Manager',
  dbQuery: `UPDATE packages SET final_pm_approved = TRUE, final_pm_approved_by = ?, final_admin_approved = TRUE, final_admin_approved_by = ? WHERE id = ?`,
  getQueryParams: (id, uploader) => [uploader, uploader, id],
  notificationMsg: (uploader) => `Project Manager (${uploader}) gave FINAL PRODUCTION APPROVAL for task {package}. DevOps team please proceed with LIVE PRODUCTION DEPLOYMENT!`,
  recipients: ['Devops Team'],
  validationFn: validateFinalApproval,
}));

router.put('/api/packages/:id/approve-final-admin', handlePackageApproval({
  roleLabel: 'Admin',
  dbQuery: `UPDATE packages SET final_pm_approved = TRUE, final_pm_approved_by = ?, final_admin_approved = TRUE, final_admin_approved_by = ? WHERE id = ?`,
  getQueryParams: (id, uploader) => [uploader, uploader, id],
  notificationMsg: (uploader) => `Admin (${uploader}) gave FINAL PRODUCTION APPROVAL for task {package}. DevOps team please proceed with LIVE PRODUCTION DEPLOYMENT!`,
  recipients: ['Devops Team'],
  validationFn: validateFinalApproval,
}));

router.post('/api/packages/:id/bugs', upload.single('file'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const stagingError = await checkDevopsStagingReady(id, 'Cannot report bugs yet');
  if (stagingError) {
    return res.status(400).json({ error: stagingError });
  }
  const { title, description, severity, reportedBy, bugUrl } = req.body;
  const file = req.file;
  const fileName = file ? file.filename : null;
  const fileSize = file ? formatSize(file.size) : null;
  const linkUrl = bugUrl || req.body.url || null;
  await queryWithFallback(
    () => db.query(
      'INSERT INTO bugs (package_id, title, description, severity, reported_by, file_name, file_size, bug_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, description, severity, reportedBy || null, fileName, fileSize, linkUrl]
    ),
    () => db.query(
      'INSERT INTO bugs (package_id, title, description, severity) VALUES (?, ?, ?, ?)',
      [id, title, description, severity]
    )
  );
  await createNotification(id, 'Testing Team reported a bug for package {package}', ['Developer Team'], reportedBy || 'Testing Team', 'Testing Team');
  res.json({ success: true });
}));

router.put('/api/packages/:id/bugs/:bugId/resolve', asyncHandler(async (req, res) => {
  const { id, bugId } = req.params;
  const { resolvedBy } = req.body || {};
  await db.query('UPDATE bugs SET resolved = TRUE WHERE id = ?', [bugId]);
  await createNotification(id, 'Developer Team resolved bug for package {package}', ['Testing Team'], resolvedBy || 'Developer Team', 'Developer Team');
  res.json({ success: true });
}));

export default router;
