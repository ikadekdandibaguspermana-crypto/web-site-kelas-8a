# Impor akun murid Aventra ke Firestore

Folder ini berisi skrip lokal untuk memeriksa dan, bila memang sudah siap, membuat dokumen akun murid pada koleksi `students` di proyek `ombak-nusantara`.

## Keamanan

- Data impor harus file JSON hash PIN. Jangan gunakan spreadsheet PIN asli sebagai input.
- Simpan file hash dan kredensial admin di folder privat di PC, di luar folder proyek dan di luar Git.
- Jangan menyalin kredensial ke chat, mengirimnya lewat email, atau memasukkannya ke kode.
- Admin SDK melewati Firestore Security Rules. Skrip ini tidak mengubah Rules, menghapus dokumen, atau menimpa dokumen yang berbeda.
- Untuk menjalankan mode tulis, gunakan kredensial Admin SDK yang tersimpan di PC dan akun Google yang berhak mengelola Firestore proyek ini.

## Membuka di VS Code

Buka folder workspace `VSCODE` yang memuat `package.json` dan `node_modules`. Skrip ini menggunakan dependensi `firebase-admin` dari workspace tersebut.

## 1. Periksa file dahulu (dry run)

Di terminal PowerShell VS Code, jalankan:

```powershell
node .\scripts\firestore-student-import\import-students.js --input "C:\PATH\PRIVAT\roster-murid-hash-revisi.json"
```

Ganti `C:\PATH\PRIVAT` dengan lokasi tempat file hash disimpan. Mode ini hanya memvalidasi berkas dan tidak menghubungi Firebase.

## 2. Siapkan kredensial lokal

Simpan kredensial Firebase Admin SDK di folder privat di PC, bukan di folder project. Lalu arahkan environment variable untuk terminal VS Code saat ini:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\PATH\PRIVAT\firebase-admin-key.json"
```

Jangan menjalankan tahap tulis jika kredensial proyek belum dipastikan benar dan tidak tersimpan di Git.

## 3. Impor (menulis ke Firestore)

Setelah dry run benar dan proyek sudah dipastikan, perintah ini membuat dokumen baru saja:

```powershell
node .\scripts\firestore-student-import\import-students.js --input "C:\PATH\PRIVAT\roster-murid-hash-revisi.json" --apply --confirm-project=ombak-nusantara
```

Skrip akan memeriksa konflik ID sebelum menulis. Dokumen yang sudah sama persis dilewati; dokumen yang berbeda menyebabkan proses berhenti. Jika beberapa batch sudah berhasil lalu terjadi kegagalan, jalankan kembali setelah memeriksa sebabnya: dokumen yang sudah sama persis akan dilewati.

**Jangan jalankan perintah impor tulis sebelum meninjau Firestore Rules dan menyetujui perubahan data live.**


fuckyou Aksha nanti hapus tolong