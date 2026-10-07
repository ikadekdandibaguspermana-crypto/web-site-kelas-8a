const crypto = require('crypto');
const admin = require('firebase-admin');

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
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json'
      },
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
      headers: {
        'Content-Type': 'application/json'
      },
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
      headers: {
        'Content-Type': 'application/json'
      },
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
      headers: {
        'Content-Type': 'application/json'
      },
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
      headers: {
        'Content-Type': 'application/json'
      },
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
      headers: {
        'Content-Type': 'application/json'
      },
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
        headers: {
          'Content-Type': 'application/json'
        },
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
      headers: {
        'Content-Type': 'application/json'
      },
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

  const expiry =
    Date.now() +
    12 * 60 * 60 * 1000;

  const raw =
    `${teacherName}|guru|${classId}|${expiry}`;

  const sig =
    crypto
      .createHmac(
        'sha256',
        SESSION_SECRET
      )
      .update(raw)
      .digest('hex');

  const token =
    Buffer
      .from(`${raw}|${sig}`)
      .toString('base64');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
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