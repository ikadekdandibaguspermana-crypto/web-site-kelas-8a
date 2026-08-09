// ================= FIREBASE / FIRESTORE =================
  const firebaseConfig = {
    apiKey: "AIzaSyAruYX883CuAYkes1Uq-eYt7ZgpWR0iUG4",
    authDomain: "ombak-nusantara.firebaseapp.com",
    projectId: "ombak-nusantara",
    storageBucket: "ombak-nusantara.firebasestorage.app",
    messagingSenderId: "874381163137",
    appId: "1:874381163137:web:c73d64a041fbab2b7c2b80",
    measurementId: "G-33TLT4ZE17"
  };
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  // Setiap tanggal = satu dokumen di koleksi "absensi", field = nama murid -> status (H/S/I/A)
  function absenDocRef(dateStr) { return db.collection('absensi').doc(dateStr); }

  // ================= AUTH / LOGIN GATE =================
  const ADMIN_PASSWORD = "admin554";
  const SESSION_KEY = "aventraSession";

  // PIN unik per anggota (angka acak 4 digit) — dipakai bersama nama saat login.
  // Ditampilkan di bawah setiap nama pada Daftar Anggota Kelas & struktur pengurus
  // supaya masing-masing tahu PIN mereka sendiri. Admin tidak memakai PIN ini.
  const studentPins = {
    "Ni Ketut Nindia Candra Dewi": "9837",
    "I Ketut Anna Ary Sudana Putra": "1553",
    "Luh Putu Laksmi Pradnyaswari": "6638",
    "I Made Bayu Pastika Putra": "3209",
    "I Gusti Ayu Kadek Sulaksmi": "1444",
    "I Gusti Lanang Agung Putra Wedhana": "4979",
    "Casey": "9144", "Redi": "4370", "Rizki": "1546", "Alit Payama": "8615",
    "Novi": "3212", "Ary": "2395",
    "Dek Adi": "9128", "Candra": "6884", "Dandi Bagus": "1921", "Prabu": "7768",
    "Alit": "8484", "Cipta": "7209", "David": "5795",
    "Resta": "3065", "Awan": "8164", "Diah": "2704",
    "Gus Dwik": "2892", "Cahya Aprianti": "2782",
    "April": "4882", "Meisya": "9932", "Rastia": "8169", "Mang Cahya": "1286",
    "Desita": "4883", "Damay": "5556", "Felii": "8277", "Aldo": "6544"
  };

  // Full roster used both for the "Daftar Anggota Kelas" grid and as the
  // master name list for login + absensi (kept in sync so the name typed
  // at login always matches a real row in absensi).
  const roster = [
    "Casey","Redi","Rizki","Alit Payama",
    "Novi","Ary",
    "Dek Adi","Candra","Dandi Bagus","Prabu",
    "Alit","Cipta","David",
    "Resta","Awan","Diah",
    "Gus Dwik","Cahya Aprianti",
    "April","Meisya","Rastia","Mang Cahya",
    "Desita","Damay","Felii","Aldo"
  ];

  // Pengurus inti — nama lengkap disamakan dengan kartu profil di atas
  // supaya nama yang dipakai untuk login = nama yang tampil di struktur kelas.
  const pengurus = [
    { name: "Ni Ketut Nindia Candra Dewi", jabatan: "Ketua Kelas" },
    { name: "I Ketut Anna Ary Sudana Putra", jabatan: "Wakil Ketua" },
    { name: "Luh Putu Laksmi Pradnyaswari", jabatan: "Sekretaris 1" },
    { name: "I Made Bayu Pastika Putra", jabatan: "Sekretaris 2" },
    { name: "I Gusti Ayu Kadek Sulaksmi", jabatan: "Bendahara 1" },
    { name: "I Gusti Lanang Agung Putra Wedhana", jabatan: "Bendahara 2" }
  ];

  const kelasLengkap = [
    ...pengurus,
    ...roster.map(name => ({ name, jabatan: "" }))
  ];

  function findStudentByName(typed) {
    const clean = typed.trim().toLowerCase();
    if (!clean) return null;
    return kelasLengkap.find(s => s.name.trim().toLowerCase() === clean) || null;
  }

  function loadSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
    catch (e) { return null; }
  }
  function saveSession(session) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
    catch (e) { /* storage unavailable */ }
  }
  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  const loginGate = document.getElementById('loginGate');
  const loginTitle = document.getElementById('loginTitle');
  const loginSub = document.getElementById('loginSub');
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

  let adminMode = false;

  loginToggle.addEventListener('click', () => {
    adminMode = !adminMode;
    loginError.textContent = '';
    if (adminMode) {
      loginTitle.textContent = 'Masuk sebagai Admin';
      loginSub.textContent = 'Masukkan password admin untuk akses penuh absensi.';
      loginFormStudent.style.display = 'none';
      loginFormAdmin.style.display = 'block';
      loginToggle.textContent = 'Masuk sebagai Murid';
      loginAdminPass.focus();
    } else {
      loginTitle.textContent = 'Masuk ke Aventra Class';
      loginSub.textContent = 'Masukkan nama dan PIN kamu persis seperti pada daftar absensi.';
      loginFormStudent.style.display = 'block';
      loginFormAdmin.style.display = 'none';
      loginToggle.textContent = 'Masuk sebagai Admin';
      loginName.focus();
    }
  });

  function doLogin() {
    loginError.textContent = '';
    if (adminMode) {
      if (loginAdminPass.value === ADMIN_PASSWORD) {
        saveSession({ role: 'admin', name: 'Admin' });
        enterSite();
      } else {
        loginError.textContent = 'Password admin salah.';
      }
    } else {
      const student = findStudentByName(loginName.value);
      if (!student) {
        loginError.textContent = 'Nama tidak ditemukan di daftar absensi. Periksa ejaan nama kamu.';
        return;
      }
      const correctPin = studentPins[student.name];
      if (correctPin && loginPin.value.trim() === correctPin) {
        saveSession({ role: 'student', name: student.name });
        enterSite();
      } else {
        loginError.textContent = 'PIN salah. Cek kembali PIN kamu di Daftar Anggota Kelas.';
      }
    }
  }
  loginSubmit.addEventListener('click', doLogin);
  loginName.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  loginPin.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  loginAdminPass.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  function enterSite() {
    const session = loadSession();
    loginGate.classList.add('hidden');
    sessionBadge.style.display = 'flex';
    sessionName.textContent = session.role === 'admin' ? 'Admin' : session.name;
    // Hanya admin yang boleh logout & berpindah akun. Murid yang sudah masuk
    // dengan nama+PIN mereka terkunci pada sesi itu sampai tab/browser ditutup.
    logoutBtn.style.display = session.role === 'admin' ? 'inline-block' : 'none';
    renderAbsensi();
  }

  logoutBtn.addEventListener('click', () => {
    const session = loadSession();
    if (!session || session.role !== 'admin') return; // jaga-jaga: murid tak bisa logout
    clearSession();
    loginGate.classList.remove('hidden');
    sessionBadge.style.display = 'none';
    loginName.value = '';
    loginPin.value = '';
    loginAdminPass.value = '';
  });

  // ---------- Roster grid (Daftar Anggota Kelas) ----------
  const rosterGrid = document.getElementById('rosterGrid');
  document.getElementById('rosterCount').textContent = roster.length;
  roster.forEach((name, i) => {
    const card = document.createElement('div');
    card.className = 'roster-card stagger-item';
    const num = String(i + 1).padStart(2, '0'); // nomor absen anggota, dimulai dari 01
    const pin = studentPins[name] || '----';
    card.innerHTML = `<div class="roster-id">${num}</div><div class="roster-info"><span>${name}</span><span class="roster-pin">PIN: ${pin}</span></div>`;
    rosterGrid.appendChild(card);
  });

  // ---------- PIN untuk kartu pengurus inti (markup sudah ada di HTML) ----------
  pengurus.forEach(p => {
    const pin = studentPins[p.name];
    if (!pin) return;
    const heading = Array.from(document.querySelectorAll('.lead-info h3, .officer-card h4'))
      .find(el => el.textContent.trim() === p.name);
    if (heading && !heading.nextElementSibling?.classList.contains('pin-tag')) {
      const tag = document.createElement('div');
      tag.className = 'pin-tag';
      tag.textContent = `PIN: ${pin}`;
      heading.insertAdjacentElement('afterend', tag);
    }
  });

  // ---------- Gallery placeholders ----------
  const galleryCaptions = [
    "Kerja Kelompok Proyek Sains",
    "Outing Class ke Museum",
    "Upacara Bendera Bersama",
    "Lomba 17 Agustus Antar Kelas",
    "Sesi Diskusi Pagi",
    "Kegiatan Kebersihan Kelas"
  ];
  const galleryGrid = document.getElementById('galleryGrid');
  galleryCaptions.forEach((cap, i) => {
    const item = document.createElement('div');
    item.className = 'g-item tilt stagger-item';
    item.setAttribute('data-caption', cap);
    item.innerHTML = `
      <div class="ph">
        <svg viewBox="0 0 24 24" fill="none" stroke="#f5f3ec" stroke-width="1.4"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-4-4 3-3-2-6 5"/></svg>
      </div>
      <div class="caption">${cap}</div>
    `;
    galleryGrid.appendChild(item);
  });

  // ---------- Lightbox ----------
  const lightbox = document.getElementById('lightbox');
  const lbLabel = document.getElementById('lbLabel');
  const lbCaption = document.getElementById('lbCaption');
  document.querySelectorAll('.g-item').forEach((item, i) => {
    item.addEventListener('click', () => {
      lbLabel.textContent = `FOTO-${String(i+1).padStart(2,'0')}.JPG`;
      lbCaption.textContent = item.getAttribute('data-caption') + " — ganti dengan foto asli kegiatan kelas.";
      lightbox.classList.add('open');
    });
  });
  document.getElementById('lbClose').addEventListener('click', () => lightbox.classList.remove('open'));
  lightbox.addEventListener('click', (e) => { if(e.target === lightbox) lightbox.classList.remove('open'); });

  document.getElementById('videoTrigger').addEventListener('click', () => {
    lbLabel.textContent = "VIDEO-KEGIATAN.MP4";
    lbCaption.textContent = "Tempatkan file <video> atau embed YouTube di sini untuk menampilkan video kegiatan kelas.";
    lightbox.classList.add('open');
  });

  // ---------- Navbar scroll state + parallax orbs ----------
  const navWrap = document.getElementById('navWrap');
  const orbOne = document.querySelector('.glow-orb.one');
  const orbTwo = document.querySelector('.glow-orb.two');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.addEventListener('scroll', () => {
    navWrap.classList.toggle('scrolled', window.scrollY > 40);
    if (!reduceMotion) {
      const y = window.scrollY;
      orbOne.style.transform = `translateY(${y * 0.12}px)`;
      orbTwo.style.transform = `translateY(${-y * 0.08}px)`;
    }
  }, { passive: true });

  // ---------- Mobile menu ----------
  const burgerBtn = document.getElementById('burgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  burgerBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    burgerBtn.classList.toggle('active');
  });
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    burgerBtn.classList.remove('active');
  }));

  // ---------- Hero cursor spotlight ----------
  const spotlight = document.getElementById('spotlight');
  const heroEl = document.getElementById('beranda');
  if (!reduceMotion && spotlight) {
    heroEl.addEventListener('mousemove', (e) => {
      const r = heroEl.getBoundingClientRect();
      spotlight.style.setProperty('--sx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      spotlight.style.setProperty('--sy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  }

  // ---------- Animated stat counters ----------
  document.querySelectorAll('.stat-chip b[data-count]').forEach(b => {
    const target = parseInt(b.getAttribute('data-count'), 10);
    if (reduceMotion) { b.textContent = target; return; }
    setTimeout(() => {
      const start = performance.now();
      const duration = 1100;
      function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        b.textContent = Math.round(eased * target);
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, 750);
  });

  // ---------- Tilt / magnetic hover on cards ----------
  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.tilt').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(700px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-3px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  // ---------- Staggered grid reveal ----------
  const staggerObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const items = entry.target.querySelectorAll('.stagger-item');
        items.forEach((item, i) => {
          item.style.transitionDelay = reduceMotion ? '0ms' : `${Math.min(i * 50, 480)}ms`;
          requestAnimationFrame(() => item.classList.add('in'));
        });
        staggerObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.stagger-container').forEach(c => staggerObs.observe(c));

  // ================= DAFTAR ABSENSI (real-time via Firestore) =================
  const absenMonthSelect = document.getElementById('absenMonth');
  const absenDateInput = document.getElementById('absenDate');
  const absenList = document.getElementById('absenList');
  const absenNote = document.getElementById('absenNote');
  const absenResetBtn = document.getElementById('absenReset');
  const absenSubText = document.getElementById('absenSubText');

  function todayStr() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  function pad2(n){ return String(n).padStart(2,'0'); }

  const bulanNama = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

  // Bulan tersedia: dari bulan berjalan sampai 1 tahun ke depan (12 bulan),
  // lalu terus bertambah otomatis tiap kali web dibuka jadi "selamanya" tidak
  // pernah kehabisan pilihan bulan.
  function buildMonthOptions() {
    const now = new Date();
    const startY = now.getFullYear(), startM = now.getMonth();
    const YEARS_AHEAD = 50; // jauh ke depan supaya praktis "selamanya"
    absenMonthSelect.innerHTML = '';
    for (let i = 0; i < 12 * YEARS_AHEAD; i++) {
      const y = startY + Math.floor((startM + i) / 12);
      const m = (startM + i) % 12;
      const opt = document.createElement('option');
      opt.value = `${y}-${pad2(m+1)}`;
      opt.textContent = `${bulanNama[m]} ${y}`;
      absenMonthSelect.appendChild(opt);
    }
    absenMonthSelect.value = `${startY}-${pad2(startM+1)}`;
  }
  buildMonthOptions();

  function clampDateToMonth(dateStr, monthVal) {
    const [y, m] = monthVal.split('-').map(Number);
    const [dy, dm] = dateStr.split('-').map(Number);
    if (dy === y && dm === m) return dateStr;
    const now = new Date();
    if (y === now.getFullYear() && (m - 1) === now.getMonth()) return todayStr();
    return `${y}-${pad2(m)}-01`;
  }

  absenDateInput.value = todayStr();

  absenMonthSelect.addEventListener('change', () => {
    absenDateInput.value = clampDateToMonth(absenDateInput.value, absenMonthSelect.value);
    renderAbsensi();
  });
  absenDateInput.addEventListener('change', () => {
    const val = absenDateInput.value || todayStr();
    absenMonthSelect.value = val.slice(0,7);
    renderAbsensi();
  });

  function currentSessionInfo() {
    const s = loadSession();
    if (!s) return { role: null, name: null };
    return s;
  }

  // Listener real-time Firestore untuk tanggal yang sedang aktif.
  let unsubscribeAbsen = null;
  let currentDayData = {};
  let listenerBusy = false;

  function renderAbsensi() {
    const session = currentSessionInfo();
    if (!session.role) return; // belum login, jangan render dulu

    const date = absenDateInput.value || todayStr();

    if (unsubscribeAbsen) { unsubscribeAbsen(); unsubscribeAbsen = null; }
    listenerBusy = true;
    absenNote.textContent = 'Menyambungkan ke server...';
    absenNote.classList.add('show');

    unsubscribeAbsen = absenDocRef(date).onSnapshot(
      (snap) => {
        listenerBusy = false;
        currentDayData = snap.exists ? snap.data() : {};
        paintAbsensi(date, session);
        absenNote.textContent = `Tersinkron otomatis · ${date}`;
        setTimeout(() => absenNote.classList.remove('show'), 1600);
      },
      (err) => {
        listenerBusy = false;
        console.error(err);
        absenNote.textContent = 'Gagal terhubung ke server. Cek koneksi internet.';
        absenNote.classList.add('show');
      }
    );
  }

  function paintAbsensi(date, session) {
    const dayData = currentDayData || {};
    const isAdmin = session.role === 'admin';
    absenSubText.textContent = isAdmin
      ? 'Admin dapat melihat & mengubah kehadiran seluruh murid secara real-time. Status tersimpan otomatis ke server setiap kali ditandai.'
      : `Kamu masuk sebagai ${session.name}. Kamu hanya bisa menandai kehadiranmu sendiri — status tersimpan otomatis ke server.`;

    rekapBtn.style.display = isAdmin ? 'inline-flex' : 'none';

    const visibleStudents = isAdmin
      ? kelasLengkap
      : kelasLengkap.filter(s => s.name.trim().toLowerCase() === session.name.trim().toLowerCase());

    absenList.innerHTML = '';
    visibleStudents.forEach((student) => {
      const globalIndex = kelasLengkap.findIndex(s => s.name === student.name);
      const isMe = !isAdmin && student.name.trim().toLowerCase() === session.name.trim().toLowerCase();
      const row = document.createElement('div');
      row.className = 'absen-row stagger-item in' + (isMe ? ' me' : '');
      const num = String(globalIndex + 1).padStart(2, '0');
      const current = dayData[student.name] || '';
      row.innerHTML = `
        <div class="absen-num">${num}</div>
        <div class="absen-name">
          <b>${student.name}</b>
          ${student.jabatan ? `<span>${student.jabatan}</span>` : ''}
        </div>
        <div class="absen-btns">
          <button class="absen-btn ${current==='H'?'active':''}" data-s="H">Hadir</button>
          <button class="absen-btn ${current==='S'?'active':''}" data-s="S">Sakit</button>
          <button class="absen-btn ${current==='I'?'active':''}" data-s="I">Izin</button>
          <button class="absen-btn ${current==='A'?'active':''}" data-s="A">Alpa</button>
        </div>
      `;
      row.querySelectorAll('.absen-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          // Murid hanya boleh mengubah barisnya sendiri; admin boleh semua.
          if (!isAdmin && !isMe) return;
          const status = btn.getAttribute('data-s');
          const newValue = dayData[student.name] === status
            ? firebase.firestore.FieldValue.delete()
            : status;
          btn.closest('.absen-btns').querySelectorAll('.absen-btn').forEach(b => b.disabled = true);
          try {
            await absenDocRef(date).set({ [student.name]: newValue }, { merge: true });
            flashSaved(date);
            // onSnapshot akan otomatis me-render ulang dengan data terbaru
          } catch (e) {
            console.error(e);
            alert('Gagal menyimpan absensi. Cek koneksi internet lalu coba lagi.');
            btn.closest('.absen-btns').querySelectorAll('.absen-btn').forEach(b => b.disabled = false);
          }
        });
      });
      absenList.appendChild(row);
    });
    updateSummary(dayData, isAdmin, session);
  }

  function updateSummary(dayData, isAdmin, session) {
    const scope = isAdmin ? kelasLengkap : kelasLengkap.filter(s => s.name.trim().toLowerCase() === session.name.trim().toLowerCase());
    const counts = { H: 0, S: 0, I: 0, A: 0 };
    scope.forEach(s => { if (dayData[s.name] && counts[dayData[s.name]] !== undefined) counts[dayData[s.name]]++; });
    const unset = scope.length - (counts.H + counts.S + counts.I + counts.A);
    document.getElementById('cntH').textContent = counts.H;
    document.getElementById('cntS').textContent = counts.S;
    document.getElementById('cntI').textContent = counts.I;
    document.getElementById('cntA').textContent = counts.A;
    document.getElementById('cntU').textContent = unset;
  }

  let flashTimer;
  function flashSaved(date) {
    absenNote.textContent = `Tersimpan otomatis ke server · ${date}`;
    absenNote.classList.add('show');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => absenNote.classList.remove('show'), 1600);
  }

  // ================= REKAP BULANAN =================
  const rekapBtn = document.getElementById('rekapBtn');
  const rekapModal = document.getElementById('rekapModal');
  const rekapClose = document.getElementById('rekapClose');
  const rekapTitle = document.getElementById('rekapTitle');
  const rekapLoading = document.getElementById('rekapLoading');
  const rekapTableWrap = document.getElementById('rekapTableWrap');
  const rekapTbody = document.getElementById('rekapTbody');
  const rekapEmpty = document.getElementById('rekapEmpty');
  const rekapDownload = document.getElementById('rekapDownload');
  const rekapDaysNote = document.getElementById('rekapDaysNote');

  let rekapCurrentData = null; // dipakai saat export CSV

  function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); } // m: 1-12

  async function openRekap() {
    const session = currentSessionInfo();
    if (session.role !== 'admin') return; // rekap hanya untuk admin

    const monthVal = absenMonthSelect.value; // format "YYYY-MM"
    const [y, m] = monthVal.split('-').map(Number);
    rekapTitle.textContent = `${bulanNama[m - 1]} ${y}`;
    rekapDaysNote.textContent = '';
    rekapCurrentData = null;

    rekapModal.classList.add('open');
    rekapLoading.style.display = 'block';
    rekapLoading.textContent = 'Memuat data...';
    rekapTableWrap.style.display = 'none';
    rekapEmpty.style.display = 'none';
    rekapDownload.disabled = true;

    const startId = `${monthVal}-01`;
    const endId = `${monthVal}-${pad2(daysInMonth(y, m))}`;

    try {
      const snap = await db.collection('absensi')
        .where(firebase.firestore.FieldPath.documentId(), '>=', startId)
        .where(firebase.firestore.FieldPath.documentId(), '<=', endId)
        .get();

      rekapLoading.style.display = 'none';

      if (snap.empty) {
        rekapEmpty.textContent = 'Belum ada data absensi tercatat pada bulan ini.';
        rekapEmpty.style.display = 'block';
        return;
      }

      const recordedDays = snap.size;
      const counts = {}; // nama -> {H,S,I,A}
      kelasLengkap.forEach(s => { counts[s.name] = { H: 0, S: 0, I: 0, A: 0 }; });

      snap.forEach(doc => {
        const dayData = doc.data();
        kelasLengkap.forEach(s => {
          const st = dayData[s.name];
          if (st && counts[s.name][st] !== undefined) counts[s.name][st]++;
        });
      });

      rekapTbody.innerHTML = '';
      const rowsForCsv = [];
      kelasLengkap.forEach((s, i) => {
        const c = counts[s.name];
        const tercatat = c.H + c.S + c.I + c.A;
        const belum = Math.max(recordedDays - tercatat, 0);
        const pct = recordedDays > 0 ? Math.round((c.H / recordedDays) * 100) : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${String(i + 1).padStart(2, '0')}</td>
          <td>${s.name}${s.jabatan ? ` <span class="rekap-jab">${s.jabatan}</span>` : ''}</td>
          <td class="c-h">${c.H}</td>
          <td class="c-s">${c.S}</td>
          <td class="c-i">${c.I}</td>
          <td class="c-a">${c.A}</td>
          <td>${belum}</td>
          <td>${pct}%</td>
        `;
        rekapTbody.appendChild(tr);
        rowsForCsv.push({ no: i + 1, nama: s.name, H: c.H, S: c.S, I: c.I, A: c.A, belum, pct });
      });

      rekapTableWrap.style.display = 'block';
      rekapDaysNote.textContent = `${recordedDays} hari tercatat dari ${daysInMonth(y, m)} hari total di bulan ini.`;
      rekapDownload.disabled = false;
      rekapCurrentData = {
        monthLabel: `${bulanNama[m - 1]}_${y}`.toLowerCase(),
        rows: rowsForCsv
      };
    } catch (e) {
      console.error(e);
      rekapLoading.style.display = 'none';
      rekapEmpty.textContent = 'Gagal memuat data rekap. Cek koneksi internet lalu coba lagi.';
      rekapEmpty.style.display = 'block';
    }
  }

  rekapBtn.addEventListener('click', openRekap);
  rekapClose.addEventListener('click', () => rekapModal.classList.remove('open'));
  rekapModal.addEventListener('click', (e) => { if (e.target === rekapModal) rekapModal.classList.remove('open'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') rekapModal.classList.remove('open'); });

  rekapDownload.addEventListener('click', () => {
    if (!rekapCurrentData) return;
    const header = ['No', 'Nama', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Belum Tercatat', '% Hadir'];
    const lines = [header.join(',')];
    rekapCurrentData.rows.forEach(r => {
      lines.push([r.no, `"${r.nama}"`, r.H, r.S, r.I, r.A, r.belum, `${r.pct}%`].join(','));
    });
    const csvContent = lines.join('\r\n');
    // \ufeff (BOM) supaya karakter tetap benar saat dibuka di Excel
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-absensi-${rekapCurrentData.monthLabel}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  absenResetBtn.addEventListener('click', async () => {
    const session = currentSessionInfo();
    if (session.role !== 'admin') { alert('Hanya admin yang dapat mereset data absensi.'); return; }
    const date = absenDateInput.value || todayStr();
    if (!confirm(`Hapus data absensi untuk tanggal ${date}?`)) return;
    try {
      await absenDocRef(date).delete();
    } catch (e) {
      console.error(e);
      alert('Gagal menghapus data. Cek koneksi internet.');
    }
  });

  // ---------- Cek sesi saat halaman dibuka ----------
  (function initSession() {
    const session = loadSession();
    if (session && (session.role === 'admin' || findStudentByName(session.name))) {
      enterSite();
    } else {
      clearSession();
      loginGate.classList.remove('hidden');
    }
  })();

  // ---------- Active link on scroll ----------
  const sections = document.querySelectorAll('section[id], header[id]');
  const navA = document.querySelectorAll('.nav-links a');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navA.forEach(a => a.classList.remove('active'));
        const match = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
        if (match) match.classList.add('active');
      }
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  sections.forEach(s => spy.observe(s));

  // ---------- Reveal on scroll ----------
  const revealEls = document.querySelectorAll('.reveal');
  const revealer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => revealer.observe(el));

  /* ============================================================
     FITUR TAMBAHAN — semua kode di bawah ini baru, tidak mengubah
     apa pun yang sudah ada di atas.
  ============================================================ */

  // ---------- Tema Terang / Gelap ----------
  const THEME_KEY = 'aventraTheme';
  const themeToggleBtn = document.getElementById('themeToggle');
  function applyTheme(theme) {
    document.body.classList.toggle('light-mode', theme === 'light');
    themeToggleBtn.textContent = theme === 'light' ? '☀️' : '🌙';
  }
  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    applyTheme(saved === 'light' ? 'light' : 'dark');
  })();
  themeToggleBtn.addEventListener('click', () => {
    const next = document.body.classList.contains('light-mode') ? 'dark' : 'light';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  });

  // ---------- Helper: tampilkan komponen khusus admin setelah login ----------
  function isCurrentlyAdmin() {
    const s = currentSessionInfo();
    return s.role === 'admin';
  }
  // Pengurus inti (Ketua/Wakil/Sekretaris/Bendahara) boleh kelola Pengumuman,
  // Jadwal, dan Agenda — tapi tetap seperti murid biasa untuk Absensi (hanya
  // tandai dirinya sendiri) dan tidak bisa akses Rekap/Reset Absensi (admin saja).
  function canManageInfo() {
    const s = currentSessionInfo();
    return s.role === 'admin' || s.role === 'pengurus';
  }


  // ================= PAPAN PENGUMUMAN =================
  const pengumumanComposer = document.getElementById('pengumumanComposer');
  const pengumumanInput = document.getElementById('pengumumanInput');
  const pengumumanSubmit = document.getElementById('pengumumanSubmit');
  const pengumumanList = document.getElementById('pengumumanList');
  const pengumumanEmpty = document.getElementById('pengumumanEmpty');

  function formatTanggalWaktu(d) {
    let dateObj = null;
    if (d && d.createdAt && d.createdAt.toDate) dateObj = d.createdAt.toDate();
    else if (d && d.createdAtMs) dateObj = new Date(d.createdAtMs);
    if (!dateObj) return 'Baru saja';
    return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) +
      ' · ' + dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  function renderPengumuman(snap) {
    pengumumanList.innerHTML = '';
    if (snap.empty) {
      pengumumanEmpty.style.display = 'block';
      return;
    }
    pengumumanEmpty.style.display = 'none';
    const admin = canManageInfo();
    snap.forEach(doc => {
      const d = doc.data();
      const item = document.createElement('div');
      item.className = 'pengumuman-item stagger-item in';
      item.innerHTML = `
        <div class="pu-dot"></div>
        <div class="pu-body">
          <div class="pu-text"></div>
          <div class="pu-meta">${formatTanggalWaktu(d)}</div>
        </div>
        ${admin ? '<button class="pu-del">Hapus</button>' : ''}
      `;
      item.querySelector('.pu-text').textContent = d.text || '';
      if (admin) {
        item.querySelector('.pu-del').addEventListener('click', async () => {
          if (!confirm('Hapus pengumuman ini?')) return;
          try { await db.collection('pengumuman').doc(doc.id).delete(); }
          catch (e) { console.error(e); alert('Gagal menghapus pengumuman: ' + (e && e.message ? e.message : e)); }
        });
      }
      pengumumanList.appendChild(item);
    });
  }

  function listenPengumuman() {
    db.collection('pengumuman').orderBy('createdAtMs', 'desc').limit(50)
      .onSnapshot(renderPengumuman, (err) => console.error('pengumuman:', err));
  }

  pengumumanSubmit.addEventListener('click', async () => {
    if (!canManageInfo()) return;
    const text = pengumumanInput.value.trim();
    if (!text) return;
    pengumumanSubmit.disabled = true;
    try {
      await db.collection('pengumuman').add({
        text,
        createdAtMs: Date.now(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      pengumumanInput.value = '';
    } catch (e) {
      console.error(e);
      alert('Gagal mengirim pengumuman: ' + (e && e.message ? e.message : e));
    }
    pengumumanSubmit.disabled = false;
  });

  // ================= JADWAL PELAJARAN =================
  const jadwalGrid = document.getElementById('jadwalGrid');
  const jadwalSubText = document.getElementById('jadwalSubText');
  const hariList = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  function jadwalDocRef() { return db.collection('jadwal').doc('mingguan'); }
  let jadwalCurrentData = {};

  function renderJadwal() {
    const admin = canManageInfo();
    jadwalSubText.textContent = admin
      ? 'Klik "+" untuk menambah mata pelajaran pada tiap hari. Tersimpan otomatis ke server.'
      : 'Jadwal mata pelajaran mingguan kelas Aventra. Tersinkron otomatis ke semua perangkat.';
    jadwalGrid.innerHTML = '';
    hariList.forEach(hari => {
      const entries = (jadwalCurrentData[hari] || []);
      const col = document.createElement('div');
      col.className = 'jadwal-day stagger-item in';
      let entriesHtml = '';
      if (entries.length === 0) {
        entriesHtml = '<span class="jadwal-empty-day">Belum ada jadwal</span>';
      } else {
        entriesHtml = entries.map((e, i) => `
          <div class="jadwal-entry">
            <span><span class="je-time">${e.waktu || ''}</span><span class="je-subject">${e.mapel || ''}</span></span>
            ${admin ? `<button class="je-del" data-hari="${hari}" data-idx="${i}">✕</button>` : ''}
          </div>
        `).join('');
      }
      col.innerHTML = `
        <h4>${hari}</h4>
        ${entriesHtml}
        ${admin ? `
          <div class="jadwal-add-row">
            <input type="text" class="je-time-input" placeholder="07:00" data-hari="${hari}">
            <input type="text" class="je-subject-input" placeholder="Mapel" data-hari="${hari}">
            <button class="jadwal-add-btn" data-hari="${hari}">+</button>
          </div>
        ` : ''}
      `;
      jadwalGrid.appendChild(col);
    });

    if (admin) {
      jadwalGrid.querySelectorAll('.je-del').forEach(btn => {
        btn.addEventListener('click', async () => {
          const hari = btn.getAttribute('data-hari');
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          const updated = (jadwalCurrentData[hari] || []).slice();
          updated.splice(idx, 1);
          try { await jadwalDocRef().set({ [hari]: updated }, { merge: true }); }
          catch (e) { console.error(e); alert('Gagal menghapus jadwal: ' + (e && e.message ? e.message : e)); }
        });
      });
      jadwalGrid.querySelectorAll('.jadwal-add-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const hari = btn.getAttribute('data-hari');
          const timeInput = jadwalGrid.querySelector(`.je-time-input[data-hari="${hari}"]`);
          const subjInput = jadwalGrid.querySelector(`.je-subject-input[data-hari="${hari}"]`);
          const mapel = subjInput.value.trim();
          if (!mapel) return;
          const waktu = timeInput.value.trim();
          const updated = (jadwalCurrentData[hari] || []).concat([{ waktu, mapel }]);
          btn.disabled = true;
          try {
            await jadwalDocRef().set({ [hari]: updated }, { merge: true });
            timeInput.value = ''; subjInput.value = '';
          } catch (e) { console.error(e); alert('Gagal menambah jadwal: ' + (e && e.message ? e.message : e)); }
          btn.disabled = false;
        });
      });
    }
  }

  function listenJadwal() {
    jadwalDocRef().onSnapshot(snap => {
      jadwalCurrentData = snap.exists ? snap.data() : {};
      renderJadwal();
    }, err => console.error('jadwal:', err));
  }

  // ================= AGENDA KELAS =================
  const agendaComposer = document.getElementById('agendaComposer');
  const agendaTitleInput = document.getElementById('agendaTitleInput');
  const agendaDateInput = document.getElementById('agendaDateInput');
  const agendaNoteInput = document.getElementById('agendaNoteInput');
  const agendaSubmit = document.getElementById('agendaSubmit');
  const agendaList = document.getElementById('agendaList');
  const agendaEmpty = document.getElementById('agendaEmpty');
  const bulanSingkat = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

  function renderAgenda(snap) {
    agendaList.innerHTML = '';
    if (snap.empty) {
      agendaEmpty.style.display = 'block';
      return;
    }
    agendaEmpty.style.display = 'none';
    const admin = canManageInfo();
    const todayId = todayStr();
    snap.forEach(doc => {
      const d = doc.data();
      const isPast = d.date && d.date < todayId;
      const dateParts = (d.date || '').split('-'); // YYYY-MM-DD
      const dayNum = dateParts[2] || '--';
      const monLabel = dateParts[1] ? bulanSingkat[parseInt(dateParts[1], 10) - 1] : '';
      const item = document.createElement('div');
      item.className = 'agenda-item stagger-item in' + (isPast ? ' past' : '');
      item.innerHTML = `
        <div class="agenda-date"><span class="ag-day">${dayNum}</span>${monLabel}</div>
        <div class="agenda-body">
          <h4></h4>
          <p></p>
        </div>
        ${admin ? '<button class="agenda-del">Hapus</button>' : ''}
      `;
      item.querySelector('h4').textContent = d.title || '';
      item.querySelector('p').textContent = d.note || '';
      if (admin) {
        item.querySelector('.agenda-del').addEventListener('click', async () => {
          if (!confirm('Hapus agenda ini?')) return;
          try { await db.collection('agenda').doc(doc.id).delete(); }
          catch (e) { console.error(e); alert('Gagal menghapus agenda: ' + (e && e.message ? e.message : e)); }
        });
      }
      agendaList.appendChild(item);
    });
  }

  function listenAgenda() {
    db.collection('agenda').orderBy('date', 'asc').limit(100)
      .onSnapshot(renderAgenda, err => console.error('agenda:', err));
  }

  agendaSubmit.addEventListener('click', async () => {
    if (!canManageInfo()) return;
    const title = agendaTitleInput.value.trim();
    const date = agendaDateInput.value;
    const note = agendaNoteInput.value.trim();
    if (!title || !date) { alert('Judul dan tanggal agenda wajib diisi.'); return; }
    agendaSubmit.disabled = true;
    try {
      await db.collection('agenda').add({
        title, date, note,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      agendaTitleInput.value = ''; agendaNoteInput.value = ''; agendaDateInput.value = '';
    } catch (e) {
      console.error(e);
      alert('Gagal menambah agenda: ' + (e && e.message ? e.message : e));
    }
    agendaSubmit.disabled = false;
  });

  // ---------- Tampilkan composer khusus admin/pengurus & mulai listener setelah login ----------
  const _originalEnterSite = enterSite;
  function enterSiteWithExtras() {
    _originalEnterSite();
    const manage = canManageInfo();
    pengumumanComposer.style.display = manage ? 'flex' : 'none';
    agendaComposer.style.display = manage ? 'flex' : 'none';
    listenPengumuman();
    listenJadwal();
    listenAgenda();
  }
  // Nama pengurus inti (dari array `pengurus` yang sudah ada) dipakai untuk
  // menandai sesi mereka sebagai role 'pengurus' saat login — dapat akses
  // kelola Pengumuman/Jadwal/Agenda, tapi tetap seperti murid biasa untuk
  // Absensi (hanya bisa tandai dirinya sendiri, tidak bisa rekap/reset).
  const pengurusNameSet = new Set(pengurus.map(p => p.name.trim().toLowerCase()));
  // Sambungkan ulang tombol login & init-session supaya memakai versi "with extras"
  // tanpa mengubah fungsi enterSite asli maupun listener yang sudah terpasang.
  loginSubmit.removeEventListener('click', doLogin);
  function doLoginWithExtras() {
    loginError.textContent = '';
    if (adminMode) {
      if (loginAdminPass.value === ADMIN_PASSWORD) {
        saveSession({ role: 'admin', name: 'Admin' });
        enterSiteWithExtras();
      } else {
        loginError.textContent = 'Password admin salah.';
      }
    } else {
      const student = findStudentByName(loginName.value);
      if (!student) {
        loginError.textContent = 'Nama tidak ditemukan di daftar absensi. Periksa ejaan nama kamu.';
        return;
      }
      const correctPin = studentPins[student.name];
      if (correctPin && loginPin.value.trim() === correctPin) {
        const role = pengurusNameSet.has(student.name.trim().toLowerCase()) ? 'pengurus' : 'student';
        saveSession({ role, name: student.name });
        enterSiteWithExtras();
      } else {
        loginError.textContent = 'PIN salah. Cek kembali PIN kamu di Daftar Anggota Kelas.';
      }
    }
  }
  loginSubmit.addEventListener('click', doLoginWithExtras);
  // Menekan Enter pada input login memanggil `doLogin()` (baris asli, tidak diubah).
  // Karena deklarasi function membuat binding yang bisa ditimpa, arahkan ulang
  // agar tekan-Enter juga memicu fitur tambahan (pengumuman/jadwal/agenda).
  doLogin = doLoginWithExtras;
  enterSite = enterSiteWithExtras;

  // Jika sesi sudah aktif saat halaman dimuat (initSession sudah memanggil
  // enterSite asli di atas), pastikan fitur tambahan tetap menyala juga.
  if (loadSession()) {
    const manage = canManageInfo();
    pengumumanComposer.style.display = manage ? 'flex' : 'none';
    agendaComposer.style.display = manage ? 'flex' : 'none';
    listenPengumuman();
    listenJadwal();
    listenAgenda();
  }

  // ================= EXPORT PDF (tambahan di modal Rekap Bulanan) =================
  const rekapDownloadPdfBtn = document.getElementById('rekapDownloadPdf');
  const _origOpenRekap = openRekap;
  rekapBtn.removeEventListener('click', openRekap);
  rekapBtn.addEventListener('click', async () => {
    await _origOpenRekap();
    rekapDownloadPdfBtn.disabled = !rekapCurrentData;
  });

  rekapDownloadPdfBtn.addEventListener('click', () => {
    if (!rekapCurrentData || !window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Rekap Absensi - Aventra Class', 14, 16);
    doc.setFontSize(10);
    doc.text(rekapTitle.textContent, 14, 23);
    doc.autoTable({
      startY: 28,
      head: [['No', 'Nama', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Belum', '% Hadir']],
      body: rekapCurrentData.rows.map(r => [r.no, r.nama, r.H, r.S, r.I, r.A, r.belum, `${r.pct}%`]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [242, 183, 5], textColor: [10, 13, 26] }
    });
    doc.save(`rekap-absensi-${rekapCurrentData.monthLabel}.pdf`);
  });
