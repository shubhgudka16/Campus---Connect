<?php
/* ==========================================================================
   Campus Connect - Audited Operational Report CSV Export
   backend/admin/export_csv.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

$currentUser = requireRole(['admin']);
$db = getDbConnection();

$stmt = $db->query("SELECT * FROM complaints ORDER BY created_at DESC");
$complaints = $stmt->fetchAll();

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="Campus_Connect_Operational_Report_' . date('Y-m-d') . '.csv"');

$output = fopen('php://output', 'w');

// CSV Headers matching existing frontend export
fputcsv($output, [
    'Complaint ID',
    'Student Name',
    'Enrollment GR',
    'Department',
    'Complaint Title',
    'Technician',
    'Date Reported',
    'Date Solved',
    'Days Pending',
    'Current Status',
    'Feedback'
]);

foreach ($complaints as $c) {
    $solvedDate = ($c['stage'] == 7 || $c['status'] === 'Completed') 
        ? ($c['admin_final_date'] ?: $c['technician_completion_date'] ?: $c['reported_at']) 
        : 'N/A';

    $daysPending = 0;
    if ($c['stage'] < 7 && $c['status'] !== 'Completed') {
        $createdTs = strtotime($c['created_at']);
        if ($createdTs) {
            $daysPending = max(0, floor((time() - $createdTs) / (60 * 60 * 24)));
        }
    }

    fputcsv($output, [
        $c['id'],
        $c['reported_by'],
        $c['reported_by_gr'],
        $c['category'],
        $c['title'],
        $c['tech_name'] ?: 'Unassigned',
        $c['reported_at'],
        $solvedDate,
        $daysPending,
        $c['status'],
        $c['feedback'] ?: ''
    ]);
}

fclose($output);
exit;
