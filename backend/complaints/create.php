<?php
/* ==========================================================================
   Campus Connect - File Institutional Complaint Endpoint
   backend/complaints/create.php
   ========================================================================== */

require_once dirname(__DIR__) . '/config/database.php';

$currentUser = requireAuth();

if ($currentUser['role'] !== 'student' && $currentUser['role'] !== 'admin') {
    sendJson(false, 'Only students can submit institutional complaints.', null, 403);
}

$data = getRequestData();
$title = trim($data['title'] ?? $data['cTitle'] ?? '');
$category = trim($data['category'] ?? $data['cCategory'] ?? 'Computer Department');
$priority = trim($data['priority'] ?? $data['cPriority'] ?? 'Low');
$location = trim($data['location'] ?? $data['cLocation'] ?? '');
$description = trim($data['description'] ?? $data['cDesc'] ?? $data['desc'] ?? '');

if ($title === '' || $location === '' || $description === '') {
    sendJson(false, 'Please fill in all required complaint fields.', null, 400);
}

// Normalize Priority
if (!in_array($priority, ['Low', 'Medium', 'High'], true)) {
    $priority = 'Low';
}

$db = getDbConnection();

// Handle Image Evidence Upload
$imagePath = saveUploadedFile('image', ['jpg', 'jpeg', 'png', 'webp']) 
          ?: saveUploadedFile('cImage', ['jpg', 'jpeg', 'png', 'webp'])
          ?: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=600';

// Handle Video Evidence Upload
$videoPath = saveUploadedFile('video', ['mp4', 'mov', 'avi', 'webm'])
          ?: saveUploadedFile('cVideo', ['mp4', 'mov', 'avi', 'webm'])
          ?: '';

// Generate unique ticket ID
$ticketId = 'COMP-' . rand(100, 9999);
$checkStmt = $db->prepare("SELECT id FROM complaints WHERE id = ?");
$checkStmt->execute([$ticketId]);
while ($checkStmt->fetch()) {
    $ticketId = 'COMP-' . rand(100, 9999);
    $checkStmt->execute([$ticketId]);
}

$reporterName = $currentUser['name'];
$reporterGr = $currentUser['grNo'] ?? $currentUser['identifier'] ?? '1001';
$reportedAt = formatNowStr();

// Insert Complaint into MySQL
$insertStmt = $db->prepare("
    INSERT INTO complaints (
        id, title, category, description, location, priority,
        reported_by, reported_by_gr, reported_at, status, stage,
        admin_status, faculty_status, technician_status, work_status,
        image, video, proof_img, remark, qa_verified, qa_feedback
    ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, 'Complaint Submitted', 1,
        'Pending', 'Pending', 'Pending', 'Not Started',
        ?, ?, '', '', 0, ''
    )
");

$insertStmt->execute([
    $ticketId, $title, $category, $description, $location, $priority,
    $reporterName, $reporterGr, $reportedAt,
    $imagePath, $videoPath
]);

// Insert Initial Complaint Log
addComplaintLog(
    $db,
    $ticketId,
    'Complaint Submitted',
    "Self Category: $category | Priority: $priority",
    $reporterName,
    $reportedAt
);

// Insert Admin Notification
addNotification(
    $db,
    null,
    null,
    null,
    'admin',
    $ticketId,
    "Incoming verification required: $ticketId [$priority] from $reporterName",
    $reportedAt
);

// Return Created Complaint object
$createdComplaint = [
    'id'           => $ticketId,
    'title'        => $title,
    'category'     => $category,
    'description'  => $description,
    'location'     => $location,
    'priority'     => $priority,
    'reportedBy'   => $reporterName,
    'reportedByGr' => $reporterGr,
    'reportedAt'   => $reportedAt,
    'status'       => 'Complaint Submitted',
    'stage'        => 1,
    'image'        => $imagePath,
    'video'        => $videoPath,
    'logs'         => [
        [
            's'    => 'Complaint Submitted',
            'note' => "Self Category: $category | Priority: $priority",
            'time' => $reportedAt,
            'by'   => $reporterName
        ]
    ]
];

sendJson(true, "Complaint $ticketId registered & routed to Admin queue.", $createdComplaint, 201);
