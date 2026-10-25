// myspensab-home.js
// Pelengkap beranda baru. Tidak mengubah JS lama:
// 1) tombol CTA hero meneruskan klik ke kartu gate yang sudah ada
//    (jadi alur kelas-step.js dan handler lama tetap jalan),
// 2) kartu gate bisa dipakai lewat keyboard (Enter / Spasi).
(function () {
  'use strict';

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-gate-target]') : null;
    if (!btn) return;
    var card = document.getElementById(btn.getAttribute('data-gate-target'));
    if (card) card.click();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var card = e.target.closest ? e.target.closest('#gateLanding .gate-card') : null;
    if (!card || e.target !== card) return;
    e.preventDefault();
    card.click();
  });
})();