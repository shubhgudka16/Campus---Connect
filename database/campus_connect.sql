-- ==========================================================================
-- Campus Connect - Automated Multi-Role Resolution Portal
-- Complete Database Schema & Initial Data Seeding
-- Database Name: campus_connect
-- ==========================================================================

CREATE DATABASE IF NOT EXISTS `campus_connect` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `campus_connect`;

-- Disable Foreign Key checks for clean rebuild
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------------------------
-- 1. Table: departments
-- --------------------------------------------------------------------------
DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `departments` (`id`, `name`, `code`) VALUES
(1, 'Computer Department', 'CS'),
(2, 'Electrical Department', 'EE'),
(3, 'Mechanical Department', 'ME'),
(4, 'Civil Department', 'CE');

-- --------------------------------------------------------------------------
-- 2. Table: users (Unified multi-role identity table)
-- --------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `identifier` VARCHAR(100) NOT NULL UNIQUE COMMENT 'GR No for students, Tech ID for tech, Dept name for faculty, admin for admin',
  `name` VARCHAR(150) NOT NULL,
  `role` ENUM('student', 'faculty', 'technician', 'admin') NOT NULL,
  `department` VARCHAR(100) NULL,
  `password` VARCHAR(255) NOT NULL,
  `avatar` VARCHAR(500) NULL,
  `experience` INT DEFAULT 0 COMMENT 'Years of experience for technicians',
  `rating` DECIMAL(3,1) DEFAULT 5.0 COMMENT 'Rating for technicians',
  `is_active` TINYINT(1) DEFAULT 1,
  `is_warned` TINYINT(1) DEFAULT 0 COMMENT 'Warning status for students',
  `is_suspended` TINYINT(1) DEFAULT 0 COMMENT 'Suspension status for students',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_role` (`role`),
  INDEX `idx_identifier` (`identifier`),
  INDEX `idx_dept` (`department`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default Seed Users (Password: 'password' for users/faculty/tech, 'admin123' for admin)
INSERT INTO `users` (`identifier`, `name`, `role`, `department`, `password`, `avatar`, `experience`, `rating`, `is_active`, `is_warned`, `is_suspended`) VALUES
-- Students
('1001', 'Kabir Mehta', 'student', 'Computer Department', '$2y$10$17EgHI0jDOOAd6jKS6kk0./aUaHkUIOl5pPGR7IYaaoH2nNO7yNeW', NULL, 0, 5.0, 1, 0, 0),
('1002', 'Ananya Iyer', 'student', 'Electrical Department', '$2y$10$17EgHI0jDOOAd6jKS6kk0./aUaHkUIOl5pPGR7IYaaoH2nNO7yNeW', NULL, 0, 5.0, 1, 0, 0),
('1003', 'Rohan Verma', 'student', 'Mechanical Department', '$2y$10$17EgHI0jDOOAd6jKS6kk0./aUaHkUIOl5pPGR7IYaaoH2nNO7yNeW', NULL, 0, 5.0, 1, 0, 0),
('1004', 'Priya Sharma', 'student', 'Civil Department', '$2y$10$17EgHI0jDOOAd6jKS6kk0./aUaHkUIOl5pPGR7IYaaoH2nNO7yNeW', NULL, 0, 5.0, 1, 0, 0),
-- Faculty
('Computer Department', 'Computer Faculty Advisor', 'faculty', 'Computer Department', '$2y$10$17EgHI0jDOOAd6jKS6kk0./aUaHkUIOl5pPGR7IYaaoH2nNO7yNeW', NULL, 0, 5.0, 1, 0, 0),
('Electrical Department', 'Electrical Faculty Advisor', 'faculty', 'Electrical Department', '$2y$10$17EgHI0jDOOAd6jKS6kk0./aUaHkUIOl5pPGR7IYaaoH2nNO7yNeW', NULL, 0, 5.0, 1, 0, 0),
('Mechanical Department', 'Mechanical Faculty Advisor', 'faculty', 'Mechanical Department', '$2y$10$17EgHI0jDOOAd6jKS6kk0./aUaHkUIOl5pPGR7IYaaoH2nNO7yNeW', NULL, 0, 5.0, 1, 0, 0),
('Civil Department', 'Civil Faculty Advisor', 'faculty', 'Civil Department', '$2y$10$17EgHI0jDOOAd6jKS6kk0./aUaHkUIOl5pPGR7IYaaoH2nNO7yNeW', NULL, 0, 5.0, 1, 0, 0),
-- Technicians
('TECH-01', 'Dilip Prasad', 'technician', 'Electrical Department', '$2y$10$17EgHI0jDOOAd6jKS6kk0./aUaHkUIOl5pPGR7IYaaoH2nNO7yNeW', NULL, 5, 4.8, 1, 0, 0),
('TECH-02', 'Jagdish Panchal', 'technician', 'Mechanical Department', '$2y$10$17EgHI0jDOOAd6jKS6kk0./aUaHkUIOl5pPGR7IYaaoH2nNO7yNeW', NULL, 8, 4.7, 1, 0, 0),
('TECH-03', 'Ankit Sharma', 'technician', 'Computer Department', '$2y$10$17EgHI0jDOOAd6jKS6kk0./aUaHkUIOl5pPGR7IYaaoH2nNO7yNeW', NULL, 3, 4.9, 1, 0, 0),
('TECH-04', 'Madan Lal', 'technician', 'Civil Department', '$2y$10$17EgHI0jDOOAd6jKS6kk0./aUaHkUIOl5pPGR7IYaaoH2nNO7yNeW', NULL, 12, 4.5, 1, 0, 0),
-- Admin
('admin', 'Principal Office Workspace', 'admin', 'Executive Dean Office', '$2y$10$Iki.EgbJ842fas1qU3hUaOtWfQec3cgx1z7etItg9ypkThEc32uv6', NULL, 0, 5.0, 1, 0, 0);

-- --------------------------------------------------------------------------
-- 3. Table: complaints
-- --------------------------------------------------------------------------
DROP TABLE IF EXISTS `complaints`;
CREATE TABLE `complaints` (
  `id` VARCHAR(32) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `description` TEXT NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  `priority` ENUM('Low', 'Medium', 'High') DEFAULT 'Low',
  `reported_by` VARCHAR(150) NOT NULL,
  `reported_by_gr` VARCHAR(50) NOT NULL,
  `reported_at` VARCHAR(50) NOT NULL,
  `status` VARCHAR(100) NOT NULL DEFAULT 'Complaint Submitted',
  `stage` INT NOT NULL DEFAULT 1,
  `admin_status` VARCHAR(50) DEFAULT 'Pending',
  `admin_verification_date` VARCHAR(50) NULL,
  `admin_final_date` VARCHAR(50) NULL,
  `faculty_status` VARCHAR(50) DEFAULT 'Pending',
  `faculty_verification_date` VARCHAR(50) NULL,
  `technician_status` VARCHAR(50) DEFAULT 'Pending',
  `technician_action` VARCHAR(50) NULL,
  `work_status` VARCHAR(50) DEFAULT 'Not Started',
  `technician_completion_date` VARCHAR(50) NULL,
  `tech_id` VARCHAR(50) NULL,
  `tech_name` VARCHAR(150) NULL,
  `deadline` VARCHAR(50) NULL,
  `rejection_reason` TEXT NULL,
  `last_rejected_tech` VARCHAR(150) NULL,
  `image` VARCHAR(500) NULL,
  `video` VARCHAR(500) NULL,
  `proof_img` VARCHAR(500) NULL,
  `remark` TEXT NULL,
  `qa_verified` TINYINT(1) DEFAULT 0,
  `qa_feedback` TEXT NULL,
  `feedback` VARCHAR(50) NULL,
  `feedback_status` VARCHAR(50) NULL,
  `feedback_comment` TEXT NULL,
  `feedback_time` VARCHAR(50) NULL,
  `notified_15_day` TINYINT(1) DEFAULT 0,
  `notified_30_day` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_reported_gr` (`reported_by_gr`),
  INDEX `idx_category` (`category`),
  INDEX `idx_tech_id` (`tech_id`),
  INDEX `idx_stage` (`stage`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Complaints
INSERT INTO `complaints` (
  `id`, `title`, `category`, `description`, `location`, `priority`,
  `reported_by`, `reported_by_gr`, `reported_at`, `status`, `stage`,
  `admin_status`, `admin_verification_date`, `admin_final_date`,
  `faculty_status`, `faculty_verification_date`,
  `technician_status`, `technician_action`, `work_status`, `technician_completion_date`,
  `tech_id`, `tech_name`, `deadline`, `rejection_reason`, `last_rejected_tech`,
  `image`, `video`, `proof_img`, `remark`, `qa_verified`, `qa_feedback`,
  `feedback`, `feedback_status`, `feedback_comment`, `feedback_time`,
  `notified_15_day`, `notified_30_day`
) VALUES
(
  'COMP-201',
  'Danger: Open wire sparking in Corridor',
  'Electrical Department',
  'Naked copper wires are hanging loose from class 201 circuit board. Sparks visible when turning fan on.',
  'Engineering Block A',
  'High',
  'Kabir Mehta',
  '1001',
  '16/07/2026 09:30 AM',
  'Assigned to Faculty',
  2,
  'Approved',
  '16/07/2026 10:15 AM',
  NULL,
  'Pending',
  NULL,
  'Pending',
  NULL,
  'Not Started',
  NULL,
  NULL,
  NULL,
  '',
  '',
  NULL,
  'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?q=80&w=600',
  '',
  '',
  '',
  0,
  '',
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  0
),
(
  'COMP-202',
  'Tubelight not working & Classroom Fan off',
  'Electrical Department',
  'Back row tubelight completely dark, fan makes buzzing noise.',
  'Science Library Room 2',
  'Medium',
  'Ananya Iyer',
  '1002',
  '15/07/2026 02:15 PM',
  'Completed',
  7,
  'Approved',
  '15/07/2026 02:30 PM',
  '16/07/2026 11:45 AM',
  'Verified',
  '16/07/2026 11:30 AM',
  'Completed',
  'Accepted',
  'Completed',
  '16/07/2026 10:00 AM',
  'TECH-01',
  'Dilip Prasad',
  '17/07/2026',
  '',
  NULL,
  'https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?q=80&w=600',
  '',
  'https://images.unsplash.com/photo-1517254485319-68a189ddc2f1?q=80&w=600',
  'Replaced bulb and starter elements.',
  1,
  'Inspected classrooms, verified perfectly operational.',
  'Satisfied',
  'Satisfied',
  'Very prompt repair work by Dilip.',
  '16/07/2026 12:00 PM',
  0,
  0
),
(
  'COMP-203',
  'Lab 4 Server Rack Switch Network Failure',
  'Computer Department',
  'Main rack switch in CS Lab 4 stopped responding. Network dropped for 40 student PCs during practical exam.',
  'CS Block Lab 4',
  'High',
  'Kabir Mehta',
  '1001',
  '16/07/2026 11:00 AM',
  'Work in Progress',
  4,
  'Approved',
  '16/07/2026 11:10 AM',
  NULL,
  'Pending',
  NULL,
  'Accepted',
  'Accepted',
  'In Progress',
  NULL,
  'TECH-03',
  'Ankit Sharma',
  '17/07/2026',
  '',
  NULL,
  'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=600',
  '',
  '',
  '',
  0,
  '',
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  0
),
(
  'COMP-204',
  'Smartboard & Projector Signal Flickering',
  'Computer Department',
  'HDMI output on smartboard flickering and cutting video signal every 2 minutes during lectures.',
  'CS Seminar Hall B',
  'Medium',
  'Kabir Mehta',
  '1001',
  '16/07/2026 01:20 PM',
  'Work Completed by Technician',
  5,
  'Approved',
  '16/07/2026 01:30 PM',
  NULL,
  'Pending',
  NULL,
  'Completed',
  'Accepted',
  'Completed',
  '16/07/2026 03:00 PM',
  'TECH-03',
  'Ankit Sharma',
  '18/07/2026',
  '',
  NULL,
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=600',
  '',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=600',
  'Replaced faulty HDMI cable & re-calibrated projector output.',
  0,
  '',
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  0
),
(
  'COMP-205',
  'Workshop Lathe Machine Emergency Stop Stuck',
  'Mechanical Department',
  'Emergency cut-off switch on Lathe Unit 3 is jammed depressed. Machine unable to power on safely.',
  'Central Mechanical Workshop',
  'High',
  'Rohan Verma',
  '1003',
  '16/07/2026 10:00 AM',
  'Faculty Verified',
  6,
  'Approved',
  '16/07/2026 10:20 AM',
  NULL,
  'Verified',
  '16/07/2026 02:30 PM',
  'Completed',
  'Accepted',
  'Completed',
  '16/07/2026 01:45 PM',
  'TECH-02',
  'Jagdish Panchal',
  '18/07/2026',
  '',
  NULL,
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=600',
  '',
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=600',
  'Repaired emergency spring return mechanism and cleaned internal contacts.',
  1,
  'Audited lathe machine operation. Safety stop triggers instantly. Forwarded to Admin for final closure.',
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  0
),
(
  'COMP-208',
  'Damaged Paver Blocks near Dept Quadrangle',
  'Civil Department',
  'Sunken and loose paver blocks causing tripping hazard at the main department entrance pathway.',
  'Civil Department Entrance',
  'Medium',
  'Priya Sharma',
  '1004',
  '16/07/2026 02:00 PM',
  'Complaint Submitted',
  1,
  'Pending',
  NULL,
  NULL,
  'Pending',
  NULL,
  'Pending',
  NULL,
  'Not Started',
  NULL,
  NULL,
  NULL,
  '',
  '',
  NULL,
  'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?q=80&w=600',
  '',
  '',
  '',
  0,
  '',
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  0
);

-- --------------------------------------------------------------------------
-- 4. Table: complaint_logs (Resolution pathway audit logs)
-- --------------------------------------------------------------------------
DROP TABLE IF EXISTS `complaint_logs`;
CREATE TABLE `complaint_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `complaint_id` VARCHAR(32) NOT NULL,
  `stage_title` VARCHAR(100) NOT NULL COMMENT 'Maps to frontend lg.s',
  `note` TEXT NOT NULL,
  `action_by` VARCHAR(150) NOT NULL COMMENT 'Maps to frontend lg.by',
  `action_time` VARCHAR(50) NOT NULL COMMENT 'Maps to frontend lg.time',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_log_complaint` (`complaint_id`),
  FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Complaint Logs
INSERT INTO `complaint_logs` (`complaint_id`, `stage_title`, `note`, `action_by`, `action_time`) VALUES
('COMP-201', 'Complaint Submitted', 'Submitted with photo evidence', 'Kabir Mehta', '16/07/2026 09:30 AM'),
('COMP-201', 'Admin Verified', 'Verified by Admin & assigned to Electrical Faculty Advisor', 'Admin Office', '16/07/2026 10:15 AM'),

('COMP-202', 'Complaint Submitted', 'Reported by Student', 'Ananya Iyer', '15/07/2026 02:15 PM'),
('COMP-202', 'Admin Verified', 'Verified by Admin & assigned to Electrical Faculty', 'Admin Office', '15/07/2026 02:30 PM'),
('COMP-202', 'Faculty Assigned Tech', 'Dispatched to Technician Dilip Prasad', 'Electrical Faculty Advisor', '15/07/2026 03:00 PM'),
('COMP-202', 'Technician Accepted', 'Accepted by Technician Dilip Prasad', 'Dilip Prasad', '15/07/2026 03:30 PM'),
('COMP-202', 'Work in Progress', 'Repair and electrical replacement in progress', 'Dilip Prasad', '15/07/2026 04:00 PM'),
('COMP-202', 'Technician Completed', 'Work finished, photo proof uploaded & sent to Faculty', 'Dilip Prasad', '16/07/2026 10:00 AM'),
('COMP-202', 'Faculty Verified', 'Audited and verified by Faculty - Sent to Admin', 'Electrical Faculty Advisor', '16/07/2026 11:30 AM'),
('COMP-202', 'Admin Final Verified', 'Admin verified faculty audit and approved completion.', 'Admin Office', '16/07/2026 11:45 AM'),
('COMP-202', 'Completed', 'Complaint fully completed and closed.', 'System', '16/07/2026 11:45 AM'),

('COMP-203', 'Complaint Submitted', 'Auto High priority', 'Kabir Mehta', '16/07/2026 11:00 AM'),
('COMP-203', 'Admin Verified', 'Verified by Admin & assigned to Computer Faculty', 'Admin Office', '16/07/2026 11:10 AM'),
('COMP-203', 'Faculty Assigned Tech', 'Assigned to Technician Ankit Sharma', 'Computer Faculty Advisor', '16/07/2026 11:15 AM'),
('COMP-203', 'Technician Accepted', 'Accepted work order by Ankit Sharma', 'Ankit Sharma', '16/07/2026 11:20 AM'),
('COMP-203', 'Work in Progress', 'Switch diagnostics and patch cable replacement underway', 'Ankit Sharma', '16/07/2026 11:30 AM'),

('COMP-204', 'Complaint Submitted', 'Reported by Student', 'Kabir Mehta', '16/07/2026 01:20 PM'),
('COMP-204', 'Admin Verified', 'Verified by Admin & assigned to Computer Faculty', 'Admin Office', '16/07/2026 01:30 PM'),
('COMP-204', 'Faculty Assigned Tech', 'Dispatched to Ankit Sharma', 'Computer Faculty Advisor', '16/07/2026 01:45 PM'),
('COMP-204', 'Technician Accepted', 'Accepted work order by Ankit Sharma', 'Ankit Sharma', '16/07/2026 02:00 PM'),
('COMP-204', 'Work in Progress', 'Display port recabling in progress', 'Ankit Sharma', '16/07/2026 02:15 PM'),
('COMP-204', 'Technician Completed', 'Completed and submitted for Faculty Verification', 'Ankit Sharma', '16/07/2026 03:00 PM'),

('COMP-205', 'Complaint Submitted', 'Safety risk identified', 'Rohan Verma', '16/07/2026 10:00 AM'),
('COMP-205', 'Admin Verified', 'Verified by Admin & assigned to Mechanical Faculty', 'Admin Office', '16/07/2026 10:20 AM'),
('COMP-205', 'Faculty Assigned Tech', 'Assigned to Technician Jagdish Panchal', 'Mechanical Faculty Advisor', '16/07/2026 10:45 AM'),
('COMP-205', 'Technician Accepted', 'Accepted by Technician Jagdish Panchal', 'Jagdish Panchal', '16/07/2026 11:00 AM'),
('COMP-205', 'Work in Progress', 'Safety mechanism overhaul underway', 'Jagdish Panchal', '16/07/2026 11:30 AM'),
('COMP-205', 'Technician Completed', 'Completed with photo proof & submitted to Faculty', 'Jagdish Panchal', '16/07/2026 01:45 PM'),
('COMP-205', 'Faculty Verified', 'Audited and verified by Mechanical Faculty - Sent to Admin', 'Mechanical Faculty Advisor', '16/07/2026 02:30 PM'),

('COMP-208', 'Complaint Submitted', 'Submitted for Admin Verification', 'Priya Sharma', '16/07/2026 02:00 PM');

-- --------------------------------------------------------------------------
-- 5. Table: complaint_attachments
-- --------------------------------------------------------------------------
DROP TABLE IF EXISTS `complaint_attachments`;
CREATE TABLE `complaint_attachments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `complaint_id` VARCHAR(32) NOT NULL,
  `file_type` ENUM('image', 'video', 'proof', 'avatar') NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_size` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_attachment_complaint` (`complaint_id`),
  FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- 6. Table: notifications
-- --------------------------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` VARCHAR(64) PRIMARY KEY,
  `for_gr` VARCHAR(50) NULL,
  `for_dept` VARCHAR(100) NULL,
  `for_tech` VARCHAR(50) NULL,
  `for_role` VARCHAR(50) NULL,
  `complaint_id` VARCHAR(32) NULL,
  `text` TEXT NOT NULL,
  `time` VARCHAR(50) NOT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notif_gr` (`for_gr`),
  INDEX `idx_notif_dept` (`for_dept`),
  INDEX `idx_notif_tech` (`for_tech`),
  INDEX `idx_notif_read` (`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `notifications` (`id`, `for_gr`, `for_dept`, `for_tech`, `for_role`, `complaint_id`, `text`, `time`, `is_read`) VALUES
('N1', '1001', NULL, NULL, NULL, 'COMP-201', 'Admin verified and assigned COMP-201 to Electrical Faculty', '16/07/2026 10:15 AM', 0);

-- --------------------------------------------------------------------------
-- 7. Table: student_feedback
-- --------------------------------------------------------------------------
DROP TABLE IF EXISTS `student_feedback`;
CREATE TABLE `student_feedback` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `complaint_id` VARCHAR(32) NOT NULL,
  `student_gr` VARCHAR(50) NOT NULL,
  `feedback` ENUM('Satisfied', 'Not Satisfied') NOT NULL,
  `comment` TEXT NULL,
  `feedback_time` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_feedback_complaint` (`complaint_id`),
  FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `student_feedback` (`complaint_id`, `student_gr`, `feedback`, `comment`, `feedback_time`) VALUES
('COMP-202', '1002', 'Satisfied', 'Very prompt repair work by Dilip.', '16/07/2026 12:00 PM');

-- Enable Foreign Key checks
SET FOREIGN_KEY_CHECKS = 1;
