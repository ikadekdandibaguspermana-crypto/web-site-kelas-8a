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

function getActiveClassId(session) {
  const s = session || currentSessionInfo();

  if (s.classId) {
    return s.classId;
  }

  if (
    s.role === 'guru' &&
    Array.isArray(s.assignedClasses) &&
    s.assignedClasses.length
  ) {
    return s.assignedClasses[0];
  }

  return null;
}

function hasClassAccess(classId, session) {
  const s = session || currentSessionInfo();

  if (!classId) return false;

  if (s.role === 'admin') {
    return true;
  }

  if (s.role === 'guru') {
    return (
      Array.isArray(s.assignedClasses) &&
      s.assignedClasses.includes(classId)
    );
  }

  if (
    s.role === 'student' ||
    s.role === 'pengurus'
  ) {
    return getActiveClassId(s) === classId;
  }

  return false;
}

function absenDocRef(dateStr) {
  const classId = getActiveClassId();

  if (!classId) {
    return null;
  }

  return db
    .collection('absensi')
    .doc(`${classId}_${dateStr}`);
}

function buildSafeStudentKey(studentName) {
  return String(studentName || '')
    .trim()
    .replace(/\//g, '-');
}

function izinDetailDocRef(dateStr, studentName) {
  const classId = getActiveClassId();

  if (!classId) {
    return null;
  }

  const safeName = buildSafeStudentKey(studentName);

  return db
    .collection('izinDetail')
    .doc(`${classId}_${dateStr}__${safeName}`);
}

function sakitDetailDocRef(dateStr, studentName) {
  const classId = getActiveClassId();

  if (!classId) {
    return null;
  }

  const safeName = buildSafeStudentKey(studentName);

  return db
    .collection('sakitDetail')
    .doc(`${classId}_${dateStr}__${safeName}`);
}

function legacyIzinDetailDocRef(dateStr, studentName) {
  const safeName = buildSafeStudentKey(studentName);

  return db
    .collection('izinDetail')
    .doc(`${dateStr}__${safeName}`);
}

function legacySakitDetailDocRef(dateStr, studentName) {
  const safeName = buildSafeStudentKey(studentName);

  return db
    .collection('sakitDetail')
    .doc(`${dateStr}__${safeName}`);
}

const fallbackRoster = [
  "Casey",
  "Redi",
  "Rizki",
  "Alit Payama",
  "Novi",
  "Ary",
  "Dek Adi",
  "Candra",
  "Dandi Bagus",
  "Prabu",
  "Alit",
  "Cipta",
  "David",
  "Resta",
  "Awan",
  "Diah",
  "Gus Dwik",
  "Cahya Aprianti",
  "April",
  "Meisya",
  "Rastia",
  "Mang Cahya",
  "Desita",
  "Damay",
  "Feli",
  "Aldo"
];

const fallbackPengurus = [
  {
    name: "Ni Ketut Nindia Candra Dewi",
    jabatan: "Ketua Kelas"
  },
  {
    name: "I Ketut Anna Ary Sudana Putra",
    jabatan: "Wakil Ketua"
  },
  {
    name: "Luh Putu Laksmi Pradnyaswari",
    jabatan: "Sekretaris 1"
  },
  {
    name: "I Made Bayu Pastika Putra",
    jabatan: "Sekretaris 2"
  },
  {
    name: "I Gusti Ayu Kadek Sulaksmi",
    jabatan: "Bendahara 1"
  },
  {
    name: "I Gusti Lanang Agung Putra Wedhana",
    jabatan: "Bendahara 2"
  }
];

const roster = fallbackRoster;
const pengurus = fallbackPengurus;

let kelasLengkap = [
  ...fallbackPengurus,
  ...fallbackRoster.map(name => ({
    name,
    jabatan: ""
  }))
];

function findStudentByName(typed) {
  const clean = String(typed || '')
    .trim()
    .toLowerCase();

  if (!clean) {
    return null;
  }

  return (
    kelasLengkap.find(
      student =>
        student.name
          .trim()
          .toLowerCase() === clean
    ) || null
  );
}

let pengurusNameSet = new Set(
  fallbackPengurus.map(
    person =>
      person.name
        .trim()
        .toLowerCase()
  )
);

function currentSessionInfo() {
  const s = window.AventraAuth
    ? window.AventraAuth.getSession()
    : null;

  if (!s || !s.role) {
    return {
      role: null,
      name: null
    };
  }

  if (s.role === 'admin') {
    return {
      role: 'admin',
      name: 'Admin',
      classId: s.classId || null,
      teacherId: s.teacherId || null
    };
  }

  if (s.role === 'guru') {
    return {
      role: 'guru',
      name: s.name || 'Guru',
      classId: s.classId || null,
      teacherId: s.teacherId || null,
      assignedClasses:
        Array.isArray(s.assignedClasses)
          ? s.assignedClasses
          : []
    };
  }

  if (s.role === 'guest') {
    return {
      role: 'guest',
      name: 'Tamu'
    };
  }

  const role = pengurusNameSet.has(
    (s.name || '')
      .trim()
      .toLowerCase()
  )
    ? 'pengurus'
    : 'student';

  return {
    role,
    name: s.name,
    classId: s.classId || null,
    studentId: s.studentId || null,
    grade: s.grade || null
  };
}

function isCurrentlyAdmin() {
  return currentSessionInfo().role === 'admin';
}

function canManageInfo() {
  const role = currentSessionInfo().role;

  return (
    role === 'admin' ||
    role === 'pengurus'
  );
}

function canViewSiswaDetail() {
  const session = currentSessionInfo();

  if (session.role === 'admin') {
    return true;
  }

  if (session.role === 'guru') {
    const classId =
      getActiveClassId(session);

    return hasClassAccess(
      classId,
      session
    );
  }

  return false;
}

function canManageJurnal() {
  const session = currentSessionInfo();

  if (session.role === 'admin') {
    return true;
  }

  if (session.role === 'guru') {
    const classId =
      getActiveClassId(session);

    return hasClassAccess(
      classId,
      session
    );
  }

  return false;
}

function renderRosterGrid(list) {
  const rosterGrid =
    document.getElementById(
      'rosterGrid'
    );

  const rosterCount =
    document.getElementById(
      'rosterCount'
    );

  if (!rosterGrid) return;

  rosterGrid.innerHTML = '';

  if (rosterCount) {
    rosterCount.textContent =
      list.length;
  }

  list.forEach((student, index) => {
    const card =
      document.createElement('div');

    card.className =
      'roster-card stagger-item in';

    const num =
      String(index + 1)
        .padStart(2, '0');

    card.innerHTML = `
      <div class="roster-id">${num}</div>
      <div class="roster-info">
        <span>${student.name}</span>
      </div>
    `;

    rosterGrid.appendChild(card);
  });
}

async function tryLoadRosterFromFirestore() {
  const classId =
    getActiveClassId();

  if (!classId) {
    console.info(
      '[roster] classId belum tersedia.'
    );
    return;
  }

  console.info(
    `[roster] Data siswa untuk ${classId} membutuhkan endpoint server aman.`
  );
}

const rosterGrid =
  document.getElementById(
    'rosterGrid'
  );

if (rosterGrid) {
  renderRosterGrid(
    roster.map(name => ({
      name
    }))
  );
}

tryLoadRosterFromFirestore();

function ensureWeekendBanner() {
  let el = document.getElementById('absenWeekendBanner');

  if (!el) {
    el = document.createElement('div');
    el.id = 'absenWeekendBanner';
    el.style.cssText =
      'margin:0 0 14px;padding:10px 14px;border-radius:10px;background:rgba(242,183,5,0.12);border:1px solid rgba(242,183,5,0.35);color:#f2b705;font-size:0.9rem;text-align:center;display:none;';

    if (absenList && absenList.parentNode) {
      absenList.parentNode.insertBefore(
        el,
        absenList
      );
    }
  }

  return el;
}

async function saveAttendanceWithOfflineQueue({
  date,
  studentName,
  status,
  action = 'set',
  lat = null,
  lng = null,
  detail = null
}) {
  const classId =
    getActiveClassId();

  if (!classId) {
    throw new Error(
      'Kelas aktif belum tersedia.'
    );
  }

  const patch =
    action === 'delete'
      ? {
          [studentName]:
            firebase.firestore.FieldValue.delete()
        }
      : {
          [studentName]: status
        };

  if (!navigator.onLine) {
    await queuePendingAbsensi({
      date,
      studentName,
      status,
      action,
      lat,
      lng,
      detail
    });

    currentDayData =
      applyPendingToDayData(
        currentDayData,
        [
          {
            studentName,
            status,
            action
          }
        ]
      );

    return {
      queued: true
    };
  }

  try {
    await db
      .collection('absensi')
      .doc(`${classId}_${date}`)
      .set(
        patch,
        { merge: true }
      );

    return {
      queued: false
    };
  } catch (e) {
    await queuePendingAbsensi({
      date,
      studentName,
      status,
      action,
      lat,
      lng,
      detail
    });

    currentDayData =
      applyPendingToDayData(
        currentDayData,
        [
          {
            studentName,
            status,
            action
          }
        ]
      );

    return {
      queued: true,
      error: e
    };
  }
}

function paintAbsensi(date, session) {
  const dayData =
    currentDayData || {};

  const isAdmin =
    session.role === 'admin';

  const isGuru =
    session.role === 'guru';

  const isGuest =
    session.role === 'guest';

  const viewAll =
    isAdmin ||
    isGuru ||
    isGuest;

  const weekend =
    isWeekendDate(date);

  const readOnly =
    weekend ||
    isGuest ||
    isGuru;

  const banner =
    ensureWeekendBanner();

  if (weekend) {
    banner.textContent =
      '🚫 Minggu libur — absensi tidak tersedia untuk tanggal ini.';
    banner.style.display =
      'block';
  } else {
    banner.style.display =
      'none';
  }

  absenSubText.textContent =
    weekend
      ? 'Hari Minggu libur. Kehadiran hanya bisa ditandai pada hari sekolah (Senin–Sabtu).'
      : isGuest
        ? 'Kamu login sebagai Tamu — bisa melihat kehadiran seluruh murid secara real-time, tapi tidak bisa mengubah apa pun.'
        : isAdmin
          ? 'Admin dapat melihat & mengubah kehadiran seluruh murid secara real-time. Status tersimpan otomatis ke server setiap kali ditandai.'
          : `Kamu masuk sebagai ${session.name}. Kamu hanya bisa menandai kehadiranmu sendiri — status tersimpan otomatis ke server.`;

  rekapBtn.style.display =
    isAdmin
      ? 'inline-flex'
      : 'none';

  const visibleStudents =
    viewAll
      ? kelasLengkap
      : kelasLengkap.filter(
          student =>
            student.name
              .trim()
              .toLowerCase() ===
            session.name
              .trim()
              .toLowerCase()
        );

  absenList.innerHTML = '';

  visibleStudents.forEach(
    student => {
      const globalIndex =
        kelasLengkap.findIndex(
          s =>
            s.name ===
            student.name
        );

      const isMe =
        !viewAll &&
        student.name
          .trim()
          .toLowerCase() ===
          session.name
            .trim()
            .toLowerCase();

      const row =
        document.createElement(
          'div'
        );

      row.className =
        'absen-row stagger-item in' +
        (isMe ? ' me' : '');

      const num =
        String(
          globalIndex + 1
        ).padStart(2, '0');

      const current =
        dayData[
          student.name
        ] || '';

      const disabledAttr =
        readOnly
          ? 'disabled'
          : '';

      const hasIzinNote =
        current === 'I';

      const hasSakitNote =
        current === 'S';

      row.innerHTML = `
        <div class="absen-num">${num}</div>

        <div class="absen-name">
          <b>${student.name}</b>
          ${
            student.jabatan
              ? `<span>${student.jabatan}</span>`
              : ''
          }
        </div>

        <div class="absen-btns">
          <button
            class="absen-btn ${
              current === 'H'
                ? 'active'
                : ''
            }"
            data-s="H"
            ${disabledAttr}
          >
            Hadir
          </button>

          <button
            class="absen-btn ${
              current === 'S'
                ? 'active'
                : ''
            }"
            data-s="S"
            ${disabledAttr}
          >
            Sakit
          </button>

          <button
            class="absen-btn ${
              current === 'I'
                ? 'active'
                : ''
            }"
            data-s="I"
            ${disabledAttr}
          >
            Izin
          </button>

          <button
            class="absen-btn ${
              current === 'A'
                ? 'active'
                : ''
            }"
            data-s="A"
            ${disabledAttr}
          >
            Alpa
          </button>

          ${
            canViewSiswaDetail() &&
            hasIzinNote
              ? `
                <button
                  type="button"
                  class="absen-izin-view-btn"
                >
                  🔍 Lihat Detail Izin
                </button>
              `
              : ''
          }

          ${
            canViewSiswaDetail() &&
            hasSakitNote
              ? `
                <button
                  type="button"
                  class="absen-sakit-view-btn"
                >
                  🔍 Lihat Detail Sakit
                </button>
              `
              : ''
          }
        </div>
      `;

      if (
        canViewSiswaDetail() &&
        hasIzinNote
      ) {
        row
          .querySelector(
            '.absen-izin-view-btn'
          )
          .addEventListener(
            'click',
            () => {
              openIzinViewModal(
                date,
                student
              );
            }
          );
      }

      if (
        canViewSiswaDetail() &&
        hasSakitNote
      ) {
        row
          .querySelector(
            '.absen-sakit-view-btn'
          )
          .addEventListener(
            'click',
            () => {
              openSakitViewModal(
                date,
                student
              );
            }
          );
      }

      row
        .querySelectorAll(
          '.absen-btn'
        )
        .forEach(btn => {
          btn.addEventListener(
            'click',
            async () => {
              if (readOnly) return;

              if (
                !isAdmin &&
                !isMe
              ) {
                return;
              }

              const status =
                btn.getAttribute(
                  'data-s'
                );

              const turningOn =
                dayData[
                  student.name
                ] !== status;

              const btnGroup =
                btn
                  .closest(
                    '.absen-btns'
                  )
                  .querySelectorAll(
                    '.absen-btn'
                  );

              if (
                status === 'I' &&
                turningOn
              ) {
                openIzinModal({
                  date,
                  student,
                  btnGroup
                });
                return;
              }

              if (
                status === 'S' &&
                turningOn
              ) {
                openSakitModal({
                  date,
                  student,
                  btnGroup
                });
                return;
              }

              btnGroup.forEach(
                b =>
                  b.disabled = true
              );

              try {
                const result =
                  await saveAttendanceWithOfflineQueue(
                    {
                      date,
                      studentName:
                        student.name,
                      status:
                        turningOn
                          ? status
                          : null,
                      action:
                        turningOn
                          ? 'set'
                          : 'delete'
                    }
                  );

                paintAbsensi(
                  date,
                  currentSessionInfo()
                );

                if (
                  status === 'I' &&
                  !turningOn
                ) {
                  await Promise.allSettled(
                    [
                      izinDetailDocRef(
                        date,
                        student.name
                      ).delete(),

                      legacyIzinDetailDocRef(
                        date,
                        student.name
                      ).delete()
                    ]
                  );
                }

                if (
                  status === 'S' &&
                  !turningOn
                ) {
                  await Promise.allSettled(
                    [
                      sakitDetailDocRef(
                        date,
                        student.name
                      ).delete(),

                      legacySakitDetailDocRef(
                        date,
                        student.name
                      ).delete()
                    ]
                  );
                }

                if (result.queued) {
                  absenNote.textContent =
                    '📦 Absensi disimpan sementara. Akan tersinkron saat online.';

                  absenNote.classList.add(
                    'show'
                  );
                } else {
                  flashSaved(date);
                }
              } catch (e) {
                console.error(e);

                alert(
                  'Gagal menyimpan absensi. Data tidak diubah menjadi Alpa. Coba lagi saat koneksi tersedia.'
                );

                btnGroup.forEach(
                  b =>
                    b.disabled =
                      readOnly
                );
              }
            }
          );
        });

      absenList.appendChild(row);
    }
  );

  updateSummary(
    dayData,
    viewAll,
    session
  );

  updateGeoPanels(
    date,
    session
  );
}

function updateSummary(
  dayData,
  viewAll,
  session
) {
  const scope =
    viewAll
      ? kelasLengkap
      : kelasLengkap.filter(
          student =>
            student.name
              .trim()
              .toLowerCase() ===
            session.name
              .trim()
              .toLowerCase()
        );

  const counts = {
    H: 0,
    S: 0,
    I: 0,
    A: 0
  };

  scope.forEach(student => {
    const status =
      dayData[
        student.name
      ];

    if (
      status &&
      counts[status] !==
        undefined
    ) {
      counts[status]++;
    }
  });

  const unset =
    scope.length -
    (
      counts.H +
      counts.S +
      counts.I +
      counts.A
    );

  document.getElementById(
    'cntH'
  ).textContent =
    counts.H;

  document.getElementById(
    'cntS'
  ).textContent =
    counts.S;

  document.getElementById(
    'cntI'
  ).textContent =
    counts.I;

  document.getElementById(
    'cntA'
  ).textContent =
    counts.A;

  document.getElementById(
    'cntU'
  ).textContent =
    unset;
}

let flashTimer;

function flashSaved(date) {
  absenNote.textContent =
    `Tersimpan otomatis ke server · ${date}`;

  absenNote.classList.add(
    'show'
  );

  clearTimeout(
    flashTimer
  );

  flashTimer =
    setTimeout(
      () =>
        absenNote.classList.remove(
          'show'
        ),
      1600
    );
}

function writeNotifikasi(
  type,
  studentName,
  date
) {
  const classId =
    getActiveClassId();

  if (!classId) return;

  db.collection(
    'notifikasi'
  )
    .add({
      type,
      studentName,
      date,
      classId,
      createdAtMs:
        Date.now(),
      createdAt:
        firebase.firestore.FieldValue.serverTimestamp()
    })
    .catch(e =>
      console.error(
        'notifikasi:',
        e
      )
    );
}

const izinModal =
  document.getElementById(
    'izinModal'
  );

const izinModalTitle =
  document.getElementById(
    'izinModalTitle'
  );

const izinTextInput =
  document.getElementById(
    'izinTextInput'
  );

const izinPhotoInput =
  document.getElementById(
    'izinPhotoInput'
  );

const izinPhotoPreview =
  document.getElementById(
    'izinPhotoPreview'
  );

const izinPhotoPreviewImg =
  document.getElementById(
    'izinPhotoPreviewImg'
  );

const izinError =
  document.getElementById(
    'izinError'
  );

const izinSubmitBtn =
  document.getElementById(
    'izinSubmit'
  );

const izinCancelBtn =
  document.getElementById(
    'izinCancel'
  );

const izinCloseBtn =
  document.getElementById(
    'izinClose'
  );

let izinPendingCtx =
  null;

let izinPendingPhotoDataUrl =
  null;

function resetIzinForm() {
  izinTextInput.value = '';
  izinPhotoInput.value = '';
  izinPhotoPreview.style.display =
    'none';
  izinPhotoPreviewImg.src = '';
  izinError.textContent = '';
  izinPendingPhotoDataUrl =
    null;

  izinSubmitBtn.disabled =
    false;

  izinSubmitBtn.textContent =
    'Kirim & Tandai Izin';
}

function openIzinModal(ctx) {
  resetIzinForm();

  izinPendingCtx =
    ctx;

  izinModalTitle.textContent =
    `Isi Keterangan Izin — ${ctx.student.name}`;

  izinModal.classList.add(
    'open'
  );
}

function closeIzinModal() {
  izinModal.classList.remove(
    'open'
  );

  if (
    izinPendingCtx &&
    izinPendingCtx.btnGroup
  ) {
    izinPendingCtx.btnGroup.forEach(
      btn => {
        btn.disabled = false;
      }
    );
  }

  izinPendingCtx =
    null;
}

function compressImageFile(
  file,
  maxDim,
  quality
) {
  return new Promise(
    (resolve, reject) => {
      if (
        !file ||
        !file.type ||
        !file.type.startsWith(
          'image/'
        )
      ) {
        reject(
          new Error(
            'File yang dipilih bukan gambar.'
          )
        );
        return;
      }

      const reader =
        new FileReader();

      reader.onerror =
        () =>
          reject(
            new Error(
              'Gagal membaca file.'
            )
          );

      reader.onload = () => {
        const img =
          new Image();

        img.onerror =
          () =>
            reject(
              new Error(
                'Gagal memuat gambar.'
              )
            );

        img.onload = () => {
          let {
            width,
            height
          } = img;

          if (
            width >
              height &&
            width >
              maxDim
          ) {
            height =
              Math.round(
                height *
                  (maxDim /
                    width)
              );

            width =
              maxDim;
          } else if (
            height >
            maxDim
          ) {
            width =
              Math.round(
                width *
                  (maxDim /
                    height)
              );

            height =
              maxDim;
          }

          const canvas =
            document.createElement(
              'canvas'
            );

          canvas.width =
            width;

          canvas.height =
            height;

          canvas
            .getContext('2d')
            .drawImage(
              img,
              0,
              0,
              width,
              height
            );

          resolve(
            canvas.toDataURL(
              'image/jpeg',
              quality
            )
          );
        };

        img.src =
          reader.result;
      };

      reader.readAsDataURL(
        file
      );
    }
  );
}

izinPhotoInput.addEventListener(
  'change',
  async () => {
    const file =
      izinPhotoInput.files &&
      izinPhotoInput.files[0];

    if (!file) return;

    izinError.textContent =
      '';

    izinPhotoPreview.style.display =
      'none';

    try {
      const dataUrl =
        await compressImageFile(
          file,
          640,
          0.55
        );

      izinPendingPhotoDataUrl =
        dataUrl;

      izinPhotoPreviewImg.src =
        dataUrl;

      izinPhotoPreview.style.display =
        'block';
    } catch (e) {
      console.error(e);

      izinPendingPhotoDataUrl =
        null;

      izinError.textContent =
        'Gagal memproses foto. Coba pilih foto lain.';
    }
  }
);

izinSubmitBtn.addEventListener(
  'click',
  async () => {
    if (!izinPendingCtx)
      return;

    const text =
      izinTextInput.value.trim();

    if (!text) {
      izinError.textContent =
        'Keterangan wajib diisi.';
      return;
    }

    if (
      !izinPendingPhotoDataUrl
    ) {
      izinError.textContent =
        'Foto bukti wajib dilampirkan.';
      return;
    }

    izinError.textContent =
      '';

    izinSubmitBtn.disabled =
      true;

    izinSubmitBtn.textContent =
      'Mengirim...';

    const {
      date,
      student
    } = izinPendingCtx;

    const session =
      currentSessionInfo();

    try {
      const detail = {
        text,
        photo:
          izinPendingPhotoDataUrl,
        by:
          session.name ||
          student.name,
        at:
          Date.now()
      };

      const result =
        await saveAttendanceWithOfflineQueue(
          {
            date,
            studentName:
              student.name,
            status: 'I',
            action: 'set',
            detail
          }
        );

      if (!result.queued) {
        await izinDetailDocRef(
          date,
          student.name
        ).set(detail);

        writeNotifikasi(
          'izin',
          student.name,
          date
        );
      }

      flashSaved(date);
      closeIzinModal();
    } catch (e) {
      console.error(e);

      izinError.textContent =
        'Gagal menyimpan. Data tetap tidak dianggap Alpa. Coba lagi saat koneksi tersedia.';

      izinSubmitBtn.disabled =
        false;

      izinSubmitBtn.textContent =
        'Kirim & Tandai Izin';
    }
  }
);

izinCancelBtn.addEventListener(
  'click',
  closeIzinModal
);

izinCloseBtn.addEventListener(
  'click',
  closeIzinModal
);

izinModal.addEventListener(
  'click',
  e => {
    if (
      e.target ===
      izinModal
    ) {
      closeIzinModal();
    }
  }
);

const izinViewModal =
  document.getElementById(
    'izinViewModal'
  );

const izinViewClose =
  document.getElementById(
    'izinViewClose'
  );

const izinViewName =
  document.getElementById(
    'izinViewName'
  );

const izinViewDate =
  document.getElementById(
    'izinViewDate'
  );

const izinViewStatus =
  document.getElementById(
    'izinViewStatus'
  );

const izinViewText =
  document.getElementById(
    'izinViewText'
  );

const izinViewPhoto =
  document.getElementById(
    'izinViewPhoto'
  );

async function openIzinViewModal(
  date,
  student
) {
  if (
    !canViewSiswaDetail()
  ) {
    return;
  }

  izinViewName.textContent =
    student.name;

  izinViewDate.textContent =
    date;

  izinViewStatus.style.display =
    'block';

  izinViewStatus.textContent =
    'Memuat...';

  izinViewText.style.display =
    'none';

  izinViewPhoto.style.display =
    'none';

  izinViewModal.classList.add(
    'open'
  );

  try {
    let snap =
      await izinDetailDocRef(
        date,
        student.name
      ).get();

    if (!snap.exists) {
      snap =
        await legacyIzinDetailDocRef(
          date,
          student.name
        ).get();
    }

    if (!snap.exists) {
      izinViewStatus.textContent =
        'Belum ada keterangan/foto tersimpan untuk izin ini.';
      return;
    }

    const data =
      snap.data();

    izinViewStatus.style.display =
      'none';

    izinViewText.textContent =
      data.text ||
      '(tanpa keterangan)';

    izinViewText.style.display =
      'block';

    if (data.photo) {
      izinViewPhoto.src =
        data.photo;

      izinViewPhoto.style.display =
        'block';
    }
  } catch (e) {
    console.error(e);

    izinViewStatus.textContent =
      'Gagal memuat detail izin. Cek koneksi internet.';
  }
}

izinViewClose.addEventListener(
  'click',
  () =>
    izinViewModal.classList.remove(
      'open'
    )
);

izinViewModal.addEventListener(
  'click',
  e => {
    if (
      e.target ===
      izinViewModal
    ) {
      izinViewModal.classList.remove(
        'open'
      );
    }
  }
);

const sakitModal =
  document.getElementById('sakitModal');

const sakitModalTitle =
  document.getElementById('sakitModalTitle');

const sakitTextInput =
  document.getElementById('sakitTextInput');

const sakitPhotoInput =
  document.getElementById('sakitPhotoInput');

const sakitPhotoPreview =
  document.getElementById('sakitPhotoPreview');

const sakitPhotoPreviewImg =
  document.getElementById('sakitPhotoPreviewImg');

const sakitError =
  document.getElementById('sakitError');

const sakitSubmitBtn =
  document.getElementById('sakitSubmit');

const sakitCancelBtn =
  document.getElementById('sakitCancel');

const sakitCloseBtn =
  document.getElementById('sakitClose');

let sakitPendingCtx = null;
let sakitPendingPhotoDataUrl = null;

function resetSakitForm() {
  sakitTextInput.value = '';
  sakitPhotoInput.value = '';
  sakitPhotoPreview.style.display = 'none';
  sakitPhotoPreviewImg.src = '';
  sakitError.textContent = '';
  sakitPendingPhotoDataUrl = null;

  sakitSubmitBtn.disabled = false;
  sakitSubmitBtn.textContent =
    'Kirim & Tandai Sakit';
}

function openSakitModal(ctx) {
  resetSakitForm();

  sakitPendingCtx = ctx;

  sakitModalTitle.textContent =
    `Isi Keterangan Sakit — ${ctx.student.name}`;

  sakitModal.classList.add('open');
}

function closeSakitModal() {
  sakitModal.classList.remove('open');

  if (
    sakitPendingCtx &&
    sakitPendingCtx.btnGroup
  ) {
    sakitPendingCtx.btnGroup.forEach(
      btn => {
        btn.disabled = false;
      }
    );
  }

  sakitPendingCtx = null;
}

sakitPhotoInput.addEventListener(
  'change',
  async () => {
    const file =
      sakitPhotoInput.files &&
      sakitPhotoInput.files[0];

    if (!file) return;

    sakitError.textContent = '';
    sakitPhotoPreview.style.display = 'none';

    try {
      const dataUrl =
        await compressImageFile(
          file,
          640,
          0.55
        );

      sakitPendingPhotoDataUrl =
        dataUrl;

      sakitPhotoPreviewImg.src =
        dataUrl;

      sakitPhotoPreview.style.display =
        'block';
    } catch (e) {
      console.error(e);

      sakitPendingPhotoDataUrl =
        null;

      sakitError.textContent =
        'Gagal memproses foto. Coba pilih foto lain.';
    }
  }
);

sakitSubmitBtn.addEventListener(
  'click',
  async () => {
    if (!sakitPendingCtx) return;

    const text =
      sakitTextInput.value.trim();

    if (!text) {
      sakitError.textContent =
        'Keterangan wajib diisi.';
      return;
    }

    if (!sakitPendingPhotoDataUrl) {
      sakitError.textContent =
        'Foto bukti wajib dilampirkan.';
      return;
    }

    sakitError.textContent = '';
    sakitSubmitBtn.disabled = true;
    sakitSubmitBtn.textContent =
      'Mengirim...';

    const {
      date,
      student
    } = sakitPendingCtx;

    const session =
      currentSessionInfo();

    try {
      const detail = {
        text,
        photo:
          sakitPendingPhotoDataUrl,
        by:
          session.name ||
          student.name,
        at: Date.now()
      };

      const result =
        await saveAttendanceWithOfflineQueue({
          date,
          studentName:
            student.name,
          status: 'S',
          action: 'set',
          detail
        });

      if (!result.queued) {
        await sakitDetailDocRef(
          date,
          student.name
        ).set(detail);

        writeNotifikasi(
          'sakit',
          student.name,
          date
        );
      }

      flashSaved(date);
      closeSakitModal();
    } catch (e) {
      console.error(e);

      sakitError.textContent =
        'Gagal menyimpan. Data tetap tidak dianggap Alpa. Coba lagi saat koneksi tersedia.';

      sakitSubmitBtn.disabled = false;
      sakitSubmitBtn.textContent =
        'Kirim & Tandai Sakit';
    }
  }
);

sakitCancelBtn.addEventListener(
  'click',
  closeSakitModal
);

sakitCloseBtn.addEventListener(
  'click',
  closeSakitModal
);

sakitModal.addEventListener(
  'click',
  e => {
    if (e.target === sakitModal) {
      closeSakitModal();
    }
  }
);

const sakitViewModal =
  document.getElementById(
    'sakitViewModal'
  );

const sakitViewClose =
  document.getElementById(
    'sakitViewClose'
  );

const sakitViewName =
  document.getElementById(
    'sakitViewName'
  );

const sakitViewDate =
  document.getElementById(
    'sakitViewDate'
  );

const sakitViewStatus =
  document.getElementById(
    'sakitViewStatus'
  );

const sakitViewText =
  document.getElementById(
    'sakitViewText'
  );

const sakitViewPhoto =
  document.getElementById(
    'sakitViewPhoto'
  );

async function openSakitViewModal(
  date,
  student
) {
  if (!canViewSiswaDetail()) {
    return;
  }

  sakitViewName.textContent =
    student.name;

  sakitViewDate.textContent =
    date;

  sakitViewStatus.style.display =
    'block';

  sakitViewStatus.textContent =
    'Memuat...';

  sakitViewText.style.display =
    'none';

  sakitViewPhoto.style.display =
    'none';

  sakitViewModal.classList.add(
    'open'
  );

  try {
    let snap =
      await sakitDetailDocRef(
        date,
        student.name
      ).get();

    if (!snap.exists) {
      snap =
        await legacySakitDetailDocRef(
          date,
          student.name
        ).get();
    }

    if (!snap.exists) {
      sakitViewStatus.textContent =
        'Belum ada keterangan/foto tersimpan untuk sakit ini.';
      return;
    }

    const data =
      snap.data();

    sakitViewStatus.style.display =
      'none';

    sakitViewText.textContent =
      data.text ||
      '(tanpa keterangan)';

    sakitViewText.style.display =
      'block';

    if (data.photo) {
      sakitViewPhoto.src =
        data.photo;

      sakitViewPhoto.style.display =
        'block';
    }
  } catch (e) {
    console.error(e);

    sakitViewStatus.textContent =
      'Gagal memuat detail sakit. Cek koneksi internet.';
  }
}

sakitViewClose.addEventListener(
  'click',
  () =>
    sakitViewModal.classList.remove(
      'open'
    )
);

sakitViewModal.addEventListener(
  'click',
  e => {
    if (
      e.target ===
      sakitViewModal
    ) {
      sakitViewModal.classList.remove(
        'open'
      );
    }
  }
);

const notifPanel =
  document.getElementById(
    'notifPanel'
  );

const notifBadge =
  document.getElementById(
    'notifBadge'
  );

const notifList =
  document.getElementById(
    'notifList'
  );

const notifEmpty =
  document.getElementById(
    'notifEmpty'
  );

const NOTIF_MAX_AGE_MS =
  3 * 24 * 60 * 60 * 1000;

function timeAgoLabel(ms) {
  const diff =
    Date.now() - ms;

  const hours =
    Math.floor(
      diff / 3600000
    );

  if (hours < 1) {
    return 'baru saja';
  }

  if (hours < 24) {
    return `${hours} jam lalu`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  return days === 1
    ? 'kemarin'
    : `${days} hari lalu`;
}

function renderNotifikasi(snap) {
  notifList.innerHTML = '';

  const session =
    currentSessionInfo();

  const activeClassId =
    getActiveClassId(session);

  const docs = [];

  snap.forEach(doc => {
    const d = doc.data();

    const visible =
      d.classId
        ? (
            d.classId === 'ALL' ||
            d.classId === activeClassId
          )
        : session.role === 'admin';

    if (visible) {
      docs.push({
        id: doc.id,
        ...d
      });
    }
  });

  notifBadge.textContent =
    docs.length;

  if (docs.length === 0) {
    notifEmpty.style.display =
      'block';
    return;
  }

  notifEmpty.style.display =
    'none';

  docs.forEach(d => {
    const typeLabel =
      d.type === 'sakit'
        ? 'sakit'
        : d.type === 'keluar'
          ? 'keluar area sebelum jam pulang'
          : 'izin';

    const typeIcon =
      d.type === 'sakit'
        ? '🩹'
        : d.type === 'keluar'
          ? '🚨'
          : '📄';

    const item =
      document.createElement(
        'div'
      );

    item.className =
      `notif-item ${d.type}`;

    item.innerHTML = `
      <span class="notif-icon">
        ${typeIcon}
      </span>

      <div class="notif-body">
        <div class="notif-name">
          ${d.studentName || '-'}
          ${typeLabel}
        </div>

        <div class="notif-meta">
          ${d.date || ''}
          ·
          ${timeAgoLabel(
            d.createdAtMs || 0
          )}
        </div>
      </div>
    `;

    item.addEventListener(
      'click',
      () => {
        const studentObj = {
          name: d.studentName
        };

        if (
          d.type === 'sakit'
        ) {
          openSakitViewModal(
            d.date,
            studentObj
          );
        } else if (
          d.type === 'izin'
        ) {
          openIzinViewModal(
            d.date,
            studentObj
          );
        }
      }
    );

    notifList.appendChild(item);
  });
}

let unsubscribeNotif = null;
let notifRefreshTimer = null;

function listenNotifikasi() {
  if (unsubscribeNotif) {
    unsubscribeNotif();
    unsubscribeNotif = null;
  }

  const cutoff =
    Date.now() -
    NOTIF_MAX_AGE_MS;

  unsubscribeNotif =
    db.collection('notifikasi')
      .where(
        'createdAtMs',
        '>=',
        cutoff
      )
      .orderBy(
        'createdAtMs',
        'desc'
      )
      .limit(30)
      .onSnapshot(
        renderNotifikasi,
        err =>
          console.error(
            'notifikasi:',
            err
          )
      );
}

function updateNotifPanelVisibility() {
  if (!notifPanel) return;

  const show =
    canViewSiswaDetail();

  notifPanel.style.display =
    show ? 'block' : 'none';

  if (show) {
    listenNotifikasi();

    if (!notifRefreshTimer) {
      notifRefreshTimer =
        setInterval(
          listenNotifikasi,
          60 * 60 * 1000
        );
    }
  } else {
    if (unsubscribeNotif) {
      unsubscribeNotif();
      unsubscribeNotif = null;
    }

    if (notifRefreshTimer) {
      clearInterval(
        notifRefreshTimer
      );

      notifRefreshTimer = null;
    }
  }
}

const rekapBtn =
  document.getElementById(
    'rekapBtn'
  );

const rekapModal =
  document.getElementById(
    'rekapModal'
  );

const rekapClose =
  document.getElementById(
    'rekapClose'
  );

const rekapTitle =
  document.getElementById(
    'rekapTitle'
  );

const rekapLoading =
  document.getElementById(
    'rekapLoading'
  );

const rekapTableWrap =
  document.getElementById(
    'rekapTableWrap'
  );

const rekapTbody =
  document.getElementById(
    'rekapTbody'
  );

const rekapEmpty =
  document.getElementById(
    'rekapEmpty'
  );

const rekapDownload =
  document.getElementById(
    'rekapDownload'
  );

const rekapDaysNote =
  document.getElementById(
    'rekapDaysNote'
  );

const rekapDownloadPdfBtn =
  document.getElementById(
    'rekapDownloadPdf'
  );

let rekapCurrentData = null;

function daysInMonth(y, m) {
  return new Date(
    y,
    m,
    0
  ).getDate();
}

async function openRekap() {
  const session =
    currentSessionInfo();

  if (
    session.role !== 'admin'
  ) {
    return;
  }

  const monthVal =
    absenMonthSelect.value;

  const [
    y,
    m
  ] =
    monthVal
      .split('-')
      .map(Number);

  rekapTitle.textContent =
    `${bulanNama[m - 1]} ${y}`;

  rekapDaysNote.textContent =
    '';

  rekapCurrentData =
    null;

  rekapModal.classList.add(
    'open'
  );

  rekapLoading.style.display =
    'block';

  rekapLoading.textContent =
    'Memuat data...';

  rekapTableWrap.style.display =
    'none';

  rekapEmpty.style.display =
    'none';

  rekapDownload.disabled =
    true;

  rekapDownloadPdfBtn.disabled =
    true;

  const classId =
    getActiveClassId(
      session
    );

  if (!classId) {
    rekapLoading.style.display =
      'none';

    rekapEmpty.textContent =
      'Kelas aktif belum tersedia.';

    rekapEmpty.style.display =
      'block';

    return;
  }

  const startId =
    `${classId}_${monthVal}-01`;

  const endId =
    `${classId}_${monthVal}-${pad2(
      daysInMonth(y, m)
    )}`;

  try {
    const snap =
      await db
        .collection('absensi')
        .where(
          firebase.firestore.FieldPath.documentId(),
          '>=',
          startId
        )
        .where(
          firebase.firestore.FieldPath.documentId(),
          '<=',
          endId
        )
        .get();

    rekapLoading.style.display =
      'none';

    if (snap.empty) {
      rekapEmpty.textContent =
        'Belum ada data absensi tercatat pada bulan ini.';

      rekapEmpty.style.display =
        'block';

      return;
    }

    const recordedDays =
      snap.size;

    const counts = {};

    kelasLengkap.forEach(
      student => {
        counts[
          student.name
        ] = {
          H: 0,
          S: 0,
          I: 0,
          A: 0
        };
      }
    );

    snap.forEach(doc => {
      const dayData =
        doc.data();

      kelasLengkap.forEach(
        student => {
          const status =
            dayData[
              student.name
            ];

          if (
            status &&
            counts[
              student.name
            ][status] !==
              undefined
          ) {
            counts[
              student.name
            ][status]++;
          }
        }
      );
    });

    rekapTbody.innerHTML =
      '';

    const rowsForCsv =
      [];

    kelasLengkap.forEach(
      (student, index) => {
        const c =
          counts[
            student.name
          ];

        const tercatat =
          c.H +
          c.S +
          c.I +
          c.A;

        const belum =
          Math.max(
            recordedDays -
              tercatat,
            0
          );

        const pct =
          recordedDays > 0
            ? Math.round(
                (c.H /
                  recordedDays) *
                  100
              )
            : 0;

        const tr =
          document.createElement(
            'tr'
          );

        tr.innerHTML = `
          <td>
            ${String(
              index + 1
            ).padStart(
              2,
              '0'
            )}
          </td>

          <td>
            ${student.name}
            ${
              student.jabatan
                ? `
                  <span class="rekap-jab">
                    ${student.jabatan}
                  </span>
                `
                : ''
            }
          </td>

          <td class="c-h">
            ${c.H}
          </td>

          <td class="c-s">
            ${c.S}
          </td>

          <td class="c-i">
            ${c.I}
          </td>

          <td class="c-a">
            ${c.A}
          </td>

          <td>
            ${belum}
          </td>

          <td>
            ${pct}%
          </td>
        `;

        rekapTbody.appendChild(
          tr
        );

        rowsForCsv.push({
          no: index + 1,
          nama: student.name,
          H: c.H,
          S: c.S,
          I: c.I,
          A: c.A,
          belum,
          pct
        });
      }
    );

    rekapTableWrap.style.display =
      'block';

    rekapDaysNote.textContent =
      `${recordedDays} hari tercatat dari ${daysInMonth(
        y,
        m
      )} hari total di bulan ini.`;

    rekapDownload.disabled =
      false;

    rekapDownloadPdfBtn.disabled =
      false;

    rekapCurrentData = {
      monthLabel:
        `${bulanNama[
          m - 1
        ]}_${y}`.toLowerCase(),

      rows:
        rowsForCsv
    };
  } catch (e) {
    console.error(e);

    rekapLoading.style.display =
      'none';

    rekapEmpty.textContent =
      'Gagal memuat data rekap. Cek koneksi internet lalu coba lagi.';

    rekapEmpty.style.display =
      'block';
  }
}

rekapBtn.addEventListener(
  'click',
  openRekap
);

rekapClose.addEventListener(
  'click',
  () =>
    rekapModal.classList.remove(
      'open'
    )
);

rekapModal.addEventListener(
  'click',
  e => {
    if (
      e.target ===
      rekapModal
    ) {
      rekapModal.classList.remove(
        'open'
      );
    }
  }
);

document.addEventListener(
  'keydown',
  e => {
    if (
      e.key === 'Escape'
    ) {
      rekapModal.classList.remove(
        'open'
      );
    }
  }
);

rekapDownload.addEventListener(
  'click',
  () => {
    if (!rekapCurrentData)
      return;

    const header = [
      'No',
      'Nama',
      'Hadir',
      'Sakit',
      'Izin',
      'Alpa',
      'Belum Tercatat',
      '% Hadir'
    ];

    const lines = [
      header.join(',')
    ];

    rekapCurrentData.rows.forEach(
      row => {
        lines.push(
          [
            row.no,
            `"${row.nama}"`,
            row.H,
            row.S,
            row.I,
            row.A,
            row.belum,
            `${row.pct}%`
          ].join(',')
        );
      }
    );

    const csvContent =
      lines.join('\r\n');

    const blob =
      new Blob(
        [
          '\ufeff' +
          csvContent
        ],
        {
          type:
            'text/csv;charset=utf-8;'
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const a =
      document.createElement(
        'a'
      );

    a.href = url;

    a.download =
      `rekap-absensi-${rekapCurrentData.monthLabel}.csv`;

    document.body.appendChild(
      a
    );

    a.click();

    document.body.removeChild(
      a
    );

    URL.revokeObjectURL(
      url
    );
  }
);

rekapDownloadPdfBtn.addEventListener(
  'click',
  () => {
    if (
      !rekapCurrentData ||
      !window.jspdf
    ) {
      return;
    }

    const {
      jsPDF
    } = window.jspdf;

    const doc =
      new jsPDF();

    doc.setFontSize(14);

    doc.text(
      'Rekap Absensi - Aventra Class',
      14,
      16
    );

    doc.setFontSize(10);

    doc.text(
      rekapTitle.textContent,
      14,
      23
    );

    doc.autoTable({
      startY: 28,

      head: [[
        'No',
        'Nama',
        'Hadir',
        'Sakit',
        'Izin',
        'Alpa',
        'Belum',
        '% Hadir'
      ]],

      body:
        rekapCurrentData.rows.map(
          row => [
            row.no,
            row.nama,
            row.H,
            row.S,
            row.I,
            row.A,
            row.belum,
            `${row.pct}%`
          ]
        ),

      styles: {
        fontSize: 9
      },

      headStyles: {
        fillColor: [
          242,
          183,
          5
        ],

        textColor: [
          10,
          13,
          26
        ]
      }
    });

    doc.save(
      `rekap-absensi-${rekapCurrentData.monthLabel}.pdf`
    );
  }
);

absenResetBtn.addEventListener(
  'click',
  async () => {
    const session =
      currentSessionInfo();

    if (
      session.role !== 'admin'
    ) {
      alert(
        'Hanya admin yang dapat mereset data absensi.'
      );
      return;
    }

    const date =
      absenDateInput.value ||
      todayStr();

    if (
      !confirm(
        `Hapus data absensi untuk tanggal ${date}?`
      )
    ) {
      return;
    }

    try {
      const ref =
        absenDocRef(date);

      if (!ref) {
        throw new Error(
          'Kelas aktif belum tersedia.'
        );
      }

      await ref.delete();
    } catch (e) {
      console.error(e);

      alert(
        'Gagal menghapus data. Cek koneksi internet.'
      );
    }
  }
);

const sections =
  document.querySelectorAll(
    'section[id], header[id]'
  );

const navA =
  document.querySelectorAll(
    '.nav-links a'
  );

const spy =
  new IntersectionObserver(
    entries => {
      entries.forEach(
        entry => {
          if (
            entry.isIntersecting
          ) {
            navA.forEach(
              a =>
                a.classList.remove(
                  'active'
                )
            );

            const match =
              document.querySelector(
                `.nav-links a[href="#${entry.target.id}"]`
              );

            if (match) {
              match.classList.add(
                'active'
              );
            }
          }
        }
      );
    },
    {
      rootMargin:
        '-45% 0px -45% 0px'
    }
  );

sections.forEach(
  section =>
    spy.observe(section)
);

const revealEls =
  document.querySelectorAll(
    '.reveal'
  );

const revealer =
  new IntersectionObserver(
    entries => {
      entries.forEach(
        entry => {
          if (
            entry.isIntersecting
          ) {
            entry.target.classList.add(
              'in'
            );

            revealer.unobserve(
              entry.target
            );
          }
        }
      );
    },
    {
      threshold: 0.12
    }
  );

revealEls.forEach(
  element =>
    revealer.observe(element)
);

const THEME_KEY =
  'aventraTheme';

const themeToggleBtn =
  document.getElementById(
    'themeToggle'
  );

function applyTheme(theme) {
  document.body.classList.toggle(
    'light-mode',
    theme === 'light'
  );

  themeToggleBtn.textContent =
    theme === 'light'
      ? '☀️'
      : '🌙';
}

(function initTheme() {
  let saved = null;

  try {
    saved =
      localStorage.getItem(
        THEME_KEY
      );
  } catch (e) {}

  applyTheme(
    saved === 'light'
      ? 'light'
      : 'dark'
  );
})();

themeToggleBtn.addEventListener(
  'click',
  () => {
    const next =
      document.body.classList.contains(
        'light-mode'
      )
        ? 'dark'
        : 'light';

    applyTheme(next);

    try {
      localStorage.setItem(
        THEME_KEY,
        next
      );
    } catch (e) {}
  }
);

const geoAdminStatus =
  document.getElementById('geoAdminStatus');

geoUseLocationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Perangkat/browser ini tidak mendukung deteksi lokasi.');
    return;
  }

  geoAdminStatus.textContent =
    'Mendeteksi lokasi...';

  navigator.geolocation.getCurrentPosition(
    pos => {
      geoLatInput.value =
        pos.coords.latitude.toFixed(6);

      geoLngInput.value =
        pos.coords.longitude.toFixed(6);

      if (geoMap) {
        const ll = [
          pos.coords.latitude,
          pos.coords.longitude
        ];

        geoMap.setView(ll, 17);
        geoMarker.setLatLng(ll);
        geoCircle.setLatLng(ll);
      }

      const acc =
        Math.round(pos.coords.accuracy);

      if (acc > 300) {
        geoAdminStatus.innerHTML =
          `⚠️ Akurasi lemah (±${acc}m). Sebaiknya ulangi menggunakan HP di sekolah.`;

        geoAdminStatus.style.color =
          'var(--gold-soft)';
      } else {
        geoAdminStatus.innerHTML =
          `Lokasi terdeteksi (akurasi ±${acc}m). Klik Simpan Pengaturan.`;

        geoAdminStatus.style.color = '';
      }
    },

    err => {
      geoAdminStatus.textContent =
        'Gagal mendeteksi lokasi: ' +
        (
          err &&
          err.message
            ? err.message
            : 'izin ditolak.'
        );
    },

    {
      enableHighAccuracy: true,
      timeout: 15000
    }
  );
});

geoSaveSettingsBtn.addEventListener(
  'click',
  async () => {
    const lat =
      parseFloat(
        geoLatInput.value
      );

    const lng =
      parseFloat(
        geoLngInput.value
      );

    const radius =
      parseInt(
        geoRadiusInput.value,
        10
      ) || 120;

    const minutes =
      parseInt(
        geoMinutesInput.value,
        10
      ) || 3;

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng)
    ) {
      alert(
        'Klik "Pakai Lokasi Saya Sekarang" atau pilih titik di peta dulu.'
      );
      return;
    }

    geoSaveSettingsBtn.disabled =
      true;

    try {
      await geofenceDocRef().set({
        lat,
        lng,
        radius,
        minutes
      });

      geoAdminStatus.textContent =
        'Tersimpan ✓';

      setTimeout(() => {
        geoAdminStatus.textContent =
          '';
      }, 3000);
    } catch (e) {
      console.error(e);

      alert(
        'Gagal menyimpan pengaturan lokasi: ' +
        (
          e && e.message
            ? e.message
            : e
        )
      );
    }

    geoSaveSettingsBtn.disabled =
      false;
  }
);

