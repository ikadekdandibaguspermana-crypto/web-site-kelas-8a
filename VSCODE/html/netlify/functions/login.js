const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

function safeStringEqual(left, right) {
  const leftBuffer = Buffer.from(String(left), 'utf8');
  const rightBuffer = Buffer.from(String(right), 'utf8');
  return leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

const STUDENT_PIN_SCRYPT = {
  N: 16384,
  r: 8,
  p: 1,
  keyLength: 64,
  maxmem: 64 * 1024 * 1024
};

async function verifyStudentPin(pin, storedHash) {
  if (typeof storedHash !== 'string') return false;

  const parts = storedHash.split('$');
  if (
    parts.length !== 6 ||
    parts[0] !== 'scrypt' ||
    Number(parts[1]) !== STUDENT_PIN_SCRYPT.N ||
    Number(parts[2]) !== STUDENT_PIN_SCRYPT.r ||
    Number(parts[3]) !== STUDENT_PIN_SCRYPT.p
  ) {
    return false;
  }

  try {
    const salt = Buffer.from(parts[4], 'base64url');
    const expected = Buffer.from(parts[5], 'base64url');
    if (salt.length < 16 || expected.length !== STUDENT_PIN_SCRYPT.keyLength) {
      return false;
    }

    const actual = await scrypt(
      pin,
      salt,
      expected.length,
      STUDENT_PIN_SCRYPT
    );

    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

const {
  initializeApp,
  getApps,
  cert
} = require('firebase-admin/app');

const {
  getFirestore
} = require('firebase-admin/firestore');

const {
  getAuth
} = require('firebase-admin/auth');

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
    let accountId = null;

    if (type === 'admin') {
      const adminAccounts = {
        wiarsayana: {
          name: 'I Putu Wiarsayana, S.Pd.B., M.Pd.',
          password: process.env.ADMIN_PASSWORD_WIARSAYANA || ''
        },
        dandi: {
          name: 'I Kadek Dandi Bagus Permana',
          password: process.env.ADMIN_PASSWORD_DANDI || ''
        },
        aksha: {
          name: 'Putu Aksha Raka',
          password: process.env.ADMIN_PASSWORD_AKSHA || ''
        }
      };
      const adminId = String(payload.adminId || '').trim();
      const adminAccount = adminAccounts[adminId];

      if (!adminAccount) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ ok: false, error: 'Pilih akun Admin yang valid.' })
        };
      }

      if (!adminAccount.password) {
        return {
          statusCode: 503,
          headers: corsHeaders,
          body: JSON.stringify({ ok: false, error: 'Akun Admin ini belum dikonfigurasi di Netlify.' })
        };
      }

      if (
        !password ||
        !safeStringEqual(password, adminAccount.password)
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
      displayName = adminAccount.name;
      accountId = `admin:${adminId}`;
      // Admin chooses a class after login; the signed session grants the
      // admin role while class-scoped requests are validated separately.
      finalClassId = null;
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

      if (!await verifyStudentPin(pin, studentData.pinHash)) {
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
      accountId = studentDoc.id;
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

    // Token JSON bertanda tangan; ID akun ikut dilindungi tanda tangan.
    const expiry = Date.now() + 12 * 60 * 60 * 1000;
    const firebaseUid = `aventra-${role}-${crypto
      .createHash('sha256')
      .update(String(accountId))
      .digest('hex')}`;
    const firebaseCustomToken = await getAuth().createCustomToken(
      firebaseUid,
      {
        role,
        accountId,
        studentId: studentId || '',
        classId: finalClassId || '',
        assignedClasses: []
      }
    );
    const sessionPayload = {
      accountId,
      firebaseUid,
      name: displayName,
      role,
      classId: finalClassId || null,
      assignedClasses: [],
      expiry
    };
    const payloadEncoded = Buffer
      .from(JSON.stringify(sessionPayload))
      .toString('base64url');
    const sig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadEncoded)
      .digest('hex');
    const token = `${payloadEncoded}.${sig}`;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: true,
        token,
        firebaseCustomToken,
        firebaseUid,
        role,
        name: displayName,
        classId: finalClassId,
        studentId,
        accountId,
        expiry
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
