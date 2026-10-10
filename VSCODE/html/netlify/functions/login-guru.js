
const crypto = require('crypto');
const admin = require('firebase-admin');

// Origin yang diizinkan.
const allowedOrigins = [
  'http://localhost:5500',
  'https://aventra-x-2026-web-bydandi.netlify.app'
];

function getCorsHeaders(event) {
  const origin =
    event.headers?.origin ||
    event.headers?.Origin ||
    '';

  const headers = {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin'
  };

  if (allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

// Inisialisasi Firebase Admin.
if (!admin.apps.length) {
  let serviceAccount;

  try {
    serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY || ''
    );
  } catch {
    serviceAccount = null;
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
}

function getDb() {
  if (!admin.apps.length) {
    return null;
  }

  return admin.firestore();
}

exports.handler = async (event) => {
  const corsHeaders = getCorsHeaders(event);

  // Menangani preflight CORS dari browser.
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: 'Method tidak diizinkan.'
      })
    };
  }

  let body;

  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: 'Request tidak valid.'
      })
    };
  }

  const GURU_PASSWORD =
    process.env.GURU_PASSWORD || '';

  const SESSION_SECRET =
    process.env.SESSION_SECRET || '';

  if (!GURU_PASSWORD) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error:
          'GURU_PASSWORD belum diatur di Environment Variables Netlify.'
      })
    };
  }

  if (!SESSION_SECRET) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error:
          'SESSION_SECRET belum diatur di Environment Variables Netlify.'
      })
    };
  }

  const password =
    String(body.password || '');

  if (
    !password ||
    password !== GURU_PASSWORD
  ) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: 'Password guru salah.'
      })
    };
  }

  const db = getDb();

  if (!db) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: 'Firebase Admin belum terkonfigurasi.'
      })
    };
  }

  let teacherId = null;
  let teacherName = 'Guru';
  let assignedClasses = [];

  try {
    const snapshot = await db
      .collection('teachers')
      .limit(2)
      .get();

    if (snapshot.size === 1) {
      const doc = snapshot.docs[0];
      const data = doc.data();

      teacherId = doc.id;

      teacherName =
        data.name ||
        data.nama ||
        'Guru';

      assignedClasses =
        Array.isArray(data.assignedClasses)
          ? data.assignedClasses
          : [];
    }

    if (snapshot.size > 1) {
      return {
        statusCode: 409,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error:
            'Terdapat lebih dari satu data guru. Login guru perlu identitas guru sebelum sistem dilanjutkan.'
        })
      };
    }

  } catch (error) {
    console.error(
      '[login-guru] Firestore error:',
      error
    );

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: 'Gagal membaca data guru.'
      })
    };
  }

  const classId =
    assignedClasses.length > 0
      ? assignedClasses[0]
      : '';

  // Token sesi berlaku selama 12 jam.
  const expiry =
    Date.now() +
    12 * 60 * 60 * 1000;

  const raw =
    `${teacherName}|guru|${classId}|${expiry}`;

  const sig = crypto
    .createHmac(
      'sha256',
      SESSION_SECRET
    )
    .update(raw)
    .digest('hex');

  const token = Buffer
    .from(`${raw}|${sig}`)
    .toString('base64');

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      ok: true,
      token,
      role: 'guru',
      name: teacherName,
      classId: classId || null,
      assignedClasses,
      teacherId
    })
  };
};
