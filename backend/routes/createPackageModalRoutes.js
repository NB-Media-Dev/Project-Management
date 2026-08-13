import express from 'express';
import db from '../../db.js';
import { asyncHandler, formatDueDateForDb, createNotification, notifyIncompleteTeams } from '../utils/helpers.js';

const router = express.Router();

router.post('/api/packages', asyncHandler(async (req, res) => {
  const { name, project, dueDate, createdByRole, createdBy } = req.body;
  const role = createdByRole || 'Project Manager';
  const creator = createdBy || null;

  const projLower = (project || '').trim().toLowerCase();
  const roleLower = role.trim().toLowerCase();
  const isClassmateOrCareerMate = projLower === 'career mate' || projLower === 'careermate' || projLower === 'classmate' || projLower === 'class mate';
  
  if (roleLower.includes('cto') && isClassmateOrCareerMate) {
    return res.status(400).json({ error: 'CTO cannot create new tasks for Classmate or Career Mate projects.' });
  }

  if (roleLower.includes('career mate') && (projLower !== 'career mate' && projLower !== 'careermate')) {
    return res.status(403).json({ error: 'Project Manager (Career Mate) can only create tasks for Career Mate project.' });
  }

  if (roleLower.includes('classmate') && (projLower !== 'classmate' && projLower !== 'class mate')) {
    return res.status(403).json({ error: 'Project Manager (Classmate) can only create tasks for Classmate project.' });
  }

  const [projRows] = await db.query('SELECT id FROM projects WHERE name = ?', [project]);
  if (projRows.length === 0) return res.status(400).json({ error: 'Project not found' });
  const projectId = projRows[0].id;
  const formattedDueDate = formatDueDateForDb(dueDate);
  const [result] = await db.query(
    'INSERT INTO packages (project_id, name, due_date, created_by_role, created_by) VALUES (?, ?, ?, ?, ?)',
    [projectId, name.trim(), formattedDueDate, role, creator]
  );
  const packageId = result.insertId;
  await db.query(
    'INSERT INTO content_files (package_id, name) VALUES (?, ?), (?, ?)',
    [packageId, 'Task Description & Copy', packageId, 'UI Text Labels & Form Rules']
  );

  await createNotification(
    packageId,
    `Project Manager (${creator || 'PM'}) created new task {package}. Content Team please upload the requirement & copy documents.`,
    ['Content Team'],
    creator,
    role
  );

  if (formattedDueDate) {
    await notifyIncompleteTeams(packageId, formattedDueDate);
  }
  res.json({ success: true, insertId: packageId });
}));

export default router;
