<?php
/* ==========================================================================
   Campus Connect - Technician Decline Task Endpoint
   backend/technician/decline.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

$currentUser = requireRole(['technician', 'admin']);
$data = getRequestData();

$id = trim($data['id'] ?? $data['declineTechId'] ?? '');
$reason = trim($data['reason'] ?? $data['declineTechReason'] ?? 'Unavailable for assignment');

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
$techName = $currentUser['name'] ?? 'Technician';

$updateStmt = $db->prepare("
    UPDATE complaints SET
        status = 'Assigned to Faculty',
        stage = 2,
        technician_status = 'Rejected',
        technician_action = 'Rejected',
        work_status = 'Not Started',
        faculty_status = 'Pending Reassignment',
        last_rejected_tech = ?,
        rejection_reason = ?,
        tech_id = NULL,
        tech_name = NULL,
        deadline = ''
    WHERE id = ?
");
$updateStmt->execute([$techName, $reason, $id]);

addComplaintLog(
    $db,
    $id,
    'Technician Declined',
    "Declined by $techName: \"$reason\" — Returned to Faculty for technician reassignment",
    $techName,
    $now
);

addNotification(
    $db,
    null,
    $c['category'],
    null,
    'faculty',
    $id,
    "Technician $techName declined complaint $id: \"$reason\". Please reassign another technician.",
    $now
);

addNotification(
    $db,
    $c['reported_by_gr'],
    null,
    null,
    null,
    $id,
    "Technician $techName was unavailable ($reason). Department Faculty is reassigning a new technician.",
    $now
);

sendJson(true, 'Work order declined. Reason submitted to Faculty for technician reassignment.', [
    'id'               => $id,
    'status'           => 'Assigned to Faculty',
    'stage'            => 2,
    'lastRejectedTech' => $techName,
    'rejectionReason'  => $reason
]);
