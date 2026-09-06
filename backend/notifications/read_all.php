<?php
/* ==========================================================================
   Campus Connect - Mark All Notifications Read Endpoint
   backend/notifications/read_all.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

<<<<<<< HEAD
$currentUser = getAuthUser();
$data = getRequestData();
$db = getDbConnection();
$role = $currentUser['role'] ?? strtolower(trim($data['role'] ?? ''));

if (!$currentUser && empty($data['gr']) && empty($data['grNo']) && empty($data['dept']) && empty($data['techId']) && $role !== 'admin') {
    $currentUser = requireAuth();
}

if ($role === 'student') {
    $gr = $currentUser['grNo'] ?? $currentUser['identifier'] ?? trim($data['gr'] ?? $data['grNo'] ?? '');
=======
$currentUser = requireAuth();
$db = getDbConnection();
$role = $currentUser['role'];

if ($role === 'student') {
    $gr = $currentUser['grNo'] ?? $currentUser['identifier'];
>>>>>>> baf232aab9c275c023da3aba876ce3c025ea996e
    $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE for_gr = ? OR (for_gr IS NULL AND for_dept IS NULL AND for_tech IS NULL AND for_role IS NULL)");
    $stmt->execute([$gr]);
} elseif ($role === 'faculty') {
    $dept = $currentUser['dept'] ?? '';
    $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE for_dept = ? OR (for_gr IS NULL AND for_dept IS NULL AND for_tech IS NULL AND for_role IS NULL)");
    $stmt->execute([$dept]);
} elseif ($role === 'technician') {
    $techId = $currentUser['techId'] ?? $currentUser['identifier'];
    $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE for_tech = ? OR (for_gr IS NULL AND for_dept IS NULL AND for_tech IS NULL AND for_role IS NULL)");
    $stmt->execute([$techId]);
} else {
    // Admin marks all read
    $db->query("UPDATE notifications SET is_read = 1");
}

sendJson(true, 'Notifications marked read.');
