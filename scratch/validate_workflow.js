const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== RUNNING WORKFLOW VERIFICATION TEST (WITH TECH REASSIGNMENT) ===\n');

const projectRoot = path.resolve(__dirname, '..');

// 1. Check JS syntax of all files
const filesToTest = [
  path.join(projectRoot, 'js/main.js'),
  path.join(projectRoot, 'js/roles.js'),
  path.join(projectRoot, 'js/portal.js'),
  path.join(projectRoot, 'js/login.js'),
  path.join(projectRoot, 'js/feed.js')
];

filesToTest.forEach(f => {
  try {
    const code = fs.readFileSync(f, 'utf8');
    new Function(code);
    console.log(`[PASS] Syntax OK: ${path.basename(f)}`);
  } catch (err) {
    console.error(`[FAIL] Syntax Error in ${path.basename(f)}:`, err.message);
    process.exit(1);
  }
});

// 2. Setup mock browser environment in global
const localStorageData = {};
global.localStorage = {
  getItem: (k) => localStorageData[k] || null,
  setItem: (k, v) => { localStorageData[k] = v; },
  removeItem: (k) => { delete localStorageData[k]; }
};

global.window = {
  location: { href: '', search: '' },
  print: () => {}
};
global.document = {
  documentElement: { classList: { contains: () => false, add: () => {}, remove: () => {} } },
  getElementById: (id) => ({
    value: '',
    innerText: '',
    innerHTML: '',
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    style: {},
    appendChild: () => {},
    remove: () => {},
    getContext: () => ({})
  }),
  querySelectorAll: () => [],
  createElement: () => ({
    className: '',
    innerHTML: '',
    appendChild: () => {},
    remove: () => {},
    style: {}
  }),
  addEventListener: () => {}
};
global.Chart = function() { return { destroy: () => {} }; };

