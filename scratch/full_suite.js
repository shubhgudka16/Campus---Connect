const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=====================================================');
console.log('  CAMPUS CONNECT 7-STAGE WORKFLOW COMPREHENSIVE SUITE');
console.log('=====================================================\n');

const projectRoot = path.resolve(__dirname, '..');

// 1. Mock Complete DOM / Browser Environment
const localStorageData = {};
global.localStorage = {
  getItem: (k) => localStorageData[k] || null,
  setItem: (k, v) => { localStorageData[k] = v; },
  removeItem: (k) => { delete localStorageData[k]; },
  clear: () => { for (let k in localStorageData) delete localStorageData[k]; }
};

global.window = {
  location: { href: '', search: '' },
  print: () => {}
};

const domElements = {};
function getOrCreateEl(id) {
  if (!domElements[id]) {
    domElements[id] = {
      id: id,
      value: '',
      innerText: '',
      innerHTML: '',
      className: '',
      classList: {
        add: function(c) { this.classes = this.classes || new Set(); this.classes.add(c); },
        remove: function(c) { this.classes = this.classes || new Set(); this.classes.delete(c); },
        contains: function(c) { return this.classes ? this.classes.has(c) : false; }
      },
      style: {},
      children: [],
      appendChild: function(ch) { this.children.push(ch); },
      getContext: () => ({ fillRect: () => {}, clearRect: () => {} })
    };
  }
  return domElements[id];
}

global.document = {
  documentElement: { classList: { contains: () => false, add: () => {}, remove: () => {} } },
  getElementById: (id) => getOrCreateEl(id),
  querySelectorAll: () => [],
  createElement: (tag) => ({
    tagName: tag,
    className: '',
    innerHTML: '',
    style: {},
    children: [],
    appendChild: function(ch) { this.children.push(ch); },
    remove: function() {}
  }),
  addEventListener: () => {}
};

global.Chart = function() { return { destroy: () => {} }; };

