# LIFEFILE / SCOS — LIVE SIH JUDGE PRESENTATION MANUAL
**System:** Smart Clinic Operating System (SCOS) / LifeFile  
**Frontend URL:** `http://localhost:5173`  
**Backend URL:** `http://localhost:5000`  
**Database:** MongoDB (`process.env.MONGO_URI`)  
**Real-Time Protocol:** Kafka + Socket.IO  
**Time Independence:** 100% Dynamic 24/7 Time-Aware Seeding Engine  

---

## 1. QUICK START COMMANDS

### Step A: Seed / Reset the Presentation Database
Run this single command right before your presentation (at any hour of the day or night) to initialize the dynamic time-aware dataset:
```powershell
cd "e:\ie proj\scos-backend"
npm run seed:presentation -- --confirm
```

### Step B: Start Backend Server
```powershell
cd "e:\ie proj\scos-backend"
npm run dev
```

### Step C: Start Frontend Application
```powershell
cd "e:\ie proj\scos-frontend"
npm run dev
```

### ⚡ Optional: 1-Click Clock Resync (If App is Left Running for Hours)
If the server has been running for several hours and you want to recalibrate demo appointment slots to your current clock without wiping data:
```http
POST http://localhost:5000/api/queue/resync-demo
```
*(Or simply re-run `npm run seed:presentation -- --confirm`)*

---

## 2. 24/7 TIME-INDEPENDENCE GUARANTEE

The seed engine dynamically calculates all appointment slots relative to the **exact moment** you run the command:

* **Patient 1 (Aarav Sharma - Emergency Override):** Scheduled for `NOW - 10m` (In queue as active emergency).
* **Patient 2 (Diya Patel - Active Check-In Window):** Scheduled for `NOW + 5m` (Check-In button is **ACTIVE**).
* **Patient 3 (Kabir Joshi - Locked Check-In Window):** Scheduled for `NOW + 45m` (Check-In button is **LOCKED** with dynamic `Opens at HH:MM PM` message).
* **Patient 5 (Vihaan Kapoor - Skipped Penalty):** Scheduled for `NOW - 25m` (1 Missed Call Penalty applied).
* **Patient 6 (Myra Nair - NOW SERVING):** Scheduled for `NOW - 15m` (`In_Progress Consultation`).

> **Boundary Safety:** Even if you present near midnight (e.g. 11:45 PM), time-clamping guarantees offsets stay cleanly within the current date without rolling over.

---

## 3. MASTER DEMO CREDENTIALS CHEAT SHEET

> **Global Password for All Demo Accounts:** `Demo@123`

| Role | Name | Email Address | Password | Demo Highlights / Focus |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Admin Lavya | `lavya@admin` | `Demo@123` | Master system analytics, doctor/hospital approvals, audit trail. |
| **Hospital 1** | LifeFile Central Hospital | `demo.hospital.central@lifefile.test` | `Demo@123` | Main facility dashboard, staff roster, pending doctor join requests. |
| **Hospital 2** | LifeFile North Hospital | `demo.hospital.north@lifefile.test` | `Demo@123` | Secondary facility dashboard, facility queue isolation demo. |
| **Doctor 1** | Dr. Ananya Sharma | `demo.doctor.ananya@lifefile.test` | `Demo@123` | Senior Cardiologist @ Hospital 1. ACPA Queue, Emergency Override. |
| **Doctor 2** | Dr. Rohan Verma | `demo.doctor.rohan@lifefile.test` | `Demo@123` | Emergency Specialist @ Hospital 1. Pending Join Request to Hospital 2. |
| **Doctor 3** | Dr. Sara Khan | `demo.doctor.sara@lifefile.test` | `Demo@123` | General Medicine @ Hospital 2. Isolated North Hospital queue. |
| **Patient 1** | Aarav Sharma | `demo.patient.01@lifefile.test` | `Demo@123` | Triage Level 5 (Emergency), Active Memory, X-Ray & Blood Records. |
| **Patient 2** | Diya Patel | `demo.patient.02@lifefile.test` | `Demo@123` | Active Check-In Window (`NOW + 5m`), Brain MRI Report. |
| **Patient 3** | Kabir Joshi | `demo.patient.03@lifefile.test` | `Demo@123` | Check-In Locked (`NOW + 45m`), Memory Contradiction & Review. |
| **Patient 4** | Isha Deshmukh | `demo.patient.04@lifefile.test` | `Demo@123` | Hospital 2 Queue Patient (Facility Isolation Demo). |
| **Patient 5** | Vihaan Kapoor | `demo.patient.05@lifefile.test` | `Demo@123` | Skipped Queue Patient (1 Missed Call Penalty Demo). |
| **Patient 6** | Myra Nair | `demo.patient.06@lifefile.test` | `Demo@123` | Currently In Consultation (`NOW SERVING`). |

---

## 4. STEP-BY-STEP LIVE JUDGE PRESENTATION SCRIPT

### 📍 STEP 1: Patient Medical Records & Profile
1. Log in as **Patient 1 (Aarav Sharma)**: `demo.patient.01@lifefile.test` / `Demo@123`.
2. Open **Medical Timeline / Records**.
3. **Show Judges:** Chest X-Ray and Cardiac Blood Panel attachments.
4. Open **Clinical Memory**: Show active verified allergy (`Penicillin allergy`) automatically extracted with source provenance.

