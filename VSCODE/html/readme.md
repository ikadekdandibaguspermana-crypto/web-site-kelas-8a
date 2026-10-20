# AVENTRA CLASS — Dokumentasi Project (untuk Tim)

Dokumen ini menjelaskan struktur, alur, dan cara kerja seluruh kode website
Aventra Class supaya siapa pun di tim bisa ikut memahami & mengembangkan
tanpa harus membaca ulang semua baris kode dari nol.

---

## 1. Struktur File

```
├── index.html          # Markup halaman (semua section)
├── css/
│   └── style.css       # Semua styling (dark/light theme, layout, animasi)
├── js/
│   ├── auth.js          # Form login dan sesi pengguna
│   ├── script.js        # Interaksi halaman, absensi, dan data kelas
│   └── teacher-directory.js # Daftar guru piket/wali TA 2026/2027
├── netlify/functions/   # Login, sesi, data kelas, dan pengelolaan akun
├── netlify.toml         # Konfigurasi build Netlify
└── .gitignore            # Mengecualikan js/config.js dari git
```

`teacher-directory.js` dimuat sebelum `auth.js` agar pilihan nama guru sudah
tersedia ketika formulir login disiapkan.

---

## 2. Password dan keamanan

Password Admin disimpan sebagai variabel rahasia Netlify dan diperiksa pada
Netlify Function. Password guru disimpan sebagai hash scrypt di Firestore dan
tidak dikirim kembali ke browser. PIN siswa diverifikasi oleh fungsi login.
Jangan menaruh password atau kunci akun layanan Firebase di kode sumber.

---

## 3. Firebase / Firestore

Inisialisasi ada di paling atas `script.js`:

```js
const firebaseConfig = { ...projectId: "ombak-nusantara"... };
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
```

### Koleksi Firestore yang dipakai

| Koleksi        | Dokumen ID              | Isi                                                        |
|----------------|--------------------------|-------------------------------------------------------------|
| `absensi`      | tanggal, mis. `2026-08-16` | Map `{ "Nama Murid": "H" / "S" / "I" / "A" }`             |
| `pengumuman`   | auto-ID                  | `{ text, createdAt (serverTimestamp), createdAtMs }`       |
| `jadwal`       | `mingguan` (fixed)       | `{ Senin: [{waktu, mapel}], Selasa: [...], ... }`           |
| `agenda`       | auto-ID                  | `{ title, date (YYYY-MM-DD), note, createdAt }`             |
| `settings`     | `geofence` (fixed)       | `{ lat, lng, radius, minutes }` — titik & radius sekolah    |

Semua koleksi ini di-*listen* secara real-time pakai `.onSnapshot(...)`,
jadi perubahan di satu perangkat langsung muncul di perangkat lain tanpa
refresh.

---

## 4. Sistem Login & Role

Sesi login disimpan di `sessionStorage` (hilang saat tab/browser ditutup).
Admin memiliki sandi berbeda melalui `ADMIN_PASSWORD_WIARSAYANA`,
`ADMIN_PASSWORD_DANDI`, dan `ADMIN_PASSWORD_AKSHA`. Nama Admin Kepala Sekolah
ditampilkan sebagai **I Putu Wiarsayana, S.Pd.B., M.Pd.**

Guru memilih jenis akses (guru piket atau wali/guru wali), nama, dan sandi
pribadi. Admin menyiapkan atau mengganti sandi melalui panel **Kelola sandi
login guru**. Sandi disimpan sebagai hash scrypt di dokumen `teachers/{teacherId}`;
sandi aslinya tidak disimpan di Firestore. Login guru piket dapat memilih kelas
pantauan. Login wali/guru wali hanya menerima kelas yang tercantum di daftar
tugas tahun ajaran 2026/2027. Data nama/tugas sumber ada di
`js/teacher-directory.js`; akun guru perlu diaktifkan Admin sebelum dapat masuk.

Nama yang dicantumkan dalam struktur pengurus kelas tetap tidak otomatis
memberi role login atau hak akses.

Fungsi penting:
- `findStudentByName()` — mencocokkan nama dengan roster kelas yang dimuat.
- `enterSite()` / `enterSiteWithExtras()` — dipanggil setelah login sukses,
  menampilkan UI sesuai role dan menyalakan semua listener Firestore.
- `logoutBtn` — **hanya muncul untuk admin**. Murid/pengurus yang sudah login
  terkunci pada sesinya sampai tab ditutup (didesain supaya tidak gampang
  tukar-tukar akun).

---

## 5. Fitur: Daftar Absensi

- Satu dokumen Firestore per tanggal di koleksi `absensi`.
- Admin melihat & bisa ubah semua baris; murid/pengurus hanya melihat &
  mengubah barisnya sendiri (dicek lewat `isAdmin` / `isMe` di `paintAbsensi()`).
- Klik tombol status (Hadir/Sakit/Izin/Alpa) → `set(..., {merge:true})` ke
  Firestore. Klik status yang sama lagi → `FieldValue.delete()` (menghapus
  statusnya, jadi "belum tercatat").
- Pemilih tanggal menentukan tanggal absensi; **Rekap Bulanan** memakai bulan
  dari tanggal yang sedang dipilih.
- Ada auto-refresh tengah malam (`setInterval` tiap 60 detik) yang memajukan
  tanggal ke "hari ini" kalau tab dibiarkan terbuka lewat tengah malam.

### Rekap Bulanan (khusus admin)
- `openRekap()` mengambil semua dokumen `absensi` dalam rentang tanggal satu
  bulan lewat query `documentId() >= startId && <= endId`.