function setGeoStatus(
  msg,
  type
) {
  geoStatusLine.textContent =
    msg;

  geoStatusLine.className =
    'geo-status-line show' +
    (
      type
        ? ` ${type}`
        : ''
    );
}

function broadcastLiveLocation(
  pos,
  dist,
  acc
) {
  const session =
    currentSessionInfo();

  if (
    !session.role ||
    session.role === 'admin' ||
    !session.name
  ) {
    return;
  }

  const now =
    Date.now();

  if (
    now - geoLastLiveWriteTs <
    4000
  ) {
    return;
  }

  geoLastLiveWriteTs =
    now;

  const bearing =
    (
      geofenceSettings &&
      geofenceSettings.lat != null
    )
      ? bearingDegrees(
          geofenceSettings.lat,
          geofenceSettings.lng,
          pos.coords.latitude,
          pos.coords.longitude
        )
      : 0;

  const classId =
    getActiveClassId(
      session
    );

  if (!classId) {
    return;
  }

  const liveLocationDocId =
    `${classId}__${buildSafeStudentKey(
      session.name
    )}`;

  db.collection('liveLocation')
    .doc(liveLocationDocId)
    .set({
      name: session.name,
      classId,
      lat:
        pos.coords.latitude,
      lng:
        pos.coords.longitude,
      dist:
        Math.round(dist),
      bearing:
        Math.round(bearing),
      acc,
      updatedAt: now
    })
    .catch(
      e =>
        console.error(
          'liveLocation write:',
          e
        )
    );
}

