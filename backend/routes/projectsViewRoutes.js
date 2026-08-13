import express from 'express';
import db from '../../db.js';
import { asyncHandler } from '../utils/helpers.js';

const router = express.Router();

router.get('/api/projects', asyncHandler(async (req, res) => {
  const [rows] = await db.query('SELECT name FROM projects');
  res.json(rows.map((r) => r.name));
}));

router.post('/api/projects', asyncHandler(async (req, res) => {
  await db.query('INSERT INTO projects (name) VALUES (?)', [req.body.name.trim()]);
  res.json({ success: true });
}));

router.delete('/api/projects/:name', asyncHandler(async (req, res) => {
  const name = req.params.name.trim();
  const lowerName = name.toLowerCase();

  // Prevent deletion of fixed system projects: Career Mate & Classmate
  const fixedProjects = ['career mate', 'careermate', 'classmate', 'class mate'];
  if (fixedProjects.includes(lowerName)) {
    return res.status(400).json({ error: `Project "${name}" is a fixed core project and cannot be deleted.` });
  }

  const [projRows] = await db.query('SELECT id FROM projects WHERE LOWER(name) = LOWER(?)', [lowerName]);
  if (projRows.length > 0) {
    const projectId = projRows[0].id;
    const [pkgRows] = await db.query('SELECT id FROM packages WHERE project_id = ?', [projectId]);
    for (const pkg of pkgRows) {
      await db.query('DELETE FROM content_files WHERE package_id = ?', [pkg.id]);
      await db.query('DELETE FROM design_files WHERE package_id = ?', [pkg.id]);
      await db.query('DELETE FROM developer_builds WHERE package_id = ?', [pkg.id]);
      await db.query('DELETE FROM bugs WHERE package_id = ?', [pkg.id]);
      await db.query('DELETE FROM design_feedbacks WHERE package_id = ?', [pkg.id]);
      await db.query('DELETE FROM notification_reads WHERE notification_id IN (SELECT id FROM notifications WHERE package_id = ?)', [pkg.id]);
      await db.query('DELETE FROM notifications WHERE package_id = ?', [pkg.id]);
      await db.query('DELETE FROM packages WHERE id = ?', [pkg.id]);
    }
    await db.query('DELETE FROM projects WHERE id = ?', [projectId]);
  }
  res.json({ success: true });
}));

export default router;
