# Campus Connect

<p align="center">
  <strong>Automated Multi-Role Campus Complaint Reporting & Resolution Portal</strong>
</p>

<p align="center">
  A centralized platform for reporting, tracking, managing, and resolving campus-related complaints.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black">
  <img src="https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white">
</p>

---

## Overview

**Campus Connect** is a web-based campus complaint management system designed to streamline communication between students, administrators, faculty members, and technicians.

The platform provides a structured workflow that allows a complaint to move from **submission to verification, assignment, resolution, quality checking, and student feedback**.

The goal is to make campus maintenance more **transparent, organized, and efficient**.

---

## Key Features

### Student Portal
- Create and manage student accounts
- Submit complaints with descriptions and photo evidence
- Track complaint status and progress
- View all complaints filed by the logged-in student
- Search complaints using keywords
- View assigned faculty and technician details
- Provide feedback after resolution
- Add comments with feedback
- Request further action when the issue is not resolved

### Admin Portal
- Verify and manage submitted complaints
- Assign complaints to appropriate faculty members
- Monitor complaint resolution
- Search and filter complaints
- Filter by department, status, and technician
- Monitor pending and unresolved complaints
- Generate complaint reports
- Track complaints pending for extended periods
- Receive reminders for complaints unresolved for 15 or 30 days

### Faculty Portal
- View departmental complaints
- Review complaint details
- Assign technicians
- Monitor technician progress
- Verify completed work
- Handle complaints requiring further action

### Technician Portal
- View assigned complaints
- Access complaint details and location
- Perform required maintenance work
- Upload resolution evidence
- Update complaint status

---

## Complaint Workflow

```text
Student
   │
   ▼
Submit Complaint
   │
   ▼
Admin Verification
   │
   ▼
Faculty Assignment
   │
   ▼
Technician Assignment
   │
   ▼
Issue Resolution
   │
   ▼
Faculty Verification
   │
   ▼
Student Feedback
   │
   ├── Satisfied ───────► Complaint Completed
   │
   └── Not Satisfied
             │
             ▼
       Admin Notified
             │
             ▼
      Technician Reassigned
             │
             ▼
        Issue Resolved
