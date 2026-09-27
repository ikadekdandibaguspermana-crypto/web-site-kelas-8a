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
│   ├── config.js       # Password admin & PIN murid (JANGAN di-push ke GitHub)
│   └── script.js       # Seluruh logika aplikasi (auth, absensi, dsb)
├── build-config.js      # Auto-generate js/config.js saat build di Netlify
├── netlify.toml         # Konfigurasi build Netlify
└── .gitignore            # Mengecualikan js/config.js dari git
```

**Urutan load penting:** `config.js` HARUS dimuat sebelum `script.js` di
`index.html`, karena `script.js` membaca `window.APP_CONFIG` (password admin
& PIN murid) dari file itu.

---

## 2. Cara Kerja Password/PIN & Kenapa Dipisah

- `js/config.js` berisi `ADMIN_PASSWORD` dan `studentPins` (mapping nama → PIN 4 digit).
- File ini **tidak** benar-benar rahasia dari user akhir — karena web ini
  murni statis (tanpa backend), browser tetap harus mengunduh file ini agar
  proses login bisa jalan. Siapa pun yang buka DevTools → Sources tetap bisa
  membacanya.
- Yang bisa dicapai dengan memisahkan file ini hanyalah: **tidak ikut
  ter-upload ke GitHub** (lewat `.gitignore`), supaya orang yang cuma lihat
  repo publik tidak langsung melihat semua password.
- Alur build otomatis di Netlify (`build-config.js` + `netlify.toml`):
  1. Password & PIN asli disimpan di **Netlify Environment Variables**
     (`ADMIN_PASSWORD`, `STUDENT_PINS` dalam format JSON), bukan di GitHub.
  2. Setiap kali repo di-push ke GitHub, Netlify otomatis menjalankan
     `node build-config.js`.
  3. Script itu membaca environment variables lalu menulis ulang
     `js/config.js` di server build Netlify, sebelum situs di-deploy.
  4. Hasil akhirnya: file `config.js` yang dikirim ke browser tetap berisi
     data asli (karena memang harus, untuk login), tapi datanya tidak pernah
     tersimpan di riwayat git/GitHub.

> Catatan keamanan jujur: ini **bukan** keamanan sungguhan tingkat produksi
> (misalnya untuk data sensitif beneran). Kalau butuh proteksi password yang
> benar-benar tidak bisa dibaca dari browser sama sekali, solusinya adalah
> pindahkan proses cek password ke backend (contoh: Firebase Cloud Function
> atau Netlify Function) sehingga password tidak pernah dikirim ke client.

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

Ada 3 role, disimpan di `sessionStorage` (hilang saat tab/browser ditutup):

| Role       | Cara login                          | Hak akses                                                                 |
|------------|--------------------------------------|----------------------------------------------------------------------------|
| `admin`    | Password admin (`ADMIN_PASSWORD`)    | Akses penuh: semua absensi, rekap bulanan, reset absensi, kelola pengumuman/jadwal/agenda, atur lokasi geofence |
| `pengurus` | Nama + PIN (harus terdaftar di array `pengurus`) | Sama seperti murid untuk Absensi (hanya bisa tandai dirinya sendiri), TAPI bisa kelola Pengumuman/Jadwal/Agenda |
| `student`  | Nama + PIN                            | Hanya bisa melihat & menandai absensinya sendiri                          |

Logika penentuan role ada di `doLoginWithExtras()`:
```js
const role = pengurusNameSet.has(nama) ? 'pengurus' : 'student';
```

Fungsi penting:
- `findStudentByName()` — mencocokkan nama yang diketik dengan `kelasLengkap`
  (gabungan `pengurus` + `roster`).
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
- Dropdown bulan (`absenMonthSelect`) dibuat otomatis untuk 50 tahun ke depan
  (`buildMonthOptions()`), supaya tidak pernah kehabisan pilihan bulan.
- Ada auto-refresh tengah malam (`setInterval` tiap 60 detik) yang memajukan
  tanggal ke "hari ini" kalau tab dibiarkan terbuka lewat tengah malam.

### Rekap Bulanan (khusus admin)
- `openRekap()` mengambil semua dokumen `absensi` dalam rentang tanggal satu
  bulan lewat query `documentId() >= startId && <= endId`.
- Menghitung total H/S/I/A per murid, lalu menampilkan tabel + tombol
  **Unduh CSV** dan **Unduh PDF** (pakai library `jsPDF` + `jspdf-autotable`,
  di-load dari CDN di `index.html`).

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
2. Di Netlify dashboard → **Site settings → Environment variables**, isi:
   - `ADMIN_PASSWORD` → password admin asli
   - `STUDENT_PINS` → JSON string berisi semua PIN murid
3. Netlify build command (`netlify.toml`): `node build-config.js`
   → otomatis membuat `js/config.js` dari environment variables tadi
   sebelum situs di-publish (`publish = "."`).
4. Setiap push baru ke GitHub akan trigger build ulang otomatis.

**Kalau butuh update password/PIN:** cukup ubah di Netlify Environment
Variables, lalu trigger re-deploy (tidak perlu ubah kode).

---

## 10. Hal yang Perlu Diketahui Tim (Catatan Penting)

- Password admin & PIN murid **bisa dibaca siapa pun** lewat DevTools browser
  karena situs ini statis (tanpa backend beneran). Ini bukan bug, tapi
  batasan arsitektur — sudah dijelaskan di komentar `config.js` & bagian 2
  dokumen ini.
- Murid yang sudah login **tidak bisa logout sendiri** (tombol logout hanya
  untuk admin) — ini disengaja supaya sesi lebih terkunci per orang.
- Jangan pernah commit `js/config.js` ke git — sudah ada di `.gitignore`,
  tapi tetap cek ulang sebelum push kalau menambah file config baru.
- Kalau menambah anggota kelas baru: tambahkan namanya ke array `roster`
  (atau `pengurus` kalau pengurus inti) di `script.js`, DAN tambahkan
  PIN-nya di `studentPins` / environment variable `STUDENT_PINS`.