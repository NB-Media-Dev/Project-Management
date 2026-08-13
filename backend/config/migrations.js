import db from '../../db.js';

export async function runMigrations() {
  try {
    await db.query('ALTER TABLE users ADD COLUMN is_team_leader TINYINT(1) DEFAULT 0');
    console.log('Added is_team_leader column to users table');
  } catch (err) {
    console.log('is_team_leader column status:', err.message);
  }
  try {
    await db.query('ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) DEFAULT NULL');
    console.log('Added avatar_url column to users table');
  } catch (err) {
    console.log('avatar_url column status:', err.message);
  }

  const migrations = [
    `CREATE TABLE IF NOT EXISTS design_feedbacks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      package_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      severity VARCHAR(50) DEFAULT 'Medium',
      resolved BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      package_id INT,
      message VARCHAR(255) NOT NULL,
      target_role VARCHAR(100) NOT NULL,
      sender_username VARCHAR(100) DEFAULT NULL,
      sender_role VARCHAR(100) DEFAULT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS notification_reads (
      notification_id INT NOT NULL,
      username VARCHAR(100) NOT NULL,
      PRIMARY KEY (notification_id, username),
      FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
    )`,
    'ALTER TABLE notifications ADD COLUMN sender_username VARCHAR(100) DEFAULT NULL',
    'ALTER TABLE notifications ADD COLUMN sender_role VARCHAR(100) DEFAULT NULL',
    'ALTER TABLE bugs ADD COLUMN file_name VARCHAR(255)',
    'ALTER TABLE bugs ADD COLUMN file_size VARCHAR(50)',
    'ALTER TABLE bugs ADD COLUMN bug_url VARCHAR(500)',
    'ALTER TABLE packages ADD COLUMN due_date DATE DEFAULT NULL',
    'ALTER TABLE packages ADD COLUMN content_tl_approved BOOLEAN DEFAULT FALSE',
    'ALTER TABLE packages ADD COLUMN content_admin_approved BOOLEAN DEFAULT FALSE',
    'ALTER TABLE packages ADD COLUMN design_tl_approved BOOLEAN DEFAULT FALSE',
    'ALTER TABLE packages ADD COLUMN design_admin_approved BOOLEAN DEFAULT FALSE',
    'ALTER TABLE packages ADD COLUMN figma_link VARCHAR(500) DEFAULT NULL',
    'ALTER TABLE packages ADD COLUMN dev_admin_approved BOOLEAN DEFAULT FALSE',
    'ALTER TABLE packages ADD COLUMN devops_staging_uploaded BOOLEAN DEFAULT FALSE',
    'ALTER TABLE packages ADD COLUMN devops_tl_approved BOOLEAN DEFAULT FALSE',
    'ALTER TABLE packages ADD COLUMN devops_tl_approved_by VARCHAR(100)',
    'ALTER TABLE packages ADD COLUMN devops_admin_approved BOOLEAN DEFAULT FALSE',
    'ALTER TABLE packages ADD COLUMN devops_admin_approved_by VARCHAR(100)',
    'ALTER TABLE packages ADD COLUMN testing_tl_approved BOOLEAN DEFAULT FALSE',
    'ALTER TABLE packages ADD COLUMN testing_tl_approved_by VARCHAR(100)',
    'ALTER TABLE packages ADD COLUMN final_admin_approved BOOLEAN DEFAULT FALSE',
    'ALTER TABLE packages ADD COLUMN final_admin_approved_by VARCHAR(100)',
    'ALTER TABLE content_files ADD COLUMN uploaded_by VARCHAR(100)',
    "ALTER TABLE content_files ADD COLUMN tl_approval VARCHAR(50) DEFAULT 'Pending'",
    'ALTER TABLE content_files ADD COLUMN tl_approved_by VARCHAR(100)',
    "ALTER TABLE content_files ADD COLUMN admin_approval VARCHAR(50) DEFAULT 'Pending'",
    'ALTER TABLE content_files ADD COLUMN admin_approved_by VARCHAR(100)',
    'ALTER TABLE design_files ADD COLUMN uploaded_by VARCHAR(100)',
    "ALTER TABLE design_files ADD COLUMN tl_approval VARCHAR(50) DEFAULT 'Pending'",
    'ALTER TABLE design_files ADD COLUMN tl_approved_by VARCHAR(100)',
    "ALTER TABLE design_files ADD COLUMN admin_approval VARCHAR(50) DEFAULT 'Pending'",
    'ALTER TABLE design_files ADD COLUMN admin_approved_by VARCHAR(100)',
    'ALTER TABLE developer_builds ADD COLUMN uploaded_by VARCHAR(100)',
    "ALTER TABLE developer_builds ADD COLUMN tl_approval VARCHAR(50) DEFAULT 'Pending'",
    'ALTER TABLE developer_builds ADD COLUMN tl_approved_by VARCHAR(100)',
    "ALTER TABLE developer_builds ADD COLUMN admin_approval VARCHAR(50) DEFAULT 'Pending'",
    'ALTER TABLE developer_builds ADD COLUMN admin_approved_by VARCHAR(100)',
    'ALTER TABLE developer_builds ADD COLUMN name VARCHAR(150)',
    'ALTER TABLE packages ADD COLUMN submitted_to_devops BOOLEAN DEFAULT FALSE',
    'ALTER TABLE packages ADD COLUMN content_uploaded BOOLEAN DEFAULT FALSE',
    'ALTER TABLE packages ADD COLUMN design_uploaded BOOLEAN DEFAULT FALSE',
    'ALTER TABLE packages ADD COLUMN deployed BOOLEAN DEFAULT FALSE',
    'ALTER TABLE packages ADD COLUMN demo_url VARCHAR(255)',
    'ALTER TABLE packages ADD COLUMN demo_description TEXT',
    'ALTER TABLE packages ADD COLUMN staging_url VARCHAR(255) DEFAULT NULL',
    "ALTER TABLE packages ADD COLUMN created_by_role VARCHAR(100) DEFAULT 'Content Team'",
    'ALTER TABLE bugs ADD COLUMN reported_by VARCHAR(100)',
    'ALTER TABLE packages ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    'ALTER TABLE content_files ADD COLUMN rejection_reason TEXT DEFAULT NULL',
    'ALTER TABLE content_files ADD COLUMN rejected_by VARCHAR(100) DEFAULT NULL',
    'ALTER TABLE design_files ADD COLUMN rejection_reason TEXT DEFAULT NULL',
    'ALTER TABLE design_files ADD COLUMN rejected_by VARCHAR(100) DEFAULT NULL',
    'ALTER TABLE developer_builds ADD COLUMN rejection_reason TEXT DEFAULT NULL',
    'ALTER TABLE developer_builds ADD COLUMN rejected_by VARCHAR(100) DEFAULT NULL',
    'ALTER TABLE packages ADD COLUMN devops_rejection_reason TEXT DEFAULT NULL',
    'ALTER TABLE packages ADD COLUMN testing_rejection_reason TEXT DEFAULT NULL',
    'ALTER TABLE packages ADD COLUMN cto_approved BOOLEAN DEFAULT FALSE',
    'ALTER TABLE packages ADD COLUMN cto_approved_by VARCHAR(100) DEFAULT NULL',
    'ALTER TABLE packages ADD COLUMN final_pm_approved BOOLEAN DEFAULT FALSE',
    'ALTER TABLE packages ADD COLUMN final_pm_approved_by VARCHAR(100) DEFAULT NULL',
    "ALTER TABLE developer_builds ADD COLUMN platform VARCHAR(50) DEFAULT 'Web'",
    'ALTER TABLE notifications ADD COLUMN sender_username VARCHAR(100) DEFAULT NULL',
    'ALTER TABLE notifications ADD COLUMN sender_role VARCHAR(100) DEFAULT NULL'
  ];

  for (const m of migrations) {
    try {
      await db.query(m);
    } catch {}
  }

  // Ensure default fixed projects exist
  const defaultProjects = ['Career Mate', 'Classmate'];
  for (const pName of defaultProjects) {
    try {
      const [rows] = await db.query('SELECT id FROM projects WHERE LOWER(name) = LOWER(?)', [pName]);
      if (rows.length === 0) {
        await db.query('INSERT INTO projects (name) VALUES (?)', [pName]);
      }
    } catch {}
  }
}
