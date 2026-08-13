import crypto from 'node:crypto';
import db from '../../db.js';

export const asyncHandler = (fn) => (req, res) =>
  fn(req, res).catch((err) => res.status(500).json({ error: err.message }));

export function formatSize(bytes) {
  if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}

export function formatDateIso(d) {
  const yr = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
}

export function formatDueDateForDb(dueDate) {
  if (!dueDate) return null;
  if (typeof dueDate !== 'string') return null;
  const trimmed = dueDate.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.includes('T')) {
    const datePart = trimmed.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
  }

  const parts = trimmed.split(/[/.-]/);
  if (parts.length === 3) {
    let [p1, p2, p3] = parts;
    if (p3.length === 4) {
      const day = String(p1).padStart(2, '0');
      const month = String(p2).padStart(2, '0');
      const year = p3;
      return `${year}-${month}-${day}`;
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateIso(parsed);
  }

  return null;
}

export function normalisePkg(pkg) {
  let dueDateStr = '';
  if (pkg.due_date) {
    if (typeof pkg.due_date === 'string') {
      dueDateStr = pkg.due_date.split('T')[0];
    } else if (pkg.due_date instanceof Date) {
      dueDateStr = formatDateIso(pkg.due_date);
    }
  }
  pkg.dueDate = dueDateStr;
  pkg.contentUploaded = pkg.content_uploaded === 1 || pkg.content_uploaded === true;
  pkg.contentTlApproved = pkg.content_tl_approved === 1 || pkg.content_tl_approved === true || pkg.content_admin_approved === 1 || pkg.content_admin_approved === true;
  pkg.contentAdminApproved = pkg.contentTlApproved;
  pkg.designUploaded = pkg.design_uploaded === 1 || pkg.design_uploaded === true;
  pkg.designTlApproved = pkg.design_tl_approved === 1 || pkg.design_tl_approved === true || pkg.design_admin_approved === 1 || pkg.design_admin_approved === true;
  pkg.designAdminApproved = pkg.designTlApproved;
  pkg.figmaLink = pkg.figma_link || '';
  pkg.devAdminApproved = pkg.dev_admin_approved === 1 || pkg.dev_admin_approved === true || pkg.submitted_to_devops === 1 || pkg.submitted_to_devops === true;
  pkg.devopsStagingUploaded = pkg.devops_staging_uploaded === 1 || pkg.devops_staging_uploaded === true;
  pkg.devopsTlApproved = pkg.devops_tl_approved === 1 || pkg.devops_tl_approved === true || pkg.devopsStagingUploaded;
  pkg.devopsTlApprovedBy = pkg.devops_tl_approved_by || '';
  pkg.devopsAdminApproved = pkg.devops_admin_approved === 1 || pkg.devops_admin_approved === true || pkg.devopsStagingUploaded;
  pkg.devopsAdminApprovedBy = pkg.devops_admin_approved_by || '';
  pkg.testingTlApproved = pkg.testing_tl_approved === 1 || pkg.testing_tl_approved === true;
  pkg.testingTlApprovedBy = pkg.testing_tl_approved_by || '';
  pkg.ctoApproved = pkg.cto_approved === 1 || pkg.cto_approved === true;
  pkg.ctoApprovedBy = pkg.cto_approved_by || '';
  pkg.finalPmApproved = pkg.final_pm_approved === 1 || pkg.final_pm_approved === true || pkg.final_admin_approved === 1 || pkg.final_admin_approved === true;
  pkg.finalPmApprovedBy = pkg.final_pm_approved_by || pkg.final_admin_approved_by || '';
  pkg.finalAdminApproved = pkg.finalPmApproved;
  pkg.finalAdminApprovedBy = pkg.finalPmApprovedBy;
  pkg.adminApproved = pkg.finalPmApproved;
  pkg.submittedToDevops = pkg.submitted_to_devops === 1 || pkg.submitted_to_devops === true;
  pkg.deployed = pkg.deployed === 1 || pkg.deployed === true;
  pkg.demoUrl = pkg.demo_url || '';
  pkg.stagingUrl = pkg.staging_url || pkg.demo_url || '';
  pkg.demoDescription = pkg.demo_description || '';
}

export function mapFileRow(f) {
  return {
    ...f,
    fileName: f.fileName || f.file_name || '',
    fileSize: f.fileSize || f.file_size || '',
    uploadedBy: f.uploadedBy || f.uploaded_by || '',
    tlApproval: f.tlApproval || f.tl_approval || 'Pending',
    tlApprovedBy: f.tlApprovedBy || f.tl_approved_by || '',
    adminApproval: f.adminApproval || f.admin_approval || 'Pending',
    adminApprovedBy: f.adminApprovedBy || f.admin_approved_by || '',
    rejectionReason: f.rejectionReason || f.rejection_reason || null,
    rejectedBy: f.rejectedBy || f.rejected_by || null,
  };
}

export async function queryWithFallback(primary, fallback) {
  try {
    const [rows] = await primary();
    return rows;
  } catch {
    const [rows] = await fallback();
    return rows;
  }
}

export function buildHistoryEvent({ prefix, id, role, actionType, title, description, projectName, packageName, status, timestamp, extra = {} }) {
  return { id: `${prefix}-${id}`, role, actionType, title, description, projectName, packageName, status, timestamp, ...extra };
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password, hash) {
  if (!hash.includes(':')) return password === hash;
  const [salt, key] = hash.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey);
}

