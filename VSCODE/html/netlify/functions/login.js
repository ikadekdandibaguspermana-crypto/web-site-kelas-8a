// netlify/functions/login.js
//
// PENTING: File ini jalan di SERVER Netlify, BUKAN di browser.
// Kode ini tidak pernah dikirim ke pengunjung situs, jadi PIN murid
// dan password admin di sini AMAN dari Inspect/DevTools.
//
// Alurnya:
//   1. Browser kirim { type: 'student', name, pin } atau
//      { type: 'admin', password } ke alamat /.netlify/functions/login
//   2. Function ini cek ke Environment Variables Netlify
//      (ADMIN_PASSWORD, STUDENT_PINS, SESSION_SECRET)
//   3. Kalau cocok -> balas token sesi (bukan PIN aslinya)
//   4. Kalau salah -> balas "salah" tanpa membocorkan PIN yang benar

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
    // Sengaja pesan errornya digeneralkan (tidak bilang "nama salah" vs
    // "PIN salah") supaya tidak membantu orang menebak nama murid mana
    // yang valid di sistem.
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Nama/PIN atau password salah.' }) };
  }

  // Buat token sesi: nama|role|kedaluwarsa, ditandatangani HMAC pakai
  // SESSION_SECRET supaya browser tidak bisa mengubah/mengaku jadi admin.
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