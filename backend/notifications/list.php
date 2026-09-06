<?php
/* ==========================================================================
   Campus Connect - Notifications List Endpoint
   backend/notifications/list.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

$currentUser = getAuthUser();
$data = getRequestData();
$db = getDbConnection();

$role = $currentUser['role'] ?? strtolower(trim($data['role'] ?? ''));

if (!$currentUser && empty($data['gr']) && empty($data['grNo']) && empty($data['dept']) && empty($data['techId']) && $role !== 'admin') {
    sendJson(true, 'No notifications for unauthenticated user', []);
}

if ($role === 'student') {
    $gr = $currentUser['grNo'] ?? $currentUser['identifier'] ?? trim($data['gr'] ?? $data['grNo'] ?? '');
    if ($gr === '') {
        sendJson(true, 'Missing student identifier', []);
    }
    $stmt = $db->prepare("
        SELECT * FROM notifications 
        WHERE for_gr = ? OR (for_gr IS NULL AND for_dept IS NULL AND for_tech IS NULL AND for_role IS NULL)
        ORDER BY id DESC LIMIT 50
    ");
    $stmt->execute([$gr]);
} elseif ($role === 'faculty') {
    $dept = $currentUser['dept'] ?? trim($data['dept'] ?? '');
    $stmt = $db->prepare("
        SELECT * FROM notifications 
        WHERE for_dept = ? OR for_role = 'faculty' OR (for_gr IS NULL AND for_dept IS NULL AND for_tech IS NULL AND for_role IS NULL)
        ORDER BY id DESC LIMIT 50
    ");
    $stmt->execute([$dept]);
} elseif ($role === 'technician') {
    $techId = $currentUser['techId'] ?? $currentUser['identifier'] ?? trim($data['techId'] ?? $data['id'] ?? '');
    $stmt = $db->prepare("
        SELECT * FROM notifications 
        WHERE for_tech = ? OR for_role = 'technician' OR (for_gr IS NULL AND for_dept IS NULL AND for_tech IS NULL AND for_role IS NULL)
        ORDER BY id DESC LIMIT 50
    ");
    $stmt->execute([$techId]);
} else {
    // Admin sees all notifications
    $stmt = $db->query("SELECT * FROM notifications ORDER BY id DESC LIMIT 50");
}

$notificationsRaw = $stmt->fetchAll();

$notifications = [];
foreach ($notificationsRaw as $n) {
    $notifications[] = [
        'id'      => $n['id'],
        'forGr'   => $n['for_gr'],
        'forDept' => $n['for_dept'],
        'forTech' => $n['for_tech'],
        'text'    => $n['text'],
        'time'    => $n['time'],
        'read'    => (bool)$n['is_read']
    ];
}

sendJson(true, 'Notifications retrieved', $notifications);
