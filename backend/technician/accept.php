<?php
/* ==========================================================================
   Campus Connect - Technician Accept Task Endpoint
   backend/technician/accept.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

$currentUser = requireRole(['technician', 'admin']);
$data = getRequestData();

$id = trim($data['id'] ?? '');

if ($id === '') {
    sendJson(false, 'Missing complaint ID', null, 400);
}

$db = getDbConnection();
$stmt = $db->prepare("SELECT * FROM complaints WHERE id = ?");
$stmt->execute([$id]);
$c = $stmt->fetch();

if (!$c) {
    sendJson(false, 'Complaint not found', null, 404);
}

$now = formatNowStr();

$updateStmt = $db->prepare("
    UPDATE complaints SET
        status = 'Work in Progress',
        stage = 4,
        technician_status = 'Accepted',
        technician_action = 'Accepted',
        work_status = 'In Progress'
    WHERE id = ?
");
$updateStmt->execute([$id]);

addComplaintLog($db, $id, 'Technician Accepted', 'Technician accepted complaint work order', $currentUser['name'], $now);
addComplaintLog($db, $id, 'Work in Progress', 'Resolution work actively underway', $currentUser['name'], $now);

addNotification($db, $c['reported_by_gr'], null, null, null, $id, "Technician {$currentUser['name']} accepted your complaint $id and started work.", $now);

sendJson(true, 'Complaint accepted! Work is now in progress.', [
    'id'     => $id,
    'status' => 'Work in Progress',
    'stage'  => 4
]);
