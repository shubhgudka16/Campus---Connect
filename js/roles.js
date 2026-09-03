/* ==========================================================================
   Campus Connect - Role Portals & Workspaces Engine (roles.js)
   ========================================================================== */

let tmpBase64Proof = null;

function handleProofPhotoUpload(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    tmpBase64Proof = e.target.result;
    document.getElementById('proofImgPreview')?.classList.remove('hidden');
    const preview = document.getElementById('proofPreviewTag');
    if (preview) preview.src = e.target.result;
    document.getElementById('proofPlaceholderBtn')?.classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

function showView(viewId) {
  const views = ['roles', 'student', 'faculty', 'technician', 'admin', 'landing', 'auth', 'portal', 'feed'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) {
      if (v === viewId) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });
}

function showRoleView(viewId) {
  const views = ['roles', 'student', 'faculty', 'technician', 'admin'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) {
      if (v === viewId) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });

  if (viewId === 'student') renderStudent(true);
  if (viewId === 'faculty') renderFaculty();
  if (viewId === 'technician') renderTechnician();
  if (viewId === 'admin') renderAdmin();

  if (typeof initScrollObserver === 'function') {
    initScrollObserver();
  }
  if (typeof init3DTiltCards === 'function') {
    init3DTiltCards();
  }
}

async function renderByRole() {
  const params = new URLSearchParams(window.location.search);
  const roleParam = params.get('role');
  const actionParam = params.get('action');

  // Verify and sync with active PHP backend session
  try {
    const sessRes = await fetch('backend/auth/session.php');
    if (sessRes.ok) {
      const sessData = await sessRes.json();
      if (sessData.success && sessData.data?.session) {
        currentSession = sessData.data.session;
        localStorage.setItem('campus_session', JSON.stringify(currentSession));
        sessionStorage.setItem('campus_session_active', '1');
        if (typeof syncNavProfile === 'function') syncNavProfile();
      }
    }
  } catch (e) {}

  if (roleParam && ['student', 'faculty', 'technician', 'admin'].includes(roleParam)) {
    if (!currentSession || currentSession.role !== roleParam) {
      if (roleParam === 'student') {
        currentSession = { role: 'student', grNo: '1001', name: 'Kabir Mehta', dept: 'Computer Department', avatar: null, loginTimestamp: Date.now() };
      } else if (roleParam === 'faculty') {
        currentSession = { role: 'faculty', name: 'Computer Faculty Advisor', dept: 'Computer Department', avatar: null, loginTimestamp: Date.now() };
      } else if (roleParam === 'technician') {
        const tech = appState.technicians[0];
        currentSession = { role: 'technician', id: tech.id, techId: tech.id, name: tech.name, dept: tech.dept, experience: tech.experience, rating: tech.rating, avatar: null, loginTimestamp: Date.now() };
      } else if (roleParam === 'admin') {
        currentSession = { role: 'admin', username: 'admin', name: 'Executive Dean Office', avatar: null, loginTimestamp: Date.now() };
      }
      persist();
    }
    showRoleView(roleParam);
    handleRoleActionParam(actionParam);
    return;
  }

  if (currentSession && currentSession.role) {
    showRoleView(currentSession.role);
    handleRoleActionParam(actionParam);
  } else {
    showRoleView('roles');
  }
}

function handleRoleActionParam(action) {
  if (!action) return;
  setTimeout(() => {
    if (typeof openComplaintModal === 'function') {
      openComplaintModal();
      if (action === 'emergency') {
        const p = document.getElementById('cPriority');
        const t = document.getElementById('cTitle');
        if (p) p.value = 'High';
        if (t) t.value = 'Emergency Hazard Report: ';
      }
    }
  }, 200);
}


/* ==========================================================================
   1. STUDENT VIEW & 7-STAGE PROGRESS BAR
   ========================================================================== */
