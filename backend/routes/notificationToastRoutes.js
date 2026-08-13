import express from 'express';
import db from '../../db.js';
import { asyncHandler, inferRole, getPMProjectForRole, markNotificationAsRead } from '../utils/helpers.js';

const router = express.Router();

router.get('/api/notifications', asyncHandler(async (req, res) => {
  const { role, username } = req.query;
  if (!role || !username) return res.status(400).json({ error: 'Role and username are required' });
  const inferredRole = inferRole(role);
  const userRoleLower = (role || inferredRole).trim().toLowerCase();
  const userNameLower = username.trim().toLowerCase();
  const pmProject = getPMProjectForRole(inferredRole) || getPMProjectForRole(role);

  let query = `
    SELECT n.id, n.package_id AS packageId, pr.name AS projectName, n.message,
           IF(nr.username IS NOT NULL, TRUE, FALSE) AS isRead, n.created_at AS createdAt,
           n.sender_username AS senderUsername, n.sender_role AS senderRole
    FROM notifications n
    LEFT JOIN packages p ON n.package_id = p.id
    LEFT JOIN projects pr ON p.project_id = pr.id
    LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.username = ?
    WHERE (
      LOWER(n.target_role) = ?
      OR LOWER(n.target_role) = 'all'
      OR (LOWER(?) LIKE '%project manager%' AND LOWER(n.target_role) LIKE '%project manager%')
      OR ((LOWER(?) LIKE '%dev%' OR LOWER(?) LIKE '%developer%') AND (LOWER(n.target_role) LIKE '%dev%' OR LOWER(n.target_role) LIKE '%developer%'))
      OR (LOWER(?) LIKE '%cto%' AND (LOWER(n.target_role) LIKE '%cto%' OR LOWER(n.target_role) = 'admin' OR LOWER(n.target_role) = 'all'))
      OR (LOWER(?) LIKE '%admin%' AND (LOWER(n.target_role) IN ('admin', 'cto', 'all') OR LOWER(n.target_role) LIKE '%project manager%'))
      OR ((LOWER(?) LIKE '%design%' OR LOWER(?) LIKE '%digital%') AND (LOWER(n.target_role) LIKE '%design%' OR LOWER(n.target_role) LIKE '%digital%'))
      OR (LOWER(?) LIKE '%content%' AND LOWER(n.target_role) LIKE '%content%')
      OR (LOWER(?) LIKE '%devops%' AND LOWER(n.target_role) LIKE '%devops%')
      OR ((LOWER(?) LIKE '%test%' OR LOWER(?) LIKE '%qa%') AND (LOWER(n.target_role) LIKE '%test%' OR LOWER(n.target_role) LIKE '%qa%'))
    )
  `;
  const queryParams = [
    username,
    userRoleLower,
    userRoleLower,
    userRoleLower, userRoleLower,
    userRoleLower,
    userRoleLower,
    userRoleLower, userRoleLower,
    userRoleLower,
    userRoleLower,
    userRoleLower, userRoleLower
  ];

  if (pmProject) {
    query += ` AND (pr.name IS NULL OR REPLACE(LOWER(pr.name), ' ', '') LIKE LOWER(?))`;
    queryParams.push(`%${pmProject.replace(/\s+/g, '')}%`);
  }

  query += ` ORDER BY n.id DESC`;

  let rows = [];
  try {
    const [dbRows] = await db.query(query, queryParams);
    rows = dbRows;
  } catch (err) {
    console.error('Notification query failed:', err.message);
  }

  // Safety filter: strip out only notifications created by current user
  const validRows = rows.filter((n) => {
    const sUser = (n.senderUsername || '').trim().toLowerCase();
    if (sUser && sUser === userNameLower) return false;
    return true;
  });

  res.json(validRows);
}));

router.put('/api/notifications/read', asyncHandler(async (req, res) => {
  const { role, username } = req.query;
  if (!role || !username) return res.status(400).json({ error: 'Role and username are required' });
  const inferredRole = inferRole(role);
  const userRoleLower = (role || inferredRole).trim().toLowerCase();

  const [unread] = await db.query(
    `SELECT id FROM notifications 
     WHERE LOWER(target_role) = ? 
        OR LOWER(target_role) = 'all'
        OR (LOWER(?) LIKE '%project manager%' AND LOWER(target_role) LIKE '%project manager%')
        OR ((LOWER(?) LIKE '%dev%' OR LOWER(?) LIKE '%developer%') AND (LOWER(target_role) LIKE '%dev%' OR LOWER(target_role) LIKE '%developer%'))
        OR (LOWER(?) LIKE '%cto%' AND (LOWER(target_role) LIKE '%cto%' OR LOWER(target_role) = 'admin' OR LOWER(target_role) = 'all'))
        OR (LOWER(?) LIKE '%admin%' AND (LOWER(target_role) IN ('admin', 'cto', 'all') OR LOWER(target_role) LIKE '%project manager%'))
        OR ((LOWER(?) LIKE '%design%' OR LOWER(?) LIKE '%digital%') AND (LOWER(target_role) LIKE '%design%' OR LOWER(target_role) LIKE '%digital%'))
        OR (LOWER(?) LIKE '%content%' AND LOWER(target_role) LIKE '%content%')
        OR (LOWER(?) LIKE '%devops%' AND LOWER(target_role) LIKE '%devops%')
        OR ((LOWER(?) LIKE '%test%' OR LOWER(?) LIKE '%qa%') AND (LOWER(target_role) LIKE '%test%' OR LOWER(target_role) LIKE '%qa%'))`,
    [
      userRoleLower,
      userRoleLower,
      userRoleLower, userRoleLower,
      userRoleLower,
      userRoleLower,
      userRoleLower, userRoleLower,
      userRoleLower,
      userRoleLower,
      userRoleLower, userRoleLower
    ]
  );
  for (const row of unread) {
    await markNotificationAsRead(row.id, username);
  }
  res.json({ success: true });
}));

router.put('/api/notifications/:id/read', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username is required' });
  await markNotificationAsRead(id, username);
  res.json({ success: true });
}));

export default router;
