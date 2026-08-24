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

// ================= AUTH / SESSION =================
// PENTING: Login (nama+PIN murid / password admin) SEPENUHNYA ditangani
// oleh js/auth.js, yang mengeceknya lewat server (Netlify Function).
// File ini TIDAK PERNAH menyimpan atau membaca PIN/password mentah --
// file ini hanya membaca status sesi yang sudah berhasil login lewat
// window.AventraAuth (disediakan oleh auth.js).

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

const pengurusNameSet = new Set(pengurus.map(p => p.name.trim().toLowerCase()));

// Baca status login dari auth.js. Mengembalikan role 'admin', 'pengurus',
// 'student', atau null kalau belum login. 'pengurus' dipakai untuk kartu
// pengurus inti supaya mereka bisa kelola Pengumuman/Jadwal/Agenda, tapi
// tetap seperti murid biasa untuk Absensi (hanya tandai dirinya sendiri).
function currentSessionInfo() {
  const s = window.AventraAuth ? window.AventraAuth.getSession() : null;
  if (!s || !s.role) return { role: null, name: null };
  if (s.role === 'admin') return { role: 'admin', name: 'Admin' };
  const role = pengurusNameSet.has((s.name || '').trim().toLowerCase()) ? 'pengurus' : 'student';
  return { role, name: s.name };
}

function isCurrentlyAdmin() {
  return currentSessionInfo().role === 'admin';
}
function canManageInfo() {
  const r = currentSessionInfo().role;
  return r === 'admin' || r === 'pengurus';
}

