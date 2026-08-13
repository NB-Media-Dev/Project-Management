import express from 'express';
import db from '../../db.js';
import { asyncHandler, buildHistoryEvent } from '../utils/helpers.js';

const router = express.Router();

function formatContentHistoryDescription(row) {
  if (row.uploaded_by) return `Uploaded by ${row.uploaded_by}`;
  const docName = row.file_name ? row.file_name.substring(row.file_name.indexOf('-') + 1) : row.name;
  return `Uploaded copy document '${docName}'`;
}

function formatDevHistoryDescription(row) {
  if (row.uploaded_by) return `Uploaded by ${row.uploaded_by}`;
  const fileName = row.file_name ? row.file_name.substring(row.file_name.indexOf('-') + 1) : 'archive.zip';
  return `Uploaded build file '${fileName}'`;
}

async function fetchContentHistoryEvents() {
  let contentRows = [];
  try {
    const [rows] = await db.query(`
      SELECT cf.id, cf.name, cf.file_name, cf.file_size, cf.uploaded_by, cf.uploaded_at AS timestamp,
             p.name AS package_name, pr.name AS project_name
      FROM content_files cf
      JOIN packages p ON cf.package_id = p.id
      JOIN projects pr ON p.project_id = pr.id
      WHERE cf.file_name IS NOT NULL AND cf.file_name != ''
    `);
    contentRows = rows;
  } catch {
    const [rows] = await db.query(`
      SELECT cf.id, cf.name, cf.file_name, cf.file_size, cf.uploaded_at AS timestamp,
             p.name AS package_name, pr.name AS project_name
      FROM content_files cf
      JOIN packages p ON cf.package_id = p.id
      JOIN projects pr ON p.project_id = pr.id
      WHERE cf.file_name IS NOT NULL AND cf.file_name != ''
    `);
    contentRows = rows;
  }
  return contentRows.map((row) => buildHistoryEvent({
    prefix: 'content', id: row.id,
    role: 'Content Team', actionType: 'Content File Upload',
    title: `Uploaded Content: ${row.name}`,
    description: formatContentHistoryDescription(row),
    projectName: row.project_name, packageName: row.package_name,
    status: 'Completed', timestamp: row.timestamp,
    extra: { fileName: row.file_name, fileSize: row.file_size, uploadedBy: row.uploaded_by || null },
  }));
}

async function fetchDesignHistoryEvents() {
  let designRows = [];
  try {
    const [rows] = await db.query(`
      SELECT df.id, df.name, df.file_name, df.file_size, df.platform, df.uploaded_by, df.uploaded_at AS timestamp,
             p.name AS package_name, pr.name AS project_name
      FROM design_files df
      JOIN packages p ON df.package_id = p.id
      JOIN projects pr ON p.project_id = pr.id
      WHERE df.file_name IS NOT NULL AND df.file_name != ''
    `);
    designRows = rows;
  } catch {
    const [rows] = await db.query(`
      SELECT df.id, df.name, df.file_name, df.file_size, df.platform, df.uploaded_at AS timestamp,
             p.name AS package_name, pr.name AS project_name
      FROM design_files df
      JOIN packages p ON df.package_id = p.id
      JOIN projects pr ON p.project_id = pr.id
      WHERE df.file_name IS NOT NULL AND df.file_name != ''
    `);
    designRows = rows;
  }
  return designRows.map((row) => buildHistoryEvent({
    prefix: 'design', id: row.id,
    role: 'Design Team', actionType: 'Screen Design Upload',
    title: `Uploaded ${row.platform} Design: ${row.name}`,
    description: row.uploaded_by ? `Uploaded by ${row.uploaded_by} for ${row.platform}` : `Uploaded mockup picture for ${row.platform} platform`,
    projectName: row.project_name, packageName: row.package_name,
    status: 'Completed', timestamp: row.timestamp,
    extra: { fileName: row.file_name, fileSize: row.file_size, uploadedBy: row.uploaded_by || null },
  }));
}

