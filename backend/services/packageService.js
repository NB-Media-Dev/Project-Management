import db from '../../db.js';
import { formatSize } from '../utils/helpers.js';

/**
 * Check if a package meets requirement gates for a given phase.
 * Phases: 'design', 'developer'
 */
export async function checkRequirementGate(packageId, phase) {
  const [pkgRows] = await db.query(
    'SELECT content_tl_approved, content_admin_approved, content_uploaded, design_uploaded, design_tl_approved, design_admin_approved FROM packages WHERE id = ?',
    [packageId]
  );
  if (pkgRows.length === 0) {
    return { ok: false, status: 404, error: 'Package not found' };
  }
  const pkg = pkgRows[0];

  if (phase === 'design') {
    const [cFiles] = await db.query(
      'SELECT id FROM content_files WHERE package_id = ? AND file_name IS NOT NULL AND file_name != ""',
      [packageId]
    );
    if (!pkg.content_tl_approved && !pkg.content_admin_approved && !pkg.content_uploaded && cFiles.length === 0) {
      return {
        ok: false,
        status: 400,
        error: 'Requirement Failed: Cannot upload design assets until Content Team uploads/approves requirements.',
      };
    }
  } else if (phase === 'developer') {
    const [dFiles] = await db.query(
      'SELECT id FROM design_files WHERE package_id = ? AND file_name IS NOT NULL AND file_name != ""',
      [packageId]
    );
    if (!pkg.design_uploaded && !pkg.design_tl_approved && !pkg.design_admin_approved && dFiles.length === 0) {
      return {
        ok: false,
        status: 400,
        error: 'Requirement Failed: Cannot upload developer build ZIP until Design Team uploads design assets.',
      };
    }
  }

  return { ok: true, pkg };
}

/**
 * Save developer build record and mark package submitted to devops
 */
export async function saveDeveloperBuildRecord(id, buildName, file, uploader, platform = 'Web') {
  const cleanPlatform = (platform === 'App' || platform === 'Mobile') ? 'App' : 'Web';
  try {
    await db.query(
      `INSERT INTO developer_builds (package_id, name, file_name, file_size, platform, uploaded_by, tl_approval, admin_approval, uploaded_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'Approved', 'Approved', CURRENT_TIMESTAMP)`,
      [id, buildName, file.filename, formatSize(file.size), cleanPlatform, uploader]
    );
  } catch (err) {
    if (err.message?.includes('platform') || err.message?.includes('name')) {
      try {
        await db.query('ALTER TABLE developer_builds ADD COLUMN platform VARCHAR(50) DEFAULT "Web"');
        await db.query('ALTER TABLE developer_builds ADD COLUMN name VARCHAR(150)');
      } catch {}
      await db.query(
        `INSERT INTO developer_builds (package_id, name, file_name, file_size, platform, uploaded_by, tl_approval, admin_approval, uploaded_at) 
         VALUES (?, ?, ?, ?, ?, ?, 'Approved', 'Approved', CURRENT_TIMESTAMP)`,
        [id, buildName, file.filename, formatSize(file.size), cleanPlatform, uploader]
      );
    } else {
      throw err;
    }
  }

  await markPackageSubmittedToDevops(id);
}

/**
 * Mark package submitted to devops in database
 */
export async function markPackageSubmittedToDevops(id) {
  try {
    await db.query(
      `UPDATE packages 
       SET submitted_to_devops = TRUE, dev_admin_approved = TRUE, devops_staging_uploaded = FALSE, devops_tl_approved = FALSE, devops_admin_approved = FALSE, testing_tl_approved = FALSE, final_admin_approved = FALSE 
       WHERE id = ?`,
      [id]
    );
  } catch (err) {
    if (err.message?.includes('submitted_to_devops')) {
      await db.query('ALTER TABLE packages ADD COLUMN submitted_to_devops BOOLEAN DEFAULT FALSE');
      await db.query(
        `UPDATE packages 
         SET submitted_to_devops = TRUE, dev_admin_approved = TRUE, devops_staging_uploaded = FALSE, devops_tl_approved = FALSE, devops_admin_approved = FALSE, testing_tl_approved = FALSE, final_admin_approved = FALSE 
         WHERE id = ?`,
        [id]
      );
    } else {
      throw err;
    }
  }
}

/**
 * Update Figma Link for a package with schema fallback
 */
export async function updateFigmaLink(id, figmaLink) {
  let cleanLink = figmaLink ? figmaLink.trim() : null;
  if (cleanLink && !cleanLink.startsWith('http://') && !cleanLink.startsWith('https://')) {
    cleanLink = 'https://' + cleanLink;
  }
  try {
    await db.query('UPDATE packages SET figma_link = ? WHERE id = ?', [cleanLink, id]);
  } catch (err) {
    if (err.message?.includes('figma_link')) {
      await db.query('ALTER TABLE packages ADD COLUMN figma_link VARCHAR(500) DEFAULT NULL');
      await db.query('UPDATE packages SET figma_link = ? WHERE id = ?', [cleanLink, id]);
    } else {
      throw err;
    }
  }
  return cleanLink;
}

/**
 * Fetch package with project details for approval endpoints
 */
export async function getApprovalPackageDetails(packageId) {
  const [pkgRows] = await db.query(
    'SELECT p.cto_approved, p.testing_tl_approved, pr.name AS project_name FROM packages p LEFT JOIN projects pr ON p.project_id = pr.id WHERE p.id = ?',
    [packageId]
  );
  return pkgRows.length > 0 ? pkgRows[0] : null;
}
