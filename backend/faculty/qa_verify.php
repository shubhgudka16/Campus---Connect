<?php
/* ==========================================================================
   Campus Connect - Faculty QA Verification & Audit Endpoint
   backend/faculty/qa_verify.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

$currentUser = requireRole(['faculty', 'admin']);
$data = getRequestData();

$id = trim($data['id'] ?? $data['qaVerifyId'] ?? '');
$approve = isset($data['approve']) ? (bool)$data['approve'] : true;
$comment = trim($data['comment'] ?? $data['qaFeedbackComment'] ?? '');

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

if ($approve) {
    $qaFeedback = $comment ?: 'Verified and approved by Faculty Advisor';
    $updateStmt = $db->prepare("
        UPDATE complaints SET
            status = 'Faculty Verified',
            stage = 6,
            faculty_status = 'Verified',
            faculty_verification_date = ?,
            qa_verified = 1,
            qa_feedback = ?
        WHERE id = ?
    ");
    $updateStmt->execute([$now, $qaFeedback, $id]);

    addComplaintLog($db, $id, 'Faculty Verified', $qaFeedback . ' - Sent to Admin for final approval', $currentUser['name'], $now);
    addNotification($db, null, null, null, 'admin', $id, "Faculty verified $id. Awaiting Admin final verification and completion.", $now);

    sendJson(true, 'Inspection completed! Sent to Admin for final verification.', [
        'id'          => $id,
        'status'      => 'Faculty Verified',
        'stage'       => 6,
        'qaFeedback'  => $qaFeedback
    ]);
} else {
    $updateStmt = $db->prepare("
        UPDATE complaints SET
            status = 'Work in Progress',
            stage = 4,
            faculty_status = 'Redo Requested'
        WHERE id = ?
    ");
    $updateStmt->execute([$id]);

    $logNote = $comment ?: 'Rework requested by Faculty during QA audit';
    addComplaintLog($db, $id, 'Faculty Redo Requested', $logNote, $currentUser['name'], $now);

    if (!empty($c['tech_id'])) {
        addNotification($db, null, null, $c['tech_id'], 'technician', $id, "Faculty requested rework on task $id: \"$logNote\"", $now);
    }

    sendJson(true, 'Redo requested. Returned to technician queue.', [
        'id'     => $id,
        'status' => 'Work in Progress',
        'stage'  => 4
    ]);
}