function clearLiveLocation() {
  const session =
    currentSessionInfo();

  if (
    !session.role ||
    session.role === 'admin' ||
    !session.name
  ) {
    return;
  }

  const classId =
    getActiveClassId(
      session
    );

  if (!classId) {
    return;
  }

  const liveLocationDocId =
    `${classId}__${buildSafeStudentKey(
      session.name
    )}`;

  db.collection('liveLocation')
    .doc(liveLocationDocId)
    .delete()
    .catch(() => {});
}

function stopGeoWatch(
  clearMsg
) {
  if (
    geoWatchId !== null
  ) {
    navigator.geolocation.clearWatch(
      geoWatchId
    );

    geoWatchId = null;
  }

  if (geoFirstFixTimer) {
    clearTimeout(
      geoFirstFixTimer
    );

    geoFirstFixTimer = null;
  }

  geoInsideSince =
    null;

  geoOutsideStreak =
    0;

  if (geoCountdownTimer) {
    clearInterval(
      geoCountdownTimer
    );

    geoCountdownTimer =
      null;
  }

  geoActivateBtn.style.display =
    'inline-flex';

  geoStopBtn.style.display =
    'none';

  clearLiveLocation();

  if (clearMsg) {
    geoStatusLine.classList.remove(
      'show'
    );
  }
}