async function renderStudent(forceFetch = true) {
  showView('student');
  if (typeof syncNavProfile === 'function') syncNavProfile();

  // Retrieve student complaints directly from MySQL database
  if (forceFetch) {
    try {
      const res = await fetch('backend/complaints/list.php?role=student');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          appState.complaints = data.data;
        }
      }
    } catch (err) {
      console.error('Failed to fetch student complaints from MySQL:', err);
    }
  }

  const warningWrap = document.getElementById('studentWarningContainer');
  if (warningWrap) {
    warningWrap.innerHTML = '';
    const u = (appState.users || []).find(x => x.grNo === currentSession?.grNo);
    if (u && u.warned) {
      warningWrap.innerHTML = `
        <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 text-sm font-semibold flex items-center gap-3">
          <i class="fa-solid fa-triangle-exclamation text-lg"></i>
          <div>
            <b class="font-bold">Official Warning Notice:</b> Please prevent submission of fraudulent issues. Future false reports will result in immediate account suspension.
          </div>
        </div>`;
    }
  }

  const stuAvatar = document.getElementById('stuAvatarBig');
  if (stuAvatar) {
    if (currentSession?.avatar) {
      stuAvatar.style.backgroundImage = `url('${currentSession.avatar}')`;
      stuAvatar.innerText = '';
    } else {
      stuAvatar.style.backgroundImage = 'none';
      stuAvatar.innerText = (currentSession?.name || 'S')[0].toUpperCase();
    }
  }

  const stuNameBig = document.getElementById('stuNameBig');
  if (stuNameBig) stuNameBig.innerText = currentSession?.name || 'Student';
  const stuDeptBig = document.getElementById('stuDeptBig');
  if (stuDeptBig) stuDeptBig.innerText = currentSession?.dept || 'Department';

  const allMyTickets = (appState.complaints || []).filter(c => 
    !currentSession || !currentSession.grNo ||
    c.reportedByGr === currentSession.grNo || 
    c.reportedBy === currentSession.name
  );

  const sQuery = (document.getElementById('stuSearch')?.value || '').trim().toLowerCase();
  let myTickets = allMyTickets;
  if (sQuery) {
    myTickets = allMyTickets.filter(c => {
      const matchText = [c.title, c.description, c.category, c.location, c.id, c.status, c.techName, c.remark, c.priority].filter(Boolean).join(' ').toLowerCase();
      return matchText.includes(sQuery);
    });
  }

  const sTotal = document.getElementById('sTotal');
  if (sTotal) sTotal.innerText = allMyTickets.length;
  const sPending = document.getElementById('sPending');
  if (sPending) sPending.innerText = allMyTickets.filter(c => c.stage === 1 || c.status === 'Complaint Submitted').length;
  const sActive = document.getElementById('sActive');
  if (sActive) sActive.innerText = allMyTickets.filter(c => c.stage >= 2 && c.stage <= 6).length;
  const sClosed = document.getElementById('sClosed');
  if (sClosed) sClosed.innerText = allMyTickets.filter(c => c.stage === 7 || c.status === 'Completed').length;

  const list = document.getElementById('stuList');
  list.innerHTML = '';
  if (myTickets.length === 0) {
    list.innerHTML = `
      <div class="bg-white dark:bg-zinc-900 border border-dashed rounded-[20px] p-12 text-center">
        <i class="fa-solid fa-folder-open text-3xl text-slate-300 mb-3"></i>
        <div class="font-bold">${sQuery ? `No complaints found matching "${sQuery}"` : 'No registered complaints'}</div>
        ${sQuery ? `<button onclick="document.getElementById('stuSearch').value=''; renderStudent(false);" class="mt-3 px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold hover:bg-slate-200">Clear Search</button>` : `<button onclick="openComplaintModal()" class="mt-4 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-xs">+ Register Complaint</button>`}
      </div>`;
    return;
  }

  myTickets.forEach((c, index) => {
    const stageInfo = getComplaintStageInfo(c);
    const isCompleted = stageInfo.stage === 7 || c.status === 'Completed' || c.status === 'Student Not Satisfied';
    const isRejected = stageInfo.isRejected;

    let feedbackHtml = '';
    if (isCompleted || c.status === 'Completed' || c.status === 'Student Not Satisfied' || c.stage === 7) {
      if (!c.feedback) {
        feedbackHtml = `
          <div class="mt-3 p-4 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-2xl space-y-3">
            <div>
              <b class="text-xs text-slate-800 dark:text-zinc-200 font-bold flex items-center gap-1.5"><i class="fa-solid fa-star-half-stroke text-amber-500"></i> Was your complaint resolved satisfactorily?</b>
              <p class="text-[11px] text-slate-500 mt-0.5">Please share your experience with the resolution quality.</p>
            </div>
            <div class="space-y-2.5">
              <div class="flex flex-wrap gap-4 text-xs font-semibold text-slate-700 dark:text-zinc-200">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="fbOpt_${c.id}" value="Satisfied" id="fbSat_${c.id}" class="accent-emerald-600 h-4 w-4 cursor-pointer" checked>
                  <span class="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold"><i class="fa-solid fa-thumbs-up"></i> Satisfied</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="fbOpt_${c.id}" value="Not Satisfied" id="fbNotSat_${c.id}" class="accent-red-600 h-4 w-4 cursor-pointer">
                  <span class="flex items-center gap-1 text-red-700 dark:text-red-300 font-bold"><i class="fa-solid fa-thumbs-down"></i> Not Satisfied</span>
                </label>
              </div>
              <div>
                <label class="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 block mb-1">Add a comment (optional)</label>
                <textarea id="fbComment_${c.id}" rows="2" placeholder="Tell us about your experience..." class="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs text-slate-800 dark:text-zinc-200 outline-none"></textarea>
              </div>
              <button onclick="submitStudentFeedbackWithComment('${c.id}')" class="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-xs shadow-md transition hover:opacity-90">
                Submit Feedback
              </button>
            </div>
          </div>`;
      } else if (c.feedback === 'Satisfied') {
        feedbackHtml = `
          <div class="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
            <i class="fa-solid fa-circle-check text-emerald-600 text-sm mt-0.5 shrink-0"></i>
            <div>
              <b class="font-bold">Feedback: Satisfied</b> — Thank you for your feedback.
              ${c.feedbackComment ? `<p class="text-[11px] text-slate-600 dark:text-zinc-300 mt-1 italic">"${c.feedbackComment}"</p>` : ''}
              <span class="text-[10px] text-slate-400 block mt-0.5">${c.feedbackTime || ''}</span>
            </div>
          </div>`;
      } else if (c.feedback === 'Not Satisfied') {
        feedbackHtml = `
          <div class="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <i class="fa-solid fa-triangle-exclamation text-amber-600 text-sm mt-0.5 shrink-0"></i>
            <div>
              <b class="font-bold">Feedback: Student Not Satisfied</b> — Admin has been notified for rework review.
              ${c.feedbackComment ? `<p class="text-[11px] text-slate-600 dark:text-zinc-300 mt-1 italic">"${c.feedbackComment}"</p>` : ''}
              <span class="text-[10px] text-slate-400 block mt-0.5">${c.feedbackTime || ''}</span>
            </div>
          </div>`;
      }
    }

    const stepDefinitions = [
      { num: 1, label: '1. Submitted', full: 'Complaint Submitted', icon: 'fa-file-circle-plus' },
      { num: 2, label: '2. Admin Assigned', full: 'Admin Verified & Assigned to Faculty', icon: 'fa-shield-halved' },
      { num: 3, label: '3. Faculty Assigned', full: 'Faculty Assigned Technician', icon: 'fa-user-tie' },
      { num: 4, label: '4. In Progress', full: 'Work in Progress', icon: 'fa-screwdriver-wrench' },
      { num: 5, label: '5. Tech Completed', full: 'Technician Completed & Sent to Faculty', icon: 'fa-camera' },
      { num: 6, label: '6. Faculty Verified', full: 'Faculty Verified & Sent to Admin', icon: 'fa-graduation-cap' },
      { num: 7, label: '7. Completed ✅', full: 'Admin Verified & Completed', icon: 'fa-circle-check' }
    ];

    const stepsHtml = stepDefinitions.map(step => {
      let itemClass = '';
      let iconHtml = '';
      
      if (isRejected && step.num === stageInfo.stage) {
        itemClass = 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 font-bold';
        iconHtml = '<i class="fa-solid fa-circle-xmark text-red-500 mr-1"></i>';
      } else if (step.num < stageInfo.stage || (step.num === 7 && isCompleted)) {
        itemClass = 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 font-semibold';
        iconHtml = '<i class="fa-solid fa-circle-check text-emerald-500 mr-1"></i>';
      } else if (step.num === stageInfo.stage && !isCompleted && !isRejected) {
        itemClass = 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-500/40 font-bold ring-1 ring-blue-500/30 shadow-sm';
        iconHtml = '<i class="fa-solid fa-circle-dot text-blue-600 dark:text-blue-400 mr-1 animate-pulse"></i>';
      } else {
        itemClass = 'bg-slate-50 dark:bg-zinc-800/30 text-slate-400 dark:text-zinc-500 border-slate-200/50 dark:border-zinc-800';
        iconHtml = '<i class="fa-regular fa-circle text-slate-300 dark:text-zinc-600 mr-1"></i>';
      }

      return `
        <div class="p-2 rounded-xl border flex items-center gap-1 text-[11px] ${itemClass}" title="${step.full}">
          ${iconHtml}
          <span class="truncate">${step.label}</span>
        </div>
      `;
    }).join('');

    const card = document.createElement('div');
    const delayClass = `delay-${((index % 4) + 1) * 100}`;
    card.className = `bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[24px] p-5 card-hover reveal-on-scroll overflow-hidden ${delayClass}`;
    card.innerHTML = `
      <div class="flex flex-col lg:flex-row gap-5 min-w-0">
        <div class="w-full lg:w-64 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 border shrink-0 flex flex-col gap-2 p-2">
          <div class="relative h-32 w-full rounded-xl overflow-hidden">
            <img src="${c.image}" class="w-full h-full object-cover cursor-pointer" onclick="openLightbox('${c.image}', '${c.title}')">
            <span class="absolute top-2 left-2 px-2 py-0.5 text-[9px] font-bold bg-black/60 text-white rounded">Photo Evidence</span>
          </div>
          ${c.video ? `
            <button type="button" onclick="openLightbox('${c.video}', '${c.title}', 'video')" class="w-full py-1.5 rounded-lg bg-violet-600/10 text-violet-600 dark:text-violet-400 text-xs font-bold hover:bg-violet-600/20"><i class="fa-solid fa-circle-play mr-1"></i> Watch Fault Video</button>
          ` : ''}
        </div>
        
        <div class="flex-1 min-w-0 space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-[11px] font-mono font-bold text-slate-500">${c.id} • ${c.reportedAt}</span>
            <span class="px-2.5 py-1 rounded-full text-[11px] font-bold border ${stageInfo.badgeClass}">${stageInfo.statusText}</span>
            <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-zinc-800 border">${c.category}</span>
            <span class="px-2.5 py-0.5 rounded text-[10px] font-bold ${c.priority === 'High' ? 'bg-red-600 text-white' : 'bg-slate-200 dark:bg-zinc-800'}">${c.priority} Priority</span>
          </div>
          <h4 class="font-display font-bold text-lg text-slate-900 dark:text-zinc-100">${c.title}</h4>
          <p class="text-xs text-slate-600 dark:text-zinc-400 font-medium">
            <i class="fa-solid fa-location-dot mr-1"></i> Location: <b>${c.location}</b> | 
            <i class="fa-solid fa-user-tie mr-1"></i> Assigned Technician: <b>${c.techName || (c.stage >= 2 ? 'Pending Faculty Assignment' : 'Pending Admin Verification')}</b>
          </p>
          <div class="text-sm bg-slate-50 dark:bg-zinc-800/60 rounded-xl p-3 border border-slate-100 dark:border-zinc-800">${c.description}</div>
          
          ${c.proofImg ? `
            <div class="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex gap-3 items-center">
              <img src="${c.proofImg}" class="h-16 w-24 object-cover rounded-lg border cursor-pointer shrink-0" onclick="openLightbox('${c.proofImg}', 'Completion proof for ${c.id}')">
              <div class="text-xs">
                <b class="text-emerald-700 dark:text-emerald-400"><i class="fa-solid fa-square-check mr-1"></i> Technician Action Uploaded</b>
                <p class="text-slate-500 mt-0.5">"${c.remark}"</p>
                <span class="text-[10px] text-slate-400 block mt-1"><i class="fa-solid fa-clock mr-1"></i> Completed: ${c.technician_completion_date || ''}</span>
              </div>
            </div>
          ` : ''}

          ${c.qaVerified ? `
            <div class="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs">
              <b class="text-blue-700 dark:text-blue-400"><i class="fa-solid fa-shield-check mr-1"></i> Faculty QA Audited & Confirmed Completed</b>
              <p class="text-slate-500 mt-1">Feedback: "${c.qaFeedback}"</p>
              <span class="text-[10px] text-slate-400 block mt-1"><i class="fa-solid fa-clock mr-1"></i> Verified on: ${c.faculty_verification_date || ''}</span>
            </div>
          ` : ''}

          ${c.lastRejectedTech && c.stage === 2 ? `
            <div class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
              <b class="font-bold"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Technician Unavailable:</b> 
              Technician <b>${c.lastRejectedTech}</b> declined assignment ("${c.rejectionReason || 'Unavailable'}"). Department Faculty is currently assigning another specialized technician.
            </div>
          ` : ''}

          ${isRejected ? `
            <div class="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 rounded-xl text-xs text-red-700 dark:text-red-300">
              <b class="font-bold"><i class="fa-solid fa-circle-xmark mr-1"></i> Rejected by ${stageInfo.rejectedBy}:</b> "${c.rejectionReason || 'Complaint rejected.'}"
            </div>
          ` : ''}

          <!-- Feedback Section for Solved Complaints -->
          ${feedbackHtml}

          <!-- 7-Stage Interactive Progress Bar -->
          <div class="space-y-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <div class="flex justify-between items-center text-xs">
              <div class="flex items-center gap-1.5">
                <span class="text-slate-500 dark:text-zinc-400 font-medium">Current Status:</span>
                <span class="font-bold ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : (isRejected ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400')}">
                  ${stageInfo.statusText}
                </span>
              </div>
              <span class="font-mono font-bold text-xs ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-zinc-400'}">
                ${stageInfo.percent}% ${isCompleted ? '• Work Done' : ''}
              </span>
            </div>

            <div class="w-full h-2.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-zinc-700/60">
              <div class="h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : (isRejected ? 'bg-red-500' : 'bg-gradient-to-r from-blue-600 to-indigo-500')}"
                   style="width: ${stageInfo.percent}%"></div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 pt-1">
              ${stepsHtml}
            </div>
          </div>

          <!-- Resolution Pathway / Audit Logs -->
          <div class="pt-2">
            <span class="text-[10px] font-bold tracking-widest uppercase text-slate-500 block mb-1">Resolution Pathway</span>
            <div class="flex gap-2 items-center overflow-x-auto pb-1">
              ${c.logs.map(lg => `
                <div class="flex items-center gap-1.5 shrink-0">
                  <div class="h-5 w-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black flex items-center justify-center text-[8px]"><i class="fa-solid fa-check"></i></div>
                  <div class="text-[10px] leading-tight">
                    <b class="block text-slate-800 dark:text-zinc-200">${lg.s}</b>
                    <span class="text-slate-500">${lg.time}</span>
                  </div>
                  <div class="w-4 h-[1px] bg-slate-300 dark:bg-zinc-700"></div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>`;
    list.appendChild(card);
  });

  if (typeof initScrollObserver === 'function') setTimeout(initScrollObserver, 50);
}

function submitStudentFeedbackWithComment(id) {
  const satRadio = document.getElementById(`fbSat_${id}`);
  const feedback = (satRadio && satRadio.checked) ? 'Satisfied' : 'Not Satisfied';
  const comment = (document.getElementById(`fbComment_${id}`)?.value || '').trim();

  submitStudentFeedback(id, feedback, comment);
}

async function submitStudentFeedback(id, feedback, comment = '') {
  const c = appState.complaints.find(x => x.id === id);
  if (!c) return;

  try {
    const res = await fetch('backend/complaints/feedback.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, feedback, comment })
    });
    const data = await res.json();
    if (!data.success) {
      return toast(data.message || 'Error recording feedback', 'err');
    }

    c.feedback = feedback;
    c.feedbackComment = comment || c.feedbackComment || '';
    c.feedbackTime = (data.data && data.data.feedbackTime) ? data.data.feedbackTime : nowStr();

    if (feedback === 'Satisfied') {
      c.feedbackStatus = 'Satisfied';
      toast('Thank you for your feedback.');
    } else {
      c.feedbackStatus = 'Student Not Satisfied';
      c.status = 'Student Not Satisfied';
      c.current_status = 'Student Not Satisfied';
      toast('Feedback recorded. Admin has been notified for rework review.', 'err');
    }

    persist();
    await renderStudent(true);
  } catch (err) {
    toast('Error saving feedback.', 'err');
  }
}


/* ==========================================================================
   2. ADMIN VERIFICATION & GOVERNANCE DASHBOARD
   ========================================================================== */
function switchAdmin(tab) {
  activeAdminViewTab = tab;
  ['dash', 'tickets', 'final', 'staff', 'students', 'reports'].forEach(t => {
    document.getElementById(`admin-${t}`)?.classList.add('hidden');
    const tabBtn = document.getElementById(`aTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (tabBtn) tabBtn.className = 'px-5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border font-semibold text-sm';
  });
  
  document.getElementById(`admin-${tab}`)?.classList.remove('hidden');
  const activeTabBtn = document.getElementById(`aTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
  if (activeTabBtn) activeTabBtn.className = 'px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-sm';
  
  if (tab === 'dash') drawCharts();
  if (tab === 'tickets') renderAdminTickets();
  if (tab === 'final') renderAdminFinalTickets();
  if (tab === 'staff') renderAdminStaff();
  if (tab === 'students') renderAdminStudents();
  if (tab === 'reports') renderReports();
}

async function renderAdmin() {
  showView('admin');
  if (typeof syncNavProfile === 'function') syncNavProfile();
  if (typeof checkAdminReminders === 'function') checkAdminReminders();

  try {
    const [compRes, dashRes] = await Promise.all([
      fetch('backend/complaints/list.php?role=admin'),
      fetch('backend/admin/dashboard.php')
    ]);
    const compData = await compRes.json();
    const dashData = await dashRes.json();

    if (compData.success && Array.isArray(compData.data)) {
      appState.complaints = compData.data;
    }

    if (dashData.success && dashData.data) {
      const d = dashData.data;
      const aTotal = document.getElementById('aTotal');
      if (aTotal) aTotal.innerText = d.total;
      const aRate = document.getElementById('aRate');
      if (aRate) aRate.innerText = d.resolutionRate;
      const aAvg = document.getElementById('aAvg');
      if (aAvg) aAvg.innerText = d.avgSla;
      const aSat = document.getElementById('aSat');
      if (aSat) aSat.innerText = d.avgRating;
      const aStaff = document.getElementById('aStaff');
      if (aStaff) aStaff.innerText = d.activeStaff;
    }
  } catch (e) {
    const total = appState.complaints.length;
    const aTotal = document.getElementById('aTotal');
    if (aTotal) aTotal.innerText = total;
    const closed = appState.complaints.filter(c => c.stage === 7 || c.status === 'Completed').length;
    const aRate = document.getElementById('aRate');
    if (aRate) aRate.innerText = total ? Math.round(closed / total * 100) + '%' : '0%';
    const aAvg = document.getElementById('aAvg');
    if (aAvg) aAvg.innerText = '15 Mins';
    
    const ratedTechs = (appState.technicians || []).filter(t => t.rating > 0);
    const avgSat = ratedTechs.length ? (ratedTechs.reduce((a, b) => a + b.rating, 0) / ratedTechs.length).toFixed(1) : '5.0';
    const aSat = document.getElementById('aSat');
    if (aSat) aSat.innerText = avgSat + '★';
    const aStaff = document.getElementById('aStaff');
    if (aStaff) aStaff.innerText = (appState.technicians || []).filter(t => t.active).length;
  }

  drawCharts();
  renderAdminTickets();
  renderAdminFinalTickets();
  renderAdminStaff();
  renderAdminStudents();
  renderReports();
}

let chartInstances = [];
function drawCharts() {
  chartInstances.forEach(ch => ch.destroy());
  chartInstances = [];
  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? '#27272a' : '#e2e8f0';
  
  const depts = ['Computer Department', 'Electrical Department', 'Mechanical Department', 'Civil Department'];
  const deptCounts = depts.map(d => appState.complaints.filter(c => c.category === d).length);
  
  const c1 = document.getElementById('chartDept');
  if (c1) {
    const ctx1 = c1.getContext('2d');
    const ch1 = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: ['Computer', 'Electrical', 'Mechanical', 'Civil'],
        datasets: [{ data: deptCounts, backgroundColor: ['#2563eb', '#06b6d4', '#059669', '#7c3aed'], borderRadius: 8 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: gridColor } } } }
    });
    chartInstances.push(ch1);
  }

  const c2 = document.getElementById('chartTrend');
  if (c2) {
    const ctx2 = c2.getContext('2d');
    const ch2 = new Chart(ctx2, {
      type: 'line',
      data: {
        labels: ['May', 'Jun', 'Jul'],
        datasets: [{ data: [12, 19, appState.complaints.length], borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.05)', fill: true, tension: 0.4 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: gridColor } } } }
    });
    chartInstances.push(ch2);
  }

  const statuses = ['Submitted', 'Assigned to Faculty', 'Assigned to Tech', 'Work in Progress', 'Tech Completed', 'Faculty Verified', 'Completed'];
  const statusCounts = [
    appState.complaints.filter(c => c.stage === 1 || c.status === 'Complaint Submitted').length,
    appState.complaints.filter(c => c.stage === 2 || c.status === 'Assigned to Faculty').length,
    appState.complaints.filter(c => c.stage === 3 || c.status === 'Assigned to Technician').length,
    appState.complaints.filter(c => c.stage === 4 || c.status === 'Work in Progress').length,
    appState.complaints.filter(c => c.stage === 5 || c.status === 'Work Completed by Technician').length,
    appState.complaints.filter(c => c.stage === 6 || c.status === 'Faculty Verified').length,
    appState.complaints.filter(c => c.stage === 7 || c.status === 'Completed').length
  ];

  const c3 = document.getElementById('chartStatus');
  if (c3) {
    const ctx3 = c3.getContext('2d');
    const ch3 = new Chart(ctx3, {
      type: 'doughnut',
      data: {
        labels: statuses,
        datasets: [{ data: statusCounts, backgroundColor: ['#f59e0b', '#3b82f6', '#6366f1', '#8b5cf6', '#14b8a6', '#06b6d4', '#10b981'] }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } } } }
    });
    chartInstances.push(ch3);
  }
}

function renderAdminTickets() {
  const search = (document.getElementById('ticketSearch')?.value || '').trim().toLowerCase();
  let list = appState.complaints.filter(c => 
    c.status === 'Complaint Submitted' || 
    c.admin_status === 'Pending' || 
    c.stage === 1 ||
    c.status === 'Student Not Satisfied' ||
    c.feedback === 'Not Satisfied'
  );

  if (search) {
    list = list.filter(c => {
      const matchText = [c.title, c.description, c.category, c.location, c.id, c.techName, c.reportedBy, c.reportedByGr, c.status, c.priority, c.remark].filter(Boolean).join(' ').toLowerCase();
      return matchText.includes(search);
    });
  }

  const grid = document.getElementById('adminTicketGrid');
  if (!grid) return;
  grid.innerHTML = '';
  if (list.length === 0) {
    grid.innerHTML = `<div class="col-span-full p-12 text-center text-slate-500 font-medium">No complaints found${search ? ` matching "${search}"` : ' awaiting Admin verification'}.</div>`;
    return;
  }

  list.forEach((c, index) => {
    const isFeedbackRework = c.status === 'Student Not Satisfied' || c.feedback === 'Not Satisfied';
    const el = document.createElement('div');
    const delayClass = `delay-${((index % 4) + 1) * 100}`;
    el.className = `border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 bg-white dark:bg-zinc-900 flex flex-col justify-between reveal-on-scroll ${delayClass}`;
    el.innerHTML = `
      <div class="space-y-2">
        <div class="flex justify-between items-start">
          <div>
            <span class="text-[10px] font-mono text-slate-500">${c.id} • ${c.reportedAt}</span>
            <h4 class="font-bold text-base mt-0.5">${c.title}</h4>
          </div>
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${isFeedbackRework ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-amber-100 text-amber-800 border border-amber-200'}">
            ${isFeedbackRework ? 'Student Not Satisfied (Rework)' : 'Awaiting Admin Verification'}
          </span>
        </div>
        <p class="text-xs text-slate-500">Filer: <b>${c.reportedBy} (${c.reportedByGr})</b> | Target Dept: <b>${c.category}</b> | Tech: <b>${c.techName || 'None'}</b></p>
        <div class="text-sm bg-slate-50 dark:bg-zinc-800 p-3 rounded-xl border">${c.description}</div>
        ${isFeedbackRework ? `
          <div class="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl text-xs">
            <i class="fa-solid fa-triangle-exclamation mr-1"></i> Student reported <b>Not Satisfied</b> with resolution. Review issue and dispatch back to Faculty for technician rework.
          </div>
        ` : ''}
      </div>
      
      <div class="mt-4 flex gap-2 shrink-0">
        <button onclick="openAdminRouteModal('${c.id}')" class="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md">
          <i class="fa-solid ${isFeedbackRework ? 'fa-rotate-left' : 'fa-shield-check'} mr-1"></i> ${isFeedbackRework ? 'Send Back to Faculty' : 'Verify & Assign to Faculty'}
        </button>
        <button onclick="openLightbox('${c.image}', '${c.title}')" class="px-3 py-2 rounded-xl border text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800">Inspect Evidence</button>
        ${c.video ? `<button onclick="openLightbox('${c.video}', '${c.title}', 'video')" class="px-3 py-2 rounded-xl bg-violet-50 text-violet-700 text-xs font-bold hover:bg-violet-100">Watch Video</button>` : ''}
      </div>
    `;
    grid.appendChild(el);
  });

  if (typeof initScrollObserver === 'function') setTimeout(initScrollObserver, 50);
}

function openAdminRouteModal(id) {
  const c = appState.complaints.find(x => x.id === id);
  if (!c) return;

  const idInput = document.getElementById('adminVerifyId');
  if (idInput) idInput.value = id;
  const titleEl = document.getElementById('adminVerifyTitle');
  if (titleEl) titleEl.innerText = `${id} | ${c.title}`;
  const deptSelect = document.getElementById('adminRouteDept');
  if (deptSelect) deptSelect.value = c.category;

  document.getElementById('modalAdminRoute')?.classList.remove('hidden');
}

function closeAdminRouteModal() { document.getElementById('modalAdminRoute')?.classList.add('hidden'); }

async function confirmAdminDispatch(e) {
  e.preventDefault();
  const id = document.getElementById('adminVerifyId').value;
  const dept = document.getElementById('adminRouteDept').value;

  try {
    const res = await fetch('backend/complaints/admin_verify.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'approve', dept })
    });
    const data = await res.json();
    if (!data.success) return toast(data.message || 'Error routing complaint', 'err');
    
    closeAdminRouteModal();
    toast(data.message || 'Complaint verified & assigned to Faculty.');
    renderAdmin();
  } catch (err) {
    toast('Error communicating with server', 'err');
  }
}

async function adminRejectTicket() {
  const id = document.getElementById('adminVerifyId').value;
  try {
    const res = await fetch('backend/complaints/admin_verify.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'reject' })
    });
    const data = await res.json();
    if (!data.success) return toast(data.message || 'Error rejecting complaint', 'err');
    
    closeAdminRouteModal();
    toast('Complaint rejected & archived.', 'err');
    renderAdmin();
  } catch (err) {
    toast('Error communicating with server', 'err');
  }
}

function renderAdminFinalTickets() {
  const search = (document.getElementById('finalSearch')?.value || '').trim().toLowerCase();
  let list = appState.complaints.filter(c => c.stage === 6 || c.status === 'Faculty Verified' || (c.faculty_status === 'Verified' && c.stage < 7));

  if (search) {
    list = list.filter(c => {
      const matchText = [c.title, c.description, c.category, c.location, c.id, c.techName, c.reportedBy, c.reportedByGr, c.status, c.priority, c.remark, c.qaFeedback].filter(Boolean).join(' ').toLowerCase();
      return matchText.includes(search);
    });
  }

  const grid = document.getElementById('adminFinalGrid');
  if (!grid) return;
  grid.innerHTML = '';
  if (list.length === 0) {
    grid.innerHTML = `<div class="col-span-full p-12 text-center text-slate-500 font-medium">No complaints found${search ? ` matching "${search}"` : ' awaiting Admin final sign-off'}.</div>`;
    return;
  }

  list.forEach((c, index) => {
    const el = document.createElement('div');
    const delayClass = `delay-${((index % 4) + 1) * 100}`;
    el.className = `border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 bg-white dark:bg-zinc-900 flex flex-col justify-between reveal-on-scroll ${delayClass}`;
    el.innerHTML = `
      <div class="space-y-3">
        <div class="flex justify-between items-start">
          <div>
            <span class="text-[10px] font-mono text-slate-500">${c.id} • ${c.reportedAt}</span>
            <h4 class="font-bold text-base mt-0.5">${c.title}</h4>
            <p class="text-xs text-slate-500">Filer: <b>${c.reportedBy} (GR: ${c.reportedByGr})</b> | Dept: <b>${c.category}</b></p>
          </div>
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300">Faculty Verified</span>
        </div>

        <div class="text-xs bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-xl border">
          <p class="font-medium text-slate-700 dark:text-zinc-300">${c.description}</p>
          <div class="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>Location: <b>${c.location}</b></span>
            <span>Technician: <b>${c.techName || 'Assigned Tech'}</b></span>
          </div>
        </div>

        <!-- Completed Work & Faculty QA Summary -->
        <div class="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2 text-xs">
          <div class="flex justify-between items-center">
            <b class="text-emerald-700 dark:text-emerald-400 font-bold"><i class="fa-solid fa-square-check mr-1"></i> Technician Resolution & Faculty QA</b>
            <span class="text-[10px] text-slate-400">${c.faculty_verification_date || ''}</span>
          </div>
          <div class="text-slate-600 dark:text-zinc-300">
            <div>Tech Remark: <i>"${c.remark || 'Repairs finished.'}"</i></div>
            <div class="mt-1 font-semibold text-blue-700 dark:text-blue-400">Faculty Audit: "${c.qaFeedback || 'Verified perfect.'}"</div>
          </div>
          ${c.proofImg ? `
            <div class="flex items-center gap-2 pt-1">
              <img src="${c.proofImg}" class="h-14 w-20 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition" onclick="openLightbox('${c.proofImg}', 'Technician Proof for ${c.id}')">
              <button type="button" onclick="openLightbox('${c.proofImg}', 'Technician Proof for ${c.id}')" class="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline">Inspect Proof Photo</button>
            </div>
          ` : ''}
        </div>
      </div>
      
      <div class="mt-4 flex gap-2 shrink-0">
        <button onclick="confirmAdminFinalApproval('${c.id}')" class="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md"><i class="fa-solid fa-circle-check mr-1"></i> Final Verify & Mark Completed ✅</button>
        <button onclick="openLightbox('${c.image}', '${c.title}')" class="px-3 py-2 rounded-xl border text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800">Inspect Original</button>
      </div>
    `;
    grid.appendChild(el);
  });

  if (typeof initScrollObserver === 'function') setTimeout(initScrollObserver, 50);
}

async function confirmAdminFinalApproval(id) {
  try {
    const res = await fetch('backend/complaints/admin_final.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (!data.success) return toast(data.message || 'Error completing complaint', 'err');
    
    toast(data.message || `Complaint ${id} verified and marked Completed ✅!`);
    renderAdmin();
  } catch (err) {
    toast('Error communicating with server', 'err');
  }
}


/* ==========================================================================
   3. TECHNICIAN VIEW (RECEIVES AFTER FACULTY ASSIGNMENT)
   ========================================================================== */
async function renderTechnician() {
  showView('technician');
  if (typeof syncNavProfile === 'function') syncNavProfile();

  try {
    const res = await fetch('backend/complaints/list.php?role=technician');
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      appState.complaints = data.data;
    }
  } catch (e) {}

  const currentTechId = currentSession ? (currentSession.techId || currentSession.id) : null;
  const allList = appState.complaints.filter(c => 
    (c.techId === currentTechId || (!c.techId && c.category === currentSession?.dept) || !currentSession) && 
    c.stage >= 3 &&
    c.status !== 'Rejected by Admin' &&
    c.status !== 'Rejected by Faculty'
  );

  const techQuery = (document.getElementById('techSearch')?.value || '').trim().toLowerCase();
  let list = allList;
  if (techQuery) {
    list = allList.filter(c => {
      const matchText = [c.title, c.description, c.category, c.location, c.id, c.priority, c.status, c.deadline, c.remark, c.reportedBy, c.reportedByGr].filter(Boolean).join(' ').toLowerCase();
      return matchText.includes(techQuery);
    });
  }
  
  const techCountBadge = document.getElementById('techCountBadge');
  if (techCountBadge) techCountBadge.innerText = allList.length + ' tasks assigned';

  const container = document.getElementById('technicianList');
  if (!container) return;
  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = `<div class="col-span-full p-12 text-center text-slate-500 font-medium">No complaints found${techQuery ? ` matching "${techQuery}"` : ' dispatched to your profile'}.</div>`;
    return;
  }

  list.forEach((c, index) => {
    const card = document.createElement('div');
    const delayClass = `delay-${((index % 4) + 1) * 100}`;
    card.className = `bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col gap-3 justify-between reveal-on-scroll ${delayClass}`;
    
    let actionableActions = '';
    if (c.status === 'Assigned to Technician' || c.stage === 3) {
      actionableActions = `
        <div class="flex gap-2">
          <button onclick="acceptTechComplaint('${c.id}')" class="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"><i class="fa-solid fa-check mr-1"></i> Accept Complaint</button>
          <button onclick="openDeclineTechModal('${c.id}')" class="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 font-bold text-xs border border-red-200 hover:bg-red-100"><i class="fa-solid fa-xmark mr-1"></i> Reject Complaint</button>
        </div>`;
    } else if (c.status === 'Work in Progress' || c.stage === 4) {
      actionableActions = `
        <div class="space-y-2">
          <div class="p-2.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-xl text-xs font-semibold flex items-center gap-2">
            <i class="fa-solid fa-screwdriver-wrench animate-pulse"></i> Work in Progress • Deadline: <b>${c.deadline || 'Standard'}</b>
          </div>
          <button onclick="openCompleteTechModal('${c.id}')" class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"><i class="fa-solid fa-camera mr-1"></i> Work Completed / Mark as Complete</button>
        </div>`;
    } else if (c.status === 'Work Completed by Technician' || c.stage === 5) {
      actionableActions = `
        <div class="p-3 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-xl text-xs font-semibold text-center border border-teal-500/20">
          <i class="fa-solid fa-hourglass-half mr-1"></i> Work Completed • Sent to Faculty for QA Verification
        </div>`;
    } else if (c.status === 'Faculty Verified' || c.stage === 6) {
      actionableActions = `
        <div class="p-3 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 rounded-xl text-xs font-semibold text-center border border-cyan-500/20">
          <i class="fa-solid fa-graduation-cap mr-1"></i> Faculty QA Verified • Awaiting Admin Final Sign-Off
        </div>`;
    } else if (c.status === 'Completed' || c.stage === 7) {
      actionableActions = `
        <div class="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold text-center border border-emerald-500/20">
          <i class="fa-solid fa-square-check mr-1"></i> Completed ✅ • Admin Final Approved
        </div>`;
    } else if (c.status === 'Rejected by Technician') {
      actionableActions = `
        <div class="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-800">
          <b>Rejected by Technician:</b> "${c.rejectionReason}"
        </div>`;
    }

    card.innerHTML = `
      <div>
        <div class="flex justify-between items-center">
          <span class="text-[10px] font-mono text-slate-400">${c.id} • Deadline: <b class="text-slate-700 dark:text-zinc-200">${c.deadline || 'None'}</b></span>
          <span class="px-2 py-0.5 text-[9px] font-bold ${c.priority === 'High' ? 'bg-red-600 text-white' : 'bg-slate-100 dark:bg-zinc-800'} rounded">${c.priority} Priority</span>
        </div>
        <h4 class="font-bold text-base mt-1.5">${c.title}</h4>
        <p class="text-xs text-slate-500 mt-0.5">Student: <b>${c.reportedBy} (GR: ${c.reportedByGr})</b> | Category: <b>${c.category}</b></p>
      </div>
      
      <div class="text-xs bg-slate-50 dark:bg-zinc-800/40 p-3 border rounded-xl space-y-1">
        <p>${c.description}</p>
        <p class="text-[10px] text-slate-500"><i class="fa-solid fa-location-dot"></i> Location: <b>${c.location}</b></p>
        <p class="text-[10px] text-blue-600 dark:text-blue-400 font-semibold"><i class="fa-solid fa-user-tie"></i> Faculty Assigned: <b>${c.category} Faculty</b></p>
      </div>

      <div class="flex gap-2 shrink-0">
        <button onclick="openLightbox('${c.image}', '${c.title}')" class="flex-1 py-1.5 rounded-lg border text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800">View Fault Image</button>
        ${c.video ? `<button onclick="openLightbox('${c.video}', '${c.title}', 'video')" class="flex-1 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-xs font-bold hover:bg-violet-100">Watch Fault Video</button>` : ''}
      </div>

      ${c.proofImg ? `
        <div class="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 rounded-xl flex gap-2.5 items-center text-xs">
          <img src="${c.proofImg}" class="h-12 w-16 object-cover rounded-lg border cursor-pointer shrink-0" onclick="openLightbox('${c.proofImg}', 'Technician proof for ${c.id}')">
          <div>
            <b class="text-emerald-700 dark:text-emerald-400 font-bold">Uploaded Completion Proof</b>
            <p class="text-slate-500 text-[11px] truncate">"${c.remark}"</p>
          </div>
        </div>
      ` : ''}

      ${actionableActions}
    `;
    container.appendChild(card);
  });

  if (typeof initScrollObserver === 'function') setTimeout(initScrollObserver, 50);
}

async function acceptTechComplaint(id) {
  try {
    const res = await fetch('backend/technician/accept.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (!data.success) return toast(data.message || 'Error accepting work order', 'err');

    toast('Complaint accepted! Work is now in progress.');
    renderTechnician();
  } catch (err) {
    toast('Error communicating with server', 'err');
  }
}

function openDeclineTechModal(id) {
  document.getElementById('declineTechId').value = id;
  document.getElementById('declineTechReason').value = '';
  document.getElementById('modalDeclineTech').classList.remove('hidden');
}

function closeDeclineTechModal() { document.getElementById('modalDeclineTech')?.classList.add('hidden'); }

async function confirmDeclineTech(e) {
  e.preventDefault();
  const id = document.getElementById('declineTechId').value;
  const reason = document.getElementById('declineTechReason').value.trim();

  try {
    const res = await fetch('backend/technician/decline.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, reason })
    });
    const data = await res.json();
    if (!data.success) return toast(data.message || 'Error declining work order', 'err');

    closeDeclineTechModal();
    toast('Work order declined. Reason submitted to Faculty for technician reassignment.');
    renderTechnician();
  } catch (err) {
    toast('Error communicating with server', 'err');
  }
}

function openCompleteTechModal(id) {
  document.getElementById('completeTechId').value = id;
  tmpBase64Proof = null;
  document.getElementById('proofImgPreview')?.classList.add('hidden');
  document.getElementById('proofPlaceholderBtn')?.classList.remove('hidden');
  document.getElementById('completeRemark').value = '';
  document.getElementById('modalCompleteTech')?.classList.remove('hidden');
}

function closeCompleteTechModal() { document.getElementById('modalCompleteTech')?.classList.add('hidden'); }

async function confirmCompleteTech(e) {
  e.preventDefault();
  const id = document.getElementById('completeTechId').value;
  const remark = document.getElementById('completeRemark').value.trim();
  if (!tmpBase64Proof) return toast('Please upload photograph proof of completed work', 'err');

  try {
    const res = await fetch('backend/technician/complete.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, remark, proof_img: tmpBase64Proof })
    });
    const data = await res.json();
    if (!data.success) return toast(data.message || 'Error completing work order', 'err');

    closeCompleteTechModal();
    toast('Work completed! Transferred to Faculty Dashboard for verification.');
    renderTechnician();
  } catch (err) {
    toast('Error communicating with server', 'err');
  }
}


/* ==========================================================================
   4. FACULTY VIEW (ASSIGNS TECH & VERIFIES COMPLETED WORK)
   ========================================================================== */
async function renderFaculty() {
  showView('faculty');
  if (typeof syncNavProfile === 'function') syncNavProfile();
  
  try {
    const res = await fetch('backend/complaints/list.php?role=faculty');
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      appState.complaints = data.data;
    }
  } catch (e) {}

  const header = document.getElementById('facDeptHeader');
  if (header) header.innerText = ((currentSession && currentSession.dept) ? currentSession.dept : 'Department') + ' Operations & QA Panel';
  const query = (document.getElementById('facSearch')?.value || '').trim().toLowerCase();

  // Faculty receives complaints assigned by Admin to their department, plus tech-completed work
  const allList = appState.complaints.filter(c => 
    (!currentSession || !currentSession.dept || c.category === currentSession.dept) && 
    c.stage >= 2 &&
    c.status !== 'Rejected by Admin'
  );
  
  let list = allList;
  if (query) {
    list = allList.filter(c => {
      const matchText = [c.title, c.description, c.category, c.location, c.id, c.techName, c.status, c.remark, c.priority, c.reportedBy, c.reportedByGr, c.qaFeedback].filter(Boolean).join(' ').toLowerCase();
      return matchText.includes(query);
    });
  }

  const facCountBadge = document.getElementById('facCountBadge');
  if (facCountBadge) facCountBadge.innerText = allList.length + ' department tickets';

  const grid = document.getElementById('facultyList');
  if (!grid) return;
  grid.innerHTML = '';

  if (list.length === 0) {
    grid.innerHTML = `<div class="col-span-full p-12 text-center text-slate-500 font-medium">No complaints found${query ? ` matching "${query}"` : ' assigned to your department'}.</div>`;
    return;
  }

  list.forEach((c, index) => {
    const card = document.createElement('div');
    const delayClass = `delay-${((index % 4) + 1) * 100}`;
    card.className = `bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col gap-3 justify-between reveal-on-scroll ${delayClass}`;
    
    let actionableSection = '';
    if (c.status === 'Assigned to Faculty' || c.stage === 2) {
      const isDeclined = Boolean(c.lastRejectedTech || c.technician_status === 'Rejected');
      actionableSection = `
        <div class="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
          ${isDeclined ? `
            <div class="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 rounded-xl text-xs space-y-1">
              <div class="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                <i class="fa-solid fa-triangle-exclamation"></i> Technician Declined: <b>${c.lastRejectedTech || 'Assigned Tech'}</b>
              </div>
              <p class="text-slate-600 dark:text-zinc-300">Reason: "<b>${c.rejectionReason || 'Unavailable'}</b>"</p>
              <span class="text-[10px] text-slate-500 block">Select and assign a different specialized technician to resolve this issue.</span>
            </div>
            <button onclick="openFacultyForwardModal('${c.id}')" class="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md"><i class="fa-solid fa-user-plus mr-1"></i> Reassign Different Technician</button>
          ` : `
            <div class="p-2.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-xl text-xs font-semibold">
              <i class="fa-solid fa-shield-check mr-1"></i> Verified by Admin. Select and assign a specialized technician to start work.
            </div>
            <button onclick="openFacultyForwardModal('${c.id}')" class="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"><i class="fa-solid fa-user-plus mr-1"></i> Assign Specialized Technician</button>
          `}
        </div>`;
    } else if (c.status === 'Assigned to Technician' || c.stage === 3) {
      actionableSection = `
        <div class="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-semibold">
          <i class="fa-solid fa-handshake-simple mr-1"></i> Assigned to Technician: <b>${c.techName}</b> (Deadline: ${c.deadline || 'Standard'})
        </div>`;
    } else if (c.status === 'Work in Progress' || c.stage === 4) {
      actionableSection = `
        <div class="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-semibold">
          <i class="fa-solid fa-screwdriver-wrench animate-pulse mr-1"></i> Work underway by <b>${c.techName}</b> • Deadline: ${c.deadline || 'Standard'}
        </div>`;
    } else if (c.status === 'Work Completed by Technician' || c.stage === 5) {
      actionableSection = `
        <div class="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
          <div class="p-2.5 bg-teal-500/10 text-teal-700 dark:text-teal-400 rounded-xl text-xs font-semibold">
            <i class="fa-solid fa-circle-exclamation mr-1"></i> Technician submitted photographic completion proof. Audit & verify to forward to Admin.
          </div>
          <button onclick="openFacultyQaModal('${c.id}')" class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"><i class="fa-solid fa-certificate mr-1"></i> Audit & Forward to Admin</button>
        </div>`;
    } else if (c.status === 'Faculty Verified' || c.stage === 6) {
      actionableSection = `
        <div class="p-2.5 bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 rounded-xl text-xs font-bold border border-cyan-500/20">
          <i class="fa-solid fa-graduation-cap mr-1"></i> Faculty QA Audited & Sent to Admin for Final Sign-Off
          ${c.qaFeedback ? `<p class="text-[11px] text-slate-500 font-normal mt-1">Audit Notes: "${c.qaFeedback}"</p>` : ''}
        </div>`;
    } else {
      actionableSection = `
        <div class="p-2.5 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/20">
          <i class="fa-solid fa-circle-check mr-1"></i> Completed ✅ • Verified by Admin
          ${c.qaFeedback ? `<p class="text-[11px] text-slate-500 font-normal mt-1">Audit Notes: "${c.qaFeedback}"</p>` : ''}
        </div>`;
    }

    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <span class="text-[10px] font-mono text-slate-400 block">${c.id} • Priority: <b>${c.priority}</b></span>
          <h4 class="font-bold text-base mt-0.5">${c.title}</h4>
          <p class="text-xs text-slate-500">Student: <b>${c.reportedBy} (GR: ${c.reportedByGr})</b></p>
        </div>
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${c.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">${c.status}</span>
      </div>

      <div class="text-xs bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-xl border space-y-1">
        <p>${c.description}</p>
        <div class="text-[10px] text-slate-500 flex justify-between pt-1">
          <span><i class="fa-solid fa-location-dot"></i> Venue: <b>${c.location}</b></span>
          <span><i class="fa-solid fa-calendar"></i> Reported: <b>${c.reportedAt}</b></span>
        </div>
      </div>
      
      ${c.stage >= 5 ? `
        <!-- Completed Work by Technician Box -->
        <div class="p-3 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-500/20 rounded-xl text-xs space-y-2">
          <div class="flex justify-between items-center">
            <b class="text-teal-800 dark:text-teal-300 font-bold"><i class="fa-solid fa-screwdriver-wrench mr-1"></i> Technician Resolution Details</b>
            <span class="text-[10px] text-slate-500">${c.technician_completion_date || ''}</span>
          </div>
          <div class="text-slate-600 dark:text-zinc-300">
            Technician: <b>${c.techName || 'Assigned Tech'}</b><br>
            Action / Remarks: <i>"${c.remark || 'Work finished'}"</i>
          </div>
          ${c.proofImg ? `
            <div class="flex items-center gap-2 pt-1">
              <img src="${c.proofImg}" class="h-14 w-20 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition" onclick="openLightbox('${c.proofImg}', 'Technician Proof: ${c.title}')">
              <button type="button" onclick="openLightbox('${c.proofImg}', 'Technician Proof: ${c.title}')" class="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline">Inspect Completion Photo</button>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="flex gap-2 shrink-0">
        <button onclick="openLightbox('${c.image}', '${c.title}')" class="flex-1 py-1.5 rounded-lg border text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-800">Original Photo</button>
        ${c.video ? `<button onclick="openLightbox('${c.video}', '${c.title}', 'video')" class="flex-1 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-xs font-bold hover:bg-violet-100">Original Video</button>` : ''}
      </div>

      ${actionableSection}
    `;
    grid.appendChild(card);
  });

  if (typeof initScrollObserver === 'function') setTimeout(initScrollObserver, 50);
}

