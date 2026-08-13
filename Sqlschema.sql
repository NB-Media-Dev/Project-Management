CREATE DATABASE IF NOT EXISTS pm_database;
USE pm_database;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS bugs;
DROP TABLE IF EXISTS developer_builds;
DROP TABLE IF EXISTS design_files;
DROP TABLE IF EXISTS content_files;
DROP TABLE IF EXISTS packages;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL
);

CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    due_date DATE DEFAULT NULL,
    content_tl_approved BOOLEAN DEFAULT FALSE,
    content_admin_approved BOOLEAN DEFAULT FALSE,
    design_uploaded BOOLEAN DEFAULT FALSE,
    design_tl_approved BOOLEAN DEFAULT FALSE,
    design_admin_approved BOOLEAN DEFAULT FALSE,
    figma_link VARCHAR(500) DEFAULT NULL,
    dev_admin_approved BOOLEAN DEFAULT FALSE,
    devops_staging_uploaded BOOLEAN DEFAULT FALSE,
    devops_tl_approved BOOLEAN DEFAULT FALSE,
    devops_tl_approved_by VARCHAR(100),
    devops_admin_approved BOOLEAN DEFAULT FALSE,
    devops_admin_approved_by VARCHAR(100),
    devops_rejection_reason TEXT DEFAULT NULL,
    testing_tl_approved BOOLEAN DEFAULT FALSE,
    testing_tl_approved_by VARCHAR(100),
    testing_rejection_reason TEXT DEFAULT NULL,
    cto_approved BOOLEAN DEFAULT FALSE,
    cto_approved_by VARCHAR(100) DEFAULT NULL,
    final_pm_approved BOOLEAN DEFAULT FALSE,
    final_pm_approved_by VARCHAR(100) DEFAULT NULL,
    final_admin_approved BOOLEAN DEFAULT FALSE,
    final_admin_approved_by VARCHAR(100),
    submitted_to_devops BOOLEAN DEFAULT FALSE,
    deployed BOOLEAN DEFAULT FALSE,
    demo_url VARCHAR(255),
    demo_description TEXT,
    created_by_role VARCHAR(100) DEFAULT 'Content Team',
    created_by VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE content_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    package_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    file_name VARCHAR(255),
    file_size VARCHAR(50),
    uploaded_by VARCHAR(100),
    tl_approval VARCHAR(50) DEFAULT 'Pending',
    tl_approved_by VARCHAR(100),
    admin_approval VARCHAR(50) DEFAULT 'Pending',
    admin_approved_by VARCHAR(100),
    rejection_reason TEXT DEFAULT NULL,
    rejected_by VARCHAR(100) DEFAULT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
);

CREATE TABLE design_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    package_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    file_name VARCHAR(255),
    file_size VARCHAR(50),
    platform VARCHAR(50) NOT NULL,
    uploaded_by VARCHAR(100),
    tl_approval VARCHAR(50) DEFAULT 'Pending',
    tl_approved_by VARCHAR(100),
    admin_approval VARCHAR(50) DEFAULT 'Pending',
    admin_approved_by VARCHAR(100),
    rejection_reason TEXT DEFAULT NULL,
    rejected_by VARCHAR(100) DEFAULT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
);

CREATE TABLE developer_builds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    package_id INT NOT NULL,
    name VARCHAR(150),
    file_name VARCHAR(255) NOT NULL,
    file_size VARCHAR(50) NOT NULL,
    uploaded_by VARCHAR(100),
    tl_approval VARCHAR(50) DEFAULT 'Pending',
    tl_approved_by VARCHAR(100),
    admin_approval VARCHAR(50) DEFAULT 'Pending',
    admin_approved_by VARCHAR(100),
    rejection_reason TEXT DEFAULT NULL,
    rejected_by VARCHAR(100) DEFAULT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
);

CREATE TABLE bugs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    package_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(50) NOT NULL,
    bug_url VARCHAR(500),
    reported_by VARCHAR(100),
    resolved BOOLEAN DEFAULT FALSE,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
);

CREATE TABLE design_feedbacks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    package_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(50) DEFAULT 'Medium',
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    package_id INT,
    message VARCHAR(255) NOT NULL,
    target_role VARCHAR(100) NOT NULL,
    sender_username VARCHAR(100) DEFAULT NULL,
    sender_role VARCHAR(100) DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
);

CREATE TABLE notification_reads (
    notification_id INT NOT NULL,
    username VARCHAR(100) NOT NULL,
    PRIMARY KEY (notification_id, username),
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
);


INSERT INTO users (username, password, role) VALUES
('content', 'password', 'Content Team'),
('content_member', 'password', 'Content Team'),
('digital', 'password', 'Design Team'),
('design_member', 'password', 'Design Team'),
('developer', 'password', 'Developer Team'),
('developer_member', 'password', 'Developer Team'),
('devops', 'password', 'Devops Team'),
('testing', 'password', 'Testing Team'),
('cto', 'password', 'CTO'),
('admin', 'password', 'Admin');

INSERT INTO projects (name) VALUES
('Careermate'),
('Classmate');
