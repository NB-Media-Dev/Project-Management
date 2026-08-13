import pool from './db.js';
import fs from 'node:fs';
import path from 'node:path';

async function cleanDatabase() {
  console.log('Cleaning database data while preserving user accounts...');
  try {
    const connection = await pool.getConnection();
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    const tablesToClean = [
      'bugs',
      'developer_builds',
      'design_files',
      'content_files',
      'design_feedbacks',
      'notification_reads',
      'notifications',
      'packages'
    ];

    for (const table of tablesToClean) {
      try {
        await connection.query(`TRUNCATE TABLE ${table}`);
        console.log(`Cleaned table: ${table}`);
      } catch (err) {
        console.log(`Table ${table} cleanup note: ${err.message}`);
      }
    }

    try {
      await connection.query("DELETE FROM projects WHERE LOWER(name) NOT IN ('career mate', 'careermate', 'classmate', 'class mate')");
      await connection.query("INSERT IGNORE INTO projects (name) VALUES ('Career Mate'), ('Classmate')");
      await connection.query("DELETE FROM users WHERE LOWER(username) NOT IN ('admin', 'cto', 'pm_careermate', 'pm_classmate')");
      console.log('Purged all non-admin users from database.');
    } catch (err) {
      console.log('Cleanup note:', err.message);
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    connection.release();
    console.log('Database cleaned successfully. Only admin user, Career Mate, and Classmate preserved.');
  } catch (err) {
    console.error('Database connection error during cleanup:', err.message);
  }

  
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      let count = 0;
      for (const file of files) {
        if (file !== '.gitkeep' && file !== 'avatars') {
          const filePath = path.join(uploadsDir, file);
          fs.rmSync(filePath, { recursive: true, force: true });
          count++;
        }
      }
      console.log(`Cleaned ${count} file(s)/folder(s) from uploads directory.`);
    }
  } catch (err) {
    console.error('Error cleaning uploads folder:', err.message);
  }

  process.exit(0);
}

await cleanDatabase();