let postAbsenWatchId =
  null;

let postAbsenOutsideStreak =
  0;

function startPostAbsenWatch(
  session
) {
  const now =
    new Date();

  if (
    now.getHours() >= 13
  ) {
    return;
  }

  if (
    postAbsenWatchId !==
    null
  ) {
    return;
  }

  postAbsenOutsideStreak =
    0;

  postAbsenWatchId =
    navigator.geolocation.watchPosition(
      pos =>
        handlePostAbsenPosition(
          pos,
          session
        ),
      () => {},
      {
        enableHighAccuracy:
          false,
        maximumAge:
          30000,
        timeout:
          20000
      }
    );
}

function stopPostAbsenWatch() {
  if (
    postAbsenWatchId !==
    null
  ) {
    navigator.geolocation.clearWatch(
      postAbsenWatchId
    );

    postAbsenWatchId =
      null;
  }
}

function handlePostAbsenPosition(
  pos,
  session
) {
  const now =
    new Date();

  if (
    now.getHours() >= 13
  ) {
    stopPostAbsenWatch();
    return;
  }

  if (
    !geofenceSettings ||
    geofenceSettings.lat ==
      null
  ) {
    return;
  }

  const dist =
    haversineMeters(
      pos.coords.latitude,
      pos.coords.longitude,
      geofenceSettings.lat,
      geofenceSettings.lng
    );

  const radius =
    geofenceSettings.radius ||
    120;

  if (
    dist > radius
  ) {
    postAbsenOutsideStreak++;

    if (
      postAbsenOutsideStreak ===
      3
    ) {
      writeNotifikasi(
        'keluar',
        session.name,
        todayStr()
      );
    }
  } else {
    postAbsenOutsideStreak =
      0;
  }
}

