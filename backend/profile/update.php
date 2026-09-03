<?php
/* ==========================================================================
   Campus Connect - Profile Update Endpoint
   backend/profile/update.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

$currentUser = requireAuth();
$db = getDbConnection();
$data = getRequestData();

$name = trim($data['name'] ?? $data['profName'] ?? '');
$dept = trim($data['dept'] ?? $data['profDept'] ?? '');
$pass = $data['password'] ?? $data['profPass'] ?? '';

// Handle avatar upload (file or base64 or URL)
$avatar = saveUploadedFile('avatar', ['jpg', 'jpeg', 'png', 'webp'])
       ?: saveUploadedFile('profFile', ['jpg', 'jpeg', 'png', 'webp'])
       ?: trim($data['avatar'] ?? $data['profImgUrl'] ?? '');

if ($name === '') {
    sendJson(false, 'Please provide your full name.', null, 400);
}

$id = $currentUser['id'] ?? null;
$identifier = $currentUser['identifier'] ?? $currentUser['grNo'] ?? $currentUser['techId'] ?? $currentUser['username'];

// Build SQL update
$fields = ["name = ?"];
$params = [$name];

if ($dept !== '' && ($currentUser['role'] === 'student' || $currentUser['role'] === 'technician')) {
    $fields[] = "department = ?";
    $params[] = $dept;
}

if ($avatar !== '') {
    $fields[] = "avatar = ?";
    $params[] = $avatar;
}

if ($pass !== '' && $pass !== 'password') {
    $fields[] = "password = ?";
    $params[] = password_hash($pass, PASSWORD_DEFAULT);
}

$params[] = $identifier;
$params[] = $currentUser['role'];

$sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE identifier = ? AND role = ?";
$stmt = $db->prepare($sql);
$stmt->execute($params);

// Update active session
$_SESSION['campus_session']['name'] = $name;
if ($dept !== '') {
    $_SESSION['campus_session']['dept'] = $dept;
}
if ($avatar !== '') {
    $_SESSION['campus_session']['avatar'] = $avatar;
}

sendJson(true, 'Profile updated successfully!', [
    'session' => $_SESSION['campus_session']
]);
