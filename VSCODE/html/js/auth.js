(function () {
  const loginGate = document.getElementById('loginGate');
  const gateLanding = document.getElementById('gateLanding');
  const loginBox = document.getElementById('loginBox');
  const gateCardMasuk = document.getElementById('gateCardMasuk');
  const gateCardFaq = document.getElementById('gateCardFaq');
  const gateCardPortofolio = document.getElementById('gateCardPortofolio');
  const gateBackBtn = document.getElementById('gateBackBtn');
  const loginTabs = document.querySelectorAll('.login-tab');
  const loginFormStudent = document.getElementById('loginFormStudent');
  const loginFormAdmin = document.getElementById('loginFormAdmin');
  const loginFormGuru = document.getElementById('loginFormGuru');
  const loginName = document.getElementById('loginName');
  const loginPin = document.getElementById('loginPin');
  const loginAdminPass = document.getElementById('loginAdminPass');
  const loginGuruPass = document.getElementById('loginGuruPass');
  const loginSubmit = document.getElementById('loginSubmit');
  const loginError = document.getElementById('loginError');
  const loginTitle = document.getElementById('loginTitle');
  const loginSub = document.getElementById('loginSub');
  const sessionBadge = document.getElementById('sessionBadge');
  const sessionName = document.getElementById('sessionName');
  const logoutBtn = document.getElementById('logoutBtn');

  const SESSION_KEY = 'aventra_session';
  let mode = 'student';

  const IS_LOCAL_DEV = ['localhost', '127.0.0.1', ''].includes(location.hostname);

  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data.token || !data.expiry || Date.now() > data.expiry) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  function saveSession({ token, role, name }) {
    const expiry = Date.now() + 12 * 60 * 60 * 1000;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, role, name, expiry }));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function showApp(session) {
    document.body.classList.remove('gate-pending');
    loginGate.style.display = 'none';
    sessionBadge.style.display = '';
    sessionName.textContent = session.name;
    document.dispatchEvent(new CustomEvent('aventra:login', { detail: session }));
  }

  function showLanding() {
    gateLanding.style.display = '';
    loginBox.style.display = 'none';
  }

  function showLoginBox() {
    gateLanding.style.display = 'none';
    loginBox.style.display = '';
    setMode('student');
  }

  function showLoginGate() {
    document.body.classList.add('gate-pending');
    loginGate.style.display = '';
    sessionBadge.style.display = 'none';
    showLanding();
  }

  function setMode(newMode) {
    mode = newMode;
    loginFormStudent.style.display = mode === 'student' ? '' : 'none';
    loginFormAdmin.style.display = mode === 'admin' ? '' : 'none';
    loginFormGuru.style.display = mode === 'guru' ? '' : 'none';
    loginError.textContent = '';

    loginTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
    });

    if (mode === 'admin') {
      loginTitle.textContent = 'Masuk sebagai Admin';
      loginSub.textContent = 'Masukkan password admin.';
    } else if (mode === 'guru') {
      loginTitle.textContent = 'Masuk sebagai Guru';
      loginSub.textContent = 'Masukkan password guru.';
    } else {
      loginTitle.textContent = 'Masuk ke Aventra Class';
      loginSub.textContent = 'Masukkan nama dan PIN kamu persis seperti pada daftar absensi.';
    }
  }

  async function doLogin() {
    loginError.textContent = '';
    loginSubmit.disabled = true;
    loginSubmit.textContent = 'Memeriksa...';

    try {
      let data;

      if (IS_LOCAL_DEV) {
        await new Promise((r) => setTimeout(r, 250));
        if (mode === 'admin') {
          if (!loginAdminPass.value.trim()) {
            loginError.textContent = '[Mode lokal] Isi password apa saja untuk masuk sebagai Admin.';
            return;
          }
          data = { ok: true, token: 'local-dev-token', role: 'admin', name: 'Admin' };
        } else if (mode === 'guru') {
          if (!loginGuruPass.value.trim()) {
            loginError.textContent = '[Mode lokal] Isi password apa saja untuk masuk sebagai Guru.';
            return;
          }
          data = { ok: true, token: 'local-dev-token', role: 'guru', name: 'Guru' };
        } else {
          if (!loginName.value.trim() || !loginPin.value.trim()) {
            loginError.textContent = '[Mode lokal] Isi nama & PIN apa saja untuk masuk.';
            return;
          }
          data = { ok: true, token: 'local-dev-token', role: 'student', name: loginName.value.trim() };
        }
      } else if (mode === 'guru') {
        const res = await fetch('/.netlify/functions/login-guru', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: loginGuruPass.value }),
        });
        data = await res.json();
        if (!res.ok || !data.ok) {
          loginError.textContent = data.error || 'Login gagal. Coba lagi.';
          return;
        }
      } else {
        const body =
          mode === 'admin'
            ? { type: 'admin', password: loginAdminPass.value }
            : { type: 'student', name: loginName.value, pin: loginPin.value };

        const res = await fetch('/.netlify/functions/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        data = await res.json();
        if (!res.ok || !data.ok) {
          loginError.textContent = data.error || 'Login gagal. Coba lagi.';
          return;
        }
      }

      saveSession(data);
      showApp(data);
    } catch (err) {
      loginError.textContent = 'Tidak bisa menghubungi server. Cek koneksi internet kamu.';
      console.error('[auth] login error:', err);
    } finally {
      loginSubmit.disabled = false;
      loginSubmit.textContent = 'Masuk';
    }
  }

  loginSubmit.addEventListener('click', doLogin);

  [loginName, loginPin, loginAdminPass, loginGuruPass].forEach((el) => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doLogin();
    });
  });

  loginTabs.forEach((tab) => {
    tab.addEventListener('click', () => setMode(tab.getAttribute('data-mode')));
  });

  gateCardMasuk.addEventListener('click', showLoginBox);
  gateCardFaq.addEventListener('click', () => { location.href = 'faq.html'; });
  gateCardPortofolio.addEventListener('click', () => { location.href = 'portofolio.html'; });
  gateBackBtn.addEventListener('click', showLanding);

  logoutBtn.addEventListener('click', () => {
    clearSession();
    showLoginGate();
    document.dispatchEvent(new CustomEvent('aventra:logout'));
  });

  function doLoginGuest() {
    const session = { token: 'guest-session', role: 'guest', name: 'Tamu' };
    saveSession(session);
    showApp(session);
  }

  function setupGuestButton() {
    if (document.getElementById('loginGuestBtn')) return;
    const guestBtn = document.createElement('button');
    guestBtn.type = 'button';
    guestBtn.id = 'loginGuestBtn';
    guestBtn.className = 'login-toggle';
    guestBtn.style.marginTop = '8px';
    guestBtn.textContent = 'Masuk sebagai Tamu (tanpa login)';
    guestBtn.addEventListener('click', doLoginGuest);
    loginBox.appendChild(guestBtn);
  }
  setupGuestButton();

  if (IS_LOCAL_DEV) {
    const noteEl = document.createElement('p');
    noteEl.style.cssText = 'font-size:11px;color:#f2b705;text-align:center;margin-top:10px;';
    noteEl.textContent = 'Mode Testing Lokal — nama/PIN/password bebas, tidak divalidasi ke server.';
    loginBox.appendChild(noteEl);
  }

  const existing = getSession();
  if (existing) {
    showApp(existing);
  } else {
    showLoginGate();
  }

  window.AventraAuth = {
    getSession,
    getToken: () => (getSession() || {}).token || null,
    getRole: () => (getSession() || {}).role || null,
    setMode,
  };
})();