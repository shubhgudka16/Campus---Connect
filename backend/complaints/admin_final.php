<?php
/* ==========================================================================
   Campus Connect - Admin Final Verification & Sign-Off Endpoint
   backend/complaints/admin_final.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

$currentUser = requireRole(['admin']);
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
        status = 'Completed',
        stage = 7,
        admin_final_date = ?
    WHERE id = ?
");
$updateStmt->execute([$now, $id]);

addComplaintLog($db, $id, 'Admin Final Verified', 'Admin verified faculty audit and approved completion.', 'Admin Office', $now);
addComplaintLog($db, $id, 'Completed', 'Complaint fully completed and officially closed.', 'System', $now);

// Increment technician rating
if (!empty($c['tech_id'])) {
    $techStmt = $db->prepare("UPDATE users SET rating = LEAST(5.0, rating + 0.1) WHERE identifier = ? AND role = 'technician'");
    $techStmt->execute([$c['tech_id']]);
}

addNotification($db, $c['reported_by_gr'], null, null, null, $id, "Your complaint $id has been verified by Admin and is now Completed ✅.", $now);
if (!empty($c['tech_id'])) {
    addNotification($db, null, null, $c['tech_id'], 'technician', $id, "Task $id has received final Admin sign-off and is officially Completed ✅.", $now);
}

sendJson(true, "Complaint $id verified and marked Completed ✅!", [
    'id'     => $id,
    'status' => 'Completed',
    'stage'  => 7
]);
