<?php
/**
 * Test Suite: Complaint Persistence & MySQL Source of Truth
 */

$baseUrl = 'http://localhost/Campus%20-%20Connect';

function makeCurlRequest($url, $method = 'GET', $data = null, $cookie = '') {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    if ($cookie) {
        curl_setopt($ch, CURLOPT_COOKIE, $cookie);
    }

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($data !== null) {
            $json = json_encode($data);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($json)
            ]);
        }
    }

    $raw = curl_exec($ch);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err) {
        return ['error' => $err, 'code' => 0];
    }

    $headerStr = substr($raw, 0, $headerSize);
    $bodyStr = substr($raw, $headerSize);

    preg_match_all('/^Set-Cookie:\s*([^;]*)/mi', $headerStr, $matches);
    $cookies = [];
    if (!empty($matches[1])) {
        foreach ($matches[1] as $c) {
            $cookies[] = $c;
        }
    }

    return [
        'code' => $httpCode,
        'cookie' => implode('; ', $cookies),
        'body' => json_decode($bodyStr, true) ?? $bodyStr
    ];
}

echo "=======================================================\n";
echo "CAMPUS CONNECT - COMPLAINT PERSISTENCE VERIFICATION\n";
echo "=======================================================\n\n";

$allPassed = true;

function check($title, $condition, $details = "") {
    global $allPassed;
    if ($condition) {
        echo "[PASS] $title\n";
    } else {
        echo "[FAIL] $title: $details\n";
        $allPassed = false;
    }
}

// ----------------------------------------------------
// TEST 1: Login as student 1001 & create a new complaint
// ----------------------------------------------------
$loginRes = makeCurlRequest("$baseUrl/backend/auth/login.php", 'POST', [
    'role' => 'student',
    'stuGr' => '1001',
    'stuPass' => 'password'
]);
$sessCookie1 = $loginRes['cookie'];
check("Step 1.1: Student 1001 Login", $loginRes['code'] === 200 && ($loginRes['body']['success'] ?? false) === true);

$uniqueTitle = "Water Leakage in Lab 204 - " . rand(1000, 9999);
$createRes = makeCurlRequest("$baseUrl/backend/complaints/create.php", 'POST', [
    'title' => $uniqueTitle,
    'category' => 'Civil Department',
    'priority' => 'Medium',
    'location' => 'Main Academic Block 2nd Floor',
    'description' => 'Ceiling tile is dripping water near workstation 14.',
    'image' => '',
    'video' => ''
], $sessCookie1);

$createdId = $createRes['body']['data']['complaint']['id'] ?? $createRes['body']['data']['id'] ?? null;
check("Step 1.2: Complaint Creation via create.php", $createRes['code'] === 201 && ($createRes['body']['success'] ?? false) === true && !empty($createdId), json_encode($createRes['body']));
echo "      -> Created Ticket ID: $createdId\n";

// Fetch complaints for student 1001
$listRes1 = makeCurlRequest("$baseUrl/backend/complaints/list.php?role=student", 'GET', null, $sessCookie1);
$foundInList1 = false;
if (is_array($listRes1['body']['data'] ?? null)) {
    foreach ($listRes1['body']['data'] as $c) {
        if (($c['id'] ?? '') === $createdId) {
            $foundInList1 = true;
            break;
        }
    }
}
check("Step 1.3: New Complaint appears in list.php for Student 1001", $foundInList1 === true, "Ticket $createdId not found in list");

// ----------------------------------------------------
// TEST 2: Simulate Page Refresh
// ----------------------------------------------------
$listRes2 = makeCurlRequest("$baseUrl/backend/complaints/list.php?role=student", 'GET', null, $sessCookie1);
$foundInList2 = false;
if (is_array($listRes2['body']['data'] ?? null)) {
    foreach ($listRes2['body']['data'] as $c) {
        if (($c['id'] ?? '') === $createdId) {
            $foundInList2 = true;
            break;
        }
    }
}
check("TEST 2: Complaint persists across page refresh", $foundInList2 === true);

