# Campus Connect — Automated Multi-Role Resolution Portal
## PHP + MySQL Backend Integration & Setup Guide

---

## 📌 1. Project Overview

**Campus Connect** is an institutional complaint registration, automated routing, operational escalation, and quality audit resolution portal designed for academic universities and colleges.

The system enforces a **7-Stage Resolution Workflow**:
1. **Student Complaint Filing (`Stage 1`)**: Student logs in, fills in details, selects category/priority, attaches image/video evidence, and submits the ticket.
2. **Admin Initial Verification & Routing (`Stage 2`)**: Admin verifies legitimacy, filters fraudulent/duplicate entries, and dispatches the ticket to the respective Department Faculty Advisor.
3. **Faculty Technician Dispatch (`Stage 3`)**: Department Faculty Advisor selects an active specialized technician, sets an SLA completion deadline, and assigns the work order.
4. **Technician Acceptance & Execution (`Stage 4`)**: Assigned technician accepts the work order and begins on-site physical resolution (`Work in Progress`).
5. **Technician Proof Submission (`Stage 5`)**: Technician completes repairs, uploads photographic proof of resolution, writes resolution notes, and submits to Faculty.
6. **Faculty QA Audit & Sign-off (`Stage 6`)**: Faculty inspects the technician's photographic evidence and resolution quality, writes audit notes, and forwards to Admin (or requests redo).
7. **Admin Final Completion & Student Feedback (`Stage 7`)**: Admin performs final sign-off, closes ticket officially, increments technician rating, and student provides resolution feedback (*Satisfied* or *Not Satisfied - Escalation for Rework*).

---

## 🛠️ 2. Technology Stack

* **Frontend**: HTML5, Vanilla CSS, JavaScript (ES6+), Bootstrap / Tailwind CSS utilities, FontAwesome Icons, Chart.js.
* **Backend**: PHP 8.x (Native Procedural & Object-Oriented Architecture, PDO, Prepared Statements, Secure Session Management, Password Bcrypt Hashing).
* **Database**: MySQL 8.x / MariaDB via phpMyAdmin.
* **Web Server**: Apache / XAMPP / PHP Built-in Server.

---

## 🚀 3. Prerequisites & XAMPP Installation

