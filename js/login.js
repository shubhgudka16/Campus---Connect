/* ==========================================================================
   Campus Connect - Authentication & Login Engine (login.js)
   ========================================================================== */

/* ---------- API ROUTING & RESOLUTION ---------- */

/**
 * Resolves API endpoints reliably relative to current host/path
 */
function getApiUrl(endpoint) {
  try {
    return new URL(endpoint, window.location.href).href;
  } catch (e) {
    return endpoint;
  }
}

/* ---------- ROLE SWITCHING & AUTH ---------- */

function switchRole(r) {
  ['Student', 'Faculty', 'Technician', 'Admin'].forEach(k => {
    const btn = document.getElementById('tab' + k);
    const form = document.getElementById('form' + k);
    if (!btn || !form) return;
    if (k.toLowerCase() === r) {
      btn.className = 'flex-1 min-w-[80px] py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-xs shadow-md';
      form.classList.remove('hidden');
    } else {
      btn.className = 'flex-1 min-w-[80px] py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border text-slate-700 dark:text-zinc-300 font-semibold text-xs';
      form.classList.add('hidden');
    }
  });
}

/**
 * Unified robust login executor handling all network, server, database, and credential states
 */
async function executeLoginRequest(payload, defaultRoleError) {
  const apiUrl = getApiUrl('backend/auth/login.php');

  // Case A Check: Direct file:// access from File Explorer
  if (window.location.protocol === 'file:') {
    const errorDetail = 'Web pages opened directly via file:// protocol cannot execute PHP backend scripts. Please open via http://localhost/Campus%20-%20Connect/login.html';
    console.error('Login API request failed\nStatus: File Protocol (file://)\nResponse: ' + errorDetail);
    return toast('Unable to connect to the PHP server. Make sure Apache is running and open the website through http://localhost/...', 'err');
  }

  let res = null;
  let rawText = '';

  // Network attempt
  try {
    res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (netErr) {
    // Case A: PHP server unreachable / Apache stopped / network failure
    console.error('Login API request failed\nStatus: Network / Connection Error\nResponse: ' + (netErr?.message || String(netErr)));
    return toast('Unable to connect to the PHP server. Make sure Apache is running and open the website through http://localhost/...', 'err');
  }

  // Read response body safely
  try {
    rawText = await res.text();
  } catch (readErr) {
    rawText = '';
  }

  // Safe JSON Parsing
  let data = null;
  try {
    data = JSON.parse(rawText);
  } catch (parseErr) {
    // PHP responded with non-JSON (e.g. fatal error, HTML, 404, or 500 error page)
    console.error(`Login API request failed\nStatus: ${res.status} ${res.statusText}\nResponse: ${rawText.substring(0, 1000)}`);

    if (res.status === 500) {
      return toast('Server error while processing login. Please check the PHP/database configuration.', 'err');
    }
    if (!res.ok) {
      return toast('Unable to connect to the PHP server. Make sure Apache is running and open the website through http://localhost/...', 'err');
    }
    return toast('Server error while processing login. Please check the PHP/database configuration.', 'err');
  }

  // Process JSON Response
  if (!data.success) {
    console.error(`Login API request failed\nStatus: ${res.status}\nResponse:`, data);

    // Case C — Database connection fails
    if (data.error_type === 'DATABASE_ERROR' || (data.message && data.message.toLowerCase().includes('database'))) {
      return toast('Database connection failed. Please make sure MySQL is running and the campus_connect database is imported.', 'err');
    }

    // Case B — PHP responds with HTTP 500
    if (res.status === 500) {
      return toast('Server error while processing login. Please check the PHP/database configuration.', 'err');
    }

    // Case D — Wrong credentials or input errors
    const credentialError = data.message || defaultRoleError;
    return toast(credentialError, 'err');
  }

  // Case E — Successful Login
  currentSession = data.data.session;
  localStorage.setItem('campus_session', JSON.stringify(currentSession));
  sessionStorage.setItem('campus_session_active', '1');

  toast(data.message || `Welcome ${currentSession.name}`);
  if (typeof runSessionTimer === 'function') {
    runSessionTimer();
  }

  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');
  const actionQuery = action ? `&action=${encodeURIComponent(action)}` : '';
  const targetRole = (currentSession.role || payload.role || 'student').toLowerCase();

  setTimeout(() => {
    window.location.href = `roles.html?role=${encodeURIComponent(targetRole)}${actionQuery}`;
  }, 400);
}

async function loginStudent(e) {
  e.preventDefault();
  const gr = document.getElementById('stuGr').value.trim();
  const pass = document.getElementById('stuPass').value;
  await executeLoginRequest({ role: 'student', stuGr: gr, stuPass: pass }, 'Invalid G.R. Number or Password');
}

async function loginFaculty(e) {
  e.preventDefault();
  const dept = document.getElementById('facDeptInput').value;
  const pass = document.getElementById('facPass').value;
  await executeLoginRequest({ role: 'faculty', facDept: dept, facPass: pass }, 'Invalid Faculty Credentials');
}

async function loginTechnician(e) {
  e.preventDefault();
  const id = document.getElementById('techId').value.trim().toUpperCase();
  const pass = document.getElementById('techPass').value;
  await executeLoginRequest({ role: 'technician', techId: id, techPass: pass }, 'Invalid Technician credentials');
}

async function loginAdmin(e) {
  e.preventDefault();
  const user = document.getElementById('adminUser').value.trim();
  const pass = document.getElementById('adminPass').value;
  await executeLoginRequest({ role: 'admin', adminUser: user, adminPass: pass }, 'Admin Credentials Invalid');
}

async function logout(isAutoExpired = false) {
  if (window.location.protocol !== 'file:') {
    try {
      const apiUrl = getApiUrl('backend/auth/logout.php');
      await fetch(apiUrl, { method: 'POST' });
    } catch (e) {}
  }

  currentSession = null;
  localStorage.removeItem('campus_session');
  localStorage.removeItem('campus_hidden_timestamp');
  sessionStorage.removeItem('campus_session_active');
  if (typeof sessionWatcherTimer !== 'undefined' && sessionWatcherTimer) {
    clearInterval(sessionWatcherTimer);
  }

  const timerBadge = document.getElementById('sessionTimerBadge');
  if (timerBadge) timerBadge.classList.add('hidden');
  const userChip = document.getElementById('userChip');
  if (userChip) {
    userChip.classList.add('hidden');
    userChip.classList.remove('flex');
  }
  const notifWrap = document.getElementById('notifWrap');
  if (notifWrap) notifWrap.classList.add('hidden');
  const authSlot = document.getElementById('navRightAuthSlot');
  if (authSlot) authSlot.classList.remove('hidden');

  if (typeof goHome === 'function') {
    goHome();
  } else {
    window.location.href = 'index.html';
  }

  if (isAutoExpired === true) {
    toast('Session ended. Please sign in again.', 'err');
  } else {
    toast('Logged out successfully');
  }
}

function openRegister() {
  const modal = document.getElementById('modalRegister');
  if (modal) modal.classList.remove('hidden');
}

function closeRegister() {
  const modal = document.getElementById('modalRegister');
  if (modal) modal.classList.add('hidden');
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const gr = document.getElementById('regGr').value.trim();
  const dept = document.getElementById('regDept').value.trim();
  const pass = document.getElementById('regPass').value;

  if (window.location.protocol === 'file:') {
    console.error('Registration API request failed\nStatus: File Protocol (file://)\nResponse: Local file opening cannot run PHP.');
    return toast('Unable to connect to the PHP server. Make sure Apache is running and open the website through http://localhost/...', 'err');
  }

  const apiUrl = getApiUrl('backend/auth/register.php');
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ regName: name, regGr: gr, regDept: dept, regPass: pass })
    });
    const rawText = await res.text();
    let data = null;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      console.error(`Registration API request failed\nStatus: ${res.status}\nResponse: ${rawText}`);
      if (res.status === 500) {
        return toast('Server error while processing registration. Please check the PHP/database configuration.', 'err');
      }
      return toast('Unable to connect to the PHP server. Make sure Apache is running and open the website through http://localhost/...', 'err');
    }

    if (!data.success) {
      if (data.error_type === 'DATABASE_ERROR') {
        return toast('Database connection failed. Please make sure MySQL is running and the campus_connect database is imported.', 'err');
      }
      return toast(data.message || 'Registration failed', 'err');
    }

    closeRegister();
    toast('Student account generated! Log in below.');
    const grInput = document.getElementById('stuGr');
    const passInput = document.getElementById('stuPass');
    if (grInput) grInput.value = gr;
    if (passInput) passInput.value = '';
  } catch (netErr) {
    console.error('Registration API request failed\nStatus: Network Error\nResponse: ' + (netErr?.message || String(netErr)));
    toast('Unable to connect to the PHP server. Make sure Apache is running and open the website through http://localhost/...', 'err');
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

document.addEventListener('DOMContentLoaded', () => {
  // If user opened via file:// protocol, output friendly diagnostic warning to console
  if (window.location.protocol === 'file:') {
    console.warn(
      '[Campus Connect Diagnostic] The website was opened directly via file:// protocol. ' +
      'PHP backend endpoints require Apache. To authenticate against MySQL, open via: ' +
      'http://localhost/Campus%20-%20Connect/login.html'
    );
  }

  const params = new URLSearchParams(window.location.search);
  const roleParam = params.get('role');
  if (roleParam && ['student', 'faculty', 'technician', 'admin'].includes(roleParam)) {
    switchRole(roleParam);
  } else {
    switchRole('student');
  }
});