// 3. Load files in global context
vm.runInThisContext(fs.readFileSync(path.join(projectRoot, 'js/main.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(projectRoot, 'js/portal.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(projectRoot, 'js/login.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(projectRoot, 'js/roles.js'), 'utf8'));

console.log('\n[PASS] All modules evaluated in global context without errors.');

// 4. Test Student -> Admin -> Faculty -> Tech Rejection -> Faculty Reassignment -> Tech Accept -> Tech Complete -> Faculty QA -> Admin Complete
console.log('\n--- Testing End-to-End Workflow with Technician Rejection & Reassignment ---');

// Step 1: Student Files Complaint
const newTicketId = 'COMP-TEST-001';
const studentComplaint = {
  id: newTicketId,
  title: 'Corridor emergency lighting failing',
  category: 'Electrical Department',
  description: 'Emergency lights are not turning on in Corridor 3.',
  location: 'Block C 2nd Floor',
  priority: 'High',
  reportedBy: 'Kabir Mehta',
  reportedByGr: '1001',
  reportedAt: nowStr(),
  status: 'Complaint Submitted',
  current_status: 'Complaint Submitted',
  stage: 1,
  admin_status: 'Pending',
  technician_status: 'Pending',
  technician_action: null,
  work_status: 'Not Started',
  faculty_status: 'Pending',
  technician_completion_date: null,
  faculty_verification_date: null,
  admin_final_date: null,
  techId: null,
  techName: null,
  lastRejectedTech: null,
  rejectionReason: '',
  deadline: '',
  image: 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?q=80&w=600',
  video: '',
  proofImg: '',
  remark: '',
  qaVerified: false,
  qaFeedback: '',
  logs: [
    { s: 'Complaint Submitted', note: 'Self Category: Electrical Department | Priority: High', time: nowStr(), by: 'Kabir Mehta' }
  ]
};

appState.complaints.unshift(studentComplaint);
persist();

let sInfo = getComplaintStageInfo(studentComplaint);
if (sInfo.stage === 1 && sInfo.percent === 14 && sInfo.statusText === 'Complaint Submitted') {
  console.log(`[PASS] Step 1 (Student Filed): Stage=${sInfo.stage} (${sInfo.percent}%), Status="${sInfo.statusText}"`);
} else {
  console.error(`[FAIL] Step 1 Failed:`, sInfo);
  process.exit(1);
}

// Step 2: Admin Verifies and Assigns to Department Faculty
studentComplaint.category = 'Electrical Department';
studentComplaint.status = 'Assigned to Faculty';
studentComplaint.current_status = 'Assigned to Faculty';
studentComplaint.stage = 2;
studentComplaint.admin_status = 'Approved';
studentComplaint.admin_verification_date = nowStr();
studentComplaint.logs.push({ s: 'Admin Verified', note: 'Approved by Admin & assigned to Electrical Department Faculty', time: nowStr(), by: 'Admin Office' });
persist();

sInfo = getComplaintStageInfo(studentComplaint);
if (sInfo.stage === 2 && sInfo.percent === 28 && sInfo.statusText === 'Assigned to Faculty') {
  console.log(`[PASS] Step 2 (Admin Assigned to Faculty): Stage=${sInfo.stage} (${sInfo.percent}%), Status="${sInfo.statusText}"`);
} else {
  console.error(`[FAIL] Step 2 Failed:`, sInfo);
  process.exit(1);
}

// Step 3: Faculty Assigns Technician A (Dilip Prasad)
studentComplaint.techId = 'TECH-01';
studentComplaint.techName = 'Dilip Prasad';
studentComplaint.deadline = '25/08/2026';
studentComplaint.status = 'Assigned to Technician';
studentComplaint.current_status = 'Assigned to Technician';
studentComplaint.stage = 3;
studentComplaint.faculty_status = 'Dispatched';
studentComplaint.logs.push({ s: 'Faculty Assigned Tech', note: 'Assigned to Technician Dilip Prasad with deadline 25/08/2026', time: nowStr(), by: 'Electrical Faculty' });
persist();

sInfo = getComplaintStageInfo(studentComplaint);
if (sInfo.stage === 3 && sInfo.percent === 43 && sInfo.statusText === 'Assigned to Technician') {
  console.log(`[PASS] Step 3 (Faculty Assigned Tech A): Stage=${sInfo.stage} (${sInfo.percent}%), Status="${sInfo.statusText}"`);
} else {
  console.error(`[FAIL] Step 3 Failed:`, sInfo);
  process.exit(1);
}

// Step 3b: Technician A Rejects Complaint with Reason (Returns to Faculty)
studentComplaint.status = 'Assigned to Faculty';
studentComplaint.current_status = 'Assigned to Faculty';
studentComplaint.stage = 2;
studentComplaint.technician_status = 'Rejected';
studentComplaint.technician_action = 'Rejected';
studentComplaint.work_status = 'Not Started';
studentComplaint.faculty_status = 'Pending Reassignment';
studentComplaint.lastRejectedTech = 'Dilip Prasad';
studentComplaint.rejectionReason = 'Specialized 24V emergency capacitors out of stock';
studentComplaint.techId = null;
studentComplaint.techName = null;
studentComplaint.deadline = '';
studentComplaint.logs.push({ s: 'Technician Declined', note: 'Declined by Dilip Prasad: "Specialized 24V emergency capacitors out of stock" — Returned to Faculty for reassignment', time: nowStr(), by: 'Dilip Prasad' });
persist();

sInfo = getComplaintStageInfo(studentComplaint);
if (sInfo.stage === 2 && sInfo.percent === 28 && sInfo.statusText.includes('Assigned to Faculty')) {
  console.log(`[PASS] Step 3b (Technician A Declined with Reason): Returned to Stage=${sInfo.stage} (${sInfo.percent}%), Status="${sInfo.statusText}", Reason="${studentComplaint.rejectionReason}"`);
} else {
  console.error(`[FAIL] Step 3b Failed:`, sInfo);
  process.exit(1);
}

// Step 3c: Faculty Reassigns to Technician B (Ankit Sharma)
studentComplaint.techId = 'TECH-03';
studentComplaint.techName = 'Ankit Sharma';
studentComplaint.deadline = '26/08/2026';
studentComplaint.status = 'Assigned to Technician';
studentComplaint.current_status = 'Assigned to Technician';
studentComplaint.stage = 3;
studentComplaint.faculty_status = 'Dispatched';
studentComplaint.technician_status = 'Pending';
studentComplaint.work_status = 'Not Started';
studentComplaint.lastRejectedTech = null;
studentComplaint.logs.push({ s: 'Faculty Assigned Tech', note: 'Reassigned to Technician Ankit Sharma with deadline 26/08/2026', time: nowStr(), by: 'Electrical Faculty' });
persist();

sInfo = getComplaintStageInfo(studentComplaint);
if (sInfo.stage === 3 && sInfo.percent === 43 && sInfo.statusText === 'Assigned to Technician' && studentComplaint.techName === 'Ankit Sharma') {
  console.log(`[PASS] Step 3c (Faculty Reassigned to Tech B): Stage=${sInfo.stage} (${sInfo.percent}%), Assigned Tech="${studentComplaint.techName}"`);
} else {
  console.error(`[FAIL] Step 3c Failed:`, sInfo);
  process.exit(1);
}

// Step 4: Technician B Accepts Complaint & Starts Work
studentComplaint.status = 'Work in Progress';
studentComplaint.current_status = 'Work in Progress';
studentComplaint.stage = 4;
studentComplaint.technician_status = 'Accepted';
studentComplaint.technician_action = 'Accepted';
studentComplaint.work_status = 'In Progress';
studentComplaint.logs.push({ s: 'Technician Accepted', note: 'Accepted by Ankit Sharma', time: nowStr(), by: 'Ankit Sharma' });
studentComplaint.logs.push({ s: 'Work in Progress', note: 'Work underway', time: nowStr(), by: 'Ankit Sharma' });
persist();

sInfo = getComplaintStageInfo(studentComplaint);
if (sInfo.stage === 4 && sInfo.percent === 57 && sInfo.statusText === 'Work in Progress') {
  console.log(`[PASS] Step 4 (Technician B Work in Progress): Stage=${sInfo.stage} (${sInfo.percent}%), Status="${sInfo.statusText}"`);
} else {
  console.error(`[FAIL] Step 4 Failed:`, sInfo);
  process.exit(1);
}

// Step 5: Technician B Completes Work and Sends Proof to Faculty
studentComplaint.status = 'Work Completed by Technician';
studentComplaint.current_status = 'Work Completed by Technician';
studentComplaint.stage = 5;
studentComplaint.technician_status = 'Completed';
studentComplaint.work_status = 'Completed';
studentComplaint.technician_completion_date = nowStr();
studentComplaint.proofImg = 'data:image/jpeg;base64,mockProofData';
studentComplaint.remark = 'Replaced backup capacitor and 24V LED array';
studentComplaint.logs.push({ s: 'Technician Completed', note: studentComplaint.remark, time: nowStr(), by: 'Ankit Sharma' });
studentComplaint.logs.push({ s: 'Sent to Faculty', note: 'Transferred to Department Faculty for QA Verification', time: nowStr(), by: 'Ankit Sharma' });
persist();

sInfo = getComplaintStageInfo(studentComplaint);
if (sInfo.stage === 5 && sInfo.percent === 71 && sInfo.statusText === 'Work Completed by Technician') {
  console.log(`[PASS] Step 5 (Technician B Completed & Sent to Faculty): Stage=${sInfo.stage} (${sInfo.percent}%), Status="${sInfo.statusText}"`);
} else {
  console.error(`[FAIL] Step 5 Failed:`, sInfo);
  process.exit(1);
}

// Step 6: Faculty Verifies and Sends to Admin
studentComplaint.status = 'Faculty Verified';
studentComplaint.current_status = 'Faculty Verified';
studentComplaint.stage = 6;
studentComplaint.faculty_status = 'Verified';
studentComplaint.faculty_verification_date = nowStr();
studentComplaint.qaVerified = true;
studentComplaint.qaFeedback = 'Tested emergency corridor lighting, illuminated properly.';
studentComplaint.logs.push({ s: 'Faculty Verified', note: studentComplaint.qaFeedback + ' - Sent to Admin for final approval', time: nowStr(), by: 'Electrical Faculty' });
persist();

sInfo = getComplaintStageInfo(studentComplaint);
if (sInfo.stage === 6 && sInfo.percent === 86 && sInfo.statusText === 'Faculty Verified') {
  console.log(`[PASS] Step 6 (Faculty Verified & Sent to Admin): Stage=${sInfo.stage} (${sInfo.percent}%), Status="${sInfo.statusText}"`);
} else {
  console.error(`[FAIL] Step 6 Failed:`, sInfo);
  process.exit(1);
}

// Step 7: Admin Verifies and Updates Status to Complete
studentComplaint.status = 'Completed';
studentComplaint.current_status = 'Completed';
studentComplaint.stage = 7;
studentComplaint.admin_final_date = nowStr();
studentComplaint.logs.push({ s: 'Admin Final Verified', note: 'Admin verified faculty audit and approved completion.', time: nowStr(), by: 'Admin Office' });
studentComplaint.logs.push({ s: 'Completed', note: 'Complaint fully completed and officially closed.', time: nowStr(), by: 'System' });
persist();

sInfo = getComplaintStageInfo(studentComplaint);
if (sInfo.stage === 7 && sInfo.percent === 100 && sInfo.statusText === 'Completed ✅') {
  console.log(`[PASS] Step 7 (Admin Verified & Completed): Stage=${sInfo.stage} (${sInfo.percent}%), Status="${sInfo.statusText}"`);
} else {
  console.error(`[FAIL] Step 7 Failed:`, sInfo);
  process.exit(1);
}

// Step 8: Test Admin Terminal Rejection
const rejectedByAdmin = {
  id: 'COMP-TEST-REJ-1',
  status: 'Rejected by Admin',
  stage: 0,
  admin_status: 'Rejected'
};
const r1Info = getComplaintStageInfo(rejectedByAdmin);
if (r1Info.isRejected && r1Info.statusText === 'Rejected by Admin') {
  console.log(`[PASS] Admin Rejection Flow: Status="${r1Info.statusText}", isRejected=${r1Info.isRejected}`);
} else {
  console.error(`[FAIL] Admin Rejection Flow Failed:`, r1Info);
  process.exit(1);
}

console.log('\n======================================================');
console.log('ALL WORKFLOW VERIFICATION & REASSIGNMENT TESTS PASSED!');
console.log('======================================================\n');
process.exit(0);
