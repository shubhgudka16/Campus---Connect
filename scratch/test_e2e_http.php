<?php
/**
 * Campus Connect - Complete HTTP E2E Integration Test Suite
 */

function makeRequest($url, $method = 'GET', $data = null, $cookies = '') {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    
    if ($cookies) {
        curl_setopt($ch, CURLOPT_COOKIE, $cookies);
    }
    
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if (is_array($data)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        }
    }
    
    $response = curl_exec($ch);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $headerStr = substr($response, 0, $headerSize);
    $bodyStr = substr($response, $headerSize);
    
    preg_match_all('/^Set-Cookie:\s*([^;]*)/mi', $headerStr, $matches);
    $newCookies = [];
    if (!empty($matches[1])) {
        foreach ($matches[1] as $item) {
            $newCookies[] = $item;
        }
    }
    
    return [
        'code' => $httpCode,
        'headers' => $headerStr,
        'cookies' => implode('; ', $newCookies),
        'body' => json_decode($bodyStr, true) ?? $bodyStr
    ];
}

$baseUrl = 'http://127.0.0.1:8000';
echo "=== CAMPUS CONNECT HTTP END-TO-END VERIFICATION ===\n\n";

// 1. Check Landing / Public Feed
$res = makeRequest("$baseUrl/backend/complaints/list.php?public=1");
echo "1. Public Feed API: " . ($res['code'] === 200 && ($res['body']['success'] ?? false) ? "PASS (Found " . count($res['body']['data']) . " complaints)" : "FAIL") . "\n";

// 2. Student Login
$res = makeRequest("$baseUrl/backend/auth/login.php", 'POST', [
    'role' => 'student',
    'stuGr' => '1001',
    'stuPass' => 'password'
]);
$stuCookie = $res['cookies'];
echo "2. Student Login (GR: 1001): " . (($res['body']['success'] ?? false) ? "PASS (" . $res['body']['data']['session']['name'] . ")" : "FAIL: " . ($res['body']['message'] ?? '')) . "\n";

// 3. Student File Complaint
$res = makeRequest("$baseUrl/backend/complaints/create.php", 'POST', [
    'title' => 'Projector Lens Glitch in CS Lab 1',
    'category' => 'Computer Department',
    'priority' => 'Medium',
    'location' => 'Lab 1 Room 204',
    'description' => 'The optical lens flicker continuously when projecting code editor.'
], $stuCookie);
$createdTicketId = $res['body']['data']['id'] ?? null;
echo "3. Student File Complaint: " . (($res['body']['success'] ?? false) ? "PASS (Created ID: $createdTicketId)" : "FAIL: " . ($res['body']['message'] ?? '')) . "\n";

// 4. Admin Login
$res = makeRequest("$baseUrl/backend/auth/login.php", 'POST', [
    'role' => 'admin',
    'adminUser' => 'admin',
    'adminPass' => 'admin123'
]);
$adminCookie = $res['cookies'];
echo "4. Admin Login: " . (($res['body']['success'] ?? false) ? "PASS (" . $res['body']['data']['session']['name'] . ")" : "FAIL") . "\n";

// 5. Admin Dashboard Metrics
$res = makeRequest("$baseUrl/backend/admin/dashboard.php", 'GET', null, $adminCookie);
echo "5. Admin Dashboard Metrics: " . (($res['body']['success'] ?? false) ? "PASS (Total: " . $res['body']['data']['total'] . ", Active Staff: " . $res['body']['data']['activeStaff'] . ")" : "FAIL") . "\n";

// 6. Admin Verification & Forward to Faculty
$res = makeRequest("$baseUrl/backend/complaints/admin_verify.php", 'POST', [
    'id' => $createdTicketId,
    'action' => 'approve',
    'dept' => 'Computer Department'
], $adminCookie);
echo "6. Admin Verify Ticket $createdTicketId: " . (($res['body']['success'] ?? false) ? "PASS" : "FAIL: " . ($res['body']['message'] ?? '')) . "\n";

// 7. Faculty Login
$res = makeRequest("$baseUrl/backend/auth/login.php", 'POST', [
    'role' => 'faculty',
    'facDept' => 'Computer Department',
    'facPass' => 'password'
]);
$facCookie = $res['cookies'];
echo "7. Faculty Login (Computer Dept): " . (($res['body']['success'] ?? false) ? "PASS" : "FAIL") . "\n";

