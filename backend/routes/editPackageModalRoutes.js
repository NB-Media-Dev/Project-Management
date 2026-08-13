import express from 'express';
import db from '../../db.js';
import { asyncHandler, formatDueDateForDb, notifyIncompleteTeams } from '../utils/helpers.js';

const router = express.Router();

router.put('/api/packages/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, project, dueDate } = req.body;
  let projectId = null;
  if (project) {
    const [projRows] = await db.query('SELECT id FROM projects WHERE name = ?', [project]);
    if (projRows.length > 0) projectId = projRows[0].id;
  }
  const formattedDueDate = formatDueDateForDb(dueDate);
  if (projectId) {
    await db.query(
      'UPDATE packages SET name = ?, project_id = ?, due_date = ? WHERE id = ?',
      [name.trim(), projectId, formattedDueDate, id]
    );
  } else {
    await db.query(
      'UPDATE packages SET name = ?, due_date = ? WHERE id = ?',
      [name.trim(), formattedDueDate, id]
    );
  }
  if (formattedDueDate) {
    await notifyIncompleteTeams(id, formattedDueDate);
  }
  res.json({ success: true });
}));

router.put('/api/packages/:id/due-date', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { dueDate } = req.body;
  const formattedDueDate = formatDueDateForDb(dueDate);
  await db.query(
    'UPDATE packages SET due_date = ? WHERE id = ?',
    [formattedDueDate, id]
  );
  if (formattedDueDate) {
    await notifyIncompleteTeams(id, formattedDueDate);
  }
  res.json({ success: true });
}));

export default router;
