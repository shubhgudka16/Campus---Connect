<?php
/* ==========================================================================
   Campus Connect - Admin Verification & Routing Endpoint
   backend/complaints/admin_verify.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

$currentUser = requireRole(['admin']);
$data = getRequestData();

$id = trim($data['id'] ?? $data['adminVerifyId'] ?? '');
$action = strtolower(trim($data['action'] ?? 'approve')); // 'approve' or 'reject'
$dept = trim($data['dept'] ?? $data['adminRouteDept'] ?? '');
$reason = trim($data['reason'] ?? 'Rejected by Admin during initial verification');

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

if ($action === 'reject') {
    $updateStmt = $db->prepare("
        UPDATE complaints SET
            status = 'Rejected by Admin',
            stage = 0,
            admin_status = 'Rejected',
            faculty_status = 'Rejected',
            technician_status = 'Cancelled',
            work_status = 'Cancelled',
            rejection_reason = ?
        WHERE id = ?
    ");
    $updateStmt->execute([$reason, $id]);

    addComplaintLog($db, $id, 'Rejected by Admin', 'Fraud / non-compliant complaint rejected by Admin.', 'Admin Office', $now);
    addNotification($db, $c['reported_by_gr'], null, null, null, $id, "Your complaint $id was rejected by Admin verification.", $now);

    sendJson(true, 'Complaint rejected & archived.', ['id' => $id, 'status' => 'Rejected by Admin']);
}

// Action: Approve & Assign to Department Faculty
$targetDept = $dept ?: $c['category'];
$wasRework = ($c['feedback'] === 'Not Satisfied' || $c['status'] === 'Student Not Satisfied');

$updateStmt = $db->prepare("
    UPDATE complaints SET
        category = ?,
        status = 'Assigned to Faculty',
        stage = 2,
        admin_status = 'Approved',
        admin_verification_date = ?,
        faculty_status = 'Pending',
        technician_status = 'Pending',
        work_status = 'Not Started',
        feedback = NULL,
        feedback_status = NULL
    WHERE id = ?
");
$updateStmt->execute([$targetDept, $now, $id]);

$logNote = $wasRework
    ? "Sent back by Admin to $targetDept Faculty Advisor for rework & technician reassignment"
    : "Approved by Admin & assigned to $targetDept Faculty Advisor";

addComplaintLog($db, $id, 'Admin Verified', $logNote, 'Admin Office', $now);

$notifMsgStudent = $wasRework
    ? "Admin sent complaint $id back to $targetDept Faculty for rework."
    : "Admin verified complaint $id and assigned to $targetDept Faculty.";

addNotification($db, $c['reported_by_gr'], null, null, null, $id, $notifMsgStudent, $now);
addNotification($db, null, $targetDept, null, 'faculty', $id, "New complaint $id routed to your department by Admin.", $now);

$msg = $wasRework
    ? "Complaint $id sent back to $targetDept Faculty for rework."
    : "Complaint $id verified & assigned to $targetDept Faculty.";

sendJson(true, $msg, [
    'id'       => $id,
    'status'   => 'Assigned to Faculty',
    'stage'    => 2,
    'category' => $targetDept
]);
