const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
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

exports.handler = async event => {
  const headers = headersFor(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method not allowed.' }) };
  }

  const session = verifySession(event.headers?.authorization || event.headers?.Authorization);
  if (!session) {
    return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'Sesi tidak valid atau sudah berakhir.' }) };
  }
  if (!getApps().length) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Layanan data belum siap.' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Permintaan tidak valid.' }) };
  }

  const action = String(body.action || '');
  const requestedClassId = String(body.classId || '').trim();
  const classId = session.role === 'admin' || session.role === 'guru' ? requestedClassId : session.classId;
  const classScopedActions = new Set([
    'save-announcement', 'delete-announcement', 'save-agenda', 'save-schedule',
    'roster', 'class-structure', 'save-class-structure'
  ]);
  if (classScopedActions.has(action) && !/^[7-9][A-J]$/.test(classId || '')) {
    return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'Kelas aktif tidak ditemukan di sesi.' }) };
  }
  if (classScopedActions.has(action) && session.role === 'guru' && !session.assignedClasses.includes(classId)) {
    return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'Kelas ini bukan kelas tugas Anda.' }) };
  }

  try {
    const db = getFirestore();
    if (body.action === 'class-structure') {
      if (session.role !== 'admin' && session.role !== 'guru' && session.classId !== classId) {
        return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'Tidak diizinkan melihat struktur kelas ini.' }) };
      }
      if (session.role === 'guru' && !session.assignedClasses.includes(classId)) {
        return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'Kelas ini bukan kelas tugas Anda.' }) };
      }
      const snapshot = await db.collection('classStructure').doc(classId).get();
      const data = snapshot.exists ? snapshot.data() : {};
      const teacherName = typeof data.teacherName === 'string' ? data.teacherName : '';
      const officers = Array.isArray(data.officers) ? data.officers
        .filter(item => item && typeof item.name === 'string' && typeof item.role === 'string')
        .map(item => ({ name: item.name, role: item.role })) : [];
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, classId, structure: { teacherName, officers } }) };
    }

    if (body.action === 'save-class-structure') {
      if (session.role !== 'admin') {
        return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'Hanya Admin yang dapat mengubah struktur kelas.' }) };
      }
      const teacherName = typeof body.teacherName === 'string' ? body.teacherName.trim() : '';
      const officers = body.officers;
      if (teacherName.length > 120 || !Array.isArray(officers) || officers.length > 20 ||
          officers.some(item => !item || typeof item.name !== 'string' || typeof item.role !== 'string' ||
            !item.name.trim() || !item.role.trim() || item.name.trim().length > 120 || item.role.trim().length > 60)) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Data wali kelas atau daftar pengurus tidak valid. Maksimal 20 pengurus.' }) };
      }
      await db.collection('classStructure').doc(classId).set({
        classId,
        teacherName,
        officers: officers.map(item => ({ name: item.name.trim(), role: item.role.trim() })),
        updatedAt: Date.now(),
        updatedBy: session.accountId
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (body.action === 'save-announcement') {
      if (session.role !== 'admin') {
        return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'Hanya Admin yang dapat menerbitkan pengumuman.' }) };
      }
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!text || text.length > 2000) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Isi pengumuman wajib diisi dan maksimal 2.000 karakter.' }) };
      }
      const createdAtMs = Date.now();
      await db.collection('pengumuman').add({
        classId, text, authorName: session.name,
        createdAt: FieldValue.serverTimestamp(), createdAtMs
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (body.action === 'delete-announcement') {
      if (session.role !== 'admin') {
        return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'Hanya Admin yang dapat menghapus pengumuman.' }) };
      }
      const announcementId = typeof body.announcementId === 'string'
        ? body.announcementId.trim()
        : '';
      if (!announcementId || announcementId.length > 150 || announcementId.includes('/')) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'ID pengumuman tidak valid.' }) };
      }
      const announcementRef = db.collection('pengumuman').doc(announcementId);
      const announcement = await announcementRef.get();
      if (!announcement.exists || announcement.data()?.classId !== classId) {
        return { statusCode: 404, headers, body: JSON.stringify({ ok: false, error: 'Pengumuman tidak ditemukan di kelas yang sedang dipilih.' }) };
      }
      await announcementRef.delete();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (body.action === 'save-agenda') {
      if (session.role !== 'admin') {
        return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'Hanya Admin yang dapat menambahkan agenda.' }) };
      }
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      const date = typeof body.date === 'string' ? body.date : '';
      const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? new Date(`${date}T00:00:00.000Z`)
        : null;
      if (!title || title.length > 150 || note.length > 2000 ||
          !parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Judul, tanggal, atau catatan agenda tidak valid.' }) };
      }
      await db.collection('agenda').add({
        classId, title, date, note, createdAt: FieldValue.serverTimestamp(), createdAtMs: Date.now()
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (body.action === 'save-schedule') {
      if (session.role !== 'admin') {
        return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'Hanya Admin yang dapat mengubah jadwal.' }) };
      }
      const allowedDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      if (!body.days || typeof body.days !== 'object' || Array.isArray(body.days) ||
          Object.keys(body.days).some(day => !allowedDays.includes(day))) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Format jadwal tidak valid.' }) };
      }
      const days = {};
      for (const day of allowedDays) {
        const entries = body.days[day] || [];
        if (!Array.isArray(entries) || entries.length > 15 || entries.some(entry =>
          !entry || typeof entry.waktu !== 'string' || !/^\d{1,2}:\d{2}$/.test(entry.waktu) ||
          typeof entry.mapel !== 'string' || !entry.mapel.trim() || entry.mapel.length > 100
        )) {
          return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: `Isi jadwal hari ${day} tidak valid.` }) };
        }
        days[day] = entries.map(entry => ({ waktu: entry.waktu, mapel: entry.mapel.trim() }));
      }
      await db.collection('jadwal').doc(classId).set({
        classId, days, updatedAt: Date.now(), updatedBy: session.accountId
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (body.action === 'roster') {
      if (session.role !== 'admin' && session.role !== 'guru' && session.classId !== classId) {
        return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'Tidak diizinkan melihat daftar kelas ini.' }) };
      }
      if (session.role === 'guru' && !session.assignedClasses.includes(classId)) {
        return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'Kelas ini bukan kelas tugas Anda.' }) };
      }

      const snapshot = await db.collection('students')
        .where('classId', '==', classId)
        .limit(300)
        .get();
      const students = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            name: typeof data.name === 'string' ? data.name.trim() : '',
            active: data.status === 'active' && data.role === 'student'
          };
        })
        .filter(student => student.name && student.active)
        .map(({ name }) => ({ name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'id'));

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, classId, students }) };
    }

    if (body.action === 'locations') {
      if (session.role !== 'admin') {
        return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'Hanya Admin yang dapat melihat lokasi aktif.' }) };
      }
      const locationScope = requestedClassId || 'ALL';
      if (locationScope !== 'ALL' && !/^[7-9][A-J]$/.test(locationScope)) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Filter kelas lokasi tidak valid.' }) };
      }
      const cutoff = Date.now() - 10 * 60 * 1000;
      let query = db.collection('liveLocationPrivate');
      if (locationScope === 'ALL') query = query.where('updatedAt', '>=', cutoff);
      else query = query.where('classId', '==', locationScope);
      const resultLimit = locationScope === 'ALL' ? 1001 : 301;
      const snapshot = await query.limit(resultLimit).get();
      const truncated = snapshot.docs.length >= resultLimit;
      const locations = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            name: typeof data.name === 'string' ? data.name : 'Murid',
            classId: typeof data.classId === 'string' ? data.classId : '',
            lat: Number(data.lat),
            lng: Number(data.lng),
            dist: Number(data.dist),
            acc: Number(data.acc),
            updatedAt: Number(data.updatedAt)
          };
        })
        .filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng) &&
          item.lat >= -90 && item.lat <= 90 && item.lng >= -180 && item.lng <= 180 &&
          Number.isFinite(item.dist) && item.dist >= 0 &&
          Number.isFinite(item.acc) && item.acc >= 0 &&
          Number.isFinite(item.updatedAt) && item.updatedAt >= cutoff &&
          (locationScope === 'ALL' || item.classId === locationScope))
        .sort((a, b) => b.updatedAt - a.updatedAt);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, classId: locationScope, locations, truncated }) };
    }

    if (body.action === 'geofence') {
      const snapshot = await db.collection('geofenceConfig').doc('school').get();
      const data = snapshot.exists ? snapshot.data() : null;
      const geofence = data && Number.isFinite(Number(data.lat)) &&
        Number.isFinite(Number(data.lng))
        ? {
            lat: Number(data.lat),
            lng: Number(data.lng),
            radius: Number(data.radius) || 120,
            minutes: Number(data.minutes) || 3
          }
        : null;
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, geofence }) };
    }

    if (body.action === 'save-geofence') {
      if (session.role !== 'admin') {
        return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'Hanya Admin yang dapat mengubah lokasi sekolah.' }) };
      }
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      const radius = Number(body.radius);
      const minutes = Number(body.minutes);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
          !Number.isFinite(lng) || lng < -180 || lng > 180 ||
          !Number.isInteger(radius) || radius < 20 || radius > 1000 ||
          !Number.isInteger(minutes) || minutes < 1 || minutes > 30) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Koordinat, radius, atau waktu di luar batas yang diizinkan.' }) };
      }
      await db.collection('geofenceConfig').doc('school').set({
        lat, lng, radius, minutes, updatedAt: Date.now(), updatedBy: session.accountId
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Jenis data tidak dikenal.' }) };
  } catch (error) {
    console.error('[class-data]', error);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Gagal mengambil data kelas.' }) };
  }
};
