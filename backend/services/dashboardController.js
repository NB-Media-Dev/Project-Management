import db from '../../db.js';
import { createNotification } from '../utils/helpers.js';
import { getApprovalPackageDetails } from './packageService.js';

export function handlePackageApproval({
  dbQuery,
  getQueryParams,
  notificationMsg,
  recipients,
  roleLabel,
  validationFn,
}) {
  return async (req, res) => {
    const { id } = req.params;
    const { approvedBy } = req.body || {};
    const uploader = approvedBy || roleLabel;

    if (validationFn) {
      const pkg = await getApprovalPackageDetails(id);
      const validationError = validationFn(pkg);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
    }

    const queryParams = getQueryParams ? getQueryParams(id, uploader) : [uploader, id];
    await db.query(dbQuery, queryParams);

    if (notificationMsg && recipients) {
      const formattedMsg = typeof notificationMsg === 'function' 
        ? notificationMsg(uploader)
        : notificationMsg;
      await createNotification(id, formattedMsg, recipients, uploader, roleLabel);
    }

    res.json({ success: true });
  };
}

/**
 * Reusable Package Rejection Controller Handler
 */
export function handlePackageRejection({
  dbQuery,
  getQueryParams,
  notificationMsg,
  recipients,
  roleLabel,
  defaultReason,
}) {
  return async (req, res) => {
    const { id } = req.params;
    const { rejectedBy, reason } = req.body || {};
    const uploader = rejectedBy || roleLabel;
    const rejectionReason = reason ? reason.trim() : defaultReason;

    const queryParams = getQueryParams ? getQueryParams(id, uploader, rejectionReason) : [rejectionReason, id];
    await db.query(dbQuery, queryParams);

    if (notificationMsg && recipients) {
      const formattedMsg = typeof notificationMsg === 'function'
        ? notificationMsg(uploader, rejectionReason)
        : notificationMsg;
      await createNotification(id, formattedMsg, recipients, uploader, roleLabel);
    }

    res.json({ success: true });
  };
}

/**
 * Reusable Developer Build Approval Handler
 */
export function handleBuildApproval(defaultUploader, notificationText, recipients, roleLabel) {
  return async (req, res) => {
    const { id, fileId } = req.params;
    const { approvedBy } = req.body || {};
    const uploader = approvedBy || defaultUploader;
    const { approveBuildFile } = await import('../utils/helpers.js');
    await approveBuildFile(fileId, id, uploader);
    await createNotification(id, notificationText(uploader), recipients, uploader, roleLabel || 'Developer Team');
    res.json({ success: true });
  };
}

/**
 * Reusable Design Mockups Approval Handler
 */
export function handleDesignMockupsApproval(defaultUploader, notificationText, recipients) {
  return async (req, res) => {
    const { id } = req.params;
    const { approvedBy } = req.body || {};
    const uploader = approvedBy || defaultUploader;

    const [dFilesCount] = await db.query('SELECT id FROM design_files WHERE package_id = ?', [id]);
    if (dFilesCount.length < 1) {
      return res.status(400).json({ error: 'Requirement failed: At least 1 design asset is required before Project Manager approval. Current: 0 assets.' });
    }

    await db.query(
      `UPDATE design_files SET tl_approval = 'Approved', tl_approved_by = ?, admin_approval = 'Approved', admin_approved_by = ?, rejection_reason = NULL, rejected_by = NULL WHERE package_id = ?`,
      [uploader, uploader, id]
    );
    await db.query('UPDATE packages SET design_tl_approved = TRUE, design_admin_approved = TRUE WHERE id = ?', [id]);
    await createNotification(id, notificationText(uploader), recipients, uploader, 'Project Manager');
    res.json({ success: true });
  };
}

/**
 * Reusable Design Mockups Rejection Handler
 */
export function handleDesignMockupsRejection(defaultUploader, defaultReason, notificationText, recipients) {
  return async (req, res) => {
    const { id } = req.params;
    const { rejectedBy, reason } = req.body || {};
    const uploader = rejectedBy || defaultUploader;
    const rejectionReason = reason ? reason.trim() : defaultReason;

    await db.query(
      `UPDATE design_files SET tl_approval = 'Rejected', rejection_reason = ?, rejected_by = ? WHERE package_id = ?`,
      [rejectionReason, uploader, id]
    );
    await db.query('UPDATE packages SET design_tl_approved = FALSE, design_admin_approved = FALSE WHERE id = ?', [id]);
    await createNotification(id, notificationText(uploader, rejectionReason), recipients, uploader, 'Project Manager');
    res.json({ success: true });
  };
}

/**
 * Reusable File Item Rejection Handler
 */
export function handleFileRejection({ table, defaultReason, notificationMsg, recipients, resetQueries = [] }) {
  return async (req, res) => {
    const { id, fileId } = req.params;
    const { rejectedBy, reason } = req.body || {};
    const uploader = rejectedBy || 'Project Manager';
    const rejectionReason = reason ? reason.trim() : defaultReason;

    await db.query(
      `UPDATE ${table} SET tl_approval = 'Rejected', rejection_reason = ?, rejected_by = ? WHERE id = ? AND package_id = ?`,
      [rejectionReason, uploader, fileId, id]
    );
    for (const q of resetQueries) {
      await db.query(q, [id]);
    }
    await createNotification(
      id,
      notificationMsg(uploader, rejectionReason),
      recipients,
      uploader,
      'Project Manager'
    );
    res.json({ success: true });
  };
}

/**
 * Reusable Package File Deletion Handler
 */
export function handleDeletePackageFile(table, resetQuery) {
  return async (req, res) => {
    const { id, fileId } = req.params;
    await db.query(`DELETE FROM ${table} WHERE id = ? AND package_id = ?`, [fileId, id]);
    const [remaining] = await db.query(`SELECT id FROM ${table} WHERE package_id = ?`, [id]);
    if (remaining.length === 0) {
      await db.query(resetQuery, [id]);
    }
    res.json({ success: true });
  };
}

