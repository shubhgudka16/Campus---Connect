<?php
/* ==========================================================================
   Campus Connect - Central Database & Application Configuration
   backend/config/database.php
   ========================================================================== */

// Set default timezone for consistent timestamping
date_default_timezone_set('Asia/Kolkata');

// Start PHP Session safely
if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
    // 15-minute SLA matching frontend SESSION_SLA_MS
    @ini_set('session.gc_maxlifetime', '900');
    @session_set_cookie_params([
        'lifetime' => 900,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    @session_start();
} elseif (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

// Database Credentials
define('DB_HOST', 'localhost');
define('DB_NAME', 'campus_connect');
define('DB_USER', 'root');
define('DB_PASS', '');

/**
 * Returns a singleton PDO database connection instance.
 */
function getDbConnection(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            sendJson(false, 'Database connection failed: ' . $e->getMessage(), null, 500);
        }
    }
    return $pdo;
}

/**
 * Standard JSON Response Sender
 */
function sendJson(bool $success, string $message, $data = null, int $httpCode = 200): void {
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($httpCode);
    }
    $response = [
        'success' => $success,
        'message' => $message
    ];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Returns current authenticated session user or null.
 */
function getAuthUser(): ?array {
    if (isset($_SESSION['campus_session']) && is_array($_SESSION['campus_session'])) {
        // Check session expiration
        if (isset($_SESSION['campus_session']['expiresAt']) && $_SESSION['campus_session']['expiresAt'] <= time() * 1000) {
            unset($_SESSION['campus_session']);
            return null;
        }
        return $_SESSION['campus_session'];
    }
    return null;
}

/**
 * Require active authentication or fail with 401
 */
function requireAuth(): array {
    $user = getAuthUser();
    if (!$user) {
        sendJson(false, 'Unauthorized. Please sign in to continue.', null, 401);
    }
    return $user;
}

/**
 * Require specific role or fail with 403
 */
function requireRole($roles): array {
    $user = requireAuth();
    $allowed = is_array($roles) ? $roles : [$roles];
    if (!in_array($user['role'], $allowed, true)) {
        sendJson(false, 'Access denied: insufficient permissions for this operation.', null, 403);
    }
    return $user;
}

/**
 * Formats current date and time matching the existing frontend (DD/MM/YYYY hh:mm AM/PM).
 */
function formatNowStr(): string {
    return date('d/m/Y h:i A');
}

/**
 * Parses JSON body or returns POST variables.
 */
function getRequestData(): array {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') !== false) {
        $raw = file_get_contents('php://input');
        $json = json_decode($raw, true);
        return is_array($json) ? $json : [];
    }
    return array_merge($_GET, $_POST);
}

/**
 * Inserts a log entry into complaint_logs
 */
function addComplaintLog(PDO $db, string $complaintId, string $stageTitle, string $note, string $actionBy, ?string $actionTime = null): void {
    $time = $actionTime ?: formatNowStr();
    $stmt = $db->prepare("INSERT INTO complaint_logs (complaint_id, stage_title, note, action_by, action_time) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$complaintId, $stageTitle, $note, $actionBy, $time]);
}

/**
 * Inserts a notification into notifications
 */
function addNotification(PDO $db, ?string $forGr, ?string $forDept, ?string $forTech, ?string $forRole, ?string $complaintId, string $text, ?string $time = null): string {
    $id = 'N' . round(microtime(true) * 1000);
    $timeStr = $time ?: formatNowStr();
    $stmt = $db->prepare("INSERT INTO notifications (id, for_gr, for_dept, for_tech, for_role, complaint_id, text, time, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)");
    $stmt->execute([$id, $forGr, $forDept, $forTech, $forRole, $complaintId, $text, $timeStr]);
    return $id;
}

/**
 * Securely saves an uploaded file or base64 data to backend/uploads/
 */
function saveUploadedFile(string $inputName, array $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'avi']): ?string {
    // 1. Check direct $_FILES upload
    if (isset($_FILES[$inputName]) && $_FILES[$inputName]['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES[$inputName];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExtensions, true)) {
            return null;
        }

        $uploadDir = dirname(__DIR__) . '/uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $filename = uniqid('up_', true) . '.' . $ext;
        $destPath = $uploadDir . $filename;

        if (move_uploaded_file($file['tmp_name'], $destPath)) {
            return 'backend/uploads/' . $filename;
        }
    }

    // 2. Check base64 encoded data URI string from POST/JSON
    $data = getRequestData();
    if (!empty($data[$inputName]) && is_string($data[$inputName]) && strpos($data[$inputName], 'data:') === 0) {
        $base64Str = $data[$inputName];
        if (preg_match('/^data:(image|video)\/([a-zA-Z0-9\+\-\.]+);base64,(.+)$/', $base64Str, $matches)) {
            $type = $matches[1];
            $ext = strtolower($matches[2]);
            if ($ext === 'jpeg') $ext = 'jpg';
            if ($ext === 'quicktime') $ext = 'mov';
            
            $base64Decoded = base64_decode($matches[3]);
            if ($base64Decoded !== false) {
                $uploadDir = dirname(__DIR__) . '/uploads/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }
                $filename = uniqid('up_', true) . '.' . $ext;
                file_put_contents($uploadDir . $filename, $base64Decoded);
                return 'backend/uploads/' . $filename;
            }
        }
    }

    // If input was already a valid URL or path, keep it
    if (!empty($data[$inputName]) && is_string($data[$inputName]) && (strpos($data[$inputName], 'http') === 0 || strpos($data[$inputName], 'backend/uploads/') === 0)) {
        return $data[$inputName];
    }

    return null;
}
