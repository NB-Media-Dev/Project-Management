import express from 'express';
import db from '../../db.js';
import { upload } from '../config/upload.js';
import { asyncHandler, verifyPassword, hashPassword, checkPasswordComplexity } from '../utils/helpers.js';

const router = express.Router();

router.put('/api/users/:username/change-password', asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { currentPassword, newPassword } = req.body;
  const cleanTarget = username.trim().toLowerCase();

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  const [rows] = await db.query(
    'SELECT password FROM users WHERE LOWER(username) = ?',
    [cleanTarget]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const storedHash = rows[0].password;
  if (!verifyPassword(currentPassword.trim(), storedHash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const cleanNewPassword = newPassword.trim();
  const complexityError = checkPasswordComplexity(cleanNewPassword);
  if (complexityError) {
    return res.status(400).json({ error: complexityError });
  }

  await db.query(
    'UPDATE users SET password = ? WHERE LOWER(username) = ?',
    [hashPassword(cleanNewPassword), cleanTarget]
  );

  res.json({ success: true, message: 'Password updated successfully!' });
}));

router.post('/api/users/:username/avatar', upload.single('avatar'), asyncHandler(async (req, res) => {
  const { username } = req.params;
  const cleanTarget = username.trim().toLowerCase();

  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded.' });
  }

  const avatarUrl = `/uploads/${req.file.filename}`;
  await db.query(
    'UPDATE users SET avatar_url = ? WHERE LOWER(username) = ?',
    [avatarUrl, cleanTarget]
  );

  res.json({ success: true, avatarUrl, message: 'Profile picture updated successfully!' });
}));

router.delete('/api/users/:username/avatar', asyncHandler(async (req, res) => {
  const { username } = req.params;
  const cleanTarget = username.trim().toLowerCase();

  await db.query(
    'UPDATE users SET avatar_url = NULL WHERE LOWER(username) = ?',
    [cleanTarget]
  );

  res.json({ success: true, avatarUrl: null, message: 'Profile picture removed.' });
}));

export default router;