async function finishAutoAbsen(
  session
) {
  stopGeoWatch(false);

  const date =
    todayStr();

  try {
    const result =
      await saveAttendanceWithOfflineQueue({
        date,
        studentName:
          session.name,
        status: 'H',
        action: 'set'
      });

    setGeoStatus(
      result.queued
        ? '📦 Koneksi belum tersedia. Absen disimpan sementara dan akan dikirim saat online.'
        : '🎉 Absen otomatis berhasil! Kamu tercatat Hadir.',
      result.queued
        ? 'warn'
        : 'success'
    );

    startPostAbsenWatch(
      session
    );
  } catch (e) {
    console.error(e);

    setGeoStatus(
      'Gagal menyimpan absen otomatis. Data tidak diubah menjadi Alpa.',
      'err'
    );
  }
}

function tickCountdown() {
  if (
    !geofenceSettings ||
    geoInsideSince ===
      null
  ) {
    return;
  }

  const minutesRequired =
    geofenceSettings.minutes ||
    3;

  const elapsedMs =
    Date.now() -
    geoInsideSince;

  const remainingMs =
    Math.max(
      minutesRequired *
        60000 -
        elapsedMs,
      0
    );

  if (
    remainingMs <= 0
  ) {
    finishAutoAbsen(
      currentSessionInfo()
    );

    return;
  }

  const remMin =
    Math.floor(
      remainingMs /
        60000
    );

  const remSec =
    Math.floor(
      (remainingMs % 60000) /
        1000
    );

  setGeoStatus(
    `✅ Terdeteksi di area sekolah — tunggu ${remMin}:${String(
      remSec
    ).padStart(
      2,
      '0'
    )} lagi tanpa keluar area...`,
    'ok'
  );
}

