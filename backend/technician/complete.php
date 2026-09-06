<?php
/* ==========================================================================
   Campus Connect - Technician Mark Work Complete Endpoint
   backend/technician/complete.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

$currentUser = requireRole(['technician', 'admin']);
$data = getRequestData();

$id = trim($data['id'] ?? $data['completeTechId'] ?? '');
$remark = trim($data['remark'] ?? $data['completeRemark'] ?? 'Repairs successfully finished.');

if ($id === '') {
    sendJson(false, 'Missing complaint ID', null, 400);
}

// Handle Proof Photo Upload
$proofImgPath = saveUploadedFile('proof_img', ['jpg', 'jpeg', 'png', 'webp'])
             ?: saveUploadedFile('proofImgInput', ['jpg', 'jpeg', 'png', 'webp'])
             ?: saveUploadedFile('proofImg', ['jpg', 'jpeg', 'png', 'webp']);

if (!$proofImgPath) {
    sendJson(false, 'Please upload photograph proof of completed work', null, 400);
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
        status = 'Work Completed by Technician',
        stage = 5,
        technician_status = 'Completed',
        work_status = 'Completed',
        technician_completion_date = ?,
        proof_img = ?,
        remark = ?
    WHERE id = ?
");
$updateStmt->execute([$now, $proofImgPath, $remark, $id]);

addComplaintLog($db, $id, 'Technician Completed', $remark, $techName, $now);
addComplaintLog($db, $id, 'Sent to Faculty', 'Transferred to Department Faculty for QA Verification', $techName, $now);

addNotification(
    $db,
    $c['reported_by_gr'],
    null,
    null,
    null,
    $id,
    "Technician finished work on $id. Ready for Faculty Verification.",
    $now
);

addNotification(
    $db,
    null,
    $c['category'],
    null,
    'faculty',
    $id,
    "Technician finished work on $id. Ready for Faculty Verification.",
    $now
);

sendJson(true, 'Work completed! Transferred to Faculty Dashboard for verification.', [
    'id'       => $id,
    'status'   => 'Work Completed by Technician',
    'stage'    => 5,
    'proofImg' => $proofImgPath,
    'remark'   => $remark
]);