export function checkPasswordComplexity(password) {
  if (!password) return 'Please enter a password.';
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least 1 uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least 1 lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least 1 number.';
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) return 'Password must contain at least 1 special symbol.';
  return null;
}

export function inferRole(userOrRole) {
  if (!userOrRole) return 'Unknown';
  const str = userOrRole.toLowerCase();
  if (str.includes('careermate') || str.includes('career mate')) return 'Project Manager (Career Mate)';
  if (str.includes('classmate') || str.includes('class mate')) return 'Project Manager (Classmate)';
  if (str.includes('content')) return 'Content Team';
  if (str.includes('design') || str.includes('digital')) return 'Design Team';
  if (str.includes('devops')) return 'Devops Team';
  if (str.includes('dev')) return 'Developer Team';
  if (str.includes('test') || str.includes('qa')) return 'Testing Team';
  if (str.includes('cto')) return 'CTO';
  if (str.includes('admin')) return 'Admin';
  return userOrRole;
}

export function getPMProjectForRole(role) {
  if (!role) return null;
  const rLower = role.toLowerCase();
  if (rLower.includes('careermate') || rLower.includes('career mate')) return 'Career Mate';
  if (rLower.includes('classmate') || rLower.includes('class mate')) return 'Classmate';
  return null;
}

export async function createNotification(packageId, message, targetRoles, senderUsername = null, senderRole = null) {
  try {
    const finalSenderRole = senderRole || inferRole(senderUsername);
    const finalSenderUser = senderUsername || finalSenderRole;

    const [rows] = await db.query('SELECT name FROM packages WHERE id = ?', [packageId]);
    const packageName = rows.length > 0 ? rows[0].name : 'Unknown';
    const formattedMessage = message.replace('{package}', packageName);

    for (const role of targetRoles) {
      try {
        await db.query(
          'INSERT INTO notifications (package_id, message, target_role, sender_username, sender_role) VALUES (?, ?, ?, ?, ?)',
          [packageId, formattedMessage, role, finalSenderUser, finalSenderRole]
        );
      } catch {
        await db.query(
          'INSERT INTO notifications (package_id, message, target_role) VALUES (?, ?, ?)',
          [packageId, formattedMessage, role]
        );
      }
    }
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

export async function checkDevopsStagingReady(packageId, actionPrefix) {
  const [pkgRows] = await db.query('SELECT submitted_to_devops, devops_staging_uploaded, staging_url, demo_url FROM packages WHERE id = ?', [packageId]);
  const [buildRows] = await db.query('SELECT id FROM developer_builds WHERE package_id = ? AND file_name IS NOT NULL AND file_name != ""', [packageId]);
  
  if (pkgRows.length > 0) {
    const p = pkgRows[0];
    const devopsReceivedZip = (p.submitted_to_devops === 1 || p.submitted_to_devops === true) || buildRows.length > 0;
    if (!devopsReceivedZip) {
      return `${actionPrefix}: DevOps team has not received the build .zip file from the Developer team.`;
    }
    const hasStaging = p.devops_staging_uploaded === 1 || Boolean(p.staging_url) || Boolean(p.demo_url);
    if (!hasStaging) {
      return `${actionPrefix}: DevOps team has not submitted the staging deployment link.`;
    }
  }
  return null;
}

export async function approveBuildFile(fileId, packageId, uploader) {
  await db.query(
    `UPDATE developer_builds SET tl_approval = 'Approved', tl_approved_by = ?, admin_approval = 'Approved', admin_approved_by = ? WHERE id = ? AND package_id = ?`,
    [uploader, uploader, fileId, packageId]
  );
  await db.query('UPDATE packages SET submitted_to_devops = TRUE, dev_admin_approved = TRUE WHERE id = ?', [packageId]);
}

export async function markNotificationAsRead(notificationId, username) {
  await db.query(
    'INSERT IGNORE INTO notification_reads (notification_id, username) VALUES (?, ?)',
    [notificationId, username]
  );
}

export async function notifyIncompleteTeams(packageId, dueDateStr) {
  if (!dueDateStr) return;
  try {
    const [rows] = await db.query(
      `SELECT name, content_tl_approved, design_tl_approved, submitted_to_devops, devops_staging_uploaded, testing_tl_approved, final_admin_approved, deployed FROM packages WHERE id = ?`,
      [packageId]
    );
    if (rows.length === 0) return;
    const pkg = rows[0];
    const incompleteRoles = [];

    if (!pkg.design_tl_approved) incompleteRoles.push('Design Team');
    if (!pkg.submitted_to_devops) incompleteRoles.push('Developer Team');
    if (!pkg.devops_staging_uploaded) incompleteRoles.push('Devops Team');
    if (!pkg.testing_tl_approved) incompleteRoles.push('Testing Team');
    if (!pkg.final_admin_approved || !pkg.deployed) incompleteRoles.push('Admin');

    if (incompleteRoles.length > 0) {
      await createNotification(
        packageId,
        `Content Team fixed Due Date to ${dueDateStr} for package {package}. Please complete your pending tasks by the due date!`,
        incompleteRoles
      );
    }
  } catch (err) {
    console.error('Failed to notify incomplete teams:', err.message);
  }
}