async function fetchDevHistoryEvents() {
  let devRows = [];
  try {
    const [rows] = await db.query(`
      SELECT db.id, db.name, db.file_name, db.file_size, db.uploaded_by, db.uploaded_at AS timestamp,
             p.name AS package_name, pr.name AS project_name, p.submitted_to_devops
      FROM developer_builds db
      JOIN packages p ON db.package_id = p.id
      JOIN projects pr ON p.project_id = pr.id
      WHERE db.file_name IS NOT NULL AND db.file_name != ''
    `);
    devRows = rows;
  } catch {
    const [rows] = await db.query(`
      SELECT db.id, db.name, db.file_name, db.file_size, db.uploaded_at AS timestamp,
             p.name AS package_name, pr.name AS project_name, p.submitted_to_devops
      FROM developer_builds db
      JOIN packages p ON db.package_id = p.id
      JOIN projects pr ON p.project_id = pr.id
      WHERE db.file_name IS NOT NULL AND db.file_name != ''
    `);
    devRows = rows;
  }
  return devRows.map((row) => buildHistoryEvent({
    prefix: 'dev', id: row.id,
    role: 'Developer Team', actionType: 'Build Zip Upload',
    title: `Uploaded Code Build: ${row.name || 'Work Build File'}`,
    description: formatDevHistoryDescription(row),
    projectName: row.project_name, packageName: row.package_name,
    status: row.submitted_to_devops ? 'Sent to Server' : 'Completed', timestamp: row.timestamp,
    extra: { fileName: row.file_name, fileSize: row.file_size, uploadedBy: row.uploaded_by || null },
  }));
}