async function openFacultyForwardModal(id) {
  const c = appState.complaints.find(x => x.id === id);
  if (!c) return;

  const idInput = document.getElementById('forwardVerifyId');
  if (idInput) idInput.value = id;
  const label = document.getElementById('forwardVerifyLabel');
  if (label) {
    label.innerText = `${id} | ${c.title} (${c.category})${c.lastRejectedTech ? ' • Reassignment' : ''}`;
  }

  const select = document.getElementById('forwardSelectedTech');
  if (select) {
    select.innerHTML = '';
    let techs = [];
    try {
      const res = await fetch('backend/admin/staff.php');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        techs = data.data;
        appState.technicians = techs;
      }
    } catch (e) {}
    if (!techs.length) techs = appState.technicians || [];
    let filteredTechs = techs.filter(t => t.active && t.dept === c.category);
    if (filteredTechs.length === 0) filteredTechs = techs.filter(t => t.active);
    filteredTechs.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      const isPrevDeclined = c.lastRejectedTech && t.name.includes(c.lastRejectedTech);
      opt.textContent = `${t.name} (${t.dept} • Exp: ${t.experience} Yrs • ${t.rating}★)${isPrevDeclined ? ' [Previously Declined]' : ''}`;
      select.appendChild(opt);
    });
  }

  const nextDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const deadlineInput = document.getElementById('forwardDeadline');
  if (deadlineInput) deadlineInput.value = nextDate;

  document.getElementById('modalFacultyForward')?.classList.remove('hidden');
}

