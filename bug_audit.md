# LifeFile — Bug Audit Report
*Audited: 2026-08-17*

---

## 🔴 CRITICAL BUGS

### BUG 1 — Queue resets on page refresh (No persistence)
**File:** `scos-frontend/src/services/streaming.ts`
**Problem:** The `queueList` and `currentServingId` are stored only in Zustand memory. If the doctor refreshes the page, the entire queue disappears. There is no server-side queue state — it's entirely event-driven in RAM.
**Fix Needed:** Either persist queue to `localStorage` via Zustand persist middleware, OR store the queue in MongoDB and hydrate it on `connect()`.

---

### BUG 2 — Doctor Queue loads only `Confirmed` appointments, ignores `Pending`
**File:** `scos-frontend/src/pages/doctor/DoctorQueue.tsx` (line 35)
```js
// BUG: Only loads Confirmed, misses Pending
const todaysAppts = res.data.filter(appt => appt.date === todayStr && appt.status === 'Confirmed');
```
**Fix Needed:** Change to `['Confirmed', 'Pending'].includes(appt.status)`.

---

### BUG 3 — `callNext` uses hardcoded `'DOC-1'` doctor ID
**File:** `scos-frontend/src/pages/doctor/DoctorQueue.tsx` (line 20)
```js
const handleCallNext = () => {
  callNext('DOC-1'); // ← HARDCODED! Always DOC-1 regardless of logged-in doctor
};
```
**Fix Needed:** Use the actual logged-in doctor's profile ID instead.

---

### BUG 4 — `localStorage` key is still `scos-auth-storage` after rename to LifeFile
**Files:** `streaming.ts` (lines 121, 139), `api.ts` (line 10)
```js
const token = JSON.parse(localStorage.getItem('scos-auth-storage') || '{}')?.state?.token;
```
**Problem:** The key is hardcoded as `scos-auth-storage` in streaming.ts but the auth store (`useAuthStore.ts`) also uses `scos-auth-storage`. If they ever mismatch, auth will silently break. This is also inconsistent with the LifeFile rebrand.

---

### BUG 5 — Reschedule doesn't validate that new date is in the future
**File:** `scos-frontend/src/pages/patient/PatientAppointments.tsx` (line 235)
```jsx
<input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
```
**Problem:** No `min` attribute — patients can reschedule to a past date (e.g., Jan 1, 2020).
**Fix:** Add `min={new Date().toISOString().split('T')[0]}`.

---

## 🟠 MEDIUM BUGS

### BUG 6 — "Complete Consult" button in DoctorQueue does nothing
**File:** `scos-frontend/src/pages/doctor/DoctorQueue.tsx` (line 105)
```jsx
<button>Complete Consult</button> // ← No onClick handler!
```
**Problem:** The button has no event handler. Clicking it does nothing. It should call the `/api/queue/complete` endpoint.

---

### BUG 7 — Upcoming appointments show Completed ones
**File:** `scos-frontend/src/pages/patient/PatientAppointments.tsx` (line 28)
```js
setUpcoming(all.filter(a => ['Confirmed', 'Pending', 'Rescheduled'].includes(a.status)));
setPast(all.filter(a => ['Completed', 'Cancelled', 'Missed', 'Postponed'].includes(a.status)));
```
**Problem:** If a patient was seen EARLY today, their appointment becomes `Completed`. But if they open the Upcoming tab, it won't show there (correct). **However**, if the appointment for today is still `Confirmed` at 11pm, it shows in "Upcoming" even though the time has passed.
**Fix Needed:** If appointment date + time is in the past and status is Confirmed/Pending → show a visual warning or auto-move to Missed.

---

### BUG 8 — Patient name shown as just "Patient ID" in Doctor Queue active card
**File:** `scos-frontend/src/pages/doctor/DoctorQueue.tsx` (line 95)
```jsx
<h1>Patient {currentServingId}</h1> // Shows a MongoDB ObjectId, not name
```
**Problem:** The `currentServingId` is the patient's MongoDB ID, not their name. The queue stores the name separately but only the ID is passed to `currentServingId`.

---

### BUG 9 — `addToQueue` in DoctorQueue crashes if `patientId._id` is undefined
**File:** `scos-frontend/src/pages/doctor/DoctorQueue.tsx` (line 39)
```js
if (!queueList.find(p => p.id === appt.patientId._id)) {
```
**Problem:** If `patientId` is not populated by MongoDB (returns a plain string ID instead of object), `appt.patientId._id` will be `undefined`, crashing the whole queue load.

---

## 🟡 MINOR BUGS / UX ISSUES

### BUG 10 — Kafka topics in DoctorQueue still show old `scos.*` name
**File:** `scos-frontend/src/pages/doctor/DoctorQueue.tsx` (lines 73–74)
```jsx
<span>scos.queue.updates</span>
<span>scos.appointments</span>
```
**Problem:** After rebranding to LifeFile, these are still labeled as `scos.*`. Minor but visible to judges.

### BUG 11 — Doctor's "Start Queue" loads ALL doctors' appointments, not just theirs
**File:** `scos-frontend/src/pages/doctor/DoctorQueue.tsx` (line 28)
```js
const res = await getAppointments({ hospitalId: activeHospitalId });
```
**Problem:** `getAppointments` with the doctor role should only return that doctor's appointments (backend correctly filters), but the hospital filter may override it and show other doctors' patients.

### BUG 12 — Appointment date shown as raw ISO string, not formatted
**File:** `scos-frontend/src/pages/patient/PatientAppointments.tsx` (line 152)
```jsx
<span>{apt.date}</span> // Shows "2026-08-16" instead of "Aug 16, 2026"
```
**Fix:** Use `new Date(apt.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })`.

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 5 |
| 🟠 Medium | 4 |
| 🟡 Minor | 3 |
| **Total** | **12 bugs** |

**Priority order to fix:** BUG 1, BUG 2, BUG 3, BUG 6, BUG 9, BUG 5, BUG 8
