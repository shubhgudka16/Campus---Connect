<?php
/* ==========================================================================
   Campus Connect - Student Resolution Feedback Endpoint
   backend/complaints/feedback.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

$currentUser = requireRole(['student', 'admin']);
$data = getRequestData();

$id = trim($data['id'] ?? '');
$feedback = trim($data['feedback'] ?? 'Satisfied');
$comment = trim($data['comment'] ?? '');

if ($id === '') {
    sendJson(false, 'Missing complaint ID', null, 400);
}

if (!in_array($feedback, ['Satisfied', 'Not Satisfied'], true)) {
    $feedback = 'Satisfied';
}

$db = getDbConnection();
$stmt = $db->prepare("SELECT * FROM complaints WHERE id = ?");
$stmt->execute([$id]);
$c = $stmt->fetch();

if (!$c) {
    sendJson(false, 'Complaint not found', null, 404);
}

$now = formatNowStr();
$reporterName = $currentUser['name'];
$studentGr = $c['reported_by_gr'];

if ($feedback === 'Satisfied') {
    $updateStmt = $db->prepare("
        UPDATE complaints SET
            feedback = 'Satisfied',
            feedback_status = 'Satisfied',
            feedback_comment = ?,
            feedback_time = ?
        WHERE id = ?
    ");
    $updateStmt->execute([$comment, $now, $id]);

    $logNote = "Student confirmed satisfied." . ($comment ? " Remark: \"$comment\"" : "");
    addComplaintLog($db, $id, 'Student Feedback', $logNote, $reporterName, $now);

    // Save in student_feedback table
    $fbStmt = $db->prepare("INSERT INTO student_feedback (complaint_id, student_gr, feedback, comment, feedback_time) VALUES (?, ?, 'Satisfied', ?, ?)");
    $fbStmt->execute([$id, $studentGr, $comment, $now]);

    sendJson(true, 'Thank you for your feedback.', [
        'id'              => $id,
        'feedback'        => 'Satisfied',
        'feedbackComment' => $comment,
        'feedbackTime'    => $now
    ]);
} else {
    // Student Not Satisfied -> Update status and notify Admin for rework
    $updateStmt = $db->prepare("
        UPDATE complaints SET
            feedback = 'Not Satisfied',
            feedback_status = 'Student Not Satisfied',
            status = 'Student Not Satisfied',
            feedback_comment = ?,
            feedback_time = ?
        WHERE id = ?
    ");
    $updateStmt->execute([$comment, $now, $id]);

    $logNote = "Student reported: Not Satisfied." . ($comment ? " Remark: \"$comment\"" : "");
    addComplaintLog($db, $id, 'Student Feedback', $logNote, $reporterName, $now);

    // Save in student_feedback table
    $fbStmt = $db->prepare("INSERT INTO student_feedback (complaint_id, student_gr, feedback, comment, feedback_time) VALUES (?, ?, 'Not Satisfied', ?, ?)");
    $fbStmt->execute([$id, $studentGr, $comment, $now]);

    $techLabel = $c['tech_name'] ?: 'Unassigned';
    $notifText = "Feedback Alert: Complaint $id - Student {$c['reported_by']} (GR: {$c['reported_by_gr']}, {$c['category']}) is Not Satisfied with \"{$c['title']}\" (Technician: $techLabel). Feedback status: Not Satisfied." . ($comment ? " Comment: \"$comment\"" : "");
    addNotification($db, null, null, null, 'admin', $id, $notifText, $now);

    sendJson(true, 'Feedback recorded. Admin has been notified for rework review.', [
        'id'              => $id,
        'feedback'        => 'Not Satisfied',
        'feedbackComment' => $comment,
        'feedbackTime'    => $now
    ]);
}
