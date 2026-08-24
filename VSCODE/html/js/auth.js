// js/auth.js
//
// Menggantikan js/config.js yang lama.
// File ini AMAN 100% untuk dilihat siapa pun lewat Inspect/DevTools,
// karena tidak berisi PIN atau password sama sekali — semua pengecekan
// PIN/password terjadi di server (netlify/functions/login.js).
//
// Setelah login sukses, info sesi (nama, role, token) disimpan di
// sessionStorage (hilang otomatis kalau tab ditutup) dan sebuah event
// 'aventra:login' dikirim supaya script.js yang sudah ada bisa
// menampilkan konten yang sesuai tanpa perlu tahu detail login-nya.

(function () {
  const loginGate = document.getElementById('loginGate');
  const loginFormStudent = document.getElementById('loginFormStudent');
  const loginFormAdmin = document.getElementById('loginFormAdmin');
  const loginName = document.getElementById('loginName');
  const loginPin = document.getElementById('loginPin');
  const loginAdminPass = document.getElementById('loginAdminPass');
  const loginSubmit = document.getElementById('loginSubmit');
  const loginError = document.getElementById('loginError');
  const loginToggle = document.getElementById('loginToggle');
  const sessionBadge = document.getElementById('sessionBadge');
  const sessionName = document.getElementById('sessionName');
  const logoutBtn = document.getElementById('logoutBtn');

  const SESSION_KEY = 'aventra_session';
  let isAdminMode = false;

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
    const expiry = Date.now() + 12 * 60 * 60 * 1000; // 12 jam, samakan dgn server
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, role, name, expiry }));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function showApp(session) {
    loginGate.style.display = 'none';
    sessionBadge.style.display = '';
    sessionName.textContent = session.name;
    document.dispatchEvent(new CustomEvent('aventra:login', { detail: session }));
  }

  function showLoginGate() {
    loginGate.style.display = '';
    sessionBadge.style.display = 'none';
  }

  async function doLogin() {
    loginError.textContent = '';
    loginSubmit.disabled = true;
    loginSubmit.textContent = 'Memeriksa...';

    const body = isAdminMode
      ? { type: 'admin', password: loginAdminPass.value }
      : { type: 'student', name: loginName.value, pin: loginPin.value };

    try {
      const res = await fetch('/.netlify/functions/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        loginError.textContent = data.error || 'Login gagal. Coba lagi.';
        return;
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

  [loginName, loginPin, loginAdminPass].forEach((el) => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doLogin();
    });
  });

  loginToggle.addEventListener('click', () => {
    isAdminMode = !isAdminMode;
    loginFormStudent.style.display = isAdminMode ? 'none' : '';
    loginFormAdmin.style.display = isAdminMode ? '' : 'none';
    loginToggle.textContent = isAdminMode ? 'Masuk sebagai Murid' : 'Masuk sebagai Admin';
    loginError.textContent = '';
  });

  logoutBtn.addEventListener('click', () => {
    clearSession();
    showLoginGate();
    document.dispatchEvent(new CustomEvent('aventra:logout'));
  });

  // Cek sesi yang mungkin masih tersimpan (misalnya user refresh halaman)
  const existing = getSession();
  if (existing) {
    showApp(existing);
  } else {
    showLoginGate();
  }

  // Expose helper kecil untuk dipakai script.js yang sudah ada, kalau
  // perlu menyertakan token saat memanggil function admin lain
  // (misalnya posting pengumuman). Contoh pakai di script.js:
  //   fetch('/.netlify/functions/pengumuman-post', {
  //     headers: { Authorization: 'Bearer ' + window.AventraAuth.getToken() }
  //   })
  window.AventraAuth = {
    getSession,
    getToken: () => (getSession() || {}).token || null,
    getRole: () => (getSession() || {}).role || null,
  };
})();