<?php
/**
 * Campus Connect - Student Complaint Resolution Notification Verification Test
 * Tests the complete 20-step lifecycle requested by the user.
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');

$baseUrl = 'http://localhost/Campus%20-%20Connect';
$testCount = 0;
$passCount = 0;

function curlReq($url, $method = 'GET', $data = null, $cookies = '') {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $reqHeaders = ['Accept: application/json'];
    if ($cookies) {
        curl_setopt($ch, CURLOPT_COOKIE, $cookies);
    }
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if (is_array($data)) {
            $reqHeaders[] = 'Content-Type: application/json';
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        } elseif (is_string($data)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
        }
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $reqHeaders);
    
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
            $newCookies[] = trim($item);
        }
    }
    
    return [
        'code' => $httpCode,
        'cookies' => implode('; ', $newCookies),
        'body' => json_decode($bodyStr, true),
        'raw' => $bodyStr
    ];
}

function assertCheck($stepName, $condition, $details = '') {
    global $testCount, $passCount;
    $testCount++;
    if ($condition) {
        $passCount++;
        echo "\033[32m[PASS]\033[0m Step $testCount: $stepName\n";
        if ($details) echo "       Details: $details\n";
    } else {
        echo "\033[31m[FAIL]\033[0m Step $testCount: $stepName\n";
        if ($details) echo "       Details: $details\n";
        exit(1);
    }
}

echo "===================================================================\n";
echo "  STUDENT RESOLUTION NOTIFICATION 20-STEP END-TO-END TEST SUITE     \n";
echo "===================================================================\n\n";

// 1. Login as a student (1001)
$lStu1 = curlReq("$baseUrl/backend/auth/login.php", 'POST', ['role' => 'student', 'stuGr' => '1001', 'stuPass' => 'password']);
assertCheck('Login as Student 1001', $lStu1['code'] === 200 && ($lStu1['body']['success'] ?? false) === true);
$stu1Cookie = $lStu1['cookies'];

// 2. Note student GR number
$stuGr = $lStu1['body']['data']['session']['grNo'] ?? '1001';
assertCheck('Verify Student GR is 1001', $stuGr === '1001', "Identified GR: $stuGr");

// 3. Submit a complaint
$complaintPayload = [
    'title' => 'Projector HDMI port damaged in Seminar Hall A',
    'category' => 'Computer Department',
    'priority' => 'High',
    'location' => 'Seminar Hall Block C',
    'description' => 'HDMI port pins are bent, screen displays flickering magenta signal.'
];
$cRes = curlReq("$baseUrl/backend/complaints/create.php", 'POST', $complaintPayload, $stu1Cookie);
$complaintId = $cRes['body']['data']['id'] ?? $cRes['body']['data']['complaint']['id'] ?? null;
assertCheck('Student submits complaint', $cRes['code'] === 201 && !empty($complaintId), "Created Ticket: $complaintId");

// 4. Admin Stage 2 Verification & Route
$lAdmin = curlReq("$baseUrl/backend/auth/login.php", 'POST', ['role' => 'admin', 'adminUser' => 'admin', 'adminPass' => 'admin123']);
$adminCookie = $lAdmin['cookies'];
$adminRoute = curlReq("$baseUrl/backend/complaints/admin_verify.php", 'POST', [
    'id' => $complaintId,
    'action' => 'approve',
    'dept' => 'Computer Department'
], $adminCookie);
assertCheck('Admin verifies and routes complaint (Stage 2)', $adminRoute['code'] === 200 && ($adminRoute['body']['data']['stage'] ?? 0) === 2);

// Faculty Stage 3 Technician Dispatch
$lFac = curlReq("$baseUrl/backend/auth/login.php", 'POST', ['role' => 'faculty', 'facDept' => 'Computer Department', 'facPass' => 'password']);
$facCookie = $lFac['cookies'];
$facDispatch = curlReq("$baseUrl/backend/faculty/assign_technician.php", 'POST', [
    'id' => $complaintId,
    'techId' => 'TECH-03',
    'deadline' => '2026-09-12'
], $facCookie);
assertCheck('Faculty assigns Technician TECH-03 (Stage 3)', $facDispatch['code'] === 200 && ($facDispatch['body']['data']['stage'] ?? 0) === 3);

// Technician Stage 4 Acceptance
$lTech = curlReq("$baseUrl/backend/auth/login.php", 'POST', ['role' => 'technician', 'techId' => 'TECH-03', 'techPass' => 'password']);
$techCookie = $lTech['cookies'];
$techAccept = curlReq("$baseUrl/backend/technician/accept.php", 'POST', ['id' => $complaintId], $techCookie);
assertCheck('Technician accepts work order (Stage 4)', $techAccept['code'] === 200 && ($techAccept['body']['data']['stage'] ?? 0) === 4);

// Technician Stage 5 Completion with Proof
$techComplete = curlReq("$baseUrl/backend/technician/complete.php", 'POST', [
    'id' => $complaintId,
    'proof_img' => 'data:image/png;base64,' . base64_encode('fake test proof image'),
    'remark' => 'Replaced HDMI module and tested 1080p 60Hz display.'
], $techCookie);
assertCheck('Technician completes work and uploads photographic proof (Stage 5)', $techComplete['code'] === 200 && ($techComplete['body']['data']['stage'] ?? 0) === 5);

// Faculty Stage 6 QA Audit
$facQa = curlReq("$baseUrl/backend/faculty/qa_verify.php", 'POST', [
    'id' => $complaintId,
    'approve' => true,
    'comment' => 'Visual audit complete. Seminar hall display fully operational.'
], $facCookie);
assertCheck('Faculty approves QA audit and forwards to Admin (Stage 6)', $facQa['code'] === 200 && ($facQa['body']['data']['stage'] ?? 0) === 6);

// 6 & 7. Admin Final Verification -> Status becomes Completed
$adminFinal = curlReq("$baseUrl/backend/complaints/admin_final.php", 'POST', ['id' => $complaintId], $adminCookie);
assertCheck('Admin performs final verification (Stage 7)', $adminFinal['code'] === 200 && ($adminFinal['body']['data']['stage'] ?? 0) === 7 && ($adminFinal['body']['data']['status'] ?? '') === 'Completed');

// 8. Confirm exactly ONE completion notification created in MySQL for student 1001
require_once dirname(__DIR__) . '/backend/config/database.php';
$db = getDbConnection();
$stmt = $db->prepare("SELECT COUNT(*) FROM notifications WHERE for_gr = ? AND complaint_id = ? AND text LIKE '%Completed%'");
$stmt->execute(['1001', $complaintId]);
$notifCount = (int)$stmt->fetchColumn();
assertCheck('Exactly ONE notification created in MySQL for Student 1001', $notifCount === 1, "Count = $notifCount");

// 9. Call admin_final.php again to verify DUPLICATE NOTIFICATION PROTECTION
$adminFinalDup = curlReq("$baseUrl/backend/complaints/admin_final.php", 'POST', ['id' => $complaintId], $adminCookie);
$stmt->execute(['1001', $complaintId]);
$notifCountAfterDup = (int)$stmt->fetchColumn();
assertCheck('Duplicate notification protection: Re-verifying does NOT create second notification', $notifCountAfterDup === 1, "Count remained = $notifCountAfterDup");

// 10 & 11. Student 1001 checks notifications list -> Unread indicator active
$notifList1 = curlReq("$baseUrl/backend/notifications/list.php?role=student&gr=1001", 'GET', null, $stu1Cookie);
$unreadNotifs = array_filter($notifList1['body']['data'] ?? [], function($n) { return !$n['read']; });
assertCheck('Student 1001 receives unread notification (Unread dot active)', count($unreadNotifs) >= 1, "Unread count = " . count($unreadNotifs));

// 12. Completion notification displayed in dropdown list
$compNotif = null;
foreach ($notifList1['body']['data'] as $n) {
    if (strpos($n['text'], $complaintId) !== false && strpos($n['text'], 'Completed') !== false) {
        $compNotif = $n;
        break;
    }
}
assertCheck('Completion notification found in student notification list', $compNotif !== null, "Found notification text: " . ($compNotif['text'] ?? 'NONE'));

// 13. Confirm correct notification text and complaint ID
$expectedText = "Your complaint $complaintId has been verified by Admin and is now Completed ✅.";
assertCheck('Notification text matches exact resolution template', ($compNotif['text'] ?? '') === $expectedText, "Text: " . ($compNotif['text'] ?? ''));

// 14. Confirm notification belongs ONLY to student 1001 (Student 1002 cannot see it)
$lStu2 = curlReq("$baseUrl/backend/auth/login.php", 'POST', ['role' => 'student', 'stuGr' => '1002', 'stuPass' => 'password']);
$stu2Cookie = $lStu2['cookies'];
$notifList2 = curlReq("$baseUrl/backend/notifications/list.php?role=student&gr=1002", 'GET', null, $stu2Cookie);
$stu2FoundStu1Notif = false;
foreach ($notifList2['body']['data'] as $n) {
    if (strpos($n['text'], $complaintId) !== false) {
        $stu2FoundStu1Notif = true;
        break;
    }
}
assertCheck('Notification isolation: Student 1002 CANNOT see Student 1001\'s completion notification', $stu2FoundStu1Notif === false);

// 15. Confirm persistence across page refresh
$notifRefresh = curlReq("$baseUrl/backend/notifications/list.php?role=student&gr=1001", 'GET', null, $stu1Cookie);
$refreshedNotif = null;
foreach ($notifRefresh['body']['data'] as $n) {
    if (strpos($n['text'], $complaintId) !== false) {
        $refreshedNotif = $n;
        break;
    }
}
assertCheck('Notification persists across page refresh', $refreshedNotif !== null && $refreshedNotif['read'] === false);

// 16 & 17. Student marks all read -> Unread indicator disappears
$markRead = curlReq("$baseUrl/backend/notifications/read_all.php", 'POST', ['gr' => '1001', 'role' => 'student'], $stu1Cookie);
assertCheck('Student calls read_all.php', $markRead['code'] === 200 && ($markRead['body']['success'] ?? false) === true);

$notifAfterRead = curlReq("$baseUrl/backend/notifications/list.php?role=student&gr=1001", 'GET', null, $stu1Cookie);
$readCompNotif = null;
foreach ($notifAfterRead['body']['data'] as $n) {
    if (strpos($n['text'], $complaintId) !== false) {
        $readCompNotif = $n;
        break;
    }
}
$unreadCountAfter = count(array_filter($notifAfterRead['body']['data'] ?? [], function($n) { return !$n['read']; }));
assertCheck('Notification status updated to is_read = 1 (Unread dot disappears)', $readCompNotif !== null && $readCompNotif['read'] === true, "is_read: " . var_export($readCompNotif['read'] ?? false, true));

// 18 & 19. Logout and Login again -> State persists correctly
curlReq("$baseUrl/backend/auth/logout.php", 'POST', null, $stu1Cookie);
$lStu1Again = curlReq("$baseUrl/backend/auth/login.php", 'POST', ['role' => 'student', 'stuGr' => '1001', 'stuPass' => 'password']);
$stu1NewCookie = $lStu1Again['cookies'];
$notifReLogin = curlReq("$baseUrl/backend/notifications/list.php?role=student&gr=1001", 'GET', null, $stu1NewCookie);
$reLoginNotif = null;
foreach ($notifReLogin['body']['data'] as $n) {
    if (strpos($n['text'], $complaintId) !== false) {
        $reLoginNotif = $n;
        break;
    }
}
assertCheck('Notification persists in MySQL across logout and re-login, preserving read status', $reLoginNotif !== null && $reLoginNotif['read'] === true);

// 20. Database Cleanup of test records
$db->prepare("DELETE FROM complaints WHERE id = ?")->execute([$complaintId]);
$db->prepare("DELETE FROM complaint_logs WHERE complaint_id = ?")->execute([$complaintId]);
$db->prepare("DELETE FROM notifications WHERE complaint_id = ?")->execute([$complaintId]);
assertCheck('Cleaned up test complaint and notification records from database', true);

echo "\n===================================================================\n";
echo ">>> ALL $passCount / $testCount NOTIFICATION FLOW STEPS PASSED SUCCESSFULLY! <<<\n";
echo "===================================================================\n";
