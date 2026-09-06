// netlify/functions/_verify-session.js
//
// Modul bantu (bukan endpoint sendiri) untuk dipakai oleh Netlify
// Function lain yang perlu memastikan request datang dari admin yang
// sudah login sah — misalnya function untuk memposting pengumuman atau
// menghapus data. Cukup import fungsi verifySession di function lain.
//
// Contoh pakai di function lain:
//   const { verifySession } = require('./_verify-session');
//   const session = verifySession(event.headers.authorization);
//   if (!session || session.role !== 'admin') {
//     return { statusCode: 403, body: JSON.stringify({ ok:false, error:'Tidak diizinkan' }) };
//   }

const crypto = require('crypto');

function verifySession(authorizationHeader) {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) return null;
  const token = authorizationHeader.slice(7);

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split('|');
    if (parts.length !== 4) return null;
    const [name, role, expiry, sig] = parts;

    const SESSION_SECRET = process.env.SESSION_SECRET || '';
    const raw = `${name}|${role}|${expiry}`;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(raw).digest('hex');

    // Perbandingan aman terhadap timing attack
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    if (Date.now() > Number(expiry)) return null; // token kedaluwarsa

    return { name, role };
  } catch {
    return null;
  }
}

module.exports = { verifySession };