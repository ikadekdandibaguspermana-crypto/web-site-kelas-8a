'use strict';

const fs = require('node:fs');
const path = require('node:path');

const EXPECTED_PROJECT = 'ombak-nusantara';
const COLLECTION = 'students';
const MAX_BATCH = 350;

function readArgs(argv) {
  const result = { apply: false, input: null, confirmProject: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') result.apply = true;
    else if (arg === '--help' || arg === '-h') result.help = true;
    else if (arg === '--input') result.input = argv[++i] || null;
    else if (arg.startsWith('--input=')) result.input = arg.slice('--input='.length);
    else if (arg === '--confirm-project') result.confirmProject = argv[++i] || null;
    else if (arg.startsWith('--confirm-project=')) result.confirmProject = arg.slice('--confirm-project='.length);
    else throw new Error(`Argumen tidak dikenal: ${arg}`);
  }
  return result;
}

function help() {
  console.log('Pemeriksaan (default): node import-students.js --input <file-hash.json>');
  console.log('Impor langsung:       node import-students.js --input <file-hash.json> --apply --confirm-project=ombak-nusantara');
  console.log('Tanpa --apply, skrip hanya memeriksa file dan tidak menghubungi Firestore.');
}

function validHash(value) {
  if (typeof value !== 'string') return false;
  const parts = value.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt' || parts[1] !== '16384' || parts[2] !== '8' || parts[3] !== '1') return false;
  try {
    return Buffer.from(parts[4], 'base64url').length === 16 && Buffer.from(parts[5], 'base64url').length === 64;
  } catch {
    return false;
  }
}

function loadAndValidate(inputPath) {
  const resolved = path.resolve(inputPath);
  const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  if (!parsed || !Array.isArray(parsed.students) || parsed.students.length === 0) {
    throw new Error('File harus berisi array students yang tidak kosong.');
  }

  const ids = new Set();
  const identities = new Set();
  const students = parsed.students.map((row, index) => {
    const line = index + 1;
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error(`Data akun ke-${line} bukan objek yang valid.`);
    if (Object.prototype.hasOwnProperty.call(row, 'pin')) throw new Error(`Data akun ke-${line} masih berisi PIN asli; impor dibatalkan.`);

    const id = String(row.id || '').trim();
    const name = String(row.name || '').trim();
    const classId = String(row.classId || '').trim().toUpperCase();
    const status = String(row.status || 'active');
    const role = String(row.role || 'student');
    const pinHash = row.pinHash;

    if (!id || id.includes('/') || id.length > 128 || ids.has(id)) throw new Error(`ID akun ke-${line} kosong, tidak valid, atau ganda.`);
    if (!name || name.length > 120) throw new Error(`Nama akun ke-${line} kosong atau terlalu panjang.`);
    if (!/^[7-9][A-J]$/.test(classId)) throw new Error(`Kelas akun ke-${line} tidak sesuai format, misalnya 7A.`);
    if (role !== 'student' || status !== 'active') throw new Error(`Role/status akun ke-${line} tidak sesuai kebijakan impor murid.`);
    if (!validHash(pinHash)) throw new Error(`Hash PIN akun ke-${line} tidak valid.`);

    const identity = `${classId}:${name.toLocaleLowerCase('id-ID')}`;
    if (identities.has(identity)) throw new Error(`Ada nama ganda di kelas yang sama pada data akun ke-${line}.`);
    ids.add(id);
    identities.add(identity);
    return { id, name, classId, status, role, pinHash };
  });

  return { resolved, students };
}

function sameDocument(existing, expected) {
  const keys = ['id', 'name', 'classId', 'status', 'role', 'pinHash'];
  const actualKeys = Object.keys(existing).sort();
  if (actualKeys.length !== keys.length || !keys.every((key) => actualKeys.includes(key))) return false;
  return keys.every((key) => existing[key] === expected[key]);
}

async function getExistingDocuments(db, students) {
  const existing = new Map();
  for (let start = 0; start < students.length; start += 100) {
    const slice = students.slice(start, start + 100);
    const refs = slice.map((student) => db.collection(COLLECTION).doc(student.id));
    const snapshots = await db.getAll(...refs);
    snapshots.forEach((snapshot) => {
      if (snapshot.exists) existing.set(snapshot.id, snapshot.data());
    });
  }
  return existing;
}

async function applyImport(students) {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS belum diarahkan ke kredensial Admin SDK yang disimpan lokal.');
  }
  if (!fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    throw new Error('File kredensial pada GOOGLE_APPLICATION_CREDENTIALS tidak ditemukan.');
  }

  const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: EXPECTED_PROJECT });
  const db = getFirestore(app);

  const existing = await getExistingDocuments(db, students);
  const conflicts = students.filter((student) => {
    const saved = existing.get(student.id);
    return saved && !sameDocument(saved, student);
  });
  if (conflicts.length) {
    throw new Error(`Ditemukan ${conflicts.length} dokumen dengan ID sama tetapi data berbeda. Tidak ada data yang ditulis.`);
  }

  const pending = students.filter((student) => !existing.has(student.id));
  let created = 0;
  for (let start = 0; start < pending.length; start += MAX_BATCH) {
    const batch = db.batch();
    const slice = pending.slice(start, start + MAX_BATCH);
    for (const student of slice) {
      const ref = db.collection(COLLECTION).doc(student.id);
      batch.create(ref, student);
    }
    await batch.commit();
    created += slice.length;
  }

  console.log(`Impor selesai untuk proyek ${EXPECTED_PROJECT}. Akun baru: ${created}; sudah cocok sebelumnya: ${existing.size}.`);
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  if (args.help) return help();
  if (!args.input) throw new Error('Tentukan file hash dengan --input.');

  const { resolved, students } = loadAndValidate(args.input);
  console.log(`Valid: ${students.length} akun; semua punya hash scrypt, tanpa PIN asli; ${COLLECTION} / ${EXPECTED_PROJECT}.`);
  console.log(`File input: ${resolved}`);

  if (!args.apply) {
    console.log('Dry run selesai. Firestore tidak dihubungi dan tidak ada perubahan yang dibuat.');
    return;
  }
  if (args.confirmProject !== EXPECTED_PROJECT) {
    throw new Error(`Untuk menulis, wajib tambahkan --confirm-project=${EXPECTED_PROJECT}.`);
  }
  await applyImport(students);
}

main().catch((error) => {
  console.error(`Impor dihentikan: ${error.message}`);
  process.exitCode = 1;
});