// ----------------------------------------------------
// TEST 3: Logout and Login Again
// ----------------------------------------------------
$logoutRes = makeCurlRequest("$baseUrl/backend/auth/logout.php", 'POST', null, $sessCookie1);
check("Step 3.1: Student Logout", $logoutRes['code'] === 200 && ($logoutRes['body']['success'] ?? false) === true);

// Verify session is invalidated
$sessCheck = makeCurlRequest("$baseUrl/backend/auth/session.php", 'GET', null, $sessCookie1);
check("Step 3.2: Session invalidated after logout", ($sessCheck['body']['success'] ?? true) === false);

// Login again with fresh session
$loginRes2 = makeCurlRequest("$baseUrl/backend/auth/login.php", 'POST', [
    'role' => 'student',
    'stuGr' => '1001',
    'stuPass' => 'password'
]);
$sessCookie2 = $loginRes2['cookie'];
check("Step 3.3: Re-login as Student 1001", $loginRes2['code'] === 200 && ($loginRes2['body']['success'] ?? false) === true);

// Fetch complaints with the new session
$listRes3 = makeCurlRequest("$baseUrl/backend/complaints/list.php?role=student", 'GET', null, $sessCookie2);
$foundInList3 = false;
if (is_array($listRes3['body']['data'] ?? null)) {
    foreach ($listRes3['body']['data'] as $c) {
        if (($c['id'] ?? '') === $createdId) {
            $foundInList3 = true;
            break;
        }
    }
}
check("TEST 3: Complaint persists after logout & re-login", $foundInList3 === true);

// ----------------------------------------------------
// TEST 4: Direct MySQL Verification
// ----------------------------------------------------
require_once __DIR__ . '/../backend/config/database.php';
$db = getDbConnection();
$stmt = $db->prepare("SELECT * FROM complaints WHERE id = ?");
$stmt->execute([$createdId]);
$dbRow = $stmt->fetch();

check("TEST 4.1: Direct MySQL row exists in campus_connect.complaints", $dbRow !== false && $dbRow['id'] === $createdId);
check("TEST 4.2: MySQL row has correct reported_by_gr = '1001'", ($dbRow['reported_by_gr'] ?? '') === '1001');
check("TEST 4.3: MySQL row has status = 'Complaint Submitted'", ($dbRow['status'] ?? '') === 'Complaint Submitted');

$logStmt = $db->prepare("SELECT * FROM complaint_logs WHERE complaint_id = ?");
$logStmt->execute([$createdId]);
$dbLogs = $logStmt->fetchAll();
check("TEST 4.4: Complaint audit log recorded in complaint_logs", count($dbLogs) > 0);

// ----------------------------------------------------
// TEST 5: Ownership Scoping Check
// ----------------------------------------------------
// Login as student 1002 (Ananya Iyer)
$loginRes1002 = makeCurlRequest("$baseUrl/backend/auth/login.php", 'POST', [
    'role' => 'student',
    'stuGr' => '1002',
    'stuPass' => 'password'
]);
$sessCookie1002 = $loginRes1002['cookie'];

$listRes1002 = makeCurlRequest("$baseUrl/backend/complaints/list.php?role=student", 'GET', null, $sessCookie1002);
$foundInStudent1002 = false;
if (is_array($listRes1002['body']['data'] ?? null)) {
    foreach ($listRes1002['body']['data'] as $c) {
        if (($c['id'] ?? '') === $createdId) {
            $foundInStudent1002 = true;
            break;
        }
    }
}
check("TEST 5: Ownership check - Student 1002 CANNOT see Student 1001's complaint", $foundInStudent1002 === false);

echo "\n=======================================================\n";
if ($allPassed) {
    echo ">>> ALL PERSISTENCE TESTS PASSED SUCCESSFULLY! <<<\n";
    echo ">>> COMPLAINT PERSISTENCE IN MYSQL CONFIRMED! <<<\n";
} else {
    echo ">>> SOME PERSISTENCE TESTS FAILED! <<<\n";
}
echo "=======================================================\n";
