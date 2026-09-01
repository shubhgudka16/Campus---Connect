/* ==========================================================================
   Campus Connect - Authentication & Login Engine (login.js)
   ========================================================================== */

/* ---------- ROLE SWITCHING & AUTH ---------- */

function switchRole(r) {
  ['Student', 'Faculty', 'Technician', 'Admin'].forEach(k => {
    const btn = document.getElementById('tab' + k);
    const form = document.getElementById('form' + k);
    if (k.toLowerCase() === r) {
      btn.className = 'flex-1 min-w-[80px] py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-xs shadow-md';
      form.classList.remove('hidden');
    } else {
      btn.className = 'flex-1 min-w-[80px] py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border text-slate-700 dark:text-zinc-300 font-semibold text-xs';
      form.classList.add('hidden');
    }
  });
}

async function loginStudent(e) {
  e.preventDefault();
  const gr = document.getElementById('stuGr').value.trim();
  const pass = document.getElementById('stuPass').value;
  try {
    const res = await fetch('backend/auth/login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'student', stuGr: gr, stuPass: pass })
    });
    const data = await res.json();
    if (!data.success) {
      return toast(data.message || 'Invalid G.R. Number or Password', 'err');
    }
    currentSession = data.data.session;
    localStorage.setItem('campus_session', JSON.stringify(currentSession));
    sessionStorage.setItem('campus_session_active', '1');
    toast(`Welcome ${currentSession.name}`);
    runSessionTimer();
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const actionQuery = action ? `&action=${encodeURIComponent(action)}` : '';
    setTimeout(() => {
      window.location.href = `roles.html?role=student${actionQuery}`;
    }, 400);
  } catch (err) {
    toast('Login failed. Please verify server connection.', 'err');
  }
}

async function loginFaculty(e) {
  e.preventDefault();
  const dept = document.getElementById('facDeptInput').value;
  const pass = document.getElementById('facPass').value;
  try {
    const res = await fetch('backend/auth/login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'faculty', facDept: dept, facPass: pass })
    });
    const data = await res.json();
    if (!data.success) {
      return toast(data.message || 'Invalid Faculty Credentials', 'err');
    }
    currentSession = data.data.session;
    localStorage.setItem('campus_session', JSON.stringify(currentSession));
    sessionStorage.setItem('campus_session_active', '1');
    toast(`Faculty authorized: ${dept}`);
    runSessionTimer();
    setTimeout(() => {
      window.location.href = 'roles.html?role=faculty';
    }, 400);
  } catch (err) {
    toast('Login failed. Please verify server connection.', 'err');
  }
}

async function loginTechnician(e) {
  e.preventDefault();
  const id = document.getElementById('techId').value.trim().toUpperCase();
  const pass = document.getElementById('techPass').value;
  try {
    const res = await fetch('backend/auth/login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'technician', techId: id, techPass: pass })
    });
    const data = await res.json();
    if (!data.success) {
      return toast(data.message || 'Invalid Technician credentials', 'err');
    }
    currentSession = data.data.session;
    localStorage.setItem('campus_session', JSON.stringify(currentSession));
    sessionStorage.setItem('campus_session_active', '1');
    toast(`Technician session open: ${currentSession.name}`);
    runSessionTimer();
    setTimeout(() => {
      window.location.href = 'roles.html?role=technician';
    }, 400);
  } catch (err) {
    toast('Login failed. Please verify server connection.', 'err');
  }
}

async function loginAdmin(e) {
  e.preventDefault();
  const user = document.getElementById('adminUser').value.trim();
  const pass = document.getElementById('adminPass').value;
  try {
    const res = await fetch('backend/auth/login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin', adminUser: user, adminPass: pass })
    });
    const data = await res.json();
    if (!data.success) {
      return toast(data.message || 'Admin Credentials Invalid', 'err');
    }
    currentSession = data.data.session;
    localStorage.setItem('campus_session', JSON.stringify(currentSession));
    sessionStorage.setItem('campus_session_active', '1');
    toast('Admin terminal unlocked');
    runSessionTimer();
    setTimeout(() => {
      window.location.href = 'roles.html?role=admin';
    }, 400);
  } catch (err) {
    toast('Login failed. Please verify server connection.', 'err');
  }
}

async function logout(isAutoExpired = false) {
  try {
    await fetch('backend/auth/logout.php', { method: 'POST' });
  } catch (e) {}

  currentSession = null;
  localStorage.removeItem('campus_session');
  localStorage.removeItem('campus_hidden_timestamp');
  sessionStorage.removeItem('campus_session_active');
  if (sessionWatcherTimer) clearInterval(sessionWatcherTimer);

  const timerBadge = document.getElementById('sessionTimerBadge');
  if (timerBadge) timerBadge.classList.add('hidden');
  const userChip = document.getElementById('userChip');
  if (userChip) userChip.classList.add('hidden');
  const notifWrap = document.getElementById('notifWrap');
  if (notifWrap) notifWrap.classList.add('hidden');
  const authSlot = document.getElementById('navRightAuthSlot');
  if (authSlot) authSlot.classList.remove('hidden');
  
  goHome();
  if (isAutoExpired === true) {
    toast('Session ended. Please sign in again.', 'err');
  } else {
    toast('Logged out successfully');
  }
}

function openRegister() { document.getElementById('modalRegister').classList.remove('hidden'); }
function closeRegister() { document.getElementById('modalRegister').classList.add('hidden'); }

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const gr = document.getElementById('regGr').value.trim();
  const dept = document.getElementById('regDept').value.trim();
  const pass = document.getElementById('regPass').value;

  try {
    const res = await fetch('backend/auth/register.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regName: name, regGr: gr, regDept: dept, regPass: pass })
    });
    const data = await res.json();
    if (!data.success) {
      return toast(data.message || 'Registration failed', 'err');
    }
    closeRegister();
    toast('Student account generated! Log in below.');
    document.getElementById('stuGr').value = gr;
    document.getElementById('stuPass').value = '';
  } catch (err) {
    toast('Registration failed. Please try again.', 'err');
  }
}

function showView(viewId) {
  const views = ['landing', 'auth', 'roles', 'student', 'faculty', 'technician', 'admin', 'portal', 'feed'];
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
  if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (typeof initScrollObserver === 'function') {
    setTimeout(initScrollObserver, 100);
  }
}

// Navigation profile synchronization is handled centrally by navigation.js


document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const roleParam = params.get('role');
  if (roleParam && ['student', 'faculty', 'technician', 'admin'].includes(roleParam)) {
    switchRole(roleParam);
  } else {
    switchRole('student');
  }
});
