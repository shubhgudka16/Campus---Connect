<?php
/* ==========================================================================
   Campus Connect - Student Registration Endpoint
   backend/auth/register.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

$data = getRequestData();
$name = trim($data['name'] ?? $data['regName'] ?? '');
$grNo = trim($data['grNo'] ?? $data['regGr'] ?? '');
$dept = trim($data['dept'] ?? $data['regDept'] ?? '');
$pass = $data['password'] ?? $data['regPass'] ?? '';

if ($name === '' || $grNo === '' || $dept === '' || $pass === '') {
    sendJson(false, 'Please fill in all required registration fields.', null, 400);
}

$db = getDbConnection();

// Check if GR number is already registered
$stmt = $db->prepare("SELECT id FROM users WHERE identifier = ?");
$stmt->execute([$grNo]);
if ($stmt->fetch()) {
    sendJson(false, 'Enrollment Number registered already', null, 409);
}

// Hash password with bcrypt
$hashedPassword = password_hash($pass, PASSWORD_DEFAULT);

$insertStmt = $db->prepare("INSERT INTO users (identifier, name, role, department, password, avatar, experience, rating, is_active, is_warned, is_suspended) VALUES (?, ?, 'student', ?, ?, NULL, 0, 5.0, 1, 0, 0)");
$insertStmt->execute([$grNo, $name, $dept, $hashedPassword]);

sendJson(true, 'Student account generated! Log in below.', [
    'grNo' => $grNo,
    'name' => $name,
    'dept' => $dept
]);