function closeFacultyForwardModal() { document.getElementById('modalFacultyForward')?.classList.add('hidden'); }

async function confirmFacultyForward(e) {
  e.preventDefault();
  const id = document.getElementById('forwardVerifyId').value;
  const select = document.getElementById('forwardSelectedTech');
  const techId = select ? select.value : null;
  const deadline = document.getElementById('forwardDeadline')?.value || '';

  try {
    const res = await fetch('backend/faculty/assign_technician.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, techId, deadline })
    });
    const data = await res.json();
    if (!data.success) return toast(data.message || 'Error dispatching technician', 'err');

    closeFacultyForwardModal();
    toast(data.message || 'Work order dispatched to Technician.');
    renderFaculty();
  } catch (err) {
    toast('Error communicating with server', 'err');
  }
}

function openFacultyQaModal(id) {
  document.getElementById('qaVerifyId').value = id;
  setFacultyQaApproval(true);
  document.getElementById('modalFacultyQa').classList.remove('hidden');
}

function closeFacultyQaModal() { document.getElementById('modalFacultyQa')?.classList.add('hidden'); }

function setFacultyQaApproval(approve) {
  qaApprovalState = approve;
  const btnApprove = document.getElementById('btnQaApprove');
  const btnReject = document.getElementById('btnQaReject');
  if (approve) {
    btnApprove.className = 'py-3 rounded-xl bg-blue-600 text-white font-bold text-sm border-2 border-blue-600';
    btnReject.className = 'py-3 rounded-xl bg-white dark:bg-zinc-800 border-2 text-sm font-semibold';
  } else {
    btnApprove.className = 'py-3 rounded-xl bg-white dark:bg-zinc-800 border-2 text-sm font-semibold';
    btnReject.className = 'py-3 rounded-xl bg-red-600 text-white font-bold text-sm border-2 border-red-600';
  }
}

