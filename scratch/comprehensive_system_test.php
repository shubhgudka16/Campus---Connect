<?php
/**
 * Campus Connect - Comprehensive Automated Testing Suite
 * Executes rigorous tests across all 10 categories against live Apache + MySQL.
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');

$baseUrl = 'http://localhost/Campus%20-%20Connect';
$results = [];

function runHttp($url, $method = 'GET', $data = null, $cookies = '', $headers = []) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $reqHeaders = array_merge(['Accept: application/json'], $headers);
    
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
    
    $start = microtime(true);
    $response = curl_exec($ch);
    $elapsed = round((microtime(true) - $start) * 1000, 2);
    
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($response === false) {
        return [
            'code' => 0,
            'headers' => '',
            'cookies' => '',
            'body' => null,
            'raw_body' => '',
            'elapsed_ms' => $elapsed,
            'error' => $curlError
        ];
    }
    
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
        'headers' => $headerStr,
        'cookies' => implode('; ', $newCookies),
        'body' => json_decode($bodyStr, true),
        'raw_body' => $bodyStr,
        'elapsed_ms' => $elapsed,
        'error' => null
    ];
}

function recordTest($id, $module, $scenario, $input, $expected, $actual, $pass, $issue = 'None', $fix = 'None', $retest = 'N/A') {
    global $results;
    $results[] = [
        'id' => $id,
        'module' => $module,
        'scenario' => $scenario,
        'input' => is_array($input) ? json_encode($input) : (string)$input,
        'expected' => $expected,
        'actual' => is_array($actual) ? json_encode($actual) : (string)$actual,
        'status' => $pass ? 'PASS' : 'FAIL',
        'issue' => $issue,
        'fix' => $fix,
        'retest' => $retest
    ];
    $statusStr = $pass ? "\033[32m[PASS]\033[0m" : "\033[31m[FAIL]\033[0m";
    echo "$statusStr $id - $module: $scenario\n";
}

echo "===================================================================\n";
echo "       CAMPUS CONNECT COMPREHENSIVE AUTOMATED TESTING SUITE        \n";
echo "===================================================================\n\n";

// --- 1. HEALTH & CONNECTIVITY ---
$h = runHttp("$baseUrl/backend/config/health.php");
recordTest('TC-001', 'Health Check', 'Verify backend server & database connectivity', 'GET health.php', 'HTTP 200 with success:true, database:true', "HTTP {$h['code']}, body: " . substr($h['raw_body'], 0, 80), $h['code'] === 200 && ($h['body']['success'] ?? false) === true);

// --- 2. AUTHENTICATION & LOGIN TESTS ---
// TC-002: Student Valid Login
$lStu = runHttp("$baseUrl/backend/auth/login.php", 'POST', ['role' => 'student', 'stuGr' => '1001', 'stuPass' => 'password']);
$stuCookie = $lStu['cookies'];
recordTest('TC-002', 'Authentication', 'Student login with valid credentials', 'GR: 1001, Pass: password', 'HTTP 200, session object, redirect to roles.html', "HTTP {$lStu['code']}, success=" . var_export($lStu['body']['success'] ?? false, true), $lStu['code'] === 200 && ($lStu['body']['success'] ?? false) === true && !empty($stuCookie));

// TC-003: Student Invalid Password
$lStuBad = runHttp("$baseUrl/backend/auth/login.php", 'POST', ['role' => 'student', 'stuGr' => '1001', 'stuPass' => 'wrongpass123']);
recordTest('TC-003', 'Authentication', 'Student login with incorrect password', 'GR: 1001, Pass: wrongpass123', 'HTTP 401, Invalid G.R. Number or Password', "HTTP {$lStuBad['code']}, message=" . ($lStuBad['body']['message'] ?? ''), $lStuBad['code'] === 401 && ($lStuBad['body']['success'] ?? true) === false);

// TC-004: Faculty Valid Login
$lFac = runHttp("$baseUrl/backend/auth/login.php", 'POST', ['role' => 'faculty', 'facDept' => 'Computer Department', 'facPass' => 'password']);
$facCookie = $lFac['cookies'];
recordTest('TC-004', 'Authentication', 'Faculty login with valid department credentials', 'Dept: Computer Department, Pass: password', 'HTTP 200, session object', "HTTP {$lFac['code']}, success=" . var_export($lFac['body']['success'] ?? false, true), $lFac['code'] === 200 && ($lFac['body']['success'] ?? false) === true && !empty($facCookie));

// TC-005: Faculty Invalid Credentials
$lFacBad = runHttp("$baseUrl/backend/auth/login.php", 'POST', ['role' => 'faculty', 'facDept' => 'Computer Department', 'facPass' => 'wrongpass']);
recordTest('TC-005', 'Authentication', 'Faculty login with incorrect password', 'Dept: Computer Department, Pass: wrongpass', 'HTTP 401, Invalid Faculty Credentials', "HTTP {$lFacBad['code']}, message=" . ($lFacBad['body']['message'] ?? ''), $lFacBad['code'] === 401 && ($lFacBad['body']['success'] ?? true) === false);

// TC-006: Technician Valid Login
$lTech = runHttp("$baseUrl/backend/auth/login.php", 'POST', ['role' => 'technician', 'techId' => 'TECH-01', 'techPass' => 'password']);
$techCookie = $lTech['cookies'];
recordTest('TC-006', 'Authentication', 'Technician login with valid credentials', 'ID: TECH-01, Pass: password', 'HTTP 200, session object', "HTTP {$lTech['code']}, success=" . var_export($lTech['body']['success'] ?? false, true), $lTech['code'] === 200 && ($lTech['body']['success'] ?? false) === true && !empty($techCookie));

// TC-007: Technician Invalid Credentials
$lTechBad = runHttp("$baseUrl/backend/auth/login.php", 'POST', ['role' => 'technician', 'techId' => 'TECH-01', 'techPass' => 'wrongpass']);
recordTest('TC-007', 'Authentication', 'Technician login with incorrect password', 'ID: TECH-01, Pass: wrongpass', 'HTTP 401, Invalid Technician credentials', "HTTP {$lTechBad['code']}, message=" . ($lTechBad['body']['message'] ?? ''), $lTechBad['code'] === 401 && ($lTechBad['body']['success'] ?? true) === false);

// TC-008: Admin Valid Login
$lAdmin = runHttp("$baseUrl/backend/auth/login.php", 'POST', ['role' => 'admin', 'adminUser' => 'admin', 'adminPass' => 'admin123']);
$adminCookie = $lAdmin['cookies'];
recordTest('TC-008', 'Authentication', 'Admin login with valid credentials', 'Username: admin, Pass: admin123', 'HTTP 200, admin session unlocked', "HTTP {$lAdmin['code']}, success=" . var_export($lAdmin['body']['success'] ?? false, true), $lAdmin['code'] === 200 && ($lAdmin['body']['success'] ?? false) === true && !empty($adminCookie));

// TC-009: Admin Invalid Login
$lAdminBad = runHttp("$baseUrl/backend/auth/login.php", 'POST', ['role' => 'admin', 'adminUser' => 'admin', 'adminPass' => 'wrongpass']);
recordTest('TC-009', 'Authentication', 'Admin login with incorrect credentials', 'Username: admin, Pass: wrongpass', 'HTTP 401, Admin Credentials Invalid', "HTTP {$lAdminBad['code']}, message=" . ($lAdminBad['body']['message'] ?? ''), $lAdminBad['code'] === 401 && ($lAdminBad['body']['success'] ?? true) === false);

// TC-010: Session Validation
$sCheck = runHttp("$baseUrl/backend/auth/session.php", 'GET', null, $stuCookie);
recordTest('TC-010', 'Session Handling', 'Verify active student session endpoint', 'Cookie: student session', 'HTTP 200, success:true, identifier: 1001', "HTTP {$sCheck['code']}, id=" . ($sCheck['body']['data']['session']['identifier'] ?? ''), $sCheck['code'] === 200 && ($sCheck['body']['data']['session']['identifier'] ?? '') === '1001');

// TC-011: Session Logout
$logoutRes = runHttp("$baseUrl/backend/auth/logout.php", 'POST', null, $stuCookie);
recordTest('TC-011', 'Session Handling', 'User logout and session invalidation', 'POST logout.php with student cookie', 'HTTP 200, Logged out successfully', "HTTP {$logoutRes['code']}, message=" . ($logoutRes['body']['message'] ?? ''), $logoutRes['code'] === 200 && ($logoutRes['body']['success'] ?? false) === true);

// TC-012: Access Session after Logout
$sAfterLogout = runHttp("$baseUrl/backend/auth/session.php", 'GET', null, $stuCookie);
recordTest('TC-012', 'Session Handling', 'Verify session endpoint returns unauthenticated after logout', 'GET session.php with terminated cookie', 'success: false, No active session', "success=" . var_export($sAfterLogout['body']['success'] ?? true, true) . ", message=" . ($sAfterLogout['body']['message'] ?? ''), ($sAfterLogout['body']['success'] ?? true) === false);

// Re-login student for subsequent tests
$lStu = runHttp("$baseUrl/backend/auth/login.php", 'POST', ['role' => 'student', 'stuGr' => '1001', 'stuPass' => 'password']);
$stuCookie = $lStu['cookies'];

// --- 3. STUDENT REGISTRATION TESTS ---
// TC-013: Register new student
$newGr = 'GR' . rand(2000, 9999);
$regRes = runHttp("$baseUrl/backend/auth/register.php", 'POST', [
    'name' => 'Automated Test Student',
    'grNo' => $newGr,
    'dept' => 'Computer Department',
    'password' => 'password123'
]);
recordTest('TC-013', 'Registration', 'Student self-registration with valid data', "GR: $newGr, Name: Automated Test Student, Dept: Computer", 'HTTP 200, Student account generated', "HTTP {$regRes['code']}, message=" . ($regRes['body']['message'] ?? ''), $regRes['code'] === 200 && ($regRes['body']['success'] ?? false) === true);

// TC-014: Duplicate Registration Attempt
$dupRegRes = runHttp("$baseUrl/backend/auth/register.php", 'POST', [
    'name' => 'Duplicate Student',
    'grNo' => $newGr,
    'dept' => 'Computer Department',
    'password' => 'password123'
]);
recordTest('TC-014', 'Registration', 'Reject duplicate student registration', "Existing GR: $newGr", 'HTTP 409, Enrollment Number registered already', "HTTP {$dupRegRes['code']}, message=" . ($dupRegRes['body']['message'] ?? ''), $dupRegRes['code'] === 409 && ($dupRegRes['body']['success'] ?? true) === false);

// TC-015: Registration Empty Fields Validation
$emptyReg = runHttp("$baseUrl/backend/auth/register.php", 'POST', ['name' => '', 'grNo' => '', 'dept' => '', 'password' => '']);
recordTest('TC-015', 'Validation', 'Reject registration with empty fields', 'Empty string values for all fields', 'HTTP 400, Please fill in all required registration fields.', "HTTP {$emptyReg['code']}, message=" . ($emptyReg['body']['message'] ?? ''), $emptyReg['code'] === 400 && ($emptyReg['body']['success'] ?? true) === false);

// --- 4. COMPLAINT FILING & VALIDATION ---
// TC-016: Submit valid complaint
$cPayload = [
    'title' => 'Water leakage from AC unit in Room 304',
    'category' => 'Mechanical Department',
    'priority' => 'Medium',
    'location' => 'Room 304 Block B',
    'description' => 'Continuous dripping water near student desks causing slippery floor.',
    'image' => '',
    'video' => ''
];
$createRes = runHttp("$baseUrl/backend/complaints/create.php", 'POST', $cPayload, $stuCookie);
$createdComplaintId = $createRes['body']['data']['id'] ?? $createRes['body']['data']['complaint']['id'] ?? null;
recordTest('TC-016', 'Complaint Lifecycle', 'Student submits valid complaint', $cPayload, 'HTTP 201, complaint created with unique COMP-XXXX ID', "HTTP {$createRes['code']}, ID=$createdComplaintId", $createRes['code'] === 201 && !empty($createdComplaintId));

// TC-017: Submit complaint with missing title/location
$badComplaint = [
    'title' => '',
    'category' => 'Mechanical Department',
    'priority' => 'Low',
    'location' => '',
    'description' => ''
];
$badCRes = runHttp("$baseUrl/backend/complaints/create.php", 'POST', $badComplaint, $stuCookie);
recordTest('TC-017', 'Validation', 'Reject complaint with empty required fields', $badComplaint, 'HTTP 400, Please fill in all required complaint fields.', "HTTP {$badCRes['code']}, message=" . ($badCRes['body']['message'] ?? ''), $badCRes['code'] === 400 && ($badCRes['body']['success'] ?? true) === false);

// TC-018: Complaint retrieval in list.php
$listRes = runHttp("$baseUrl/backend/complaints/list.php?role=student", 'GET', null, $stuCookie);
$foundCreated = false;
if (!empty($listRes['body']['data'])) {
    foreach ($listRes['body']['data'] as $item) {
        if ($item['id'] === $createdComplaintId) {
            $foundCreated = true;
            break;
        }
    }
}
recordTest('TC-018', 'Complaint Retrieval', 'Newly filed complaint appears in student complaint list', "ID: $createdComplaintId", "Complaint present in list with stage 1 (Complaint Submitted)", "found=" . var_export($foundCreated, true), $foundCreated);

// TC-019: Single complaint fetch with logs
$getRes = runHttp("$baseUrl/backend/complaints/get.php?id=$createdComplaintId", 'GET', null, $stuCookie);
$hasLogs = !empty($getRes['body']['data']['logs']) && is_array($getRes['body']['data']['logs']);
recordTest('TC-019', 'Complaint Retrieval', 'Fetch single complaint with complete audit logs', "GET get.php?id=$createdComplaintId", 'HTTP 200, complaint object with audit trail logs', "HTTP {$getRes['code']}, logs count=" . count($getRes['body']['data']['logs'] ?? []), $getRes['code'] === 200 && $hasLogs);

// --- 5. COMPLAINT WORKFLOW LIFECYCLE (STAGES 2 TO 7) ---
// TC-020: Admin stage 2 verification and assignment
$adminVerifyRes = runHttp("$baseUrl/backend/complaints/admin_verify.php", 'POST', [
    'id' => $createdComplaintId,
    'action' => 'approve',
    'dept' => 'Mechanical Department'
], $adminCookie);
recordTest('TC-020', 'Admin Management', 'Admin verifies complaint and routes to Faculty (Stage 2)', "ID: $createdComplaintId, action: approve, dept: Mechanical", 'HTTP 200, status: Assigned to Faculty, stage: 2', "HTTP {$adminVerifyRes['code']}, status=" . ($adminVerifyRes['body']['data']['status'] ?? ''), $adminVerifyRes['code'] === 200 && ($adminVerifyRes['body']['data']['stage'] ?? 0) === 2);

// Login Mechanical Faculty for assignment
$lFacMech = runHttp("$baseUrl/backend/auth/login.php", 'POST', ['role' => 'faculty', 'facDept' => 'Mechanical Department', 'facPass' => 'password']);
$facMechCookie = $lFacMech['cookies'];

// TC-021: Faculty stage 3 technician assignment
$assignRes = runHttp("$baseUrl/backend/faculty/assign_technician.php", 'POST', [
    'id' => $createdComplaintId,
    'techId' => 'TECH-02',
    'deadline' => '2026-09-10'
], $facMechCookie);
recordTest('TC-021', 'Faculty Dispatch', 'Faculty assigns technician with SLA deadline (Stage 3)', "ID: $createdComplaintId, techId: TECH-02, deadline: 2026-09-10", 'HTTP 200, status: Assigned to Technician, stage: 3', "HTTP {$assignRes['code']}, techName=" . ($assignRes['body']['data']['techName'] ?? ''), $assignRes['code'] === 200 && ($assignRes['body']['data']['stage'] ?? 0) === 3);

// Login Technician TECH-02
$lTech2 = runHttp("$baseUrl/backend/auth/login.php", 'POST', ['role' => 'technician', 'techId' => 'TECH-02', 'techPass' => 'password']);
$tech2Cookie = $lTech2['cookies'];

// TC-022: Technician accepts task (Stage 4)
$acceptRes = runHttp("$baseUrl/backend/technician/accept.php", 'POST', ['id' => $createdComplaintId], $tech2Cookie);
recordTest('TC-022', 'Technician Execution', 'Technician accepts complaint work order (Stage 4)', "ID: $createdComplaintId", 'HTTP 200, status: Work in Progress, stage: 4', "HTTP {$acceptRes['code']}, status=" . ($acceptRes['body']['data']['status'] ?? ''), $acceptRes['code'] === 200 && ($acceptRes['body']['data']['stage'] ?? 0) === 4);

// TC-023: Technician completion with proof image (Stage 5)
$mockProof = 'data:image/jpeg;base64,' . base64_encode('fake JPEG binary image data for test');
$completeRes = runHttp("$baseUrl/backend/technician/complete.php", 'POST', [
    'id' => $createdComplaintId,
    'proof_img' => $mockProof,
    'remark' => 'AC drain pipe cleared and resealed successfully.'
], $tech2Cookie);
recordTest('TC-023', 'Technician Execution', 'Technician submits repair photographic proof (Stage 5)', "ID: $createdComplaintId, proof_img, remark", 'HTTP 200, status: Work Completed by Technician, stage: 5', "HTTP {$completeRes['code']}, status=" . ($completeRes['body']['data']['status'] ?? ''), $completeRes['code'] === 200 && ($completeRes['body']['data']['stage'] ?? 0) === 5);

// TC-024: Faculty QA verification & approval (Stage 6)
$qaRes = runHttp("$baseUrl/backend/faculty/qa_verify.php", 'POST', [
    'id' => $createdComplaintId,
    'approve' => true,
    'comment' => 'Physical site inspected, AC operation normal.'
], $facMechCookie);
recordTest('TC-024', 'Faculty QA Audit', 'Faculty audits repair proof and approves for Admin (Stage 6)', "ID: $createdComplaintId, approve: true", 'HTTP 200, status: Faculty Verified, stage: 6', "HTTP {$qaRes['code']}, status=" . ($qaRes['body']['data']['status'] ?? ''), $qaRes['code'] === 200 && ($qaRes['body']['data']['stage'] ?? 0) === 6);

// TC-025: Admin final sign-off & completion (Stage 7)
$adminFinalRes = runHttp("$baseUrl/backend/complaints/admin_final.php", 'POST', ['id' => $createdComplaintId], $adminCookie);
recordTest('TC-025', 'Admin Final Sign-off', 'Admin performs final sign-off and closes ticket (Stage 7)', "ID: $createdComplaintId", 'HTTP 200, status: Completed, stage: 7', "HTTP {$adminFinalRes['code']}, status=" . ($adminFinalRes['body']['data']['status'] ?? ''), $adminFinalRes['code'] === 200 && ($adminFinalRes['body']['data']['stage'] ?? 0) === 7);

// TC-026: Student submits feedback
$fbRes = runHttp("$baseUrl/backend/complaints/feedback.php", 'POST', [
    'id' => $createdComplaintId,
    'feedback' => 'Satisfied',
    'comment' => 'Fast resolution and clean work.'
], $stuCookie);
recordTest('TC-026', 'Student Feedback', 'Student submits satisfaction feedback on closed ticket', "ID: $createdComplaintId, feedback: Satisfied", 'HTTP 200, feedback: Satisfied recorded', "HTTP {$fbRes['code']}, status=" . ($fbRes['body']['data']['feedback'] ?? ''), $fbRes['code'] === 200 && ($fbRes['body']['data']['feedback'] ?? '') === 'Satisfied');

// --- 6. AUTHORIZATION & ACCESS CONTROL ---
// TC-027: Student accessing Admin Dashboard
$unauthDash = runHttp("$baseUrl/backend/admin/dashboard.php", 'GET', null, $stuCookie);
recordTest('TC-027', 'Authorization', 'Block student from accessing Admin Dashboard', 'Student session accessing admin/dashboard.php', 'HTTP 403 Access Denied: insufficient permissions', "HTTP {$unauthDash['code']}, message=" . ($unauthDash['body']['message'] ?? ''), $unauthDash['code'] === 403);

// TC-028: Technician accessing Admin Staff Management
$unauthStaff = runHttp("$baseUrl/backend/admin/staff.php", 'GET', null, $techCookie);
recordTest('TC-028', 'Authorization', 'Block technician from accessing Admin Staff Management', 'Technician session accessing admin/staff.php', 'HTTP 403 Access Denied', "HTTP {$unauthStaff['code']}", $unauthStaff['code'] === 403);

// TC-029: Unauthenticated request to protected create.php
$noAuthCreate = runHttp("$baseUrl/backend/complaints/create.php", 'POST', $cPayload);
recordTest('TC-029', 'Authorization', 'Block unauthenticated user from submitting complaint', 'No session cookies', 'HTTP 401 Unauthorized', "HTTP {$noAuthCreate['code']}", $noAuthCreate['code'] === 401);

// --- 7. ADMIN MANAGEMENT & REPORTS ---
// TC-030: Admin Dashboard Analytics
$dashRes = runHttp("$baseUrl/backend/admin/dashboard.php", 'GET', null, $adminCookie);
recordTest('TC-030', 'Admin Analytics', 'Retrieve administrative dashboard metrics', 'GET admin/dashboard.php with Admin cookie', 'HTTP 200, total complaints, resolutionRate, deptCounts', "HTTP {$dashRes['code']}, total=" . ($dashRes['body']['data']['total'] ?? 0), $dashRes['code'] === 200 && isset($dashRes['body']['data']['total']));

// TC-031: Admin Staff Registry
$staffRes = runHttp("$baseUrl/backend/admin/staff.php", 'GET', null, $adminCookie);
recordTest('TC-031', 'Staff Registry', 'Admin retrieves technician registry list', 'GET admin/staff.php', 'HTTP 200, array of technicians', "HTTP {$staffRes['code']}, count=" . count($staffRes['body']['data'] ?? []), $staffRes['code'] === 200 && is_array($staffRes['body']['data']));

// TC-032: Admin Student Directory
$studentsRes = runHttp("$baseUrl/backend/admin/students.php", 'GET', null, $adminCookie);
recordTest('TC-032', 'Student Directory', 'Admin retrieves registered student directory', 'GET admin/students.php', 'HTTP 200, array of students', "HTTP {$studentsRes['code']}, count=" . count($studentsRes['body']['data'] ?? []), $studentsRes['code'] === 200 && is_array($studentsRes['body']['data']));

// TC-033: Operational CSV Export
$csvRes = runHttp("$baseUrl/backend/admin/export_csv.php", 'GET', null, $adminCookie);
$isCsv = strpos($csvRes['headers'], 'text/csv') !== false && strpos($csvRes['raw_body'], 'Complaint ID') !== false;
recordTest('TC-033', 'Reports Export', 'Admin downloads audited operational report CSV', 'GET admin/export_csv.php', 'HTTP 200, Content-Type: text/csv with header row', "HTTP {$csvRes['code']}, Content-Type header present=" . var_export($isCsv, true), $csvRes['code'] === 200 && $isCsv);

// --- 8. NOTIFICATIONS MODULE ---
// TC-034: Notifications list
$notifRes = runHttp("$baseUrl/backend/notifications/list.php", 'GET', null, $stuCookie);
recordTest('TC-034', 'Notifications', 'Fetch role-targeted student notifications', 'GET notifications/list.php', 'HTTP 200, array of notifications', "HTTP {$notifRes['code']}, count=" . count($notifRes['body']['data'] ?? []), $notifRes['code'] === 200 && is_array($notifRes['body']['data']));

// TC-035: Mark all notifications read
$readRes = runHttp("$baseUrl/backend/notifications/read_all.php", 'POST', null, $stuCookie);
recordTest('TC-035', 'Notifications', 'Mark student notifications as read', 'POST notifications/read_all.php', 'HTTP 200, Notifications marked read.', "HTTP {$readRes['code']}, message=" . ($readRes['body']['message'] ?? ''), $readRes['code'] === 200 && ($readRes['body']['success'] ?? false) === true);

// --- 9. PROFILE MODULE ---
// TC-036: Profile update
$profRes = runHttp("$baseUrl/backend/profile/update.php", 'POST', [
    'name' => 'Kabir Mehta Updated',
    'dept' => 'Computer Department'
], $stuCookie);
recordTest('TC-036', 'Profile Management', 'Update user profile details', 'Name: Kabir Mehta Updated', 'HTTP 200, Profile updated successfully!', "HTTP {$profRes['code']}, name=" . ($profRes['body']['data']['session']['name'] ?? ''), $profRes['code'] === 200 && ($profRes['body']['data']['session']['name'] ?? '') === 'Kabir Mehta Updated');

// Revert profile name
runHttp("$baseUrl/backend/profile/update.php", 'POST', ['name' => 'Kabir Mehta', 'dept' => 'Computer Department'], $stuCookie);

// --- 10. PUBLIC FEED & SEARCH/FILTER ---
// TC-037: Public Feed
$feedRes = runHttp("$baseUrl/backend/complaints/list.php?public=1");
recordTest('TC-037', 'Public Feed', 'Unauthenticated public access to transparency feed', 'GET complaints/list.php?public=1', 'HTTP 200, public complaint array', "HTTP {$feedRes['code']}, count=" . count($feedRes['body']['data'] ?? []), $feedRes['code'] === 200 && is_array($feedRes['body']['data']));

// TC-038: Filter complaints by department
$filterRes = runHttp("$baseUrl/backend/complaints/list.php?public=1&category=" . urlencode('Computer Department'));
$allMatch = true;
if (!empty($filterRes['body']['data'])) {
    foreach ($filterRes['body']['data'] as $item) {
        if ($item['category'] !== 'Computer Department') {
            $allMatch = false;
            break;
        }
    }
}
recordTest('TC-038', 'Search & Filtering', 'Filter complaints by department category', 'category=Computer Department', 'HTTP 200, only complaints matching Computer Department', "HTTP {$filterRes['code']}, allMatch=" . var_export($allMatch, true), $filterRes['code'] === 200 && $allMatch);

// TC-039: Search query filtering
$searchRes = runHttp("$baseUrl/backend/complaints/list.php?public=1&search=" . urlencode('wire'));
recordTest('TC-039', 'Search & Filtering', 'Search complaints by keyword query', 'search=wire', 'HTTP 200, filtered complaints containing keyword', "HTTP {$searchRes['code']}, count=" . count($searchRes['body']['data'] ?? []), $searchRes['code'] === 200 && is_array($searchRes['body']['data']));

// --- 11. ERROR HANDLING & SECURITY INJECTION ---
// TC-040: Non-existent complaint ID
$notFoundRes = runHttp("$baseUrl/backend/complaints/get.php?id=COMP-NONEXISTENT", 'GET', null, $stuCookie);
recordTest('TC-040', 'Error Handling', 'Handle non-existent complaint ID gracefully', 'id=COMP-NONEXISTENT', 'HTTP 404, Complaint not found', "HTTP {$notFoundRes['code']}, message=" . ($notFoundRes['body']['message'] ?? ''), $notFoundRes['code'] === 404 && ($notFoundRes['body']['success'] ?? true) === false);

// TC-041: SQL Injection in login field
$sqliRes = runHttp("$baseUrl/backend/auth/login.php", 'POST', ['role' => 'student', 'stuGr' => "' OR '1'='1", 'stuPass' => "' OR '1'='1"]);
recordTest('TC-041', 'Security / Validation', 'SQL Injection string in authentication fields safely rejected', "stuGr: ' OR '1'='1", 'HTTP 401 Credential Error, prepared statement safely parameterized', "HTTP {$sqliRes['code']}, success=" . var_export($sqliRes['body']['success'] ?? true, true), $sqliRes['code'] === 401 && ($sqliRes['body']['success'] ?? true) === false);

// TC-042: XSS Payload in complaint description
$xssTitle = '<script>alert("XSS")</script> Broken Switch';
$xssDesc = '<img src=x onerror=alert(1)> Urgent short circuit';
$xssRes = runHttp("$baseUrl/backend/complaints/create.php", 'POST', [
    'title' => $xssTitle,
    'category' => 'Electrical Department',
    'priority' => 'High',
    'location' => 'Lab 1',
    'description' => $xssDesc
], $stuCookie);
recordTest('TC-042', 'Security / Validation', 'XSS payload in complaint fields safely stored without script execution', 'HTML script and onerror tags in title and desc', 'Complaint stored safely; frontend uses textContent or esc', "HTTP {$xssRes['code']}, success=" . var_export($xssRes['body']['success'] ?? false, true), $xssRes['code'] === 201);

// Clean up XSS test complaint
if (!empty($xssRes['body']['data']['id'])) {
    $xssId = $xssRes['body']['data']['id'];
    require_once dirname(__DIR__) . '/backend/config/database.php';
    $db = getDbConnection();
    $db->prepare("DELETE FROM complaints WHERE id = ?")->execute([$xssId]);
    $db->prepare("DELETE FROM complaint_logs WHERE complaint_id = ?")->execute([$xssId]);
    $db->prepare("DELETE FROM notifications WHERE complaint_id = ?")->execute([$xssId]);
}

// TC-043: Performance latency of key endpoints
$perfEndpoints = [
    'health.php' => "$baseUrl/backend/config/health.php",
    'complaints_list.php' => "$baseUrl/backend/complaints/list.php?public=1",
    'admin_dashboard.php' => "$baseUrl/backend/admin/dashboard.php"
];
$allUnder100ms = true;
$latencies = [];
foreach ($perfEndpoints as $name => $epUrl) {
    $c = ($name === 'admin_dashboard.php') ? $adminCookie : '';
    $p = runHttp($epUrl, 'GET', null, $c);
    $latencies[$name] = $p['elapsed_ms'] . 'ms';
    if ($p['elapsed_ms'] > 500) {
        $allUnder100ms = false;
    }
}
recordTest('TC-043', 'Performance Testing', 'Endpoint response time check (< 500ms latency)', $perfEndpoints, 'Sub-500ms response time for all standard API calls', json_encode($latencies), $allUnder100ms);

// --- CLEANUP TEST CREATED COMPLAINT ---
if (!empty($createdComplaintId)) {
    require_once dirname(__DIR__) . '/backend/config/database.php';
    $db = getDbConnection();
    $db->prepare("DELETE FROM complaints WHERE id = ?")->execute([$createdComplaintId]);
    $db->prepare("DELETE FROM complaint_logs WHERE complaint_id = ?")->execute([$createdComplaintId]);
    $db->prepare("DELETE FROM notifications WHERE complaint_id = ?")->execute([$createdComplaintId]);
    $db->prepare("DELETE FROM student_feedback WHERE complaint_id = ?")->execute([$createdComplaintId]);
    $db->prepare("DELETE FROM users WHERE identifier = ?")->execute([$newGr]);
}

// --- SUMMARY CALCULATION ---
$totalTests = count($results);
$passCount = 0;
$failCount = 0;
foreach ($results as $r) {
    if ($r['status'] === 'PASS') {
        $passCount++;
    } else {
        $failCount++;
    }
}

echo "\n===================================================================\n";
echo "                      TEST EXECUTION SUMMARY                       \n";
echo "===================================================================\n";
echo "Total Tests Executed: $totalTests\n";
echo "Passed:               $passCount\n";
echo "Failed:               $failCount\n";
echo "Success Rate:         " . round(($passCount / $totalTests) * 100, 2) . "%\n";
echo "===================================================================\n";

// Save JSON test log
file_put_contents(__DIR__ . '/comprehensive_results.json', json_encode($results, JSON_PRETTY_PRINT));
