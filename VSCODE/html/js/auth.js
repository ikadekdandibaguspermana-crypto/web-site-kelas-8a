(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyAruYX883CuAYkes1Uq-eYt7ZgpWR0iUG4",
    authDomain: "ombak-nusantara.firebaseapp.com",
    projectId: "ombak-nusantara",
    storageBucket: "ombak-nusantara.firebasestorage.app",
    messagingSenderId: "874381163137",
    appId: "1:874381163137:web:c73d64a041fbab2b7c2b80",
    measurementId: "G-33TLT4ZE17"
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const firebaseAuth = firebase.auth();

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
  const loginAdminAccount = document.getElementById('loginAdminAccount');
  const loginAdminPass = document.getElementById('loginAdminPass');
  const loginGuruPass = document.getElementById('loginGuruPass');

  const loginSubmit = document.getElementById('loginSubmit');
  const loginError = document.getElementById('loginError');

  const loginTitle = document.getElementById('loginTitle');
  const loginSub = document.getElementById('loginSub');

  const classSelection = document.getElementById('classSelection');
  const adminClassControls = document.getElementById('adminClassControls');
  const adminClassSelect = document.getElementById('adminClassSelect');
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
  const ADMIN_CLASS_KEY = 'aventra_admin_class';

  let mode = 'student';

  let selectedGrade = null;
  let selectedClassId = null;

  function setAdminClassId(classId, notify = true) {
    const value = /^[7-9][A-J]$/.test(String(classId || ''))
      ? String(classId)
      : '';
    if (value) sessionStorage.setItem(ADMIN_CLASS_KEY, value);
    else sessionStorage.removeItem(ADMIN_CLASS_KEY);
    if (adminClassSelect) adminClassSelect.value = value;
    if (notify) {
      document.dispatchEvent(new CustomEvent('aventra:class-change', {
        detail: { classId: value || null }
      }));
    }
    return value || null;
  }

  if (adminClassSelect) {
    for (const grade of [7, 8, 9]) {
      const group = document.createElement('optgroup');
      group.label = `Kelas ${grade}`;
      for (const letter of 'ABCDEFGHIJ') {
        const option = document.createElement('option');
        option.value = `${grade}${letter}`;
        option.textContent = `Kelas ${grade}${letter}`;
        group.appendChild(option);
      }
      adminClassSelect.appendChild(group);
    }
  }

  if (adminClassSelect) {
    adminClassSelect.addEventListener('change', () => {
      setAdminClassId(adminClassSelect.value);
    });
  }


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

  const IS_LOCAL_DEV = false;

  const API_BASE =
    'https://aventra-x-2026-web-bydandi.netlify.app';


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
        data.token === 'local-dev-token' ||
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

  function saveSession({
    token,
    role,
    name,
    grade,
    classId,
    assignedClasses,
    teacherId,
    studentId,
    accountId,
    firebaseUid,
    expiry: serverExpiry
  }) {

    const expiry =
      Number(serverExpiry) || (Date.now() + 12 * 60 * 60 * 1000);

    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        token,
        accountId: accountId ?? studentId ?? teacherId ?? (role === 'admin' ? 'admin' : null),
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

        firebaseUid:
          firebaseUid ?? null,

        expiry
      })
    );
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function expectedFirebaseUid(session) {
    if (!session || !session.role || !session.accountId) {
      return null;
    }

    return session.firebaseUid || null;
  }

  function showApp(session) {
    document.body.classList.remove('gate-pending');

    loginGate.style.display = 'none';

    if (adminClassControls) {
      adminClassControls.hidden = session.role !== 'admin';
    }
    if (adminClassSelect && session.role === 'admin') {
      adminClassSelect.value = sessionStorage.getItem(ADMIN_CLASS_KEY) || '';
    }

    sessionBadge.style.display = '';

    sessionName.textContent =
      session.name;

    document.dispatchEvent(
      new CustomEvent('aventra:login', {
        detail: session
      })
    );
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

    if (adminClassControls) adminClassControls.hidden = true;

    showLanding();
  }



  function setMode(newMode) {
    mode = newMode;

    if (classSelection) {
      classSelection.style.display = mode === 'admin' ? 'none' : '';
    }

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


  async function doLogin() {

    loginError.textContent = '';

    loginSubmit.disabled = true;

    loginSubmit.textContent =
      'Memeriksa...';


    try {

      let data;


      if (IS_LOCAL_DEV) {

        await new Promise((resolve) =>
          setTimeout(resolve, 250)
        );


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
            accountId: `admin:${loginAdminAccount?.value || 'wiarsayana'}`,
            expiry: Date.now() + 12 * 60 * 60 * 1000,
            name: loginAdminAccount?.selectedOptions?.[0]?.textContent || 'Admin'
          };

        }



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
            accountId: null,
            expiry: Date.now() + 12 * 60 * 60 * 1000,

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
            accountId: null,
            expiry: Date.now() + 12 * 60 * 60 * 1000,

            name:
              loginName.value.trim(),

            grade:
              selectedGrade,

            classId:
              selectedClassId
          };
        }


      }


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


      else {


        if (mode === 'student' && !selectedClassId) {

          loginError.textContent =
            'Pilih tingkat dan kelas yang akan digunakan terlebih dahulu.';

          return;
        }


        const body =
          mode === 'admin'

            ? {
                type:
                  'admin',

                adminId:
                  loginAdminAccount?.value || '',

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

      if (!data.firebaseCustomToken) {
        throw new Error('Token Firebase tidak diterima dari server.');
      }

      await firebaseAuth.signInWithCustomToken(
        data.firebaseCustomToken
      );

      if (data.role === 'admin') setAdminClassId(null, false);

      saveSession(data);

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

  loginSubmit.addEventListener(
    'click',
    doLogin
  );

  [
    loginName,
    loginPin,
    loginAdminAccount,
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
  logoutBtn.addEventListener(
    'click',
    async () => {

      document.dispatchEvent(
        new CustomEvent('aventra:logout')
      );

      clearSession();
      setAdminClassId(null, false);

      try {
        await firebaseAuth.signOut();
      } catch (err) {
        console.error('[auth] logout Firebase gagal:', err);
      }

      showLoginGate();

    }
  );

  const existing = getSession();

  if (existing) {
    firebaseAuth.onAuthStateChanged((user) => {
      if (
        user &&
        user.uid === expectedFirebaseUid(existing)
      ) {
        showApp(existing);
        return;
      }

      clearSession();
      if (user) {
        firebaseAuth.signOut().catch((err) =>
          console.error('[auth] pembersihan sesi tidak cocok gagal:', err)
        );
      }
      showLoginGate();
    }, (err) => {
      console.error('[auth] pemulihan sesi Firebase gagal:', err);
      clearSession();
      showLoginGate();
    });
  } else {
    if (firebaseAuth.currentUser) {
      firebaseAuth.signOut().catch((err) =>
        console.error('[auth] pembersihan sesi Firebase gagal:', err)
      );
    }

    showLoginGate();
  }

  window.AventraAuth = {

    getSession,

    getToken: () =>
      (getSession() || {}).token || null,

    getApiBase: () => API_BASE,

    getRole: () =>
      (getSession() || {}).role || null,

    getSelectedClassId: () => {
      const session = getSession();
      if (session?.role === 'admin') {
        return sessionStorage.getItem(ADMIN_CLASS_KEY) || null;
      }
      return session?.classId || null;
    },

    setAdminClassId,

    setMode
  };

})();
