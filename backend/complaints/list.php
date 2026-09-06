<?php
/* ==========================================================================
   Campus Connect - Complaints Listing Endpoint
   backend/complaints/list.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

$data = getRequestData();
$currentUser = getAuthUser();
$db = getDbConnection();

// Allow public feed access or role-specific access
$filterRole = strtolower(trim($data['role'] ?? ($currentUser['role'] ?? 'public')));
$search = strtolower(trim($data['search'] ?? ''));
$category = trim($data['category'] ?? $data['dept'] ?? '');
$statusFilter = trim($data['status'] ?? '');
$isPublic = ($filterRole === 'public' || isset($data['public']));

// Enforce authentication for student, faculty, technician, and admin roles
if (!$isPublic) {
    if (!$currentUser) {
        $currentUser = requireAuth();
    }
}

$query = "SELECT c.* FROM complaints c WHERE 1=1";
$params = [];

// Role-based scoping based strictly on authenticated PHP session
if (!$isPublic && $currentUser) {
    if ($currentUser['role'] === 'student') {
        $studentGr = $currentUser['grNo'] ?? $currentUser['identifier'] ?? '';
        $studentName = $currentUser['name'] ?? '';
        $query .= " AND (c.reported_by_gr = ? OR c.reported_by = ?)";
        $params[] = $studentGr;
        $params[] = $studentName;
    } elseif ($currentUser['role'] === 'faculty') {
        if (!empty($currentUser['dept'])) {
            $query .= " AND (c.category = ? OR c.category = '') AND c.stage >= 2 AND c.status != 'Rejected by Admin'";
            $params[] = $currentUser['dept'];
        } else {
            $query .= " AND c.stage >= 2 AND c.status != 'Rejected by Admin'";
        }
    } elseif ($currentUser['role'] === 'technician') {
        $techId = $currentUser['techId'] ?? $currentUser['id'] ?? '';
        $query .= " AND ((c.tech_id = ? OR (c.tech_id IS NULL AND c.category = ?)) AND c.stage >= 3 AND c.status NOT LIKE 'Rejected%')";
        $params[] = $techId;
        $params[] = $currentUser['dept'] ?? '';
    }
    // Admin role has unrestricted visibility of all complaints
}

// Category filter
if ($category !== '' && $category !== 'all' && $category !== 'All') {
    $query .= " AND c.category = ?";
    $params[] = $category;
}

// Status filter
if ($statusFilter !== '' && $statusFilter !== 'All') {
    $query .= " AND c.status = ?";
    $params[] = $statusFilter;
}

// Order by latest
$query .= " ORDER BY c.created_at DESC";

$stmt = $db->prepare($query);
$stmt->execute($params);
$complaintsRaw = $stmt->fetchAll();

if (empty($complaintsRaw)) {
    sendJson(true, 'No complaints found', []);
}

// Fetch all logs for these complaints
$complaintIds = array_column($complaintsRaw, 'id');
$placeholders = implode(',', array_fill(0, count($complaintIds), '?'));
$logStmt = $db->prepare("SELECT * FROM complaint_logs WHERE complaint_id IN ($placeholders) ORDER BY id ASC");
$logStmt->execute($complaintIds);
$logsRaw = $logStmt->fetchAll();

$logsByComplaint = [];
foreach ($logsRaw as $log) {
    $logsByComplaint[$log['complaint_id']][] = [
        's'    => $log['stage_title'],
        'note' => $log['note'],
        'time' => $log['action_time'],
        'by'   => $log['action_by']
    ];
}

// Format each complaint to match the frontend schema
$complaints = [];
foreach ($complaintsRaw as $c) {
    $id = $c['id'];
    $logs = $logsByComplaint[$id] ?? [
        [
            's'    => 'Complaint Submitted',
            'note' => 'Submitted with details',
            'time' => $c['reported_at'],
            'by'   => $c['reported_by']
        ]
    ];

    $complaint = [
        'id'                        => $c['id'],
        'title'                     => $c['title'],
        'category'                  => $c['category'],
        'dept'                      => $c['category'],
        'description'               => $c['description'],
        'desc'                      => $c['description'],
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
        'notified15Day'             => (bool)$c['notified_15_day'],
        'notified30Day'             => (bool)$c['notified_30_day'],
        'logs'                      => $logs
    ];

    // Search filter if provided
    if ($search !== '') {
        $matchText = strtolower(implode(' ', [
            $complaint['title'],
            $complaint['description'],
            $complaint['category'],
            $complaint['location'],
            $complaint['id'],
            $complaint['techName'] ?? '',
            $complaint['reportedBy'],
            $complaint['reportedByGr'],
            $complaint['status'],
            $complaint['priority']
        ]));
        if (strpos($matchText, $search) === false) {
            continue;
        }
    }

    $complaints[] = $complaint;
}

sendJson(true, 'Complaints fetched successfully', $complaints);