function handleGeoPosition(
  pos
) {
  if (
    geoFirstFixTimer
  ) {
    clearTimeout(
      geoFirstFixTimer
    );

    geoFirstFixTimer =
      null;
  }

  if (
    !geofenceSettings ||
    geofenceSettings.lat ==
      null
  ) {
    setGeoStatus(
      'Lokasi sekolah belum diatur oleh admin.',
      'warn'
    );

    stopGeoWatch(false);
    return;
  }

  const dist =
    haversineMeters(
      pos.coords.latitude,
      pos.coords.longitude,
      geofenceSettings.lat,
      geofenceSettings.lng
    );

  const radius =
    geofenceSettings.radius ||
    120;

  const acc =
    Math.round(
      pos.coords.accuracy ||
        0
    );

  broadcastLiveLocation(
    pos,
    dist,
    acc
  );

  if (
    dist <= radius
  ) {
    geoOutsideStreak =
      0;

    if (
      geoInsideSince ===
      null
    ) {
      geoInsideSince =
        Date.now();
    }

    tickCountdown();
  } else {
    geoOutsideStreak++;

    if (
      geoInsideSince !==
        null &&
      geoOutsideStreak >= 2
    ) {
      geoInsideSince =
        null;

      setGeoStatus(
        '📍 Kamu terdeteksi keluar area sekolah — hitungan dibatalkan. Kembali ke area sekolah untuk mulai ulang otomatis.',
        'warn'
      );
    } else if (
      geoInsideSince !==
      null
    ) {
      tickCountdown();
    } else {
      let msg =
        `Belum berada di area sekolah (jarak ±${Math.round(
          dist
        )}m dari titik sekolah, akurasi GPS ±${acc}m).`;

      if (
        acc > 100
      ) {
        msg +=
          ' Sinyal GPS lemah — coba pindah ke tempat terbuka untuk hasil lebih akurat.';
      }

      setGeoStatus(
        msg,
        'warn'
      );
    }
  }
}

