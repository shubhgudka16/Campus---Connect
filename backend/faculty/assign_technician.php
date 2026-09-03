<?php
/* ==========================================================================
   Campus Connect - Faculty Assign/Reassign Technician Endpoint
   backend/faculty/assign_technician.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

$currentUser = requireRole(['faculty', 'admin']);
$data = getRequestData();

$id = trim($data['id'] ?? $data['forwardVerifyId'] ?? '');
$techId = trim($data['techId'] ?? $data['forwardSelectedTech'] ?? '');
$deadline = trim($data['deadline'] ?? $data['forwardDeadline'] ?? '');

if ($id === '' || $techId === '') {
    sendJson(false, 'Please select a technician and complaint to dispatch.', null, 400);
}

$db = getDbConnection();

// Get complaint
$stmt = $db->prepare("SELECT * FROM complaints WHERE id = ?");
$stmt->execute([$id]);
$c = $stmt->fetch();

if (!$c) {
    sendJson(false, 'Complaint not found', null, 404);
}

// Get technician details
$techStmt = $db->prepare("SELECT * FROM users WHERE identifier = ? AND role = 'technician'");
$techStmt->execute([$techId]);
$tech = $techStmt->fetch();

$techName = $tech ? $tech['name'] : 'Assigned Technician';
$wasReassigned = !empty($c['last_rejected_tech']) || $c['technician_status'] === 'Rejected';
$now = formatNowStr();

$updateStmt = $db->prepare("
    UPDATE complaints SET
        tech_id = ?,
        tech_name = ?,
        deadline = ?,
        status = 'Assigned to Technician',
        stage = 3,
        faculty_status = 'Dispatched',
        technician_status = 'Pending',
        work_status = 'Not Started',
        last_rejected_tech = NULL
    WHERE id = ?
");
$updateStmt->execute([$techId, $techName, $deadline, $id]);

$logNote = $wasReassigned
    ? "Reassigned to Technician $techName with deadline " . ($deadline ?: 'N/A')
    : "Faculty assigned work to Technician $techName with deadline " . ($deadline ?: 'N/A');

addComplaintLog($db, $id, 'Faculty Assigned Tech', $logNote, $currentUser['name'], $now);

$notifMsgStudent = $wasReassigned
    ? "Faculty reassigned complaint $id to Technician $techName."
    : "Faculty assigned complaint $id to Technician $techName.";

addNotification($db, $c['reported_by_gr'], null, null, null, $id, $notifMsgStudent, $now);
addNotification($db, null, null, $techId, 'technician', $id, "New task assignment: $id. Please review and accept.", $now);

sendJson(true, "Work order dispatched to Technician $techName.", [
    'id'       => $id,
    'status'   => 'Assigned to Technician',
    'stage'    => 3,
    'techId'   => $techId,
    'techName' => $techName,
    'deadline' => $deadline
]);