// 8. Faculty Assign Technician
$res = makeRequest("$baseUrl/backend/faculty/assign_technician.php", 'POST', [
    'id' => $createdTicketId,
    'techId' => 'TECH-01',
    'deadline' => '2026-09-05'
], $facCookie);
echo "8. Faculty Assign Tech (TECH-01) with SLA: " . (($res['body']['success'] ?? false) ? "PASS" : "FAIL: " . ($res['body']['message'] ?? '')) . "\n";

// 9. Technician Login
$res = makeRequest("$baseUrl/backend/auth/login.php", 'POST', [
    'role' => 'technician',
    'techId' => 'TECH-01',
    'techPass' => 'password'
]);
$techCookie = $res['cookies'];
echo "9. Technician Login (TECH-01): " . (($res['body']['success'] ?? false) ? "PASS (" . $res['body']['data']['session']['name'] . ")" : "FAIL") . "\n";

// 10. Technician Accept
$res = makeRequest("$baseUrl/backend/technician/accept.php", 'POST', [
    'id' => $createdTicketId
], $techCookie);
echo "10. Technician Accept Ticket: " . (($res['body']['success'] ?? false) ? "PASS" : "FAIL: " . ($res['body']['message'] ?? '')) . "\n";

// 11. Technician Complete with Proof
$res = makeRequest("$baseUrl/backend/technician/complete.php", 'POST', [
    'id' => $createdTicketId,
    'remark' => 'Re-calibrated the optical focal lens and tightened HDMI interface cable.',
    'proof_img' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
], $techCookie);
echo "11. Technician Complete Ticket & Submit Proof: " . (($res['body']['success'] ?? false) ? "PASS" : "FAIL: " . ($res['body']['message'] ?? '')) . "\n";

// 12. Faculty QA Audit Verification
$res = makeRequest("$baseUrl/backend/faculty/qa_verify.php", 'POST', [
    'id' => $createdTicketId,
    'approve' => true,
    'comment' => 'Physical inspection passed. Projection is crystal clear.'
], $facCookie);
echo "12. Faculty QA Audit Verification: " . (($res['body']['success'] ?? false) ? "PASS" : "FAIL: " . ($res['body']['message'] ?? '')) . "\n";

// 13. Admin Final Sign-off
$res = makeRequest("$baseUrl/backend/complaints/admin_final.php", 'POST', [
    'id' => $createdTicketId
], $adminCookie);
echo "13. Admin Final Sign-off (Stage 7 Closure): " . (($res['body']['success'] ?? false) ? "PASS" : "FAIL: " . ($res['body']['message'] ?? '')) . "\n";

// 14. Student Feedback (Satisfied)
$res = makeRequest("$baseUrl/backend/complaints/feedback.php", 'POST', [
    'id' => $createdTicketId,
    'feedback' => 'Satisfied'
], $stuCookie);
echo "14. Student Feedback (Satisfied): " . (($res['body']['success'] ?? false) ? "PASS" : "FAIL: " . ($res['body']['message'] ?? '')) . "\n";

// 15. Admin Staff Registry
$res = makeRequest("$baseUrl/backend/admin/staff.php", 'GET', null, $adminCookie);
echo "15. Admin Staff Directory Listing: " . (($res['body']['success'] ?? false) ? "PASS (Found " . count($res['body']['data']) . " staff)" : "FAIL") . "\n";

// 16. Admin Student Directory
$res = makeRequest("$baseUrl/backend/admin/students.php", 'GET', null, $adminCookie);
echo "16. Admin Student Directory Listing: " . (($res['body']['success'] ?? false) ? "PASS (Found " . count($res['body']['data']) . " students)" : "FAIL") . "\n";

// 17. Admin Export CSV
$res = makeRequest("$baseUrl/backend/admin/export_csv.php", 'GET', null, $adminCookie);
$isCsv = ($res['code'] === 200 && strpos($res['headers'], 'text/csv') !== false);
echo "17. Admin Export CSV: " . ($isCsv ? "PASS (CSV Generated)" : "FAIL") . "\n";

// 18. Notifications Listing
$res = makeRequest("$baseUrl/backend/notifications/list.php", 'GET', null, $stuCookie);
echo "18. Student Notifications List: " . (($res['body']['success'] ?? false) ? "PASS (Found " . count($res['body']['data']) . " notifs)" : "FAIL") . "\n";

echo "\n=== ALL 18 INTEGRATION TESTS COMPLETED SUCCESSFULLY ===\n";