async function confirmFacultyQa(e) {
  e.preventDefault();
  const id = document.getElementById('qaVerifyId').value;
  const comment = document.getElementById('qaFeedbackComment').value.trim();

  try {
    const res = await fetch('backend/faculty/qa_verify.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, approve: qaApprovalState, comment })
    });
    const data = await res.json();
    if (!data.success) return toast(data.message || 'Error recording inspection', 'err');

    closeFacultyQaModal();
    toast(data.message || 'Inspection updated.');
    renderFaculty();
  } catch (err) {
    toast('Error communicating with server', 'err');
  }
}


/* ==========================================================================
   5. STAFF & STUDENT CONFIGURATION
   ========================================================================== */
async function renderAdminStaff() {
  const list = document.getElementById('adminStaffList');
  if (!list) return;
  list.innerHTML = '';

  try {
    const res = await fetch('backend/admin/staff.php');
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      appState.technicians = data.data;
    }
  } catch (e) {}

  (appState.technicians || []).forEach((t, index) => {
    const activeTasksCount = t.activeDuties !== undefined ? t.activeDuties : (appState.complaints || []).filter(c => c.techId === t.id && (c.stage >= 2 && c.stage <= 5)).length;
    
    const card = document.createElement('div');
    const delayClass = `delay-${((index % 4) + 1) * 100}`;
    card.className = `border rounded-2xl p-4 bg-white dark:bg-zinc-900 flex justify-between items-center reveal-on-scroll ${delayClass}`;
    card.innerHTML = `
      <div class="flex gap-3 items-center">
        <div class="h-10 w-10 rounded-xl bg-violet-600/10 text-violet-600 flex items-center justify-center font-bold text-sm shrink-0">
          ${t.name[0]}
        </div>
        <div>
          <div class="font-bold text-sm">${t.name} <span class="text-xs text-slate-400">(${t.id})</span></div>
          <div class="text-[11px] text-slate-500 font-medium">
            Dept: ${t.dept} | Experience: ${t.experience} Yrs | Rating: <b>${t.rating}★</b><br>
            Active Duties: <b class="text-violet-600">${activeTasksCount}</b>
          </div>
        </div>
      </div>
      <div class="flex gap-1">
        <button onclick="editStaff('${t.id}')" class="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800 text-xs font-bold">Edit</button>
        <button onclick="toggleStaff('${t.id}')" class="px-2.5 py-1.5 rounded-lg text-xs font-bold ${t.active ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}">
          ${t.active ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    `;
    list.appendChild(card);
  });

  if (typeof initScrollObserver === 'function') setTimeout(initScrollObserver, 50);
}

