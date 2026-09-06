<?php
/* ==========================================================================
   Campus Connect - Technician Staff Registry Management Endpoint
   backend/admin/staff.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

$currentUser = requireRole(['admin']);
$db = getDbConnection();
$data = getRequestData();
$action = strtolower(trim($data['action'] ?? 'list'));

if ($action === 'toggle') {
    $id = trim($data['id'] ?? '');
    if ($id === '') {
        sendJson(false, 'Missing technician ID', null, 400);
    }
    $stmt = $db->prepare("UPDATE users SET is_active = NOT is_active WHERE identifier = ? AND role = 'technician'");
    $stmt->execute([$id]);

    $checkStmt = $db->prepare("SELECT is_active, name FROM users WHERE identifier = ? AND role = 'technician'");
    $checkStmt->execute([$id]);
    $tech = $checkStmt->fetch();

    $statusMsg = ($tech && $tech['is_active']) ? 'Technician account activated.' : 'Technician account deactivated.';
    sendJson(true, $statusMsg, ['id' => $id, 'active' => (bool)($tech['is_active'] ?? 0)]);
}

if ($action === 'save') {
    $editId = trim($data['editId'] ?? $data['staffEditId'] ?? '');
    $name = trim($data['name'] ?? $data['staffName'] ?? '');
    $dept = trim($data['dept'] ?? $data['staffDept'] ?? '');
    $exp = (int)($data['experience'] ?? $data['staffExp'] ?? 2);
    $pass = $data['password'] ?? $data['staffPassNew'] ?? 'password';

    if ($name === '' || $dept === '') {
        sendJson(false, 'Please provide technician name and department.', null, 400);
    }

    if ($editId !== '') {
        // Update existing technician
        if ($pass !== '' && $pass !== 'password') {
            $hashed = password_hash($pass, PASSWORD_DEFAULT);
            $stmt = $db->prepare("UPDATE users SET name = ?, department = ?, experience = ?, password = ? WHERE identifier = ? AND role = 'technician'");
            $stmt->execute([$name, $dept, $exp, $hashed, $editId]);
        } else {
            $stmt = $db->prepare("UPDATE users SET name = ?, department = ?, experience = ? WHERE identifier = ? AND role = 'technician'");
            $stmt->execute([$name, $dept, $exp, $editId]);
        }
        sendJson(true, 'Technician details updated.', ['id' => $editId, 'name' => $name, 'dept' => $dept]);
    } else {
        // Create new technician ID
        $countStmt = $db->query("SELECT COUNT(*) FROM users WHERE role = 'technician'");
        $techCount = (int)$countStmt->fetchColumn() + 1;
        $newId = 'TECH-' . str_pad((string)$techCount, 2, '0', STR_PAD_LEFT);

        $hashed = password_hash($pass, PASSWORD_DEFAULT);
        $stmt = $db->prepare("INSERT INTO users (identifier, name, role, department, password, experience, rating, is_active, is_warned, is_suspended) VALUES (?, ?, 'technician', ?, ?, ?, 5.0, 1, 0, 0)");
        $stmt->execute([$newId, $name, $dept, $hashed, $exp]);

        sendJson(true, "Registered technician: $name assigned to $dept", [
            'id'         => $newId,
            'name'       => $name,
            'dept'       => $dept,
            'experience' => $exp,
            'rating'     => 5.0,
            'active'     => true
        ]);
    }
}

// Default action: list all technicians
$stmt = $db->query("SELECT * FROM users WHERE role = 'technician' ORDER BY id ASC");
$techniciansRaw = $stmt->fetchAll();

$technicians = [];
foreach ($techniciansRaw as $t) {
    $techId = $t['identifier'];
    $taskStmt = $db->prepare("SELECT COUNT(*) FROM complaints WHERE tech_id = ? AND stage >= 2 AND stage <= 5");
    $taskStmt->execute([$techId]);
    $activeDuties = (int)$taskStmt->fetchColumn();

    $technicians[] = [
        'id'           => $t['identifier'],
        'name'         => $t['name'],
        'dept'         => $t['department'],
        'experience'   => (int)$t['experience'],
        'rating'       => (float)$t['rating'],
        'active'       => (bool)$t['is_active'],
        'activeDuties' => $activeDuties
    ];
}

sendJson(true, 'Technician registry retrieved', $technicians);
