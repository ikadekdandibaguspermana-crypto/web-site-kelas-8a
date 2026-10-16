const crypto = require('crypto');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { verifySession } = require('./_verify-session');

const allowedOrigins = [
  'http://localhost:5500',
  'https://aventra-x-2026-web-bydandi.netlify.app'
];

function headersFor(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    Vary: 'Origin'
  };
  if (allowedOrigins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

if (!getApps().length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '');
    initializeApp({ credential: cert(serviceAccount) });
  } catch {
    // Keep module loading safe; the handler reports a configuration error.
  }
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const radians = value => value * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

exports.handler = async event => {
  const headers = headersFor(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method not allowed.' }) };
  }

  const session = verifySession(event.headers?.authorization || event.headers?.Authorization);
  if (!session || session.role !== 'student' ||
      !/^[7-9][A-J]$/.test(session.classId || '') || !session.accountId) {
    return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'Sesi murid tidak valid atau sudah berakhir.' }) };
  }
  if (!getApps().length) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Layanan lokasi belum siap.' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Permintaan tidak valid.' }) };
  }

  try {
    const db = getFirestore();
    const locationId = crypto.createHash('sha256')
      .update(`${session.classId}:${session.accountId}`)
      .digest('hex');
    const locationRef = db.collection('liveLocationPrivate').doc(locationId);

    if (body.action === 'delete') {
      await locationRef.delete();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }
    if (body.action !== 'set') {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Jenis pembaruan lokasi tidak dikenal.' }) };
    }

    const lat = Number(body.lat);
    const lng = Number(body.lng);
    const acc = Number(body.acc);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
        !Number.isFinite(lng) || lng < -180 || lng > 180 ||
        !Number.isFinite(acc) || acc < 0 || acc > 10000) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Koordinat lokasi tidak valid.' }) };
    }

    const settings = await db.collection('geofenceConfig').doc('school').get();
    if (!settings.exists) {
      return { statusCode: 409, headers, body: JSON.stringify({ ok: false, error: 'Lokasi sekolah belum diatur Admin.' }) };
    }
    const previous = await locationRef.get();
    if (previous.exists && Date.now() - Number(previous.data().updatedAt || 0) < 7000) {
      return { statusCode: 429, headers, body: JSON.stringify({ ok: false, error: 'Pembaruan lokasi terlalu sering. Tunggu sebentar.' }) };
    }
    const geofence = settings.data();
    const dist = distanceMeters(lat, lng, Number(geofence.lat), Number(geofence.lng));
    const updatedAt = Date.now();
    await locationRef.set({
      name: session.name,
      classId: session.classId,
      lat,
      lng,
      dist: Math.round(dist),
      acc: Math.round(acc),
      updatedAt
    });
    return { statusCode: 200, headers, body: JSON.stringify({
      ok: true,
      dist: Math.round(dist),
      inside: dist <= (Number(geofence.radius) || 120),
      updatedAt
    }) };
  } catch (error) {
    console.error('[location-update]', error);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Lokasi gagal diperbarui.' }) };
  }
};
