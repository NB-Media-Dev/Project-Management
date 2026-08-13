import express from 'express';
import db from '../../db.js';
import { asyncHandler, verifyPassword } from '../utils/helpers.js';

const router = express.Router();

router.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || typeof username !== 'string' || username.length > 255 || !password || typeof password !== 'string' || password.length > 255) {
    return res.status(400).json({ error: 'Invalid input parameters or length limit exceeded' });
  }
  const cleanUsername = username.trim().toLowerCase();
  const cleanPassword = password.trim();
  const [rows] = await db.query(
    'SELECT username, password, role, is_team_leader, avatar_url FROM users WHERE username = ?',
    [cleanUsername]
  );
  if (rows.length > 0 && verifyPassword(cleanPassword, rows[0].password)) {
    res.json({
      username: rows[0].username,
      role: rows[0].role,
      isTeamLeader: rows[0].is_team_leader === 1 || rows[0].is_team_leader === true,
      avatarUrl: rows[0].avatar_url || null
    });
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
}));

export default router;
