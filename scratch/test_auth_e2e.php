<?php
/**
 * Verification Script: Test PHP + MySQL Authentication & Session under XAMPP Apache
 */

$baseUrl = 'http://localhost/Campus%20-%20Connect';

function testRequest($url, $method = 'GET', $data = null, $cookie = '') {
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
echo "CAMPUS CONNECT - AUTHENTICATION & XAMPP INTEGRATION TEST\n";
echo "Target Base URL: $baseUrl\n";
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

// 1. Health Endpoint
$res = testRequest("$baseUrl/backend/config/health.php");
check("1. Health Endpoint", $res['code'] === 200 && ($res['body']['success'] ?? false) === true, json_encode($res['body']));

// 2. Student Valid Login
$res = testRequest("$baseUrl/backend/auth/login.php", 'POST', [
    'role' => 'student',
    'stuGr' => '1001',
    'stuPass' => 'password'
]);
$studentCookie = $res['cookie'];
check("2. Student Valid Login (1001 / password)", $res['code'] === 200 && ($res['body']['success'] ?? false) === true && ($res['body']['data']['session']['name'] ?? '') === 'Kabir Mehta', json_encode($res['body']));

// 3. Student Invalid Login
$res = testRequest("$baseUrl/backend/auth/login.php", 'POST', [
    'role' => 'student',
    'stuGr' => '1001',
    'stuPass' => 'wrongpassword'
]);
check("3. Student Invalid Login -> 401 Credential Error", $res['code'] === 401 && ($res['body']['message'] ?? '') === 'Invalid G.R. Number or Password', json_encode($res['body']));

// 4. Faculty Valid Login
$res = testRequest("$baseUrl/backend/auth/login.php", 'POST', [
    'role' => 'faculty',
    'facDept' => 'Computer Department',
    'facPass' => 'password'
]);
check("4. Faculty Valid Login (Computer Department / password)", $res['code'] === 200 && ($res['body']['success'] ?? false) === true, json_encode($res['body']));

// 5. Faculty Invalid Login
$res = testRequest("$baseUrl/backend/auth/login.php", 'POST', [
    'role' => 'faculty',
    'facDept' => 'Computer Department',
    'facPass' => 'wrongpass'
]);
check("5. Faculty Invalid Login -> 401 Credential Error", $res['code'] === 401 && ($res['body']['message'] ?? '') === 'Invalid Faculty Credentials', json_encode($res['body']));

// 6. Technician Valid Login
$res = testRequest("$baseUrl/backend/auth/login.php", 'POST', [
    'role' => 'technician',
    'techId' => 'TECH-01',
    'techPass' => 'password'
]);
check("6. Technician Valid Login (TECH-01 / password)", $res['code'] === 200 && ($res['body']['success'] ?? false) === true && ($res['body']['data']['session']['name'] ?? '') === 'Dilip Prasad', json_encode($res['body']));

// 7. Technician Invalid Login
$res = testRequest("$baseUrl/backend/auth/login.php", 'POST', [
    'role' => 'technician',
    'techId' => 'TECH-01',
    'techPass' => 'badpass'
]);
check("7. Technician Invalid Login -> 401 Credential Error", $res['code'] === 401 && ($res['body']['message'] ?? '') === 'Invalid Technician credentials', json_encode($res['body']));

// 8. Admin Valid Login
$res = testRequest("$baseUrl/backend/auth/login.php", 'POST', [
    'role' => 'admin',
    'adminUser' => 'admin',
    'adminPass' => 'admin123'
]);
$adminCookie = $res['cookie'];
check("8. Admin Valid Login (admin / admin123)", $res['code'] === 200 && ($res['body']['success'] ?? false) === true, json_encode($res['body']));

// 9. Admin Invalid Login
$res = testRequest("$baseUrl/backend/auth/login.php", 'POST', [
    'role' => 'admin',
    'adminUser' => 'admin',
    'adminPass' => 'wrongpass'
]);
check("9. Admin Invalid Login -> 401 Credential Error", $res['code'] === 401 && ($res['body']['message'] ?? '') === 'Admin Credentials Invalid', json_encode($res['body']));

// 10. Session Verification with Student Cookie
$res = testRequest("$baseUrl/backend/auth/session.php", 'GET', null, $studentCookie);
check("10. Session Persistence (session.php with cookie)", $res['code'] === 200 && ($res['body']['success'] ?? false) === true && ($res['body']['data']['session']['identifier'] ?? '') === '1001', json_encode($res['body']));

// 11. Admin Dashboard with Admin Cookie
$res = testRequest("$baseUrl/backend/admin/dashboard.php", 'GET', null, $adminCookie);
check("11. Admin Dashboard Access with Admin Session Cookie", $res['code'] === 200 && ($res['body']['success'] ?? false) === true && isset($res['body']['data']['total']), json_encode($res['body']));

// 12. Student Logout
$res = testRequest("$baseUrl/backend/auth/logout.php", 'POST', null, $studentCookie);
check("12. Logout (logout.php)", $res['code'] === 200 && ($res['body']['success'] ?? false) === true, json_encode($res['body']));

// 13. Verify Session is gone after Logout
$res = testRequest("$baseUrl/backend/auth/session.php", 'GET', null, $studentCookie);
check("13. Session Invalidated After Logout", ($res['body']['success'] ?? true) === false, json_encode($res['body']));

echo "\n=======================================================\n";
if ($allPassed) {
    echo ">>> ALL 13 TEST CASES PASSED SUCCESSFULLY! <<<\n";
} else {
    echo ">>> SOME TESTS FAILED! CHECK OUTPUT ABOVE. <<<\n";
}
echo "=======================================================\n";
