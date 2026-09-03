<?php
/* ==========================================================================
   Campus Connect - Logout Endpoint
   backend/auth/logout.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

$_SESSION = [];

if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

session_destroy();

sendJson(true, 'Logged out successfully');