function handleGeoError(
  err
) {
  let msg =
    'Gagal mendeteksi lokasi.';

  if (
    err &&
    err.code === 1
  ) {
    msg =
      'Izin lokasi ditolak. Aktifkan izin lokasi untuk browser ini di pengaturan HP, lalu coba lagi.';
  } else if (
    err &&
    err.code === 2
  ) {
    msg =
      'Lokasi tidak tersedia. Pastikan GPS/Lokasi HP menyala.';
  } else if (
    err &&
    err.code === 3
  ) {
    msg =
      'Waktu deteksi lokasi habis. Coba lagi.';
  }

  setGeoStatus(
    msg,
    'err'
  );

  stopGeoWatch(false);
}

geoActivateBtn.addEventListener(
  'click',
  () => {
    if (
      isWeekendDate(
        todayStr()
      )
    ) {
      alert(
        'Absensi GPS tidak tersedia pada hari Minggu.'
      );
      return;
    }

    if (
      !navigator.geolocation
    ) {
      alert(
        'Perangkat/browser ini tidak mendukung deteksi lokasi.'
      );
      return;
    }

    if (
      !geofenceSettings ||
      geofenceSettings.lat ==
        null
    ) {
      alert(
        'Lokasi sekolah belum diatur oleh admin. Minta admin mengatur lokasi dulu di halaman Absensi.'
      );
      return;
    }

    geoActivateBtn.style.display =
      'none';

    geoStopBtn.style.display =
      'inline-block';

    setGeoStatus(
      'Meminta izin lokasi...',
      'warn'
    );

    geoFirstFixTimer =
      setTimeout(
        () => {
          setGeoStatus(
            'Masih mencari sinyal GPS... ini wajar sampai 30 detik. Coba pindah lebih dekat jendela/luar ruangan kalau terlalu lama.',
            'warn'
          );
        },
        6000
      );

    geoWatchId =
      navigator.geolocation.watchPosition(
        handleGeoPosition,
        handleGeoError,
        {
          enableHighAccuracy:
            true,
          maximumAge:
            5000,
          timeout:
            30000
        }
      );

    geoCountdownTimer =
      setInterval(
        tickCountdown,
        1000
      );
  }
);

