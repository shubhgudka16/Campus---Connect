<?php
/* ==========================================================================
   Campus Connect - Student Directory Governance Endpoint
   backend/admin/students.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

$currentUser = requireRole(['admin']);
$db = getDbConnection();
$data = getRequestData();
$action = strtolower(trim($data['action'] ?? 'list'));

if ($action === 'toggle_warn') {
    $grNo = trim($data['grNo'] ?? $data['gr'] ?? '');
    if ($grNo === '') {
        sendJson(false, 'Missing student enrollment number', null, 400);
    }
    $stmt = $db->prepare("UPDATE users SET is_warned = NOT is_warned WHERE identifier = ? AND role = 'student'");
    $stmt->execute([$grNo]);
    sendJson(true, 'Student warning status updated.');
}

if ($action === 'toggle_suspend') {
    $grNo = trim($data['grNo'] ?? $data['gr'] ?? '');
    if ($grNo === '') {
        sendJson(false, 'Missing student enrollment number', null, 400);
    }
    $stmt = $db->prepare("UPDATE users SET is_suspended = NOT is_suspended WHERE identifier = ? AND role = 'student'");
    $stmt->execute([$grNo]);
    sendJson(true, 'Student suspension status updated.');
}

if ($action === 'override') {
    $gr = trim($data['gr'] ?? $data['adminUserEditGr'] ?? '');
    $name = trim($data['name'] ?? $data['adminUserEditName'] ?? '');
    $dept = trim($data['dept'] ?? $data['adminUserEditDept'] ?? '');
    $pass = $data['password'] ?? $data['adminUserEditPass'] ?? '';
    $avatar = trim($data['avatar'] ?? $data['adminUserEditImgUrl'] ?? '');

    if ($gr === '' || $name === '' || $dept === '') {
        sendJson(false, 'Please fill in student name and department.', null, 400);
    }

    if ($pass !== '' && $pass !== 'password') {
        $hashed = password_hash($pass, PASSWORD_DEFAULT);
        $stmt = $db->prepare("UPDATE users SET name = ?, department = ?, avatar = ?, password = ? WHERE identifier = ? AND role = 'student'");
        $stmt->execute([$name, $dept, $avatar ?: null, $hashed, $gr]);
    } else {
        $stmt = $db->prepare("UPDATE users SET name = ?, department = ?, avatar = ? WHERE identifier = ? AND role = 'student'");
        $stmt->execute([$name, $dept, $avatar ?: null, $gr]);
    }

    sendJson(true, "Administrative profile override applied for student: $name", [
        'grNo'   => $gr,
        'name'   => $name,
        'dept'   => $dept,
        'avatar' => $avatar
    ]);
}

// Default action: list all students
$search = strtolower(trim($data['search'] ?? ''));
$stmt = $db->query("SELECT * FROM users WHERE role = 'student' ORDER BY id ASC");
$studentsRaw = $stmt->fetchAll();

$students = [];
foreach ($studentsRaw as $s) {
    $grNo = $s['identifier'];

    if ($search !== '' && strpos(strtolower($s['name']), $search) === false && strpos($grNo, $search) === false) {
        continue;
    }

    $cStmt = $db->prepare("SELECT COUNT(*) FROM complaints WHERE reported_by_gr = ?");
    $cStmt->execute([$grNo]);
    $complaintsCount = (int)$cStmt->fetchColumn();

    $students[] = [
        'grNo'            => $grNo,
        'name'            => $s['name'],
        'dept'            => $s['department'],
        'avatar'          => $s['avatar'],
        'warned'          => (bool)$s['is_warned'],
        'suspended'       => (bool)$s['is_suspended'],
        'complaintsCount' => $complaintsCount
    ];
}

sendJson(true, 'Student directory retrieved', $students);
