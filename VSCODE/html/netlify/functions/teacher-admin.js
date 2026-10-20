const crypto = require('crypto');
const { promisify } = require('util');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { verifySession } = require('./_verify-session');
const { directory, classIds } = require('../../js/teacher-directory');

const scrypt = promisify(crypto.scrypt);
const SCRYPT = { N: 16384, r: 8, p: 1, keyLength: 64, maxmem: 64 * 1024 * 1024 };
const allowedOrigins = ['http://localhost:5500', 'https://aventra-x-2026-web-bydandi.netlify.app'];

function headersFor(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
    Vary: 'Origin'
  };
  if (allowedOrigins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

if (!getApps().length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '');
    initializeApp({ credential: cert(serviceAccount) });
  } catch { /* Handler returns a configuration error below. */ }
}

function reply(statusCode, headers, payload) {
  return { statusCode, headers, body: JSON.stringify(payload) };
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, SCRYPT.keyLength, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

exports.handler = async event => {
  const headers = headersFor(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, headers, { ok: false, error: 'Method tidak diizinkan.' });
  const session = verifySession(event.headers?.authorization || event.headers?.Authorization);
  if (!session) return reply(401, headers, { ok: false, error: 'Sesi tidak valid atau sudah berakhir.' });
  if (session.role !== 'admin') return reply(403, headers, { ok: false, error: 'Hanya Admin yang dapat mengatur akun guru.' });
  if (!getApps().length) return reply(503, headers, { ok: false, error: 'Firebase Admin belum terkonfigurasi.' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return reply(400, headers, { ok: false, error: 'Permintaan tidak valid.' }); }

  try {
    const db = getFirestore();
    if (body.action === 'list') {
      const snapshot = await db.collection('teachers').get();
      const configured = new Set(snapshot.docs.filter(doc => doc.data().status === 'active').map(doc => doc.id));
      return reply(200, headers, {
        ok: true,
        teachers: directory.map(teacher => ({
          id: teacher.id,
          name: teacher.name,
          teacherTypes: teacher.teacherTypes,
          waliClasses: teacher.waliClasses,
          configured: configured.has(teacher.id)
        }))
      });
    }
    if (body.action !== 'set-password') return reply(400, headers, { ok: false, error: 'Aksi tidak dikenal.' });

    const teacherId = String(body.teacherId || '').trim();
    const password = String(body.password || '');
    const teacher = directory.find(item => item.id === teacherId);
    if (!teacher) return reply(400, headers, { ok: false, error: 'Nama guru tidak ditemukan di daftar tugas.' });
    if (password.length < 8 || password.length > 128) return reply(400, headers, { ok: false, error: 'Sandi harus berisi 8–128 karakter.' });

    const assignedClasses = teacher.teacherTypes.includes('piket') ? classIds : teacher.waliClasses;
    await db.collection('teachers').doc(teacher.id).set({
      name: teacher.name,
      teacherTypes: teacher.teacherTypes,
      waliClasses: teacher.waliClasses,
      assignedClasses,
      status: 'active',
      passwordHash: await hashPassword(password),
      updatedAt: Date.now(),
      updatedBy: session.accountId
    });
    return reply(200, headers, { ok: true, teacherId: teacher.id, name: teacher.name });
  } catch (error) {
    console.error('[teacher-admin] account management error:', error);
    return reply(500, headers, { ok: false, error: 'Pengaturan akun guru gagal disimpan.' });
  }
};
