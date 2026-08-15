// build-config.js
// -----------------------------------------------------------------------
// File ini AMAN untuk di-push ke GitHub (tidak berisi password/PIN sama
// sekali). Tugasnya cuma: waktu Netlify build/deploy web ini, script ini
// otomatis MEMBUAT file js/config.js dari Environment Variables yang kamu
// atur di dashboard Netlify (bukan dari GitHub).
//
// Jadi:
//  - GitHub  -> cuma nyimpen script.js, index.html, css, DAN file ini
//               (build-config.js). Tidak pernah ada password di GitHub.
//  - Netlify -> nyimpen password ADMIN_PASSWORD & STUDENT_PINS di
//               "Environment Variables" (rahasia, cuma kamu yang bisa
//               lihat/ubah lewat dashboard Netlify).
//  - Tiap kamu push ke GitHub, Netlify otomatis re-build: menjalankan
//    file ini, yang menulis ulang js/config.js pakai data dari Netlify.
// -----------------------------------------------------------------------

const fs = require('fs');

const adminPassword = process.env.ADMIN_PASSWORD || '';
const studentPinsJson = process.env.STUDENT_PINS || '{}';

// Validasi sederhana supaya kalau env var belum diisi di Netlify,
// buildnya kasih pesan jelas alih-alih diam-diam bikin config.js kosong.
if (!adminPassword) {
  console.warn('[build-config] PERINGATAN: ADMIN_PASSWORD belum diatur di Netlify Environment Variables.');
}
if (studentPinsJson === '{}') {
  console.warn('[build-config] PERINGATAN: STUDENT_PINS belum diatur di Netlify Environment Variables.');
}

const configContent = `// File ini DIBUAT OTOMATIS oleh build-config.js setiap Netlify deploy.
// JANGAN edit file ini langsung -- perubahan akan hilang di deploy berikutnya.
// Untuk mengubah password admin atau PIN murid, edit di:
// Netlify Dashboard -> Site settings -> Environment variables
window.APP_CONFIG = {
  ADMIN_PASSWORD: ${JSON.stringify(adminPassword)},
  studentPins: ${studentPinsJson}
};
`;

fs.mkdirSync('js', { recursive: true });
fs.writeFileSync('js/config.js', configContent);
console.log('[build-config] js/config.js berhasil dibuat dari Environment Variables.');