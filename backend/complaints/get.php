<?php
/* ==========================================================================
   Campus Connect - Single Complaint Endpoint
   backend/complaints/get.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

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

// Fetch logs
$logStmt = $db->prepare("SELECT * FROM complaint_logs WHERE complaint_id = ? ORDER BY id ASC");
$logStmt->execute([$id]);
$logsRaw = $logStmt->fetchAll();

$logs = [];
foreach ($logsRaw as $log) {
    $logs[] = [
        's'    => $log['stage_title'],
        'note' => $log['note'],
        'time' => $log['action_time'],
        'by'   => $log['action_by']
    ];
}

$complaint = [
    'id'                        => $c['id'],
    'title'                     => $c['title'],
    'category'                  => $c['category'],
    'description'               => $c['description'],
    'location'                  => $c['location'],
    'priority'                  => $c['priority'],
    'reportedBy'                => $c['reported_by'],
    'reportedByGr'              => $c['reported_by_gr'],
    'reportedAt'                => $c['reported_at'],
    'status'                    => $c['status'],
    'current_status'            => $c['status'],
    'stage'                     => (int)$c['stage'],
    'admin_status'              => $c['admin_status'],
    'admin_verification_date'   => $c['admin_verification_date'],
    'admin_final_date'          => $c['admin_final_date'],
    'faculty_status'            => $c['faculty_status'],
    'faculty_verification_date' => $c['faculty_verification_date'],
    'technician_status'         => $c['technician_status'],
    'technician_action'         => $c['technician_action'],
    'work_status'               => $c['work_status'],
    'technician_completion_date'=> $c['technician_completion_date'],
    'techId'                    => $c['tech_id'],
    'techName'                  => $c['tech_name'],
    'deadline'                  => $c['deadline'] ?? '',
    'rejectionReason'           => $c['rejection_reason'] ?? '',
    'lastRejectedTech'          => $c['last_rejected_tech'],
    'image'                     => $c['image'] ?? '',
    'video'                     => $c['video'] ?? '',
    'proofImg'                  => $c['proof_img'] ?? '',
    'remark'                    => $c['remark'] ?? '',
    'qaVerified'                => (bool)$c['qa_verified'],
    'qaFeedback'                => $c['qa_feedback'] ?? '',
    'feedback'                  => $c['feedback'],
    'feedbackStatus'            => $c['feedback_status'],
    'feedbackComment'           => $c['feedback_comment'],
    'feedbackTime'              => $c['feedback_time'],
    'logs'                      => $logs
];

sendJson(true, 'Complaint retrieved', $complaint);
