# Draft Firestore Rules test matrix

Use Firebase Rules Playground or the Emulator Suite with the draft in `firestore.rules.draft`. Do not publish until all expected results pass.

## Mock identities

- Admin: `role=admin`, `accountId=admin:wiarsayana`.
- Guru piket: `role=guru`, `assignedClasses` contains all 30 class IDs.
- Wali kelas 8A: `role=guru`, `assignedClasses=[8A]`.
- Murid 8A: `role=student`, `classId=8A`, `studentId` points to an active `students/{studentId}` record with the matching `classId` and `name`.
- Murid 8B: same shape with `classId=8B`.
- Unauthenticated: no auth token.

## Expected checks

| Request | Expected |
| --- | --- |
| Unauthenticated read/write `absensi/8A_2026-10-20` | Deny |
| Admin read/write/delete attendance in any valid class | Allow |
| Wali 8A read attendance 8A | Allow |
| Wali 8A read attendance 8B | Deny |
| Murid 8A read attendance 8A | Allow |
| Murid 8A update only their own name key in 8A attendance | Allow |
| Murid 8A update another student's key or delete the whole attendance document | Deny |
| Murid 8A read/write their own class-scoped izin/sakit detail | Allow |
| Murid 8A read/write another student's or 8B detail | Deny |
| Wali 8A read 8A detail; write that detail | Allow / Deny |
| Wali 8A read 8B detail | Deny |
| Non-Admin query notifications with `classId == 8A` and `createdAtMs >= cutoff` | Allow for assigned/same class |
| Non-Admin query notifications without a class filter | Deny |
| Admin query notifications across classes | Allow |
| Murid creates notification for own class/name with valid fields and server timestamp | Allow |
| Murid creates notification for another class/name | Deny |
| Student/guru reads `pengumuman`, `agenda`, or `jadwal` for assigned class | Allow |
| Student/guru directly writes `pengumuman`, `agenda`, or `jadwal` | Deny; Admin SDK Netlify Functions handle writes |
| Any direct client access to `piket` | Deny until a page actively uses `piket.js` and its access model is audited |
| Any direct client access to `students`, `teachers`, `liveLocationPrivate`, or `geofenceConfig` | Deny; current code uses Admin SDK functions |

## Publish blockers

- `destinations`, `bookings`, `jurnalMengajar`, legacy `liveLocation`, and old `settings/geofence` have no code references other than README documentation. A `piket.js` client script exists, but no HTML page loads it. Current server code reads `geofenceConfig/school` and writes `liveLocationPrivate` through Netlify Functions using the Admin SDK. This draft leaves the unused collections without direct browser access. The Admin SDK bypasses Firestore Rules, so the Netlify Functions remain the authorized access path for `geofenceConfig` and `liveLocationPrivate`.
- Existing legacy izin/sakit detail IDs do not contain a class ID. Only Admin can access those legacy documents in this draft; new class-scoped details remain available to assigned teachers and their own student.
- Admin SDK calls bypass Firestore Rules. Keep validating signed sessions and roles inside Netlify Functions.
