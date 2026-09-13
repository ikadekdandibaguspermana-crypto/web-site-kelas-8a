const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method tidak diizinkan' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Data tidak valid' }) };
  }

  const SESSION_SECRET = process.env.SESSION_SECRET || '';
  if (!SESSION_SECRET) {
    console.error('[login] SESSION_SECRET belum diatur di Netlify Environment Variables.');
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Server belum dikonfigurasi. Hubungi admin.' }) };
  }

  const { type, name, pin, password } = payload;
  let role = null;
  let displayName = null;

  if (type === 'admin') {
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
    if (ADMIN_PASSWORD && typeof password === 'string' && password === ADMIN_PASSWORD) {
      role = 'admin';
      displayName = 'Admin';
    }
  } else if (type === 'student') {
    let STUDENT_PINS = {};
    try {
      STUDENT_PINS = JSON.parse(process.env.STUDENT_PINS || '{}');
    } catch {
      console.error('[login] STUDENT_PINS di Netlify bukan JSON yang valid.');
    }
    const cleanName = (name || '').trim();
    if (cleanName && STUDENT_PINS[cleanName] && String(STUDENT_PINS[cleanName]) === String(pin)) {
      role = 'student';
      displayName = cleanName;
    }
  } else {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Tipe login tidak dikenali' }) };
  }

  if (!role) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Nama/PIN atau password salah.' }) };
  }

  const expiry = Date.now() + 12 * 60 * 60 * 1000; // berlaku 12 jam
  const raw = `${displayName}|${role}|${expiry}`;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(raw).digest('hex');
  const token = Buffer.from(`${raw}|${sig}`).toString('base64');

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, token, role, name: displayName }),
  };
};