geoStopBtn.addEventListener(
  'click',
  () =>
    stopGeoWatch(true)
);

function updateGeoPanels(
  date,
  session
) {
  const isAdmin =
    session.role ===
    'admin';

  geoAdminBox.style.display =
    isAdmin
      ? 'block'
      : 'none';

  if (isAdmin) {
    geoStudentBox.style.display =
      'none';

    return;
  }

  if (
    session.role ===
    'guest'
  ) {
    geoStudentBox.style.display =
      'none';

    return;
  }

  const isToday =
    date === todayStr();

  const alreadySet =
    !!(
      currentDayData &&
      currentDayData[
        session.name
      ]
    );

  const todayIsWeekend =
    isWeekendDate(
      todayStr()
    );

  if (
    isToday &&
    !alreadySet &&
    !todayIsWeekend
  ) {
    geoStudentBox.style.display =
      'block';
  } else {
    geoStudentBox.style.display =
      'none';

    if (
      alreadySet ||
      todayIsWeekend
    ) {
      stopGeoWatch(true);
    }
  }
}

geoActivateBtn.addEventListener(
  'click',
  () => {
    if (
      isWeekendDate(
        todayStr()
      )
    ) {
      alert(
        'Absensi GPS tidak tersedia pada hari Minggu.'
      );
      return;
    }

    if (
      !navigator.geolocation
    ) {
      alert(
        'Perangkat/browser ini tidak mendukung deteksi lokasi.'
      );
      return;
    }

    if (
      !geofenceSettings ||
      geofenceSettings.lat ==
        null
    ) {
      alert(
        'Lokasi sekolah belum diatur oleh admin. Minta admin mengatur lokasi dulu di halaman Absensi.'
      );
      return;
    }

    geoActivateBtn.style.display =
      'none';

    geoStopBtn.style.display =
      'inline-block';

    setGeoStatus(
      'Meminta izin lokasi...',
      'warn'
    );

    geoFirstFixTimer =
      setTimeout(
        () => {
          setGeoStatus(
            'Masih mencari sinyal GPS... ini wajar sampai 30 detik. Coba pindah lebih dekat jendela/luar ruangan kalau terlalu lama.',
            'warn'
          );
        },
        6000
      );

    geoWatchId =
      navigator.geolocation.watchPosition(
        handleGeoPosition,
        handleGeoError,
        {
          enableHighAccuracy:
            true,
          maximumAge:
            5000,
          timeout:
            30000
        }
      );

    geoCountdownTimer =
      setInterval(
        tickCountdown,
        1000
      );
  }
);

geoStopBtn.addEventListener(
  'click',
  () =>
    stopGeoWatch(true)
);

function updateGeoPanels(
  date,
  session
) {
  const isAdmin =
    session.role ===
    'admin';

  geoAdminBox.style.display =
    isAdmin
      ? 'block'
      : 'none';

  if (isAdmin) {
    geoStudentBox.style.display =
      'none';

    return;
  }

  if (
    session.role ===
    'guest'
  ) {
    geoStudentBox.style.display =
      'none';

    return;
  }

  const isToday =
    date === todayStr();

  const alreadySet =
    !!(
      currentDayData &&
      currentDayData[
        session.name
      ]
    );

  const todayIsWeekend =
    isWeekendDate(
      todayStr()
    );

  if (
    isToday &&
    !alreadySet &&
    !todayIsWeekend
  ) {
    geoStudentBox.style.display =
      'block';
  } else {
    geoStudentBox.style.display =
      'none';

    if (
      alreadySet ||
      todayIsWeekend
    ) {
      stopGeoWatch(true);
    }
  }
}