1. Download and install **XAMPP** for Windows from [https://www.apachefriends.org/](https://www.apachefriends.org/).
2. Open the **XAMPP Control Panel**.
3. Start the **Apache** and **MySQL** services by clicking their respective **Start** buttons. Both modules should turn green.

---

## 🗄️ 4. Database Setup & phpMyAdmin Import

1. Open your web browser and navigate to:
   ```
   http://localhost/phpmyadmin/
   ```
2. In the left navigation sidebar, click **New**.
3. Enter the Database name:
   ```
   campus_connect
   ```
   Set collation to `utf8mb4_unicode_ci` and click **Create**.
4. With the newly created `campus_connect` database selected, click the **Import** tab in the top navigation bar.
5. Under **File to import**, click **Choose File** and select:
   ```
   d:/dm/Campus - Connect/database/campus_connect.sql
   ```
   *(or the location where this project is stored on your system)*.
6. Scroll to the bottom and click **Import** (or **Go**).
7. All 7 tables with seed data will be created:
   * `departments`
   * `users`
   * `complaints`
   * `complaint_logs`
   * `complaint_attachments`
   * `notifications`
   * `student_feedback`

---

## ⚙️ 5. Database Configuration Settings

The database connection and security parameters are centralized in `backend/config/database.php`:

```php
// backend/config/database.php
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 'campus_connect');
define('DB_USER', 'root');
define('DB_PASS', '');
```

* If your MySQL root account has a password, update `DB_PASS` accordingly.
* If your MySQL runs on a custom port, update `DB_PORT`.

---

## 🏃 6. Running the Application

### Option A: Via XAMPP `htdocs` (Recommended for Production / Evaluation)
1. Copy or move the entire project folder `Campus - Connect` into:
   ```
   C:\xampp\htdocs\Campus - Connect
   ```
2. Open your web browser and visit:
   ```
   http://localhost/Campus%20-%20Connect/index.html
   ```

### Option B: Via PHP Built-in Server (Development / Testing)
1. Open Command Prompt or PowerShell in the project directory:
   ```powershell
   cd "d:\dm\Campus - Connect"
   C:\xampp\php\php.exe -S 127.0.0.1:8000
   ```
2. Open your browser and navigate to:
   ```
   http://127.0.0.1:8000/index.html
   ```

---

## 🔑 7. Test Account Credentials

All accounts come pre-configured with secure password hashes (`password_hash` with `PASSWORD_BCRYPT`):

| Role | Username / Identifier | Password | Name / Department | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | `1001` | `password` | Kabir Mehta (Computer Dept) | Student with active and resolved complaints |
| **Student** | `1002` | `password` | Ananya Iyer (Electrical Dept) | Student filer |
| **Student** | `1003` | `password` | Rohan Verma (Mechanical Dept) | Student filer |
| **Student** | `1004` | `password` | Priya Sharma (Civil Dept) | Student filer |
| **Faculty** | `Computer Department` | `password` | Computer Dept Faculty Advisor | Faculty ticket dispatch & QA audit |
| **Faculty** | `Electrical Department` | `password` | Electrical Dept Faculty Advisor | Faculty ticket dispatch & QA audit |
| **Faculty** | `Mechanical Department` | `password` | Mechanical Dept Faculty Advisor | Faculty ticket dispatch & QA audit |
| **Faculty** | `Civil Department` | `password` | Civil Dept Faculty Advisor | Faculty ticket dispatch & QA audit |
| **Technician** | `TECH-01` | `password` | Dilip Prasad (Computer Dept) | Hardware & network technician (Rating: 4.9★) |
| **Technician** | `TECH-02` | `password` | Jagdish Panchal (Electrical Dept) | Electrical technician (Rating: 4.8★) |
| **Technician** | `TECH-03` | `password` | Ankit Sharma (Mechanical Dept) | Mechanical technician (Rating: 4.7★) |
| **Technician** | `TECH-04` | `password` | Madan Lal (Civil Dept) | Civil technician (Rating: 4.9★) |
| **Administrator** | `admin` | `admin123` | Principal Office Workspace | Central oversight, audit, routing & export |

---

## 📂 8. Backend Directory Structure & Endpoints

```
backend/
├── config/
│   └── database.php                # PDO Database connection, session config, helper functions
├── auth/
│   ├── login.php                   # Multi-role authentication (Student, Faculty, Technician, Admin)
│   ├── session.php                 # Active session validation & role verification
│   ├── logout.php                  # Session termination & cookie cleanup
│   └── register.php                # Student self-registration with Bcrypt password hashing
├── complaints/
│   ├── list.php                    # Filtered complaint list by role, status, department & search
│   ├── get.php                     # Single complaint fetch with full audit trail logs
│   ├── create.php                  # Student complaint creation with image/video file storage
│   ├── admin_verify.php            # Admin stage 1 verification & routing to Department Faculty
│   ├── admin_final.php             # Admin stage 7 sign-off, technician rating increment & closure
│   └── feedback.php                # Student satisfaction feedback & rework escalation handler
├── faculty/
│   ├── assign_technician.php       # Faculty stage 2 -> 3 technician dispatch with SLA deadline
│   └── qa_verify.php               # Faculty stage 5 -> 6 QA inspection approval or rework request
├── technician/
│   ├── accept.php                  # Technician stage 3 -> 4 task acceptance
│   ├── decline.php                 # Technician rejection with reason, returns ticket to Faculty
│   └── complete.php                # Technician stage 4 -> 5 completion with photographic proof
├── admin/
│   ├── dashboard.php               # High-level analytics, SLA metrics, and chart statistics
│   ├── staff.php                   # Technician staff registry (List, Register, Edit, Toggle status)
│   ├── students.php                # Student registry (List, Warning toggle, Suspension, Profile override)
│   └── export_csv.php              # Audited operational report export as downloadable CSV
├── notifications/
│   ├── list.php                    # Role-targeted notification list
│   └── read_all.php                # Mark notifications as read
├── profile/
│   └── update.php                  # User name, password, department, and avatar image updates
└── uploads/
    ├── .htaccess                   # Execution prevention security rule
    ├── complaints/                 # Student fault evidence photos and videos
    ├── proofs/                     # Technician repair completion photographs
    └── avatars/                    # User profile avatars
```

---

## 📡 9. API Reference & Contract

### 1. Authentication Endpoints
* **`POST backend/auth/login.php`**
  * Payload: `{ "role": "student"|"faculty"|"technician"|"admin", "stuGr": "...", "stuPass": "...", ... }`
  * Response: `{ "success": true, "message": "...", "data": { "session": { ... } } }`
* **`GET backend/auth/session.php`**
  * Response: `{ "success": true, "data": { "authenticated": true, "session": { ... } } }`
* **`POST backend/auth/logout.php`**
  * Response: `{ "success": true, "message": "Logged out successfully" }`
* **`POST backend/auth/register.php`**
  * Payload: `{ "grNo": "1005", "name": "John Doe", "dept": "Computer Department", "password": "password" }`

### 2. Complaint Lifecycle Endpoints
* **`GET backend/complaints/list.php?role=student|faculty|technician|admin&public=1`**
  * Response: `{ "success": true, "data": [ ...complaint objects with logs and proofs... ] }`
* **`POST backend/complaints/create.php`**
  * Payload: `{ "title": "...", "category": "...", "priority": "Low"|"Medium"|"High", "location": "...", "description": "...", "image": "data:image/...", "video": "data:video/..." }`
* **`POST backend/complaints/admin_verify.php`**
  * Payload: `{ "id": "COMP-474", "action": "approve"|"reject", "dept": "Computer Department" }`
* **`POST backend/faculty/assign_technician.php`**
  * Payload: `{ "id": "COMP-474", "techId": "TECH-01", "deadline": "2026-09-05" }`
* **`POST backend/technician/accept.php`**
  * Payload: `{ "id": "COMP-474" }`
* **`POST backend/technician/decline.php`**
  * Payload: `{ "id": "COMP-474", "reason": "Material unavailable" }`
* **`POST backend/technician/complete.php`**
  * Payload: `{ "id": "COMP-474", "remark": "Resolution note", "proof_img": "data:image/..." }`
* **`POST backend/faculty/qa_verify.php`**
  * Payload: `{ "id": "COMP-474", "approve": true|false, "comment": "QA Inspection note" }`
* **`POST backend/complaints/admin_final.php`**
  * Payload: `{ "id": "COMP-474" }`
* **`POST backend/complaints/feedback.php`**
  * Payload: `{ "id": "COMP-474", "feedback": "Satisfied"|"Not Satisfied" }`

### 3. Administrator Endpoints
* **`GET backend/admin/dashboard.php`**: Summary counters, SLA metrics, department distribution, trend counts.
* **`GET/POST backend/admin/staff.php`**: List staff, toggle active status, add/edit technician.
* **`GET/POST backend/admin/students.php`**: List students, toggle warn/suspend flags, override profile.
* **`GET backend/admin/export_csv.php`**: Generates and streams `Campus_Connect_Operational_Report.csv`.

---

## 🔒 10. Security Implementation Highlights

1. **SQL Injection Prevention**: All queries use PDO prepared statements with parameterized inputs.
2. **Password Security**: All user passwords are encrypted using PHP `password_hash()` with Bcrypt standard algorithm.
3. **Session Fixation & Role Protection**: Protected APIs call `requireAuth()` and `requireRole()` to ensure actions are strictly authorized for the active user session.
4. **File Upload Hardening**:
   * MIME type validation for images (`jpg`, `jpeg`, `png`, `webp`, `gif`) and videos (`mp4`, `webm`).
   * Upload directory contains a `.htaccess` file denying script execution (`php`, `phtml`, `cgi`, `exe`).
5. **Cross-Site Scripting (XSS) Sanitization**: All incoming string inputs are sanitized using `htmlspecialchars()`.

---

## ❓ 11. Troubleshooting & FAQs

* **Issue: "Database connection failed"**
  * Verify that MySQL is running in XAMPP Control Panel.
  * Check `backend/config/database.php` to ensure `DB_USER` and `DB_PASS` match your local MySQL configuration.
  * Ensure you created the database `campus_connect` and imported `database/campus_connect.sql`.
* **Issue: "Student cannot access File Complaint section"**
  * Resolved: The complaint modal is directly accessible from the Student Dashboard left navigation bar and the 4-Step Portal page. Any URL parameter `?action=file` or `?action=emergency` automatically triggers the complaint dialog.
* **Issue: "File upload size exceeded"**
  * If uploading large media, check your `php.ini` settings:
    ```ini
    upload_max_filesize = 50M
    post_max_size = 50M
    ```
* **Issue: "Apache port 80 conflict in XAMPP"**
  * If another application (e.g. Skype, IIS, VMware) is using port 80, in XAMPP Control Panel click **Config** next to Apache -> `httpd.conf` and change `Listen 80` to `Listen 8080`, then access the site at `http://localhost:8080/Campus%20-%20Connect/`.

---

*Campus Connect — Engineered for Academic Excellence & Operational Transparency.*