async function fetchDevopsHistoryEvents() {
  let devopsRows = [];
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.name AS package_name, pr.name AS project_name,
             p.demo_url, p.staging_url, p.demo_description, p.devops_staging_uploaded, p.deployed,
             COALESCE(p.updated_at, p.created_at) AS timestamp
      FROM packages p
      JOIN projects pr ON p.project_id = pr.id
      WHERE p.deployed = 1 OR p.devops_staging_uploaded = 1 OR p.staging_url IS NOT NULL OR p.demo_url IS NOT NULL
    `);
    devopsRows = rows;
  } catch {
    const [rows] = await db.query(`
      SELECT p.id, p.name AS package_name, pr.name AS project_name,
             p.demo_url, p.demo_description, p.created_at AS timestamp
      FROM packages p
      JOIN projects pr ON p.project_id = pr.id
      WHERE p.deployed = 1
    `);
    devopsRows = rows;
  }
  return devopsRows.map((row) => {
    const isLive = row.deployed === 1;
    const targetUrl = isLive ? (row.demo_url || row.staging_url) : (row.staging_url || row.demo_url);
    return buildHistoryEvent({
      prefix: `devops-${isLive ? 'live' : 'staging'}`, id: row.id,
      role: 'Devops Team',
      actionType: isLive ? 'Live Deployment' : 'Staging Deployment',
      title: isLive ? `Published Live Link for ${row.package_name}` : `Submitted Staging Link for ${row.package_name}`,
      description: row.demo_description || `${isLive ? 'Published live URL' : 'Staging URL'}: ${targetUrl}`,
      projectName: row.project_name, packageName: row.package_name,
      status: isLive ? 'Live Published' : 'Completed', timestamp: row.timestamp,
      extra: { demoUrl: targetUrl },
    });
  });
}

async function fetchBugHistoryEvents() {
  let bugRows = [];
  try {
    const [rows] = await db.query(`
      SELECT b.id, b.title, b.description, b.severity, b.resolved, b.reported_by,
             b.reported_at AS timestamp, b.file_name, b.file_size, b.bug_url,
             p.name AS package_name, pr.name AS project_name
      FROM bugs b
      JOIN packages p ON b.package_id = p.id
      JOIN projects pr ON p.project_id = pr.id
    `);
    bugRows = rows;
  } catch {
    const [rows] = await db.query(`
      SELECT b.id, b.title, b.description, b.severity, b.resolved,
             b.reported_at AS timestamp,
             p.name AS package_name, pr.name AS project_name
      FROM bugs b
      JOIN packages p ON b.package_id = p.id
      JOIN projects pr ON p.project_id = pr.id
    `);
    bugRows = rows;
  }
  return bugRows.map((row) => buildHistoryEvent({
    prefix: 'bug', id: row.id,
    role: 'Testing Team', actionType: 'Test Bug Report',
    title: `Reported Issue: ${row.title}`,
    description: row.reported_by ? `${row.description || ''} (Reported by ${row.reported_by})` : (row.description || 'Bug reported during testing'),
    projectName: row.project_name, packageName: row.package_name,
    status: row.resolved ? 'Fixed' : `${row.severity} Priority Open`, timestamp: row.timestamp,
    extra: { fileName: row.file_name || null, fileSize: row.file_size || null, bugUrl: row.bug_url || null, reportedBy: row.reported_by || null },
  }));
}

router.get('/api/history', asyncHandler(async (req, res) => {
  const { role, project } = req.query;
  let events = [];

  try {
    const [cEvents, dEvents, devEvents, devopsEvents, bugEvents] = await Promise.all([
      fetchContentHistoryEvents(),
      fetchDesignHistoryEvents(),
      fetchDevHistoryEvents(),
      fetchDevopsHistoryEvents(),
      fetchBugHistoryEvents()
    ]);
    events = [...cEvents, ...dEvents, ...devEvents, ...devopsEvents, ...bugEvents];
  } catch (err) {
    console.error('History query error:', err.message);
  }

  try {
    let pkgRows = [];
    try {
      const [rows] = await db.query(`
        SELECT p.id, p.name AS package_name, pr.name AS project_name, p.created_at AS timestamp,
               COALESCE(p.created_by_role, 'Content Team') AS created_by_role, p.created_by,
               p.final_admin_approved, p.final_admin_approved_by, COALESCE(p.updated_at, p.created_at) AS updated_timestamp
        FROM packages p
        JOIN projects pr ON p.project_id = pr.id
      `);
      pkgRows = rows;
    } catch {
      const [rows] = await db.query(`
        SELECT p.id, p.name AS package_name, pr.name AS project_name, p.created_at AS timestamp
        FROM packages p
        JOIN projects pr ON p.project_id = pr.id
      `);
      pkgRows = rows;
    }
    pkgRows.forEach((row) => {
      events.push(buildHistoryEvent({
        prefix: 'pkg-created', id: row.id,
        role: row.created_by_role || 'Content Team',
        actionType: 'Task Created',
        title: `Created Task: ${row.package_name}`,
        description: row.created_by ? `Initialized by ${row.created_by} under ${row.project_name}` : `Initialized project module under ${row.project_name}`,
        projectName: row.project_name, packageName: row.package_name,
        status: 'Active', timestamp: row.timestamp,
      }));

      if (row.final_admin_approved) {
        events.push(buildHistoryEvent({
          prefix: 'admin-final', id: row.id,
          role: 'Admin',
          actionType: 'Final Release Approval',
          title: `Final Admin Approval: ${row.package_name}`,
          description: `Final approval given for production release by ${row.final_admin_approved_by || 'Admin'}`,
          projectName: row.project_name, packageName: row.package_name,
          status: 'Completed', timestamp: row.updated_timestamp || row.timestamp,
        }));
      }
    });
  } catch (err) {
    console.error('Package history query error:', err.message);
  }

  if (role && role !== 'All Roles' && role !== 'All') {
    events = events.filter((e) => e.role.toLowerCase() === role.toLowerCase());
  }
  if (project && project !== 'All Projects' && project !== 'All') {
    events = events.filter((e) => e.projectName && e.projectName.toLowerCase() === project.toLowerCase());
  }
  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(events);
}));

export default router;
