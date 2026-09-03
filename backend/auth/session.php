<?php
/* ==========================================================================
   Campus Connect - Session Verification Endpoint
   backend/auth/session.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

$session = getAuthUser();

if (!$session) {
    sendJson(false, 'No active session', null, 200);
}

// Refresh from database to ensure up-to-date attributes
$db = getDbConnection();
$stmt = $db->prepare("SELECT * FROM users WHERE identifier = ? AND role = ?");
$stmt->execute([$session['identifier'], $session['role']]);
$user = $stmt->fetch();

if (!$user || !empty($user['is_suspended']) || (isset($user['is_active']) && $user['is_active'] == 0)) {
    unset($_SESSION['campus_session']);
    sendJson(false, 'Account suspended or inactive', null, 403);
}

// Refresh session data
$session['name'] = $user['name'];
$session['dept'] = $user['department'];
$session['avatar'] = $user['avatar'];
$session['warned'] = (bool)$user['is_warned'];
$session['suspended'] = (bool)$user['is_suspended'];
if ($user['role'] === 'technician') {
    $session['experience'] = (int)($user['experience'] ?? 0);
    $session['rating'] = (float)($user['rating'] ?? 5.0);
}

$_SESSION['campus_session'] = $session;

sendJson(true, 'Active session found', [
    'session' => $session
]);