---

### 📍 STEP 2: Check-In Time Engine Locks (Dynamic Pre-Slot & Post-Slot Rules)
1. Log in as **Patient 2 (Diya Patel)**: `demo.patient.02@lifefile.test` / `Demo@123`.
   * **Show Judges:** Appointment is scheduled for `NOW + 5 mins` (within the valid window).
   * **Result:** The Check-In button is **Active** (`Join Queue / Check In Now`).
   * Click **Join Queue** to enter the live queue.
2. Log in as **Patient 3 (Kabir Joshi)**: `demo.patient.03@lifefile.test` / `Demo@123`.
   * **Show Judges:** Appointment is scheduled for `NOW + 45 mins` (too early).
   * **Result:** The Check-In button is **Locked** (`Opens at HH:MM PM`). Explain: *"Prevents patients from overwhelming OPD queues hours in advance."*

---

### 📍 STEP 3: ACPA Queue Engine & Emergency Priority Override
1. Log in as **Doctor 1 (Dr. Ananya Sharma)**: `demo.doctor.ananya@lifefile.test` / `Demo@123`.
2. Open **Doctor Queue Dashboard**.
3. **Point out Aarav Sharma (Token #101):**
   * Aarav Sharma has **Triage Level 5 (Resuscitation / Emergency)**.
   * ACPA places Aarav at **Queue Position #1**, outranking earlier routine appointments.
   * Explain: *"Notice this is NOT a simple FIFO queue. ACPA dynamically calculates urgency scores, ensuring life-threatening cases are prioritized immediately while preserving token numbers."*

---

### 📍 STEP 4: Real-Time Dual Synchronization (Socket.IO + Kafka)
1. Keep Doctor Dashboard open in Browser Window 1.
2. Open Browser Window 2 (Incognito) and log in as **Patient 1 (Aarav Sharma)**. Open **Live Queue / ETA View**.
3. In Doctor Window 1, click **START Consultation** on Aarav Sharma.
4. **Show Judges:** Patient Window 2 updates **instantly in real time** without page refresh to show status `NOW SERVING`.

---

### 📍 STEP 5: Missed Call Penalty & Skipped Queue Recovery
1. On Doctor Dashboard, point to **Vihaan Kapoor (Token #104)**:
   * Status shows **1 Missed Call**.
   * ACPA applies a penalty score deduction (`-30 points`), moving the patient down the queue without losing their token.
2. Click **CALL NOW** or **START** to resume consultation for a skipped patient.

---

### 📍 STEP 6: Patient Memory Engine Conflict & Doctor Review Workflow
1. Log in as **Doctor 1 (Dr. Ananya Sharma)**.
2. Open Clinical Memory for **Kabir Joshi (P03)**.
3. **Show Judges:** Red **CONFLICTED** badge on Penicillin Allergy.
   * Assertion A: *"No known drug allergy (Patient assertion)"*
   * Assertion B: *"Penicillin allergy noted in 2024 consultation"*
4. Open **Correction Review Modal**: Show patient's review note: *"I took Amoxicillin in 2023 with no reaction..."*
5. Click **Approve** or **Reject** to resolve the clinical memory conflict.

---

### 📍 STEP 7: Multi-Facility Data & Queue Isolation
1. Log in as **Doctor 3 (Dr. Sara Khan)**: `demo.doctor.sara@lifefile.test` / `Demo@123` at **LifeFile North Hospital**.
2. Open Doctor Queue.
3. **Show Judges:** Queue contains **only Isha Deshmukh (P04)**. Zero data leakage from LifeFile Central Hospital.
4. Explain: *"LifeFile enforces multi-tenant facility isolation at the database layer. Doctors only see queue events affiliated with their active facility."*

---

### 📍 STEP 8: Hospital Admin & Staff Roster Management
1. Log in as **Hospital Admin (LifeFile Central Hospital)**: `demo.hospital.central@lifefile.test` / `Demo@123`.
2. Open **Hospital Dashboard** (`/hospital`).
3. **Show Judges:**
   * Active Doctor Roster (`Dr. Ananya Sharma`, `Dr. Rohan Verma`).
   * Pending Doctor Applications: View `Dr. Rohan Verma` requesting affiliation with North Hospital. Click **Approve**.
   * Toggle doctor leave status or mark doctor unavailable for specific dates.

---

### 📍 STEP 9: Security & Cross-Patient Protection
1. Log in as **Patient 1 (Aarav Sharma)**.
2. Attempt to open Patient 2's memory endpoint in browser URL (`/api/memory/patient/<P02_ID>`).
3. **Show Judges:** Request blocked with **HTTP 403 Forbidden**.

---

### 📍 STEP 10: Admin System Oversight & Audit Trail
1. Log in as **System Admin**: `lavya@admin` / `Demo@123`.
2. Open **Audit Logs** (`/admin/audit`).
3. **Show Judges:** Structured audit trail logging security actions, emergency overrides, and memory conflicts.
4. Open **Benchmark Dashboard** (`/admin/benchmark`). Run high-load simulation to show live ACPA vs FIFO vs Priority comparative analytics.
