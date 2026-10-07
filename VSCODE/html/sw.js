// Service worker minimal — TIDAK melakukan caching apa pun.
// Fungsinya cuma memenuhi syarat teknis Chrome/Android supaya situs
// dianggap "installable" sebagai PWA. Data Firestore tetap selalu
// diambil real-time dari server, tidak ada yang basi/ke-cache.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Sengaja TIDAK ada event listener 'fetch' — semua request
// tetap langsung ke network seperti biasa, tidak ada intersepsi/cache.