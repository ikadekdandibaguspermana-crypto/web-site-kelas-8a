// kelas-step.js  (v2)
// Menyelipkan langkah "pilih tingkat -> pilih kelas" sebelum login,
// tanpa mengubah JS yang sudah ada.
(function () {
  // 1) SESUAIKAN: kartu gate mana yang memicu pilih kelas.
  //    Dua kemungkinan sudah dimasukkan; hapus yang tidak dipakai.
  var TARGET = '#gateCardMasuk, .gate-card[data-gate="student"]';

  // 2) SESUAIKAN: daftar kelas per tingkat. Ini hanya contoh, isi sesuai sekolah.
  var DAFTAR_KELAS = {
    7: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    8: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    9: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
  };

  var picker, classSection, classList, gradeLabel;
  var lolos = false;       // true = klik ulang boleh lewat ke handler lama
  var kartuAsal = null;    // kartu gate yang tadi diklik
  var tingkat = null;

  // Elemen dicari saat dibutuhkan, jadi urutan script di HTML tidak masalah.
  function ambil() {
    picker = document.getElementById('classSelection');
    classSection = document.getElementById('classListSection');
    classList = document.getElementById('classList');
    gradeLabel = document.getElementById('selectionGradeLabel');
    return !!(picker && classSection && classList && gradeLabel);
  }

  console.log('[kelas-step] siap, TARGET =', TARGET);

  // Mencegat klik kartu gate. Dipasang di window (capture) supaya jalan
  // paling awal, sebelum listener apa pun di document atau di kartu.
  window.addEventListener('click', function (e) {
    if (!e.target.closest) return;

    var gate = e.target.closest('.gate-card');
    var card = e.target.closest(TARGET);

    if (gate && !card) {
      // petunjuk debug: kartu ini diklik tapi TARGET tidak cocok
      console.warn('[kelas-step] kartu gate tidak cocok TARGET. id =', gate.id,
        ', data-gate =', gate.dataset.gate, '(abaikan kalau memang bukan kartu Masuk)');
    }
    if (!card) return;

    if (lolos) { lolos = false; return; }

    if (!ambil()) {
      console.error('[kelas-step] elemen overlay tidak lengkap. Cek id: classSelection, classListSection, classList, selectionGradeLabel');
      return;   // biarkan alur lama jalan supaya login tetap bisa dipakai
    }

    e.stopImmediatePropagation();   // handler lama ditahan dulu
    e.preventDefault();
    kartuAsal = card;
    buka();
  }, true);

  // Klik di dalam overlay
  document.addEventListener('click', function (e) {
    if (!picker || picker.hidden || !picker.contains(e.target)) return;

    if (e.target.closest('[data-close]')) { tutup(); return; }

    var grade = e.target.closest('.grade-card');
    if (grade) { tampilkanKelas(grade); return; }

    var kelas = e.target.closest('.class-card');
    if (kelas) { pilihKelas(kelas.dataset.kelas); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && picker && !picker.hidden) tutup();
  });

  function buka() {
    tingkat = null;
    classSection.hidden = true;
    picker.querySelectorAll('.grade-card').forEach(function (b) {
      b.classList.remove('is-active');
    });
    picker.hidden = false;
    var pertama = picker.querySelector('.grade-card');
    if (pertama) pertama.focus();
  }

  function tutup() {
    picker.hidden = true;
    kartuAsal = null;
  }

  function tampilkanKelas(tombolTingkat) {
    tingkat = tombolTingkat.dataset.grade;
    picker.querySelectorAll('.grade-card').forEach(function (b) {
      b.classList.toggle('is-active', b === tombolTingkat);
    });

    gradeLabel.textContent = 'Kelas ' + tingkat;
    classList.textContent = '';

    (DAFTAR_KELAS[tingkat] || []).forEach(function (huruf) {
      var nama = tingkat + huruf;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'class-card';
      btn.dataset.kelas = nama;

      var letter = document.createElement('span');
      letter.className = 'class-letter';
      letter.textContent = huruf;

      var info = document.createElement('span');
      info.className = 'class-info';
      var judul = document.createElement('strong');
      judul.textContent = 'Kelas ' + nama;
      var sub = document.createElement('small');
      sub.textContent = 'Lanjut ke halaman masuk';
      info.appendChild(judul);
      info.appendChild(sub);

      var arrow = document.createElement('span');
      arrow.className = 'class-arrow';
      arrow.textContent = '→';

      btn.appendChild(letter);
      btn.appendChild(info);
      btn.appendChild(arrow);
      classList.appendChild(btn);
    });

    classSection.hidden = false;
    classSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function pilihKelas(nama) {
    try {
      sessionStorage.setItem('kelas', nama);
      sessionStorage.setItem('tingkat', tingkat);
    } catch (err) {}

    if (typeof window.setStudentClass === 'function') {
      window.setStudentClass(tingkat, nama);
    } else {
      console.error('[kelas-step] setStudentClass tidak tersedia');
      return;
    }

    var card = kartuAsal;
    tutup();

    if (card) {
      lolos = true;
      card.click();
    }
  }
})();