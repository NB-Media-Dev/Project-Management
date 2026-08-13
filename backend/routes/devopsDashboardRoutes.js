import express from 'express';
import db from '../../db.js';
import { asyncHandler, createNotification, queryWithFallback } from '../utils/helpers.js';

const router = express.Router();

router.put('/api/packages/:id/approve-devops-pm', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approvedBy } = req.body || {};
  const uploader = approvedBy || 'Project Manager';
  await db.query(
    `UPDATE packages SET devops_tl_approved = TRUE, devops_tl_approved_by = ?, devops_admin_approved = TRUE, devops_rejection_reason = NULL WHERE id = ?`,
    [uploader, id]
  );
  await createNotification(id, `Project Manager (${uploader}) APPROVED DevOps staging preview link for package {package}. Sent to Testing Team!`, ['Devops Team', 'Testing Team'], uploader, 'Project Manager');
  res.json({ success: true });
}));

router.put('/api/packages/:id/reject-devops-pm', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectedBy, reason } = req.body || {};
  const uploader = rejectedBy || 'Project Manager';
  const rejectionReason = reason ? reason.trim() : 'DevOps staging deployment requires fixes.';

  await db.query(
    `UPDATE packages SET devops_tl_approved = FALSE, devops_admin_approved = FALSE, devops_rejection_reason = ? WHERE id = ?`,
    [rejectionReason, id]
  );
  await createNotification(
    id,
    `Project Manager (${uploader}) REJECTED DevOps staging deployment for package {package}. Reason: '${rejectionReason}'`,
    ['Devops Team'],
    uploader,
    'Project Manager'
  );
  res.json({ success: true });
}));

router.put('/api/packages/:id/devops-staging', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [pkgRows] = await db.query('SELECT submitted_to_devops FROM packages WHERE id = ?', [id]);
  const [buildRows] = await db.query('SELECT id FROM developer_builds WHERE package_id = ? AND file_name IS NOT NULL AND file_name != ""', [id]);
  
  const devZipUploaded = (pkgRows.length > 0 && (pkgRows[0].submitted_to_devops === 1 || pkgRows[0].submitted_to_devops === true)) || buildRows.length > 0;
  if (!devZipUploaded) {
    return res.status(400).json({ error: 'Cannot submit links: Developer team has not uploaded the build .zip file for this task yet.' });
  }

  const { stagingUrl, demoUrl, productionUrl, demoDescription, submittedBy } = req.body;
  const finalStagingUrl = stagingUrl || demoUrl || '';
  const finalProdUrl = productionUrl || (demoUrl !== finalStagingUrl ? demoUrl : null);
  const devopsUser = submittedBy || 'Devops Team';

  if (finalProdUrl) {
    await queryWithFallback(
      () => db.query(
        `UPDATE packages 
         SET staging_url = ?, demo_url = ?, demo_description = ?, submitted_to_devops = TRUE, devops_staging_uploaded = TRUE, devops_tl_approved = TRUE, devops_admin_approved = TRUE, deployed = TRUE, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [finalStagingUrl, finalProdUrl, demoDescription, id]
      ),
      () => db.query(
        `UPDATE packages 
         SET staging_url = ?, demo_url = ?, demo_description = ?, submitted_to_devops = TRUE, devops_staging_uploaded = TRUE, devops_tl_approved = TRUE, devops_admin_approved = TRUE, deployed = TRUE 
         WHERE id = ?`,
        [finalStagingUrl, finalProdUrl, demoDescription, id]
      )
    );
  } else {
    await queryWithFallback(
      () => db.query(
        `UPDATE packages 
         SET staging_url = ?, demo_description = ?, submitted_to_devops = TRUE, devops_staging_uploaded = TRUE, devops_tl_approved = TRUE, devops_admin_approved = TRUE, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [finalStagingUrl, demoDescription, id]
      ),
      () => db.query(
        `UPDATE packages 
         SET staging_url = ?, demo_description = ?, submitted_to_devops = TRUE, devops_staging_uploaded = TRUE, devops_tl_approved = TRUE, devops_admin_approved = TRUE 
         WHERE id = ?`,
        [finalStagingUrl, demoDescription, id]
      )
    );
  }

  await createNotification(id, `DevOps team updated deployment links (Staging: ${finalStagingUrl}${finalProdUrl ? ', Production: ' + finalProdUrl : ''}) for package {package}.`, ['Testing Team', 'Project Manager', 'Admin'], devopsUser, 'Devops Team');
  res.json({ success: true, stagingUrl: finalStagingUrl, productionUrl: finalProdUrl });
}));

router.put('/api/packages/:id/approve-devops-tl', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approvedBy } = req.body;
  const uploader = approvedBy || 'Devops TL';
  await db.query(
    `UPDATE packages SET devops_staging_uploaded = TRUE, devops_tl_approved = TRUE, devops_tl_approved_by = ?, devops_admin_approved = TRUE WHERE id = ?`,
    [uploader, id]
  );
  await createNotification(id, `DevOps Team Leader (${uploader}) sent staging link for package {package} to Testing Team.`, ['Testing Team'], uploader, 'Devops Team');
  res.json({ success: true });
}));

router.put('/api/packages/:id/approve-devops-admin', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approvedBy } = req.body;
  const uploader = approvedBy || 'Admin';
  await db.query(
    `UPDATE packages SET devops_staging_uploaded = TRUE, devops_tl_approved = TRUE, devops_admin_approved = TRUE, devops_admin_approved_by = ? WHERE id = ?`,
    [uploader, id]
  );
  await createNotification(id, `Admin approved staging link for package {package}. Sent to Testing Team!`, ['Testing Team'], uploader, 'Admin');
  res.json({ success: true });
}));

router.put('/api/packages/:id/deploy', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { demoUrl, productionUrl, demoDescription, deployedBy } = req.body || {};
  const finalDemoUrl = productionUrl || demoUrl || '';
  const finalDemoDesc = demoDescription || 'Production Deployment Finalized';
  await db.query(
    'UPDATE packages SET deployed = TRUE, demo_url = ?, demo_description = ? WHERE id = ?',
    [finalDemoUrl, finalDemoDesc, id]
  );
  await createNotification(id, 'Devops Team deployed package {package} to production', ['Testing Team', 'Admin', 'CTO', 'Content Team', 'Developer Team'], deployedBy || 'Devops Team', 'Devops Team');
  res.json({ success: true });
}));

export default router;