// 2. Load Core Application Scripts
console.log('--- Loading System Modules ---');
vm.runInThisContext(fs.readFileSync(path.join(projectRoot, 'js/main.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(projectRoot, 'js/portal.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(projectRoot, 'js/login.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(projectRoot, 'js/roles.js'), 'utf8'));
console.log('[PASS] main.js, portal.js, login.js, roles.js compiled successfully.');

// --- TEST 1: Verify Initial Database Seeding & Normalization ---
console.log('\n--- TEST 1: Database Seeding & Normalization ---');
localStorage.clear();
appState = JSON.parse(JSON.stringify(initialSeedDatabase));
appState.complaints = normalizeComplaints(appState.complaints);
persist();

console.log(`Loaded ${appState.complaints.length} complaints, ${appState.technicians.length} technicians, ${appState.users.length} users.`);
if (appState.complaints.length >= 6 && appState.technicians.length >= 4) {
  console.log('[PASS] Initial database seed successfully loaded.');
} else {
  console.error('[FAIL] Database seed failed.');
  process.exit(1);
}

// --- TEST 2: Student Submits New Complaint ---
console.log('\n--- TEST 2: Student Files Problem ---');
currentSession = { role: 'student', grNo: '1001', name: 'Kabir Mehta', dept: 'Computer Department' };
persist();

getOrCreateEl('cTitle').value = 'Severe AC Leakage in LH-101';
getOrCreateEl('cCategory').value = 'Mechanical Department';
getOrCreateEl('cLocation').value = 'Lecture Hall 101';
getOrCreateEl('cDesc').value = 'Water dripping rapidly near main presentation screen.';
getOrCreateEl('cPriority').value = 'High';
tmpBase64Image = 'data:image/jpeg;base64,mockImageData==';
tmpBase64Video = '';

submitComplaint({ preventDefault: () => {} });

if (appState.complaints[0].title === 'Severe AC Leakage in LH-101') {
  console.log('[PASS] Complaint successfully submitted.');
} else {
  console.error('[FAIL] Complaint submission failed.');
  process.exit(1);
}

const newComplaint = appState.complaints[0];
console.log(`Created Ticket: ${newComplaint.id}, Status: "${newComplaint.status}", Stage: ${newComplaint.stage}`);

let stageInfo = getComplaintStageInfo(newComplaint);
if (newComplaint.status === 'Complaint Submitted' && stageInfo.stage === 1 && stageInfo.percent === 14) {
  console.log('[PASS] Stage 1 (14% - Complaint Submitted) verified.');
} else {
  console.error('[FAIL] Incorrect Stage 1:', stageInfo);
  process.exit(1);
}

// --- TEST 3: Admin Audits and Assigns to Department Faculty ---
console.log('\n--- TEST 3: Admin Verifies & Assigns to Department Faculty ---');
currentSession = { role: 'admin', username: 'admin', name: 'Executive Dean Office' };
persist();

openAdminRouteModal(newComplaint.id);
getOrCreateEl('adminRouteDept').value = 'Mechanical Department';

confirmAdminDispatch({ preventDefault: () => {} });

console.log(`After Admin Verification: Status: "${newComplaint.status}", Stage: ${newComplaint.stage}, Category: ${newComplaint.category}`);
stageInfo = getComplaintStageInfo(newComplaint);

if (newComplaint.status === 'Assigned to Faculty' && newComplaint.admin_status === 'Approved' && stageInfo.stage === 2 && stageInfo.percent === 28) {
  console.log('[PASS] Stage 2 (28% - Assigned to Faculty) verified.');
} else {
  console.error('[FAIL] Stage 2 failed:', stageInfo);
  process.exit(1);
}

// --- TEST 4: Faculty Assigns Specialized Technician ---
console.log('\n--- TEST 4: Faculty Assigns Specialized Technician ---');
currentSession = { role: 'faculty', name: 'Mechanical Faculty Advisor', dept: 'Mechanical Department' };
persist();

renderFaculty();
openFacultyForwardModal(newComplaint.id);

// Select technician Jagdish Panchal (TECH-02)
getOrCreateEl('forwardVerifyId').value = newComplaint.id;
getOrCreateEl('forwardSelectedTech').value = 'TECH-02';
getOrCreateEl('forwardDeadline').value = '2026-08-30';

confirmFacultyForward({ preventDefault: () => {} });

console.log(`After Faculty Tech Dispatch: Status: "${newComplaint.status}", Stage: ${newComplaint.stage}, Tech: ${newComplaint.techName}`);
stageInfo = getComplaintStageInfo(newComplaint);

if (newComplaint.status === 'Assigned to Technician' && newComplaint.techName === 'Jagdish Panchal' && stageInfo.stage === 3 && stageInfo.percent === 43) {
  console.log('[PASS] Stage 3 (43% - Assigned to Technician) verified.');
} else {
  console.error('[FAIL] Stage 3 failed:', stageInfo);
  process.exit(1);
}

// --- TEST 5: Technician Receives, Views, and Accepts Complaint ---
console.log('\n--- TEST 5: Technician Receives and Accepts Complaint ---');
currentSession = { role: 'technician', id: 'TECH-02', techId: 'TECH-02', name: 'Jagdish Panchal', dept: 'Mechanical Department' };
persist();

renderTechnician();
acceptTechComplaint(newComplaint.id);

console.log(`After Technician Acceptance: Status: "${newComplaint.status}", Stage: ${newComplaint.stage}, Work Status: "${newComplaint.work_status}"`);
stageInfo = getComplaintStageInfo(newComplaint);

if (newComplaint.status === 'Work in Progress' && newComplaint.technician_status === 'Accepted' && stageInfo.stage === 4 && stageInfo.percent === 57) {
  console.log('[PASS] Stage 4 (57% - Work in Progress) verified.');
} else {
  console.error('[FAIL] Stage 4 failed:', stageInfo);
  process.exit(1);
}

// --- TEST 6: Technician Completes Work and Sends to Faculty ---
console.log('\n--- TEST 6: Technician Completes Work & Submits Proof to Faculty ---');
openCompleteTechModal(newComplaint.id);
tmpBase64Proof = 'data:image/jpeg;base64,mockCompletionPhotoData==';
getOrCreateEl('completeRemark').value = 'Replaced damaged compressor bearing and cleared drain pipe.';

confirmCompleteTech({ preventDefault: () => {} });

console.log(`After Technician Completion: Status: "${newComplaint.status}", Stage: ${newComplaint.stage}, Proof: ${Boolean(newComplaint.proofImg)}`);
stageInfo = getComplaintStageInfo(newComplaint);

if (newComplaint.status === 'Work Completed by Technician' && newComplaint.technician_status === 'Completed' && stageInfo.stage === 5 && stageInfo.percent === 71) {
  console.log('[PASS] Stage 5 (71% - Work Completed by Technician) verified.');
} else {
  console.error('[FAIL] Stage 5 failed:', stageInfo);
  process.exit(1);
}

// --- TEST 7: Faculty Audits and Verifies Work, Sends to Admin ---
console.log('\n--- TEST 7: Faculty Audits QA and Sends to Admin ---');
currentSession = { role: 'faculty', name: 'Mechanical Faculty Advisor', dept: 'Mechanical Department' };
persist();

renderFaculty();
openFacultyQaModal(newComplaint.id);
setFacultyQaApproval(true);
getOrCreateEl('qaFeedbackComment').value = 'Audited LH-101 AC unit. Air conditioning is running cold and silent.';

confirmFacultyQa({ preventDefault: () => {} });

console.log(`After Faculty QA: Status: "${newComplaint.status}", Stage: ${newComplaint.stage}, QA Verified: ${newComplaint.qaVerified}`);
stageInfo = getComplaintStageInfo(newComplaint);

if (newComplaint.status === 'Faculty Verified' && newComplaint.faculty_status === 'Verified' && newComplaint.qaVerified === true && stageInfo.stage === 6 && stageInfo.percent === 86) {
  console.log('[PASS] Stage 6 (86% - Faculty Verified) verified.');
} else {
  console.error('[FAIL] Stage 6 failed:', stageInfo);
  process.exit(1);
}

// --- TEST 8: Admin Final Verification and Marks Completed ---
console.log('\n--- TEST 8: Admin Final Verification and Closure ---');
currentSession = { role: 'admin', username: 'admin', name: 'Executive Dean Office' };
persist();

renderAdmin();
confirmAdminFinalApproval(newComplaint.id);

console.log(`After Admin Final Sign-Off: Status: "${newComplaint.status}", Stage: ${newComplaint.stage}`);
stageInfo = getComplaintStageInfo(newComplaint);

if (newComplaint.status === 'Completed' && stageInfo.stage === 7 && stageInfo.percent === 100) {
  console.log('[PASS] Stage 7 (100% - Completed ✅) verified.');
} else {
  console.error('[FAIL] Stage 7 failed:', stageInfo);
  process.exit(1);
}

// --- TEST 9: Student Dashboard Verification ---
console.log('\n--- TEST 9: Student Dashboard 7-Stage Stepper Rendering ---');
currentSession = { role: 'student', grNo: '1001', name: 'Kabir Mehta', dept: 'Computer Department' };
persist();
renderStudent();

const stuListEl = getOrCreateEl('stuList');
if (stuListEl.children.length > 0) {
  console.log(`[PASS] Student cards rendered (${stuListEl.children.length} cards rendered).`);
} else {
  console.error('[FAIL] Student cards failed to render.');
  process.exit(1);
}

// --- TEST 10: Admin & Tech Rejection Flows ---
console.log('\n--- TEST 10: Rejection Flows ---');
const rejectTestTicket = {
  id: 'COMP-REJ-001',
  title: 'Test prank report',
  category: 'Civil Department',
  description: 'Fake issue',
  location: 'Grounds',
  priority: 'Low',
  reportedBy: 'Kabir Mehta',
  reportedByGr: '1001',
  reportedAt: nowStr(),
  status: 'Complaint Submitted',
  stage: 1,
  admin_status: 'Pending',
  technician_status: 'Pending',
  work_status: 'Not Started',
  faculty_status: 'Pending',
  logs: []
};
appState.complaints.unshift(rejectTestTicket);
persist();

getOrCreateEl('adminVerifyId').value = rejectTestTicket.id;
adminRejectTicket();

const r1 = getComplaintStageInfo(rejectTestTicket);
if (rejectTestTicket.status === 'Rejected by Admin' && r1.isRejected) {
  console.log('[PASS] Admin Rejection correctly stopped progression.');
} else {
  console.error('[FAIL] Admin Rejection failed:', r1);
  process.exit(1);
}

const techRejectTicket = {
  id: 'COMP-REJ-002',
  title: 'Specialized lab calibration',
  category: 'Electrical Department',
  description: 'Needs vendor technician',
  location: 'Lab 1',
  priority: 'High',
  reportedBy: 'Ananya Iyer',
  reportedByGr: '1002',
  reportedAt: nowStr(),
  status: 'Assigned to Technician',
  stage: 3,
  admin_status: 'Approved',
  technician_status: 'Pending',
  techId: 'TECH-01',
  techName: 'Dilip Prasad',
  work_status: 'Not Started',
  faculty_status: 'Dispatched',
  logs: []
};
appState.complaints.unshift(techRejectTicket);
persist();

getOrCreateEl('declineTechId').value = techRejectTicket.id;
getOrCreateEl('declineTechReason').value = 'Requires proprietary vendor replacement parts';
currentSession = { role: 'technician', name: 'Dilip Prasad', id: 'TECH-01', techId: 'TECH-01' };
confirmDeclineTech({ preventDefault: () => {} });

const r2 = getComplaintStageInfo(techRejectTicket);
if (techRejectTicket.status === 'Assigned to Faculty' && techRejectTicket.stage === 2 && techRejectTicket.lastRejectedTech === 'Dilip Prasad') {
  console.log('[PASS] Technician Decline correctly returned complaint to Faculty for reassignment.');
} else {
  console.error('[FAIL] Technician Rejection failed:', techRejectTicket, r2);
  process.exit(1);
}

console.log('\n=====================================================');
console.log('  ALL 10 VERIFICATION & REGRESSION TESTS PASSED! ✅');
console.log('=====================================================\n');
process.exit(0);
