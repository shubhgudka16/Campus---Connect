<?php
/* ==========================================================================
   Campus Connect - Admin Dashboard & Analytics Endpoint
   backend/admin/dashboard.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

$currentUser = requireRole(['admin']);
$db = getDbConnection();

// Total complaints
$totalStmt = $db->query("SELECT COUNT(*) as total FROM complaints");
$total = (int)$totalStmt->fetch()['total'];

// Closed / Completed complaints
$closedStmt = $db->query("SELECT COUNT(*) as closed FROM complaints WHERE stage = 7 OR status = 'Completed'");
$closed = (int)$closedStmt->fetch()['closed'];

$resolutionRate = $total > 0 ? round(($closed / $total) * 100) : 0;

// Active staff count
$staffStmt = $db->query("SELECT COUNT(*) as staff_count FROM users WHERE role = 'technician' AND is_active = 1");
$activeStaff = (int)$staffStmt->fetch()['staff_count'];

// Average technician rating
$ratingStmt = $db->query("SELECT AVG(rating) as avg_rating FROM users WHERE role = 'technician' AND rating > 0");
$avgRating = round((float)($ratingStmt->fetch()['avg_rating'] ?: 5.0), 1);

// Complaints by Department
$depts = ['Computer Department', 'Electrical Department', 'Mechanical Department', 'Civil Department'];
$deptCounts = [];
foreach ($depts as $dept) {
    $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM complaints WHERE category = ?");
    $stmt->execute([$dept]);
    $deptCounts[$dept] = (int)$stmt->fetch()['cnt'];
}

// Complaints by Stage / Status
$statusCounts = [
    'Submitted'        => (int)$db->query("SELECT COUNT(*) FROM complaints WHERE stage = 1 OR status = 'Complaint Submitted'")->fetchColumn(),
    'AssignedFaculty'  => (int)$db->query("SELECT COUNT(*) FROM complaints WHERE stage = 2 OR status = 'Assigned to Faculty'")->fetchColumn(),
    'AssignedTech'     => (int)$db->query("SELECT COUNT(*) FROM complaints WHERE stage = 3 OR status = 'Assigned to Technician'")->fetchColumn(),
    'WorkInProgress'   => (int)$db->query("SELECT COUNT(*) FROM complaints WHERE stage = 4 OR status = 'Work in Progress'")->fetchColumn(),
    'TechCompleted'    => (int)$db->query("SELECT COUNT(*) FROM complaints WHERE stage = 5 OR status = 'Work Completed by Technician'")->fetchColumn(),
    'FacultyVerified'  => (int)$db->query("SELECT COUNT(*) FROM complaints WHERE stage = 6 OR status = 'Faculty Verified'")->fetchColumn(),
    'Completed'        => (int)$db->query("SELECT COUNT(*) FROM complaints WHERE stage = 7 OR status = 'Completed'")->fetchColumn(),
];

sendJson(true, 'Admin dashboard metrics retrieved', [
    'total'          => $total,
    'closed'         => $closed,
    'resolutionRate' => $resolutionRate . '%',
    'avgSla'         => '15 Mins',
    'avgRating'      => $avgRating . '★',
    'activeStaff'    => $activeStaff,
    'deptCounts'     => $deptCounts,
    'statusCounts'   => $statusCounts
]);
