const fs = require('node:fs');
const path = require('node:path');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} = require('firebase/firestore');

const projectId = 'demo-aventra-rules';
const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules.draft'), 'utf8');
const envPromise = initializeTestEnvironment({
  projectId,
  firestore: { rules, host: '127.0.0.1', port: 8080 },
});

const ownName = 'Test Student';
const ownClass = '8A';
const attendancePath = 'absensi/8A_2026-10-20';
const ownDetailPath = 'izinDetail/8A_2026-10-20__Test Student';

function client(env, uid, claims) {
  return env.authenticatedContext(uid, claims).firestore();
}

async function seed(env) {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'students/student-a'), {
      name: ownName,
      classId: ownClass,
      active: true,
    });
    await setDoc(doc(db, attendancePath), {
      [ownName]: 'H',
      'Other Student': 'H',
    });
    await setDoc(doc(db, 'absensi/8B_2026-10-20'), { 'Student B': 'H' });
    await setDoc(doc(db, ownDetailPath), {
      text: 'Izin', photo: 'data:image/jpeg;base64,abc', by: ownName, at: Date.now(),
    });
    await setDoc(doc(db, 'izinDetail/8B_2026-10-20__Student B'), {
      text: 'Sakit', photo: 'data:image/jpeg;base64,abc', by: 'Student B', at: Date.now(),
    });
    await setDoc(doc(db, 'notifikasi/notif-a'), {
      type: 'izin', studentName: ownName, date: '2026-10-20', classId: ownClass,
      createdAtMs: Date.now(), createdAt: new Date(),
    });
    await setDoc(doc(db, 'notifikasi/notif-b'), {
      type: 'izin', studentName: 'Student B', date: '2026-10-20', classId: '8B',
      createdAtMs: Date.now(), createdAt: new Date(),
    });
    await setDoc(doc(db, 'pengumuman/announcement-a'), { classId: ownClass, text: 'Info 8A' });
    await setDoc(doc(db, 'pengumuman/announcement-b'), { classId: '8B', text: 'Info 8B' });
  });
}

async function run() {
  const env = await envPromise;
  let passed = 0;
  const check = async (label, action) => {
    await action();
    passed += 1;
    console.log(`PASS ${label}`);
  };

  try {
    await seed(env);
    const anon = env.unauthenticatedContext().firestore();
    const admin = client(env, 'admin-w', { role: 'admin', accountId: 'admin:wiarsayana' });
    const wali8A = client(env, 'teacher-a', { role: 'guru', assignedClasses: ['8A'] });
    const student8A = client(env, 'student-a', {
      role: 'student', classId: ownClass, studentId: 'student-a',
    });
    const student8B = client(env, 'student-b', {
      role: 'student', classId: '8B', studentId: 'student-b',
    });

    await check('unauthenticated read is denied', () => assertFails(getDoc(doc(anon, attendancePath))));
    await check('admin can read and write attendance', async () => {
      await assertSucceeds(getDoc(doc(admin, attendancePath)));
      await assertSucceeds(setDoc(doc(admin, 'absensi/9J_2026-10-20'), { 'Student Z': 'H' }));
    });
    await check('wali 8A can read 8A but not 8B attendance', async () => {
      await assertSucceeds(getDoc(doc(wali8A, attendancePath)));
      await assertFails(getDoc(doc(wali8A, 'absensi/8B_2026-10-20')));
    });
    await check('student can read own class and change only own attendance field', async () => {
      await assertSucceeds(getDoc(doc(student8A, attendancePath)));
      await assertSucceeds(updateDoc(doc(student8A, attendancePath), { [ownName]: 'S' }));
      await assertFails(updateDoc(doc(student8A, attendancePath), { 'Other Student': 'A' }));
      await assertFails(deleteDoc(doc(student8A, attendancePath)));
    });
    await check('student cannot write attendance for another class', () =>
      assertFails(setDoc(doc(student8A, 'absensi/8B_2026-10-21'), { [ownName]: 'H' })));
    await check('student can access own class-scoped health detail only', async () => {
      await assertSucceeds(getDoc(doc(student8A, ownDetailPath)));
      await assertSucceeds(setDoc(doc(student8A, ownDetailPath), {
        text: 'Izin keluarga', photo: 'data:image/jpeg;base64,abc', by: ownName, at: Date.now(),
      }));
      await assertFails(getDoc(doc(student8A, 'izinDetail/8B_2026-10-20__Student B')));
      await assertFails(getDoc(doc(student8B, ownDetailPath)));
    });
    await check('wali can read assigned detail but cannot write it', async () => {
      await assertSucceeds(getDoc(doc(wali8A, ownDetailPath)));
      await assertFails(setDoc(doc(wali8A, ownDetailPath), {
        text: 'ubah', photo: '', by: 'Teacher', at: Date.now(),
      }));
    });
    await check('student notification is limited to own identity/class and class queries', async () => {
      const ownNotice = doc(collection(student8A, 'notifikasi'));
      await assertSucceeds(setDoc(ownNotice, {
        type: 'izin', studentName: ownName, date: '2026-10-20', classId: ownClass,
        createdAtMs: Date.now(), createdAt: serverTimestamp(),
      }));
      await assertFails(setDoc(doc(collection(student8A, 'notifikasi')), {
        type: 'izin', studentName: 'Someone Else', date: '2026-10-20', classId: ownClass,
        createdAtMs: Date.now(), createdAt: serverTimestamp(),
      }));
      await assertSucceeds(getDocs(query(collection(student8A, 'notifikasi'), where('classId', '==', ownClass))));
      await assertFails(getDocs(collection(student8A, 'notifikasi')));
    });
    await check('class announcements are readable only in scope and not client-writable', async () => {
      await assertSucceeds(getDoc(doc(student8A, 'pengumuman/announcement-a')));
      await assertFails(getDoc(doc(student8A, 'pengumuman/announcement-b')));
      await assertFails(setDoc(doc(student8A, 'pengumuman/new'), { classId: ownClass, text: 'x' }));
    });
    await check('unmatched/private paths remain denied to clients', async () => {
      await assertFails(getDoc(doc(student8A, 'students/student-a')));
      await assertFails(getDoc(doc(student8A, 'piket/mingguan')));
      await assertFails(getDoc(doc(student8A, 'destinations/d1')));
      await assertFails(getDoc(doc(anon, 'bookings/b1')));
    });

    console.log(`\n${passed} test groups passed.`);
  } finally {
    await env.cleanup();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