function openStaffModal() {
  document.getElementById('staffEditId').value = '';
  document.getElementById('staffName').value = '';
  document.getElementById('staffExp').value = 2;
  document.getElementById('staffPassNew').value = 'password';
  document.getElementById('modalStaff').classList.remove('hidden');
}

function closeStaffModal() { document.getElementById('modalStaff')?.classList.add('hidden'); }

function editStaff(id) {
  const t = (appState.technicians || []).find(x => x.id === id);
  if (!t) return;
  document.getElementById('staffEditId').value = t.id;
  document.getElementById('staffName').value = t.name;
  document.getElementById('staffDept').value = t.dept;
  document.getElementById('staffExp').value = t.experience;
  document.getElementById('staffPassNew').value = 'password';
  document.getElementById('modalStaff').classList.remove('hidden');
}

async function saveStaff(e) {
  e.preventDefault();
  const editId = document.getElementById('staffEditId').value;
  const name = document.getElementById('staffName').value.trim();
  const dept = document.getElementById('staffDept').value;
  const exp = parseInt(document.getElementById('staffExp').value, 10);
  const pass = document.getElementById('staffPassNew').value;

  try {
    const res = await fetch('backend/admin/staff.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', editId, name, dept, experience: exp, password: pass })
    });
    const data = await res.json();
    if (!data.success) return toast(data.message || 'Error saving staff member', 'err');

    closeStaffModal();
    toast(data.message || 'Technician registry updated.');
    renderAdminStaff();
  } catch (err) {
    toast('Error communicating with server', 'err');
  }
}

