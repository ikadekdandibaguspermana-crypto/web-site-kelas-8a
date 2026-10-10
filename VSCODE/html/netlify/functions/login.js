const crypto = require('crypto');

const {
  initializeApp,
  getApps,
  cert
} = require('firebase-admin/app');

const {
  getFirestore
} = require('firebase-admin/firestore');

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

if (!getApps().length) {
  let serviceAccount;

  try {
    serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY || ''
    );
  } catch {
    serviceAccount = null;
  }

  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount)
    });
  }
}

function getDb() {
  if (!getApps().length) {
    return null;
  }

  return getFirestore();
}

exports.handler = async (event) => {
  const corsHeaders = getCorsHeaders(event);

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
        error: 'Method not allowed'
      })
    };
  }

  try {
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

    const payload = JSON.parse(event.body || '{}');

    const type = String(payload.type || '').trim();
    const name = String(payload.name || '').trim();
    const pin = String(payload.pin || '');
    const password = String(payload.password || '');
    const requestedClassId =
      String(payload.classId || '').trim();

    const SESSION_SECRET =
      process.env.SESSION_SECRET || '';

    if (!SESSION_SECRET) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error: 'SESSION_SECRET belum dikonfigurasi.'
        })
      };
    }

    let role = null;
    let displayName = '';
    let finalClassId = null;
    let studentId = null;

    if (type === 'admin') {
      const adminPassword =
        process.env.ADMIN_PASSWORD || '';

      if (
        !password ||
        !adminPassword ||
        password !== adminPassword
      ) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            ok: false,
            error: 'Password admin salah.'
          })
        };
      }

      role = 'admin';
      displayName = 'Admin';
    }

    else if (type === 'student') {
      if (
        !name ||
        !requestedClassId ||
        !pin
      ) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            ok: false,
            error: 'Nama, PIN, dan kelas wajib diisi.'
          })
        };
      }

      const snap = await db
        .collection('students')
        .where(
          'classId',
          '==',
          requestedClassId
        )
        .where(
          'name',
          '==',
          name
        )
        .limit(1)
        .get();

      if (snap.empty) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            ok: false,
            error: 'Nama atau kelas tidak ditemukan.'
          })
        };
      }

      const studentDoc = snap.docs[0];
      const studentData = studentDoc.data();

      if (
        String(studentData.pin || '') !== pin
      ) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            ok: false,
            error: 'PIN salah.'
          })
        };
      }

      if (
        studentData.status &&
        studentData.status !== 'active'
      ) {
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({
            ok: false,
            error: 'Akun siswa tidak aktif.'
          })
        };
      }

      role = 'student';

      displayName =
        studentData.name || name;

      finalClassId =
        studentData.classId ||
        requestedClassId;

      studentId = studentDoc.id;
    }

    else {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error: 'Tipe login tidak valid.'
        })
      };
    }

    // Membuat token sesi yang berlaku selama 12 jam.
    const expiry =
      Date.now() +
      12 * 60 * 60 * 1000;

    const raw =
      `${displayName}|${role}|${finalClassId || ''}|${expiry}`;

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
        role,
        name: displayName,
        classId: finalClassId,
        studentId
      })
    };

  } catch (error) {
    console.error(
      '[login]',
      error
    );

    return {
      statusCode: 500,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        ok: false,
        error: 'Terjadi kesalahan pada server.'
      })
    };
  }
};
