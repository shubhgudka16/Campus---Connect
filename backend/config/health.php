<?php
/* ==========================================================================
   Campus Connect - Development Health & Diagnostic Check Endpoint
   backend/config/health.php
   ========================================================================== */

header('Content-Type: application/json; charset=utf-8');

$php = true;
$database = false;
$users_table = false;
$success = false;

try {
    require_once __DIR__ . '/database.php';
    $db = getDbConnection();
    $database = true;

    // Check if the users table exists
    $stmt = $db->query("SHOW TABLES LIKE 'users'");
    if ($stmt && $stmt->fetch()) {
        $users_table = true;
        $success = true;
    }
} catch (Throwable $e) {
    error_log("Health check failure: " . $e->getMessage());
}

$httpStatus = $success ? 200 : 500;
http_response_code($httpStatus);

echo json_encode([
    'success'     => $success,
    'php'         => $php,
    'database'    => $database,
    'users_table' => $users_table
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
exit;
