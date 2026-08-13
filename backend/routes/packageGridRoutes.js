import express from 'express';
import db from '../../db.js';
import { asyncHandler, normalisePkg, queryWithFallback, mapFileRow } from '../utils/helpers.js';

const router = express.Router();

router.get('/api/packages', asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    'SELECT p.*, pr.name AS project FROM packages p JOIN projects pr ON p.project_id = pr.id'
  );

  for (const pkg of rows) {
    normalisePkg(pkg);

    const cFiles = await queryWithFallback(
      () => db.query(
        `SELECT id, name, file_name AS fileName, file_size AS fileSize, uploaded_by AS uploadedBy, 
                tl_approval AS tlApproval, tl_approved_by AS tlApprovedBy, 
                admin_approval AS adminApproval, admin_approved_by AS adminApprovedBy,
                rejection_reason AS rejectionReason, rejected_by AS rejectedBy 
         FROM content_files WHERE package_id = ?`,
        [pkg.id]
      ),
      () => db.query(
        'SELECT id, name, file_name AS fileName, file_size AS fileSize FROM content_files WHERE package_id = ?',
        [pkg.id]
      )
    );
    pkg.contentFiles = cFiles.map(mapFileRow);

    const dFiles = await queryWithFallback(
      () => db.query(
        `SELECT id, name, file_name AS fileName, file_size AS fileSize, platform, uploaded_by AS uploadedBy, 
                tl_approval AS tlApproval, tl_approved_by AS tlApprovedBy, 
                admin_approval AS adminApproval, admin_approved_by AS adminApprovedBy,
                rejection_reason AS rejectionReason, rejected_by AS rejectedBy 
         FROM design_files WHERE package_id = ?`,
        [pkg.id]
      ),
      () => db.query(
        'SELECT id, name, file_name AS fileName, file_size AS fileSize, platform FROM design_files WHERE package_id = ?',
        [pkg.id]
      )
    );
    pkg.designFiles = dFiles.map(mapFileRow);

    const bFiles = await queryWithFallback(
      () => db.query(
        `SELECT id, name, file_name AS fileName, file_size AS fileSize, platform, uploaded_by AS uploadedBy, 
                tl_approval AS tlApproval, tl_approved_by AS tlApprovedBy, 
                admin_approval AS adminApproval, admin_approved_by AS adminApprovedBy,
                rejection_reason AS rejectionReason, rejected_by AS rejectedBy 
         FROM developer_builds WHERE package_id = ? ORDER BY id DESC`,
        [pkg.id]
      ),
      () => db.query(
        'SELECT id, file_name AS fileName, file_size AS fileSize, platform FROM developer_builds WHERE package_id = ? ORDER BY id DESC',
        [pkg.id]
      )
    );
    pkg.devBuildFiles = bFiles.map((f) => ({
      ...mapFileRow(f),
      platform: f.platform || 'Web',
      name: f.name || 'Code Build',
    }));
    pkg.devBuildFile = pkg.devBuildFiles.length > 0 ? pkg.devBuildFiles[0] : null;

    const bugs = await queryWithFallback(
      () => db.query(
        'SELECT id, title, description, severity, resolved, reported_by AS reportedBy, file_name AS fileName, file_size AS fileSize, bug_url AS bugUrl FROM bugs WHERE package_id = ? ORDER BY id DESC',
        [pkg.id]
      ),
      () => db.query(
        'SELECT id, title, description, severity, resolved FROM bugs WHERE package_id = ? ORDER BY id DESC',
        [pkg.id]
      )
    );
    pkg.bugs = bugs.map((b) => ({
      ...b,
      resolved: b.resolved === 1,
      reportedBy: b.reportedBy || 'QA Tester',
      fileName: b.fileName || null,
      fileSize: b.fileSize || null,
      bugUrl: b.bugUrl || b.bug_url || '',
    }));

    try {
      const [feedbacks] = await db.query(
        'SELECT id, title, description, severity, resolved FROM design_feedbacks WHERE package_id = ? ORDER BY id DESC',
        [pkg.id]
      );
      pkg.designFeedbacks = feedbacks.map((f) => ({ ...f, resolved: f.resolved === 1 }));
    } catch {
      pkg.designFeedbacks = [];
    }
  }

  res.json(rows);
}));

router.delete('/api/packages/:id', asyncHandler(async (req, res) => {
  await db.query('DELETE FROM packages WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

export default router;