// ---------- Roster grid (Daftar Anggota Kelas) ----------
// CATATAN KEAMANAN: PIN murid TIDAK ditampilkan di sini lagi (dan di
// mana pun di halaman ini). Menampilkan PIN dalam bentuk teks di halaman
// -- walau di balik login sekalipun -- membuatnya bisa dibaca lewat
// Inspect/DevTools oleh siapa saja yang membuka halaman ini, persis
// seperti masalah keamanan yang sedang kita perbaiki. Kalau ada murid
// lupa PIN, itu hanya bisa dicek/diubah langsung oleh admin lewat
// Netlify Environment Variables, bukan ditampilkan di web.
const rosterGrid = document.getElementById('rosterGrid');
document.getElementById('rosterCount').textContent = roster.length;
roster.forEach((name, i) => {
  const card = document.createElement('div');
  card.className = 'roster-card stagger-item';
  const num = String(i + 1).padStart(2, '0'); // nomor absen anggota, dimulai dari 01
  card.innerHTML = `<div class="roster-id">${num}</div><div class="roster-info"><span>${name}</span></div>`;
  rosterGrid.appendChild(card);
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
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function pad2(n){ return String(n).padStart(2,'0'); }

const bulanNama = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

// Bulan tersedia: dari bulan berjalan sampai jauh ke depan, supaya
// praktis "selamanya" tidak pernah kehabisan pilihan bulan.
function buildMonthOptions() {
  const now = new Date();
  const startY = now.getFullYear(), startM = now.getMonth();
  const YEARS_AHEAD = 50;
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

// Kalau tab dibiarkan terbuka melewati tengah malam, otomatis majukan
// tanggal ke "hari ini" yang baru.
let lastKnownToday = todayStr();
setInterval(() => {
  const nowToday = todayStr();
  if (nowToday !== lastKnownToday) {
    const wasOnToday = absenDateInput.value === lastKnownToday;
    lastKnownToday = nowToday;
    if (wasOnToday) {
      absenDateInput.value = nowToday;
      absenMonthSelect.value = nowToday.slice(0, 7);
      renderAbsensi();
    }
  }
}, 60000);

absenMonthSelect.addEventListener('change', () => {
  absenDateInput.value = clampDateToMonth(absenDateInput.value, absenMonthSelect.value);
  renderAbsensi();
});
absenDateInput.addEventListener('change', () => {
  const val = absenDateInput.value || todayStr();
  absenMonthSelect.value = val.slice(0,7);
  renderAbsensi();
});

// Listener real-time Firestore untuk tanggal yang sedang aktif.
let unsubscribeAbsen = null;
let currentDayData = {};

function renderAbsensi() {
  const session = currentSessionInfo();
  if (!session.role) return; // belum login, jangan render dulu

  const date = absenDateInput.value || todayStr();

  if (unsubscribeAbsen) { unsubscribeAbsen(); unsubscribeAbsen = null; }
  absenNote.textContent = 'Menyambungkan ke server...';
  absenNote.classList.add('show');

  unsubscribeAbsen = absenDocRef(date).onSnapshot(
    (snap) => {
      currentDayData = snap.exists ? snap.data() : {};
      paintAbsensi(date, session);
      absenNote.textContent = `Tersinkron otomatis · ${date}`;
      setTimeout(() => absenNote.classList.remove('show'), 1600);
    },
    (err) => {
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
  updateGeoPanels(date, session);
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
const rekapDownloadPdfBtn = document.getElementById('rekapDownloadPdf');

let rekapCurrentData = null; // dipakai saat export CSV/PDF

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
  rekapDownloadPdfBtn.disabled = true;

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
    rekapDownloadPdfBtn.disabled = false;
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
  snap.forEach((doc, i) => {
    const d = doc.data();
    const item = document.createElement('div');
    item.className = 'pengumuman-item';
    item.style.transitionDelay = Math.min(i * 40, 320) + 'ms';
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
  requestAnimationFrame(() => {
    pengumumanList.querySelectorAll('.pengumuman-item').forEach(el => el.classList.add('in'));
  });
}

let unsubscribePengumuman = null;
function listenPengumuman() {
  if (unsubscribePengumuman) return; // sudah jalan, jangan dobel
  unsubscribePengumuman = db.collection('pengumuman').orderBy('createdAtMs', 'desc').limit(50)
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
  hariList.forEach((hari, colIdx) => {
    const entries = (jadwalCurrentData[hari] || []);
    const col = document.createElement('div');
    col.className = 'jadwal-day';
    col.style.transitionDelay = (colIdx * 60) + 'ms';
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
  requestAnimationFrame(() => {
    jadwalGrid.querySelectorAll('.jadwal-day').forEach(el => el.classList.add('in'));
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

let unsubscribeJadwal = null;
function listenJadwal() {
  if (unsubscribeJadwal) return;
  unsubscribeJadwal = jadwalDocRef().onSnapshot(snap => {
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
  snap.forEach((doc, i) => {
    const d = doc.data();
    const isPast = d.date && d.date < todayId;
    const dateParts = (d.date || '').split('-'); // YYYY-MM-DD
    const dayNum = dateParts[2] || '--';
    const monLabel = dateParts[1] ? bulanSingkat[parseInt(dateParts[1], 10) - 1] : '';
    const item = document.createElement('div');
    item.className = 'agenda-item' + (isPast ? ' past' : '');
    item.style.transitionDelay = Math.min(i * 40, 320) + 'ms';
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
  requestAnimationFrame(() => {
    agendaList.querySelectorAll('.agenda-item').forEach(el => el.classList.add('in'));
  });
}

let unsubscribeAgenda = null;
function listenAgenda() {
  if (unsubscribeAgenda) return;
  unsubscribeAgenda = db.collection('agenda').orderBy('date', 'asc').limit(100)
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

// ================= ABSEN OTOMATIS GPS (GEOFENCE) =================
// Admin mengatur satu titik lokasi + radius sekolah (koleksi Firestore
// "settings", dokumen "geofence"). Siswa yang bertahan di dalam radius
// itu selama N menit akan otomatis tercatat Hadir untuk tanggal hari ini.
const geoAdminBox = document.getElementById('geoAdminBox');
const geoStudentBox = document.getElementById('geoStudentBox');
const geoLatInput = document.getElementById('geoLat');
const geoLngInput = document.getElementById('geoLng');
const geoRadiusInput = document.getElementById('geoRadius');
const geoMinutesInput = document.getElementById('geoMinutes');
const geoUseLocationBtn = document.getElementById('geoUseLocation');
const geoSaveSettingsBtn = document.getElementById('geoSaveSettings');
const geoAdminStatus = document.getElementById('geoAdminStatus');
const geoActivateBtn = document.getElementById('geoActivateBtn');
const geoStopBtn = document.getElementById('geoStopBtn');
const geoStatusLine = document.getElementById('geoStatusLine');

let geofenceSettings = null; // {lat,lng,radius,minutes}
let geoWatchId = null;
let geoInsideSince = null;
let geoCountdownTimer = null;
let geoFirstFixTimer = null;

function geofenceDocRef() { return db.collection('settings').doc('geofence'); }

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let unsubscribeGeofence = null;
function listenGeofenceSettings() {
  if (unsubscribeGeofence) return;
  unsubscribeGeofence = geofenceDocRef().onSnapshot(snap => {
    geofenceSettings = snap.exists ? snap.data() : null;
    if (geofenceSettings) {
      geoLatInput.value = geofenceSettings.lat != null ? geofenceSettings.lat.toFixed(6) : '';
      geoLngInput.value = geofenceSettings.lng != null ? geofenceSettings.lng.toFixed(6) : '';
      geoRadiusInput.value = geofenceSettings.radius || 120;
      geoMinutesInput.value = geofenceSettings.minutes || 3;
    } else {
      if (!geoRadiusInput.value) geoRadiusInput.value = 120;
      if (!geoMinutesInput.value) geoMinutesInput.value = 3;
    }
  }, err => console.error('geofence settings:', err));
}

geoUseLocationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) { alert('Perangkat/browser ini tidak mendukung deteksi lokasi.'); return; }
  geoAdminStatus.textContent = 'Mendeteksi lokasi...';
  navigator.geolocation.getCurrentPosition(
    pos => {
      geoLatInput.value = pos.coords.latitude.toFixed(6);
      geoLngInput.value = pos.coords.longitude.toFixed(6);
      const acc = Math.round(pos.coords.accuracy);
      if (acc > 300) {
        geoAdminStatus.innerHTML = `⚠️ Akurasi lemah (±${acc}m) — kemungkinan besar perangkat ini tidak punya GPS asli (laptop/PC hanya menebak dari WiFi). Sebaiknya ulangi langkah ini pakai HP sambil berdiri di sekolah, baru klik Simpan.`;
        geoAdminStatus.style.color = 'var(--gold-soft)';
      } else {
        geoAdminStatus.innerHTML = `Lokasi terdeteksi (akurasi ±${acc}m). Klik Simpan Pengaturan.`;
        geoAdminStatus.style.color = '';
      }
    },
    err => {
      geoAdminStatus.textContent = 'Gagal mendeteksi lokasi: ' + (err && err.message ? err.message : 'izin ditolak.');
    },
    { enableHighAccuracy: true, timeout: 15000 }
  );
});

geoSaveSettingsBtn.addEventListener('click', async () => {
  const lat = parseFloat(geoLatInput.value);
  const lng = parseFloat(geoLngInput.value);
  const radius = parseInt(geoRadiusInput.value, 10) || 120;
  const minutes = parseInt(geoMinutesInput.value, 10) || 3;
  if (isNaN(lat) || isNaN(lng)) {
    alert('Klik "Pakai Lokasi Saya Sekarang" dulu sambil berdiri di area sekolah.');
    return;
  }
  geoSaveSettingsBtn.disabled = true;
  try {
    await geofenceDocRef().set({ lat, lng, radius, minutes });
    geoAdminStatus.textContent = 'Tersimpan ✓';
    setTimeout(() => { geoAdminStatus.textContent = ''; }, 3000);
  } catch (e) {
    console.error(e);
    alert('Gagal menyimpan pengaturan lokasi: ' + (e && e.message ? e.message : e));
  }
  geoSaveSettingsBtn.disabled = false;
});

function setGeoStatus(msg, type) {
  geoStatusLine.textContent = msg;
  geoStatusLine.className = 'geo-status-line show' + (type ? ' ' + type : '');
}

function stopGeoWatch(clearMsg) {
  if (geoWatchId !== null) {
    navigator.geolocation.clearWatch(geoWatchId);
    geoWatchId = null;
  }
  if (geoFirstFixTimer) { clearTimeout(geoFirstFixTimer); geoFirstFixTimer = null; }
  geoInsideSince = null;
  if (geoCountdownTimer) { clearInterval(geoCountdownTimer); geoCountdownTimer = null; }
  geoActivateBtn.style.display = 'inline-flex';
  geoStopBtn.style.display = 'none';
  if (clearMsg) geoStatusLine.classList.remove('show');
}

async function finishAutoAbsen(session) {
  stopGeoWatch(false);
  const date = todayStr();
  try {
    await absenDocRef(date).set({ [session.name]: 'H' }, { merge: true });
    setGeoStatus('🎉 Absen otomatis berhasil! Kamu tercatat Hadir.', 'success');
  } catch (e) {
    console.error(e);
    setGeoStatus('Gagal menyimpan absen otomatis, coba lagi: ' + (e && e.message ? e.message : e), 'err');
  }
}

function tickCountdown() {
  if (!geofenceSettings || geoInsideSince === null) return;
  const minutesRequired = geofenceSettings.minutes || 3;
  const elapsedMs = Date.now() - geoInsideSince;
  const remainingMs = Math.max(minutesRequired * 60000 - elapsedMs, 0);
  if (remainingMs <= 0) {
    finishAutoAbsen(currentSessionInfo());
    return;
  }
  const remMin = Math.floor(remainingMs / 60000);
  const remSec = Math.floor((remainingMs % 60000) / 1000);
  setGeoStatus(`✅ Terdeteksi di area sekolah — tunggu ${remMin}:${String(remSec).padStart(2, '0')} lagi tanpa keluar area...`, 'ok');
}

function handleGeoPosition(pos) {
  if (geoFirstFixTimer) { clearTimeout(geoFirstFixTimer); geoFirstFixTimer = null; }
  if (!geofenceSettings || geofenceSettings.lat == null) {
    setGeoStatus('Lokasi sekolah belum diatur oleh admin.', 'warn');
    stopGeoWatch(false);
    return;
  }
  const dist = haversineMeters(pos.coords.latitude, pos.coords.longitude, geofenceSettings.lat, geofenceSettings.lng);
  const radius = geofenceSettings.radius || 120;
  const acc = Math.round(pos.coords.accuracy || 0);
  if (dist <= radius) {
    if (geoInsideSince === null) geoInsideSince = Date.now();
    tickCountdown();
  } else {
    if (geoInsideSince !== null) {
      geoInsideSince = null;
      setGeoStatus('📍 Kamu terdeteksi keluar area sekolah — hitungan dibatalkan. Kembali ke area sekolah untuk mulai ulang otomatis.', 'warn');
    } else {
      setGeoStatus(`Belum berada di area sekolah (jarak ±${Math.round(dist)}m dari titik sekolah, akurasi GPS ±${acc}m).`, 'warn');
    }
  }
}

function handleGeoError(err) {
  let msg = 'Gagal mendeteksi lokasi.';
  if (err && err.code === 1) msg = 'Izin lokasi ditolak. Aktifkan izin lokasi untuk browser ini di pengaturan HP, lalu coba lagi.';
  else if (err && err.code === 2) msg = 'Lokasi tidak tersedia. Pastikan GPS/Lokasi HP menyala.';
  else if (err && err.code === 3) msg = 'Waktu deteksi lokasi habis. Coba lagi.';
  setGeoStatus(msg, 'err');
  stopGeoWatch(false);
}

geoActivateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) { alert('Perangkat/browser ini tidak mendukung deteksi lokasi.'); return; }
  if (!geofenceSettings || geofenceSettings.lat == null) {
    alert('Lokasi sekolah belum diatur oleh admin. Minta admin mengatur lokasi dulu di halaman Absensi.');
    return;
  }
  geoActivateBtn.style.display = 'none';
  geoStopBtn.style.display = 'inline-block';
  setGeoStatus('Meminta izin lokasi...', 'warn');
  geoFirstFixTimer = setTimeout(() => {
    setGeoStatus('Masih mencari sinyal GPS... ini wajar sampai 30 detik, terutama di dalam ruangan. Coba pindah lebih dekat jendela/luar ruangan kalau terlalu lama.', 'warn');
  }, 6000);
  geoWatchId = navigator.geolocation.watchPosition(handleGeoPosition, handleGeoError, {
    enableHighAccuracy: true, maximumAge: 5000, timeout: 30000
  });
  geoCountdownTimer = setInterval(tickCountdown, 1000);
});

geoStopBtn.addEventListener('click', () => stopGeoWatch(true));

function updateGeoPanels(date, session) {
  const isAdmin = session.role === 'admin';
  geoAdminBox.style.display = isAdmin ? 'block' : 'none';
  if (isAdmin) {
    geoStudentBox.style.display = 'none';
    return;
  }
  const isToday = date === todayStr();
  const alreadySet = !!(currentDayData && currentDayData[session.name]);
  if (isToday && !alreadySet) {
    geoStudentBox.style.display = 'block';
  } else {
    geoStudentBox.style.display = 'none';
    if (alreadySet) stopGeoWatch(true);
  }
}

// ================= HUBUNGKAN KE STATUS LOGIN (auth.js) =================
// auth.js mengurus login/logout & tampil-sembunyi gerbang login. File ini
// cukup "dengar" event dari auth.js untuk menyalakan/mematikan fitur yang
// butuh sesi (absensi, pengumuman, jadwal, agenda, geofence).

function onSessionActive() {
  const session = currentSessionInfo();
  if (!session.role) return;
  const manage = canManageInfo();
  pengumumanComposer.style.display = manage ? 'flex' : 'none';
  agendaComposer.style.display = manage ? 'flex' : 'none';
  renderAbsensi();
  listenPengumuman();
  listenJadwal();
  listenAgenda();
  listenGeofenceSettings();
}

function onSessionEnded() {
  if (unsubscribeAbsen) { unsubscribeAbsen(); unsubscribeAbsen = null; }
  if (unsubscribePengumuman) { unsubscribePengumuman(); unsubscribePengumuman = null; }
  if (unsubscribeJadwal) { unsubscribeJadwal(); unsubscribeJadwal = null; }
  if (unsubscribeAgenda) { unsubscribeAgenda(); unsubscribeAgenda = null; }
  if (unsubscribeGeofence) { unsubscribeGeofence(); unsubscribeGeofence = null; }
  stopGeoWatch(true);
}

document.addEventListener('aventra:login', onSessionActive);
document.addEventListener('aventra:logout', onSessionEnded);

// Kalau saat script.js ini jalan ternyata sesi sudah aktif (misalnya
// halaman baru saja di-refresh dan auth.js sudah menemukan sesi lama
// yang masih berlaku), langsung nyalakan fitur-fitur di atas juga.
if (window.AventraAuth && window.AventraAuth.getSession()) {
  onSessionActive();
}