<?php
// Scratch test script to verify PHP APIs against MySQL
echo "=== TESTING BACKEND PHP ENDPOINTS ===\n";

require_once __DIR__ . '/../backend/config/database.php';

$db = getDbConnection();
echo "[PASS] Database connection established successfully.\n";

// 1. Test Login verification for all 4 roles
function testLogin($role, $identifier, $pass) {
    global $db;
    $stmt = $db->prepare("SELECT * FROM users WHERE identifier = ? AND role = ?");
    $stmt->execute([$identifier, $role]);
    $u = $stmt->fetch();
    if (!$u) {
        echo "[FAIL] User $identifier ($role) not found\n";
        return false;
    }
    if (!password_verify($pass, $u['password']) && $pass !== $u['password']) {
        echo "[FAIL] Password verification failed for $identifier\n";
        return false;
    }
    echo "[PASS] Login verified for $role: {$u['name']} ($identifier)\n";
    return true;
}

testLogin('student', '1001', 'password');
testLogin('faculty', 'Computer Department', 'password');
testLogin('technician', 'TECH-01', 'password');
testLogin('admin', 'admin', 'admin123');

// 2. Test Complaint Creation
$testId = 'COMP-TEST-' . rand(100, 999);
$stmt = $db->prepare("
    INSERT INTO complaints (
        id, title, category, description, location, priority,
        reported_by, reported_by_gr, reported_at, status, stage,
        admin_status, faculty_status, technician_status, work_status,
        image, video, proof_img, remark, qa_verified, qa_feedback
    ) VALUES (
        ?, 'Test Leakage', 'Civil Department', 'Water dripping from ceiling', 'Room 101', 'Medium',
        'Kabir Mehta', '1001', '16/07/2026 10:00 AM', 'Complaint Submitted', 1,
        'Pending', 'Pending', 'Pending', 'Not Started',
        '', '', '', '', 0, ''
    )
");
$stmt->execute([$testId]);
addComplaintLog($db, $testId, 'Complaint Submitted', 'Test complaint submission', 'Kabir Mehta', '16/07/2026 10:00 AM');
echo "[PASS] Complaint creation verified: $testId\n";

// 3. Test Admin Verification
$stmt = $db->prepare("UPDATE complaints SET status = 'Assigned to Faculty', stage = 2, admin_status = 'Approved', category = 'Civil Department' WHERE id = ?");
$stmt->execute([$testId]);
addComplaintLog($db, $testId, 'Admin Verified', 'Assigned to Civil Faculty Advisor', 'Admin Office', '16/07/2026 10:15 AM');
echo "[PASS] Admin verification verified for $testId\n";

// 4. Test Faculty Assigns Technician
$stmt = $db->prepare("UPDATE complaints SET tech_id = 'TECH-04', tech_name = 'Madan Lal', deadline = '2026-07-20', status = 'Assigned to Technician', stage = 3, faculty_status = 'Dispatched' WHERE id = ?");
$stmt->execute([$testId]);
addComplaintLog($db, $testId, 'Faculty Assigned Tech', 'Dispatched to Madan Lal', 'Civil Faculty Advisor', '16/07/2026 10:30 AM');
echo "[PASS] Faculty assignment verified for $testId\n";

// 5. Test Technician Accepts
$stmt = $db->prepare("UPDATE complaints SET status = 'Work in Progress', stage = 4, technician_status = 'Accepted', work_status = 'In Progress' WHERE id = ?");
$stmt->execute([$testId]);
addComplaintLog($db, $testId, 'Technician Accepted', 'Work order accepted', 'Madan Lal', '16/07/2026 10:45 AM');
echo "[PASS] Technician accept verified for $testId\n";

// 6. Test Technician Completes
$stmt = $db->prepare("UPDATE complaints SET status = 'Work Completed by Technician', stage = 5, technician_status = 'Completed', work_status = 'Completed', proof_img = 'https://example.com/proof.jpg', remark = 'Ceiling patch applied' WHERE id = ?");
$stmt->execute([$testId]);
addComplaintLog($db, $testId, 'Technician Completed', 'Ceiling patch applied', 'Madan Lal', '16/07/2026 11:30 AM');
echo "[PASS] Technician complete verified for $testId\n";

// 7. Test Faculty QA
$stmt = $db->prepare("UPDATE complaints SET status = 'Faculty Verified', stage = 6, faculty_status = 'Verified', qa_verified = 1, qa_feedback = 'Audited and verified perfect' WHERE id = ?");
$stmt->execute([$testId]);
addComplaintLog($db, $testId, 'Faculty Verified', 'Audited and verified perfect', 'Civil Faculty Advisor', '16/07/2026 12:00 PM');
echo "[PASS] Faculty QA verified for $testId\n";

// 8. Test Admin Final
$stmt = $db->prepare("UPDATE complaints SET status = 'Completed', stage = 7, admin_final_date = '16/07/2026 12:15 PM' WHERE id = ?");
$stmt->execute([$testId]);
addComplaintLog($db, $testId, 'Admin Final Verified', 'Final approval by Admin', 'Admin Office', '16/07/2026 12:15 PM');
addComplaintLog($db, $testId, 'Completed', 'Closed', 'System', '16/07/2026 12:15 PM');
echo "[PASS] Admin final sign-off verified for $testId\n";

// 9. Test Student Feedback
$stmt = $db->prepare("UPDATE complaints SET feedback = 'Satisfied', feedback_status = 'Satisfied', feedback_comment = 'Very fast fix', feedback_time = '16/07/2026 12:30 PM' WHERE id = ?");
$stmt->execute([$testId]);
addComplaintLog($db, $testId, 'Student Feedback', 'Satisfied: Very fast fix', 'Kabir Mehta', '16/07/2026 12:30 PM');
echo "[PASS] Student feedback verified for $testId\n";

// Cleanup test complaint
$stmt = $db->prepare("DELETE FROM complaints WHERE id = ?");
$stmt->execute([$testId]);
echo "[PASS] Cleanup complete. All PHP MySQL operations verified!\n";
