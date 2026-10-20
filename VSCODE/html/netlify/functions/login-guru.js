const crypto = require('crypto');
const { promisify } = require('util');
const admin = require('firebase-admin');
const { directory } = require('../../js/teacher-directory');

const scrypt = promisify(crypto.scrypt);
const SCRYPT = { N: 16384, r: 8, p: 1, keyLength: 64, maxmem: 64 * 1024 * 1024 };
const allowedOrigins = ['http://localhost:5500', 'https://aventra-x-2026-web-bydandi.netlify.app'];

function headersFor(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
    Vary: 'Origin'
  };
  if (allowedOrigins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch { /* Handler reports missing Firebase configuration. */ }
}

function reply(statusCode, headers, payload) {
  return { statusCode, headers, body: JSON.stringify(payload) };
}

async function verifyPassword(password, encoded) {
  if (typeof encoded !== 'string') return false;
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt' || Number(parts[1]) !== SCRYPT.N ||
      Number(parts[2]) !== SCRYPT.r || Number(parts[3]) !== SCRYPT.p) return false;
  try {
    const salt = Buffer.from(parts[4], 'base64url');
    const expected = Buffer.from(parts[5], 'base64url');
    if (salt.length !== 16 || expected.length !== SCRYPT.keyLength) return false;
    const actual = await scrypt(password, salt, expected.length, SCRYPT);
    return crypto.timingSafeEqual(actual, expected);
  } catch { return false; }
}

function signSession(payload, secret) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('hex');
  return `${encoded}.${signature}`;
}

exports.handler = async event => {
  const headers = headersFor(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, headers, { ok: false, error: 'Method tidak diizinkan.' });
  if (!admin.apps.length) return reply(503, headers, { ok: false, error: 'Firebase Admin belum terkonfigurasi.' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return reply(400, headers, { ok: false, error: 'Permintaan login tidak valid.' }); }

  const teacherId = String(body.teacherId || '').trim();
  const teacherType = String(body.teacherType || '').trim();
  const password = String(body.password || '');
  const teacher = directory.find(item => item.id === teacherId);
  if (!teacher || !['piket', 'wali'].includes(teacherType) || !teacher.teacherTypes.includes(teacherType) || password.length < 8 || password.length > 128) {
    return reply(400, headers, { ok: false, error: 'Pilih nama, jenis akses, dan sandi guru yang valid.' });
  }

  const sessionSecret = process.env.SESSION_SECRET || '';
  if (!sessionSecret) return reply(503, headers, { ok: false, error: 'SESSION_SECRET belum dikonfigurasi di Netlify.' });

  try {
    const db = admin.firestore();
    const snapshot = await db.collection('teachers').doc(teacherId).get();
    const account = snapshot.exists ? snapshot.data() : null;
    if (!account || account.status !== 'active' || !await verifyPassword(password, account.passwordHash)) {
      return reply(401, headers, { ok: false, error: 'Nama atau sandi guru salah, atau akun belum disiapkan Admin.' });
    }

    const assignedClasses = teacherType === 'piket'
      ? (teacherDirectoryClassIds())
      : teacher.waliClasses;
    if (!assignedClasses.length) return reply(403, headers, { ok: false, error: 'Akun belum memiliki kelas tugas.' });
    const classId = teacherType === 'wali' ? assignedClasses[0] : null;
    const firebaseUid = `aventra-guru-${crypto.createHash('sha256').update(teacherId).digest('hex')}`;
    const expiry = Date.now() + 12 * 60 * 60 * 1000;
    const firebaseCustomToken = await admin.auth().createCustomToken(firebaseUid, {
      role: 'guru', accountId: teacherId, teacherId, teacherType, assignedClasses
    });
    const payload = { accountId: teacherId, firebaseUid, name: teacher.name, role: 'guru', teacherId, teacherType, classId, assignedClasses, expiry };
    return reply(200, headers, {
      ok: true, token: signSession(payload, sessionSecret), firebaseCustomToken, firebaseUid,
      accountId: teacherId, expiry, role: 'guru', name: teacher.name, teacherId, teacherType, classId, assignedClasses
    });
  } catch (error) {
    console.error('[login-guru] login error:', error);
    return reply(500, headers, { ok: false, error: 'Login guru gagal diproses. Coba lagi.' });
  }
};

function teacherDirectoryClassIds() {
  return Array.from({ length: 3 }, (_, gradeIndex) => [...'ABCDEFGHIJ'].map(letter => `${gradeIndex + 7}${letter}`)).flat();
}
