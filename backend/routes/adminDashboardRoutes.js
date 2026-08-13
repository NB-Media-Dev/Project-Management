import express from 'express';
import db from '../../db.js';
import { asyncHandler, hashPassword, checkPasswordComplexity } from '../utils/helpers.js';

const router = express.Router();

router.get('/api/users', asyncHandler(async (req, res) => {
  const [rows] = await db.query('SELECT username, password, role, avatar_url FROM users');
  res.json(rows.map(u => ({
    username: u.username,
    role: u.role,
    avatarUrl: u.avatar_url || null
  })));
}));

router.post('/api/users', asyncHandler(async (req, res) => {
  const { username, password, role } = req.body;
  const cleanUsername = username.trim().toLowerCase();
  const cleanPassword = password.trim();
  const complexityError = checkPasswordComplexity(cleanPassword);
  if (complexityError) return res.status(400).json({ error: complexityError });

  await db.query(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [cleanUsername, hashPassword(cleanPassword), role]
  );
  res.json({ success: true });
}));

router.put('/api/users/:username', asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { password, role } = req.body;
  const cleanTarget = username.trim().toLowerCase();

  if (password && password.trim() !== '') {
    const cleanPassword = password.trim();
    const complexityError = checkPasswordComplexity(cleanPassword);
    if (complexityError) return res.status(400).json({ error: complexityError });
    await db.query(
      'UPDATE users SET password = ?, role = ? WHERE LOWER(username) = ?',
      [hashPassword(cleanPassword), role, cleanTarget]
    );
  } else {
    await db.query(
      'UPDATE users SET role = ? WHERE LOWER(username) = ?',
      [role, cleanTarget]
    );
  }
  res.json({ success: true });
}));

router.delete('/api/users/:username', asyncHandler(async (req, res) => {
  const cleanTarget = req.params.username.trim().toLowerCase();
  if (cleanTarget === 'admin') {
    return res.status(400).json({ error: 'Default admin account cannot be deleted.' });
  }
  await db.query('DELETE FROM users WHERE LOWER(username) = ?', [cleanTarget]);
  res.json({ success: true });
}));

router.post('/api/admin/clean-database', asyncHandler(async (req, res) => {
  try {
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = ['bugs', 'developer_builds', 'design_files', 'content_files', 'design_feedbacks', 'notification_reads', 'notifications', 'packages'];
    for (const t of tables) {
      try { await db.query(`TRUNCATE TABLE ${t}`); } catch {}
    }
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    res.json({ success: true, message: 'Database cleaned. Users and project structures preserved.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}));

export default router;
