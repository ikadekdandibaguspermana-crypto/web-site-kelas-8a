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

  const classSelection = document.getElementById('classSelection');
  const gradeCards = document.querySelectorAll('.grade-card');

  const classListSection = document.getElementById('classListSection');
  const classList = document.getElementById('classList');

  const selectedGradeLabel =
    document.getElementById('selectionGradeLabel');

  const selectedClassInfo =
    document.getElementById('selectedClassInfo');

  const selectedClassName =
    document.getElementById('selectedClassName');

  const sessionBadge =
    document.getElementById('sessionBadge');

  const sessionName =
    document.getElementById('sessionName');

  const logoutBtn =
    document.getElementById('logoutBtn');

  const SESSION_KEY = 'aventra_session';

  let mode = 'student';

  let selectedGrade = null;
  let selectedClassId = null;


  /* =========================================================
     RENDER KELAS A-J
  ========================================================= */

  function renderClassButtons(grade) {
    classList.innerHTML = '';

    const letters = 'ABCDEFGHIJ'.split('');

    letters.forEach((letter) => {
      const classId = `${grade}${letter}`;

      const button = document.createElement('button');

      button.type = 'button';
      button.className = 'class-card';
      button.dataset.class = classId;

      button.innerHTML = `
        <span class="class-letter">${letter}</span>
        <span class="class-name">Kelas ${classId}</span>
      `;

      button.addEventListener('click', () => {
        selectedClassId = classId;

        selectedClassName.textContent = `Kelas ${classId}`;
        selectedClassInfo.hidden = false;

        document
          .querySelectorAll('.class-card')
          .forEach((card) => {
            card.classList.remove('active');
          });

        button.classList.add('active');
      });

      classList.appendChild(button);
    });
  }


  /* =========================================================
     PILIH TINGKAT 7 / 8 / 9
  ========================================================= */

  gradeCards.forEach((card) => {
    card.addEventListener('click', () => {
      selectedGrade = Number(card.dataset.grade);

      selectedClassId = null;

      selectedGradeLabel.textContent =
        `Kelas ${selectedGrade}`;

      classListSection.hidden = false;

      selectedClassInfo.hidden = true;

      renderClassButtons(selectedGrade);

      gradeCards.forEach((item) => {
        item.classList.remove('active');
      });

      card.classList.add('active');
    });
  });


  /* =========================================================
     API
  ========================================================= */

  const IS_LOCAL_DEV = false;

  const API_BASE =
    'https://aventra-x-2026-web-bydandi.netlify.app';


  /* =========================================================
     AMBIL SESSION
  ========================================================= */

  function getSession() {
    try {
      const raw =
        sessionStorage.getItem(SESSION_KEY);

      if (!raw) {
        return null;
      }

      const data = JSON.parse(raw);

      if (
        !data.token ||
        !data.expiry ||
        Date.now() > data.expiry
      ) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }

      return data;

    } catch {
      return null;
    }
  }


  /* =========================================================
     SIMPAN SESSION
  ========================================================= */

  function saveSession({
    token,
    role,
    name,
    grade,
    classId,
    assignedClasses,
    teacherId,
    studentId
  }) {

    const expiry =
      Date.now() + 12 * 60 * 60 * 1000;

    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        token,
        role,
        name,

        grade:
          grade ??
          (
            classId
              ? Number(String(classId).charAt(0))
              : null
          ),

        classId:
          classId ?? null,

        assignedClasses:
          Array.isArray(assignedClasses)
            ? assignedClasses
            : [],

        teacherId:
          teacherId ?? null,

        studentId:
          studentId ?? null,

        expiry
      })
    );
  }


  /* =========================================================
     HAPUS SESSION
  ========================================================= */

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }


  /* =========================================================
     TAMPILKAN APP
  ========================================================= */

  function showApp(session) {
    document.body.classList.remove('gate-pending');

    loginGate.style.display = 'none';

    sessionBadge.style.display = '';

    sessionName.textContent =
      session.name;

    document.dispatchEvent(
      new CustomEvent('aventra:login', {
        detail: session
      })
    );
  }


  /* =========================================================
     TAMPILKAN LANDING
  ========================================================= */

  function showLanding() {
    gateLanding.style.display = '';

    loginBox.style.display = 'none';
  }


  /* =========================================================
     TAMPILKAN LOGIN
  ========================================================= */

  function showLoginBox() {
    gateLanding.style.display = 'none';

    loginBox.style.display = '';

    setMode('student');
  }


  /* =========================================================
     TAMPILKAN LOGIN GATE
  ========================================================= */

  function showLoginGate() {
    document.body.classList.add('gate-pending');

    loginGate.style.display = '';

    sessionBadge.style.display = 'none';

    showLanding();
  }


  /* =========================================================
     MODE LOGIN
     STUDENT / ADMIN / GURU
  ========================================================= */

  function setMode(newMode) {
    mode = newMode;

    loginFormStudent.style.display =
      mode === 'student'
        ? ''
        : 'none';

    loginFormAdmin.style.display =
      mode === 'admin'
        ? ''
        : 'none';

    loginFormGuru.style.display =
      mode === 'guru'
        ? ''
        : 'none';

    loginError.textContent = '';

    loginTabs.forEach((tab) => {
      tab.classList.toggle(
        'active',
        tab.getAttribute('data-mode') === mode
      );
    });


    if (mode === 'admin') {

      loginTitle.textContent =
        'Masuk sebagai Admin';

      loginSub.textContent =
        'Masukkan password admin.';

    } else if (mode === 'guru') {

      loginTitle.textContent =
        'Masuk sebagai Guru';

      loginSub.textContent =
        'Masukkan password guru.';

    } else {

      loginTitle.textContent =
        'Masuk ke Aventra Class';

      loginSub.textContent =
        'Masukkan nama dan PIN kamu persis seperti pada daftar absensi.';
    }
  }


  /* =========================================================
     PROSES LOGIN
  ========================================================= */

  async function doLogin() {

    loginError.textContent = '';

    loginSubmit.disabled = true;

    loginSubmit.textContent =
      'Memeriksa...';


    try {

      let data;


      /* =====================================================
         LOCAL DEVELOPMENT
      ===================================================== */

      if (IS_LOCAL_DEV) {

        await new Promise((resolve) =>
          setTimeout(resolve, 250)
        );


        /* ADMIN */

        if (mode === 'admin') {

          if (!loginAdminPass.value.trim()) {

            loginError.textContent =
              '[Mode lokal] Isi password apa saja untuk masuk sebagai Admin.';

            return;
          }

          data = {
            ok: true,
            token: 'local-dev-token',
            role: 'admin',
            name: 'Admin'
          };

        }


        /* GURU */

        else if (mode === 'guru') {

          if (!loginGuruPass.value.trim()) {

            loginError.textContent =
              '[Mode lokal] Isi password apa saja untuk masuk sebagai Guru.';

            return;
          }

          data = {

            ok: true,

            token:
              'local-dev-token',

            role:
              'guru',

            name:
              'Guru',

            assignedClasses:
              [],

            teacherId:
              null,

            classId:
              null
          };

        }


        /* SISWA */

        else {

          if (
            !loginName.value.trim() ||
            !loginPin.value.trim()
          ) {

            loginError.textContent =
              '[Mode lokal] Isi nama & PIN apa saja untuk masuk.';

            return;
          }

          data = {

            ok: true,

            token:
              'local-dev-token',

            role:
              'student',

            name:
              loginName.value.trim(),

            grade:
              selectedGrade,

            classId:
              selectedClassId
          };
        }


      }


      /* =====================================================
         LOGIN GURU
      ===================================================== */

      else if (mode === 'guru') {

        const res = await fetch(
          `${API_BASE}/.netlify/functions/login-guru`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({
              password:
                loginGuruPass.value
            })
          }
        );


        data = await res.json();


        if (!res.ok || !data.ok) {

          loginError.textContent =
            data.error ||
            'Login gagal. Coba lagi.';

          return;
        }
      }


      /* =====================================================
         LOGIN ADMIN / SISWA
      ===================================================== */

      else {

        /* SISWA HARUS PILIH KELAS */

        if (
          mode === 'student' &&
          !selectedClassId
        ) {

          loginError.textContent =
            'Pilih tingkat dan kelas terlebih dahulu.';

          return;
        }


        const body =
          mode === 'admin'

            ? {
                type:
                  'admin',

                password:
                  loginAdminPass.value
              }

            : {
                type:
                  'student',

                name:
                  loginName.value,

                pin:
                  loginPin.value,

                classId:
                  selectedClassId
              };


        const res = await fetch(
          `${API_BASE}/.netlify/functions/login`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify(body)
          }
        );


        data = await res.json();


        if (!res.ok || !data.ok) {

          loginError.textContent =
            data.error ||
            'Login gagal. Coba lagi.';

          return;
        }
      }


      /* =====================================================
         SIMPAN SESSION
      ===================================================== */

      saveSession(data);


      /* =====================================================
         MASUK KE APP
      ===================================================== */

      showApp(data);


    } catch (err) {

      loginError.textContent =
        'Tidak bisa menghubungi server. Cek koneksi internet kamu.';

      console.error(
        '[auth] login error:',
        err
      );

    } finally {

      loginSubmit.disabled = false;

      loginSubmit.textContent =
        'Masuk';
    }
  }


  /* =========================================================
     TOMBOL LOGIN
  ========================================================= */

  loginSubmit.addEventListener(
    'click',
    doLogin
  );


  /* =========================================================
     ENTER UNTUK LOGIN
  ========================================================= */

  [
    loginName,
    loginPin,
    loginAdminPass,
    loginGuruPass
  ].forEach((el) => {

    el.addEventListener(
      'keydown',
      (e) => {

        if (e.key === 'Enter') {
          doLogin();
        }

      }
    );

  });


  /* =========================================================
     TAB LOGIN
  ========================================================= */

  loginTabs.forEach((tab) => {

    tab.addEventListener(
      'click',
      () => {

        setMode(
          tab.getAttribute('data-mode')
        );

      }
    );

  });


  /* =========================================================
     NAVIGASI LANDING
  ========================================================= */

  gateCardMasuk.addEventListener(
    'click',
    showLoginBox
  );


  gateCardFaq.addEventListener(
    'click',
    () => {
      location.href = 'faq.html';
    }
  );


  gateCardPortofolio.addEventListener(
    'click',
    () => {
      location.href = 'portofolio.html';
    }
  );


  gateBackBtn.addEventListener(
    'click',
    showLanding
  );


  /* =========================================================
     LOGOUT
  ========================================================= */

  logoutBtn.addEventListener(
    'click',
    () => {

      clearSession();

      showLoginGate();

      document.dispatchEvent(
        new CustomEvent('aventra:logout')
      );

    }
  );


  /* =========================================================
     CEK SESSION SAAT HALAMAN DIBUKA
  ========================================================= */

  const existing =
    getSession();


  if (existing) {

    showApp(existing);

  } else {

    showLoginGate();

  }


  /* =========================================================
     PUBLIC API
  ========================================================= */

  window.AventraAuth = {

    getSession,

    getToken: () =>
      (getSession() || {}).token || null,

    getRole: () =>
      (getSession() || {}).role || null,

    setMode
  };

})();