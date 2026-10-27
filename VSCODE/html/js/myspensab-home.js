// myspensab-home.js
// Pelengkap tampilan baru. Tidak mengubah JS lama:
// 1) tombol CTA hero meneruskan klik ke kartu gate yang sudah ada
//    (jadi alur kelas-step.js dan handler lama tetap jalan),
// 2) kartu gate bisa dipakai lewat keyboard (Enter / Spasi),
// 3) kartu login: chip kelas terpilih + ganti sisa teks "Aventra".
(function () {
  'use strict';

  // ---------- 1) CTA hero ----------
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-gate-target]') : null;
    if (!btn) return;
    var card = document.getElementById(btn.getAttribute('data-gate-target'));
    if (card) card.click();
  });

  // ---------- 2) keyboard di kartu gate ----------
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var card = e.target.closest ? e.target.closest('#gateLanding .gate-card') : null;
    if (!card || e.target !== card) return;
    e.preventDefault();
    card.click();
  });

  // ---------- 3) kartu login ----------
  var RE_KELAS = /^[7-9][A-J]$/;

  function kelasTerpilih() {
    try {
      var k = String(sessionStorage.getItem('kelas') || '').trim().toUpperCase();
      return RE_KELAS.test(k) ? k : '';
    } catch (err) { return ''; }
  }

  function modeMurid() {
    var aktif = document.querySelector('#loginBox .login-tab.active');
    return !aktif || aktif.getAttribute('data-mode') === 'student';
  }

  function updateChip() {
    var chip = document.getElementById('loginClassChip');
    if (!chip) return;
    var kelas = kelasTerpilih();
    var tampil = !!(kelas && modeMurid());
    var teks = 'Kelas ' + kelas;
    // tulis hanya kalau berubah, supaya MutationObserver tidak memicu dirinya sendiri
    if (tampil && chip.textContent !== teks) chip.textContent = teks;
    if (chip.hidden === tampil) chip.hidden = !tampil;
  }

  // auth.js menulis ulang judul/sub login (masih "Aventra Class").
  // Ganti kata itu saja, teks lain biarkan apa adanya.
  function bersihkanTeks() {
    ['loginTitle', 'loginSub'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var asli = el.textContent;
      var baru = asli.replace(/Aventra\s*Class/gi, 'MySpensab').replace(/Aventra/gi, 'MySpensab');
      if (baru !== asli) el.textContent = baru;   // hanya tulis jika beda, supaya observer tidak berputar
    });
  }

  function segarkan() {
    bersihkanTeks();
    updateChip();
  }

  function pasang() {
    var box = document.getElementById('loginBox');
    if (!box) return;
    segarkan();
    new MutationObserver(segarkan).observe(box, {
      subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ['style', 'class', 'hidden']
    });
    box.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.login-tab')) setTimeout(segarkan, 0);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang);
  else pasang();
})();