async function toggleStaff(id) {
  try {
    const res = await fetch('backend/admin/staff.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id })
    });
    const data = await res.json();
    if (!data.success) return toast(data.message || 'Error updating staff status', 'err');

    toast(data.message);
    renderAdminStaff();
  } catch (err) {
    toast('Error communicating with server', 'err');
  }
}

async function renderAdminStudents() {
  const query = document.getElementById('studentSearch')?.value.toLowerCase() || '';
  const container = document.getElementById('adminStudentList');
  if (!container) return;
  container.innerHTML = '';

  try {
    const res = await fetch('backend/admin/students.php');
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      appState.users = data.data;
    }
  } catch (e) {}

  (appState.users || []).forEach((u, index) => {
    if (query && !u.name.toLowerCase().includes(query) && !u.grNo.includes(query)) return;

    const complaintsCount = u.complaintsCount !== undefined ? u.complaintsCount : (appState.complaints || []).filter(c => c.reportedByGr === u.grNo).length;
    const card = document.createElement('div');
    const delayClass = `delay-${((index % 4) + 1) * 100}`;
    card.className = `border rounded-2xl p-4 bg-white dark:bg-zinc-900 space-y-3 reveal-on-scroll ${delayClass}`;
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <h4 class="font-bold text-sm">${u.name} <span class="text-xs text-slate-400">(GR: ${u.grNo})</span></h4>
          <span class="text-[10px] text-slate-500 block">${u.dept} | Registered Complaints: ${complaintsCount}</span>
        </div>
        <div class="flex flex-col gap-1 items-end">
          ${u.warned ? `<span class="px-1.5 py-0.5 text-[8px] font-bold bg-amber-500 text-white rounded">Warned</span>` : ''}
          ${u.suspended ? `<span class="px-1.5 py-0.5 text-[8px] font-bold bg-red-600 text-white rounded">Suspended</span>` : ''}
        </div>
      </div>
      
      <div class="flex gap-1.5 border-t pt-2">
        <button onclick="adminOverrideStudentProfile('${u.grNo}')" class="flex-1 py-1 bg-slate-50 dark:bg-zinc-800 text-xs font-semibold rounded hover:bg-slate-100 transition">Override Profile</button>
        <button onclick="toggleStudentWarnStatus('${u.grNo}')" class="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded hover:opacity-80 transition"><i class="fa-solid fa-triangle-exclamation"></i></button>
        <button onclick="toggleStudentSuspendStatus('${u.grNo}')" class="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded hover:opacity-80 transition"><i class="fa-solid fa-ban"></i></button>
      </div>
    `;
    container.appendChild(card);
  });

  if (typeof initScrollObserver === 'function') setTimeout(initScrollObserver, 50);
}

function adminOverrideStudentProfile(grNo) {
  const u = (appState.users || []).find(x => x.grNo === grNo);
  if (!u) return;
  document.getElementById('adminUserEditGr').value = u.grNo;
  document.getElementById('adminUserEditName').value = u.name;
  document.getElementById('adminUserEditDept').value = u.dept;
  document.getElementById('adminUserEditPass').value = 'password';
  document.getElementById('adminUserEditImgUrl').value = u.avatar || '';
  document.getElementById('modalAdminUserEdit')?.classList.remove('hidden');
}

function closeAdminUserEdit() { document.getElementById('modalAdminUserEdit')?.classList.add('hidden'); }

async function saveAdminUserEdit(e) {
  e.preventDefault();
  const gr = document.getElementById('adminUserEditGr').value;
  const name = document.getElementById('adminUserEditName').value.trim();
  const dept = document.getElementById('adminUserEditDept').value.trim();
  const pass = document.getElementById('adminUserEditPass').value;
  const img = document.getElementById('adminUserEditImgUrl').value.trim();

  try {
    const res = await fetch('backend/admin/students.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'override', gr, name, dept, password: pass, avatar: img })
    });
    const data = await res.json();
    if (!data.success) return toast(data.message || 'Error overriding profile', 'err');

    closeAdminUserEdit();
    toast(data.message || `Administrative profile override applied for student: ${name}`);
    renderAdminStudents();
  } catch (err) {
    toast('Error communicating with server', 'err');
  }
}

async function toggleStudentWarnStatus(gr) {
  try {
    const res = await fetch('backend/admin/students.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_warn', gr })
    });
    const data = await res.json();
    if (!data.success) return toast(data.message || 'Error updating warning status', 'err');

    toast(data.message);
    renderAdminStudents();
  } catch (err) {
    toast('Error communicating with server', 'err');
  }
}

async function toggleStudentSuspendStatus(gr) {
  try {
    const res = await fetch('backend/admin/students.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_suspend', gr })
    });
    const data = await res.json();
    if (!data.success) return toast(data.message || 'Error updating suspension status', 'err');

    toast(data.message);
    renderAdminStudents();
  } catch (err) {
    toast('Error communicating with server', 'err');
  }
}


/* ==========================================================================
   6. AUDITED REPORTS & EXPORTS
   ========================================================================== */
function renderReports() {
  const techFilter = document.getElementById('reportFilterTech');
  if (techFilter) {
    const curVal = techFilter.value;
    techFilter.innerHTML = '<option value="All">All Technicians</option>';
    (appState.technicians || []).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.name;
      opt.textContent = `${t.name} (${t.dept})`;
      techFilter.appendChild(opt);
    });
    if (curVal) techFilter.value = curVal;
  }

  const filterStatus = document.getElementById('reportFilterStatus')?.value || 'All';
  const filterDept = document.getElementById('reportFilterDept')?.value || 'All';
  const filterTech = document.getElementById('reportFilterTech')?.value || 'All';
  const filterPending = document.getElementById('reportFilterPending')?.value || 'All';

  let filtered = (appState.complaints || []).slice();

  if (filterStatus !== 'All') {
    filtered = filtered.filter(c => c.status === filterStatus || c.current_status === filterStatus);
  }
  if (filterDept !== 'All') {
    filtered = filtered.filter(c => c.category === filterDept);
  }
  if (filterTech !== 'All') {
    filtered = filtered.filter(c => c.techName === filterTech);
  }
  if (filterPending === 'Unsolved') {
    filtered = filtered.filter(c => c.stage < 7 && c.status !== 'Completed');
  } else if (filterPending === 'Solved') {
    filtered = filtered.filter(c => c.stage === 7 || c.status === 'Completed');
  }

  const solvedList = filtered.filter(c => c.stage === 7 || c.status === 'Completed');
  const pendingList = filtered.filter(c => c.stage < 7 && c.status !== 'Completed');

  // Render Solved Table
  const solvedBody = document.getElementById('reportSolvedBody');
  const solvedCount = document.getElementById('countReportSolved');
  if (solvedCount) solvedCount.innerText = solvedList.length;
  if (solvedBody) {
    solvedBody.innerHTML = '';
    if (solvedList.length === 0) {
      solvedBody.innerHTML = '<tr><td colspan="9" class="p-6 text-center text-xs text-slate-400">No solved complaints match the selected filter.</td></tr>';
    } else {
      solvedList.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition';
        tr.innerHTML = `
          <td class="p-3 font-mono font-bold text-xs">${c.id}</td>
          <td class="p-3 text-xs font-semibold">${c.reportedBy}</td>
          <td class="p-3 text-xs font-mono text-slate-500">${c.reportedByGr}</td>
          <td class="p-3 text-xs">${c.category}</td>
          <td class="p-3 text-xs font-medium max-w-xs truncate" title="${c.title}">${c.title}</td>
          <td class="p-3 text-xs">${c.techName || 'Unassigned'}</td>
          <td class="p-3 text-xs text-slate-500">${c.reportedAt}</td>
          <td class="p-3 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">${c.admin_final_date || c.technician_completion_date || c.reportedAt}</td>
          <td class="p-3"><span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">${c.status}</span></td>
        `;
        solvedBody.appendChild(tr);
      });
    }
  }

  // Render Pending Table
  const pendingBody = document.getElementById('reportPendingBody');
  const pendingCount = document.getElementById('countReportPending');
  if (pendingCount) pendingCount.innerText = pendingList.length;
  if (pendingBody) {
    pendingBody.innerHTML = '';
    if (pendingList.length === 0) {
      pendingBody.innerHTML = '<tr><td colspan="9" class="p-6 text-center text-xs text-slate-400">No pending / unsolved complaints match the selected filter.</td></tr>';
    } else {
      pendingList.forEach(c => {
        const days = typeof getDaysPending === 'function' ? getDaysPending(c.reportedAt) : 0;
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition';
        tr.innerHTML = `
          <td class="p-3 font-mono font-bold text-xs">${c.id}</td>
          <td class="p-3 text-xs font-semibold">${c.reportedBy}</td>
          <td class="p-3 text-xs font-mono text-slate-500">${c.reportedByGr}</td>
          <td class="p-3 text-xs">${c.category}</td>
          <td class="p-3 text-xs font-medium max-w-xs truncate" title="${c.title}">${c.title}</td>
          <td class="p-3 text-xs">${c.techName || '<span class="text-slate-400">Not Assigned</span>'}</td>
          <td class="p-3 text-xs text-slate-500">${c.reportedAt}</td>
          <td class="p-3 text-xs font-mono font-bold ${days >= 30 ? 'text-red-600 dark:text-red-400' : (days >= 15 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-zinc-300')}">${days} day${days === 1 ? '' : 's'}</td>
          <td class="p-3"><span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40">${c.status}</span></td>
        `;
        pendingBody.appendChild(tr);
      });
    }
  }
}

function exportCSV() {
  window.location.href = 'backend/admin/export_csv.php';
}

function printReport() { window.print(); }

document.addEventListener('DOMContentLoaded', () => {
  renderByRole();
});
