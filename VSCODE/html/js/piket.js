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
function piketDocRef() { return db.collection('piket').doc('mingguan'); }

function getCurrentRole() {
  try {
    const raw = sessionStorage.getItem('aventra_session');
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.token || !data.expiry || Date.now() > data.expiry) return null;
    return data.role || null;
  } catch (e) {
    return null;
  }
}
const isAdmin = getCurrentRole() === 'admin';

document.getElementById('piketSubText').textContent = isAdmin
  ? 'Kamu masuk sebagai Admin -- bisa menambah, menandai selesai, dan menghapus jadwal piket.'
  : 'Cek siapa piket hari ini, dan tandai kalau tugasnya udah beres.';
document.getElementById('piketControls').style.display = isAdmin ? 'flex' : 'none';
document.getElementById('piketViewOnlyNote').style.display = isAdmin ? 'none' : 'block';

const navWrap = document.getElementById('navWrap');
window.addEventListener('scroll', () => {
  navWrap.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

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

const THEME_KEY = 'aventraTheme';
const themeToggleBtn = document.getElementById('themeToggle');
const sunIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`;
const moonIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

function applyTheme(theme) {
  document.body.classList.toggle('light-mode', theme === 'light');
  themeToggleBtn.innerHTML = theme === 'light' ? sunIcon : moonIcon;
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

const piketGroups = document.getElementById('piketGroups');
const piketNote = document.getElementById('piketNote');
const piketNameInput = document.getElementById('piketNameInput');
const piketDayInput = document.getElementById('piketDayInput');
const piketAddBtn = document.getElementById('piketAddBtn');

const hariList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
let piketCurrentData = {};

function flashPiketNote(text) {
  piketNote.textContent = text;
  piketNote.classList.add('show');
  setTimeout(() => piketNote.classList.remove('show'), 1800);
}

async function updateHariField(hari, newArray) {
  try {
    await piketDocRef().set({ [hari]: newArray }, { merge: true });
  } catch (e) {
    console.error(e);
    alert('Gagal menyimpan ke server: ' + (e && e.message ? e.message : e));
  }
}

function renderPiket() {
  piketGroups.innerHTML = '';
  hariList.forEach((hari) => {
    const entries = piketCurrentData[hari] || [];
    const group = document.createElement('div');
    group.className = 'piket-group stagger-item in';
    const rowsHtml = entries.length === 0
      ? '<div class="piket-empty-day">Belum ada yang dijadwalkan.</div>'
      : entries.map((item, i) => `
          <div class="piket-row ${item.selesai ? 'selesai' : ''}">
            <div class="piket-name">${item.nama}</div>
            ${isAdmin ? `
              <div class="piket-actions">
                <button class="piket-btn done" data-hari="${hari}" data-idx="${i}" data-action="toggle">${item.selesai ? '✓ Selesai' : 'Tandai Selesai'}</button>
                <button class="piket-btn del" data-hari="${hari}" data-idx="${i}" data-action="delete">Hapus</button>
              </div>
            ` : ''}
          </div>
        `).join('');
    group.innerHTML = `<div class="piket-group-title">${hari}</div><div class="piket-list">${rowsHtml}</div>`;
    piketGroups.appendChild(group);
  });

  if (isAdmin) {
    piketGroups.querySelectorAll('[data-action="toggle"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const hari = btn.getAttribute('data-hari');
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const updated = (piketCurrentData[hari] || []).slice();
        updated[idx] = { ...updated[idx], selesai: !updated[idx].selesai };
        await updateHariField(hari, updated);
        flashPiketNote('Tersimpan ke server');
      });
    });
    piketGroups.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const hari = btn.getAttribute('data-hari');
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const nama = (piketCurrentData[hari] || [])[idx]?.nama || '';
        if (!confirm(`Hapus jadwal piket ${nama} (${hari})?`)) return;
        const updated = (piketCurrentData[hari] || []).slice();
        updated.splice(idx, 1);
        await updateHariField(hari, updated);
        flashPiketNote('Terhapus dari server');
      });
    });
  }
}

piketDocRef().onSnapshot(
  (snap) => {
    piketCurrentData = snap.exists ? snap.data() : {};
    renderPiket();
    flashPiketNote('Tersinkron otomatis');
  },
  (err) => {
    console.error(err);
    piketNote.textContent = 'Gagal terhubung ke server. Cek koneksi internet.';
    piketNote.classList.add('show');
  }
);

if (isAdmin) {
  piketAddBtn.addEventListener('click', async () => {
    const nama = piketNameInput.value.trim();
    const hari = piketDayInput.value;
    if (!nama) { alert('Isi nama murid dulu.'); return; }
    const updated = (piketCurrentData[hari] || []).concat([{ nama, selesai: false }]);
    piketAddBtn.disabled = true;
    await updateHariField(hari, updated);
    piketAddBtn.disabled = false;
    piketNameInput.value = '';
    flashPiketNote('Tersimpan ke server');
  });
  piketNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') piketAddBtn.click();
  });
}

document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));