- Menghitung total H/S/I/A per murid, lalu menampilkan tabel + tombol
  **Unduh CSV** dan **Unduh PDF** (pakai library `jsPDF` + `jspdf-autotable`,
  di-load dari CDN di `index.html`).

## Struktur Pengurus per Kelas

- Setiap kelas menyimpan satu dokumen `classStructure/{classId}`.
- Admin memilih kelas aktif, lalu mengisi nama wali kelas dan daftar pengurus
  dengan jabatan yang dapat berbeda di setiap kelas.
- Pembacaan melewati fungsi Netlify yang memeriksa sesi dan kelas; penyimpanan
  hanya diizinkan untuk sesi Admin.
- Data pengurus hanya untuk tampilan. Data nama tidak memberikan hak login atau
  hak mengubah pengumuman/agenda.

---

## 6. Fitur: Absen Otomatis GPS (Geofence)

Tujuan: murid tidak perlu tap manual "Hadir" — kalau dia berada dalam radius
sekolah selama N menit, sistem otomatis menandai Hadir.

- **Admin** mengatur titik lokasi sekolah + radius (meter) + durasi (menit)
  lewat panel `#geoAdminBox`, disimpan ke `settings/geofence`.
- **Murid** mengaktifkan lewat tombol di `#geoStudentBox`, yang menjalankan
  `navigator.geolocation.watchPosition()`.
- `haversineMeters()` menghitung jarak murid ke titik sekolah.
- Kalau di dalam radius terus-menerus selama waktu yang ditentukan tanpa
  keluar area → `finishAutoAbsen()` otomatis `set()` status `"H"` ke
  Firestore untuk tanggal hari ini.
- Kalau murid keluar radius sebelum waktu tercapai, hitungan mundur direset.
- Panel ini otomatis disembunyikan kalau murid sudah tercatat hari itu, atau
  kalau tanggal yang sedang dilihat bukan hari ini (`updateGeoPanels()`).

---

## 7. Fitur: Papan Pengumuman, Jadwal Pelajaran, Agenda Kelas

Ketiganya punya pola yang sama:
1. Real-time listener Firestore (`onSnapshot`) → render ulang otomatis.
2. Hanya `admin` & `pengurus` yang bisa menambah/menghapus (dicek lewat
   `canManageInfo()`).
3. Composer (form input) disembunyikan otomatis untuk role `student`.

| Fitur       | Koleksi     | Fungsi render      | Fungsi listen         |
|-------------|-------------|----------------------|--------------------------|
| Pengumuman  | `pengumuman`| `renderPengumuman()` | `listenPengumuman()`    |
| Jadwal      | `jadwal`    | `renderJadwal()`     | `listenJadwal()`        |
| Agenda      | `agenda`    | `renderAgenda()`     | `listenAgenda()`        |

---

## 8. Fitur UI/UX Tambahan (tidak terkait Firestore)

- **Tema Terang/Gelap** — disimpan di `localStorage` (`aventraTheme`), toggle
  lewat tombol 🌙/☀️ di navbar. Diterapkan lewat class `body.light-mode` yang
  meng-override CSS variables di `:root`.
- **Roster grid & kartu pengurus** — di-generate otomatis dari array
  `roster` dan `pengurus` di `script.js` (bukan hardcode di HTML), termasuk
  PIN yang ditampilkan di tiap kartu.
- **Galeri kegiatan & lightbox** — masih placeholder (`svg` ikon), siap
  diganti dengan foto asli.
- **Animasi**: parallax orb, stagger reveal on scroll, tilt hover pada kartu,
  animated stat counter di hero — semua menghormati
  `prefers-reduced-motion`.

---

## 9. Alur Deploy (Netlify)

1. Push kode ke GitHub (tanpa `js/config.js`, sudah di-`.gitignore`).
2. Di Netlify dashboard → **Project configuration → Environment variables**,
   isi sandi Admin (`ADMIN_PASSWORD_WIARSAYANA`, `ADMIN_PASSWORD_DANDI`,
   `ADMIN_PASSWORD_AKSHA`), `SESSION_SECRET`, dan
   `FIREBASE_SERVICE_ACCOUNT_KEY`. PIN siswa dikelola lewat data akun siswa di
   Firestore, bukan variabel `STUDENT_PINS`.
3. Setelah kode dipush ke GitHub, Netlify akan membangun ulang situs. Untuk
   menyiapkan login guru, Admin masuk ke situs yang sudah diperbarui, pilih nama
   pada panel **Kelola sandi login guru**, lalu simpan sandi awal yang akan
   diberikan langsung kepada guru.

**Kalau butuh update password/PIN:** cukup ubah di Netlify Environment
Variables, lalu trigger re-deploy (tidak perlu ubah kode).

---

## 10. Hal yang Perlu Diketahui Tim (Catatan Penting)

- Password Admin dan sandi guru diverifikasi pada Netlify Functions; jangan
  memasukkan nilainya ke kode atau mengirimkannya di grup umum.
- Murid yang sudah login **tidak bisa logout sendiri** (tombol logout hanya
  untuk admin) — ini disengaja supaya sesi lebih terkunci per orang.
- Jangan pernah commit `js/config.js` ke git — sudah ada di `.gitignore`,
  tapi tetap cek ulang sebelum push kalau menambah file config baru.
- Kalau menambah anggota kelas baru: tambahkan namanya ke array `roster`
  (atau `pengurus` kalau pengurus inti) di `script.js`, DAN tambahkan
  PIN-nya di `studentPins` / environment variable `STUDENT_PINS`.
