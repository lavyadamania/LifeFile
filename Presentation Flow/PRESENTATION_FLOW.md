# 🏥 LIFEFILE — SIH 2026 LIVE JUDGE PRESENTATION MASTER MANUAL
**Platform:** LifeFile (Smart Clinic Operating System / SCOS)  
**Frontend URL:** `http://localhost:5173`  
**Backend URL:** `http://localhost:5000`  
**Database:** MongoDB (`process.env.MONGO_URI`)  
**Real-Time Bus:** Apache Kafka + Socket.IO  
**Seeding Engine:** 100% Dynamic 24/7 Time-Aware Offset Engine  

---

## ⚡ 1. QUICK START COMMANDS CHEAT SHEET

> Run all commands directly from the project root folder (`cd "e:\ie proj"`).

### 🛠️ Pre-Presentation Setup (Run before live demo):
```powershell
# 1. Stop old background processes
npm run stop:all

# 2. Reset database with 24/7 time-aware offsets
npm run seed:presentation -- --confirm

# 3. Start Frontend & Backend concurrently
npm run dev
```

### 📊 Live Database CLI Inspector (To show technical judges raw backend data):
```powershell
npm run inspect:db
```

---

## 🕒 2. 24/7 TIME-INDEPENDENCE GUARANTEE

The presentation seed engine calculates all appointment slots dynamically relative to your **current clock**:

* **Patient 1 (Aarav Sharma - Emergency Override):** Scheduled for `NOW - 10m` (Triage Level 5 Red Code).
* **Patient 2 (Diya Patel - Active Check-In Window):** Scheduled for `NOW + 5m` (Check-In button is **ACTIVE**).
* **Patient 3 (Kabir Joshi - Locked Check-In Window):** Scheduled for `NOW + 45m` (Check-In button is **LOCKED**).
* **Patient 5 (Vihaan Kapoor - Skipped Penalty):** Scheduled for `NOW - 25m` (1 Missed Call Penalty applied).
* **Patient 6 (Myra Nair - NOW SERVING):** Scheduled for `NOW - 15m` (`In_Progress Consultation`).

---

## 🔑 3. MASTER DEMO CREDENTIALS CHEAT SHEET

> **Global Password for All Accounts:** `Demo@123`

| Role | Name | Email Address | Password | Demo Highlights |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Admin Lavya | `lavya@admin` | `Demo@123` | Master analytics, audit logs, benchmark graphs. |
| **Hospital 1** | LifeFile Central Hospital | `demo.hospital.central@lifefile.test` | `Demo@123` | Primary facility, doctor roster, pending approvals. |
| **Hospital 2** | LifeFile North Hospital | `demo.hospital.north@lifefile.test` | `Demo@123` | Isolated secondary facility queue. |
| **Doctor 1** | Dr. Ananya Sharma | `demo.doctor.ananya@lifefile.test` | `Demo@123` | Senior Cardiologist. ACPA Queue & Emergency Override. |
| **Doctor 2** | Dr. Rohan Verma | `demo.doctor.rohan@lifefile.test` | `Demo@123` | Emergency Specialist. Pending affiliation to North Hospital. |
| **Doctor 3** | Dr. Sara Khan | `demo.doctor.sara@lifefile.test` | `Demo@123` | General Medicine @ North Hospital (Isolated Queue). |
| **Patient 1** | Aarav Sharma | `demo.patient.01@lifefile.test` | `Demo@123` | Triage Level 5, Medical Memory, Allergy Conflict. |
| **Patient 2** | Diya Patel | `demo.patient.02@lifefile.test` | `Demo@123` | Active Check-In Window (`NOW + 5m`), Brain MRI report. |
| **Patient 3** | Kabir Joshi | `demo.patient.03@lifefile.test` | `Demo@123` | Check-In Locked (`NOW + 45m`), Memory Contradiction. |

---

## 🎤 4. STEP-BY-STEP LIVE JUDGE PRESENTATION SCRIPT

---

### 📍 STEP 0: 1-Click Quick Demo Login & Auto-Role Detection
* **Action:** Open `http://localhost:5173/login`.
* **What to Show Judges:** Point to the **1-Click Demo Login Pills** (`👑 Admin`, `🏥 Hospital`, `👨‍⚕️ Doctor`, `👤 Patient 1/2/3`).
* **Verbatim Script:**
  > *"Respected Judges, to ensure seamless live demonstrations, LifeFile includes 1-Click Role Authentication Pills that instantly log in any role—or you can type manual credentials. The backend automatically detects user roles with zero login ambiguity."*

---

### 📍 STEP 1: Patient Chief Complaint & Real-Time NLP Auto-Triage
* **Action:** Click `👤 Patient 1 (Aarav)` pill $\rightarrow$ Go to **Search Doctors** $\rightarrow$ Click **Book Appointment**.
* **What to Show Judges:** Type in the **Describe Health Problem / Symptoms** box:
  > *"Severe chest pain radiating to left arm and sweating"*
* **Visual Highlight:** Watch the dynamic badge instantly turn **🔴 ⚡ Level 5: Cardiac Event (Emergency)**.
* **Verbatim Script:**
  > *"Notice how as the patient types their chief complaint, our real-time NLP Clinical Classifier automatically evaluates symptom urgency. Rather than assigning a static appointment slot, it flags this as a Level 5 Resuscitation Emergency, which directly feeds into our dynamic queue algorithm."*

---

### 📍 STEP 2: Time-Aware Check-In Locks (Crowd Control Engine)
* **Action:** Log in as **Patient 2 (Diya Patel)** vs **Patient 3 (Kabir Joshi)**.
* **What to Show Judges:**
  * **Diya Patel (Slot `NOW + 5m`):** Check-In button is **ACTIVE (`Join Queue / Check In Now`)**. Click it!
  * **Kabir Joshi (Slot `NOW + 45m`):** Check-In button is **LOCKED (`Opens at HH:MM PM`)**.
* **Verbatim Script:**
  > *"To eliminate chaotic hospital waiting rooms, LifeFile enforces dynamic time-window locking. Diya's appointment is in 5 minutes, so her check-in is active. However, Kabir's slot is in 45 minutes, so his check-in is locked. This prevents patients from crowding OPDs hours in advance."*

---

### 📍 STEP 3: ACPA Engine & Emergency Priority Override
* **Action:** Log in as **Doctor 1 (Dr. Ananya Sharma)** $\rightarrow$ Open **Doctor Queue Dashboard**.
* **What to Show Judges:** Point out **Aarav Sharma (Token #101)** standing at **Position #1** in the queue.
* **Verbatim Script:**
  > *"Here on Dr. Ananya Sharma's Queue Dashboard, observe that Aarav Sharma holds Position #1 despite earlier bookings. This is our ACPA Engine—Adaptive Clinical Priority Allocation. It calculates CEP priority scores combining Triage Level, Wait Time Aging, and Missed Call penalties. Emergency cases jump to top priority ethically while preserving token numbers."*

---

### 📍 STEP 4: Dual Real-Time Synchronization (Kafka + Socket.IO)
* **Action:** Keep Doctor Dashboard open in Window 1. Open Window 2 (Incognito) as **Patient 1 (Aarav)**.
* **In Doctor Window 1:** Click **START Consultation** on Aarav.
* **What to Show Judges:** Patient Window 2 updates **instantly in real time** showing status `NOW SERVING`.
* **Verbatim Script:**
  > *"Watch both screens: as the doctor clicks 'Start Consultation', our Kafka event bus dispatches a state transition through Socket.IO. The patient's mobile device updates instantly in real time without page refresh."*

---

### 📍 STEP 5: Patient Clinical Memory & Allergy Safety Warning
* **Action:** In Doctor Consultation view for Aarav Sharma, view the **AI Clinical Memory** panel.
* **What to Show Judges:** Highlight the red **CONFLICTED / ALLERGY WARNING** badge on Penicillin.
* **Verbatim Script:**
  > *"LifeFile features an AI-powered Patient Clinical Memory Engine. It aggregates medical history across past visits. Here, it flags an active Penicillin allergy conflict before the doctor prescribes medication, preventing dangerous drug interaction errors."*

---

### 📍 STEP 6: Multi-Facility Data Isolation
* **Action:** Log in as **Doctor 3 (Dr. Sara Khan)** at **LifeFile North Hospital**.
* **What to Show Judges:** Her queue contains **only Isha Deshmukh (P04)**. Zero data from Central Hospital.
* **Verbatim Script:**
  > *"LifeFile enforces strict multi-tenant facility isolation at the database layer. Doctor queues and patient lists are strictly scoped to the active hospital facility context, ensuring zero data leakage across hospital networks."*

---

### 📍 STEP 7: Live CLI Database Matrix (Terminal Demo for Technical Judges)
* **Action:** Open terminal in root folder and execute:
  ```powershell
  npm run inspect:db
  ```
* **What to Show Judges:** Point out the clean ASCII tabular output displaying Users, Queue Tokens, Clinical Memory, and Audit Trail.
* **Verbatim Script:**
  > *"For complete system transparency, our CLI database inspection tool gives technical judges an instant, real-time audit matrix of database state, queue priority scores, and security audit logs."*

---

## ❓ 5. JUDGE Q&A DEFENSE CHEAT SHEET

### Q1: "How does ACPA prevent low-priority patients from starving if emergencies keep coming?"
* **Answer:** *"ACPA includes an anti-starvation wait-aging multiplier (+1.5 points accumulated per minute in the waiting room). As routine patients wait, their score steadily rises, ensuring they are served within reasonable bounds."*

### Q2: "What happens if a patient misses their turn when called?"
* **Answer:** *"The doctor clicks 'Skip Patient'. This increments `missedCalls` by 1 and applies a bounded penalty (-30 points). The patient drops down the queue so the doctor isn't stalled, but retains their token to be called when they return."*

### Q3: "How is real-time performance handled under network drops?"
* **Answer:** *"We utilize Apache Kafka with state-machine consumer rebalance guards combined with Socket.IO websockets. If a client disconnects, state is authoritatively resynchronized from MongoDB upon reconnection."*

---

## 🏆 6. WHY LIFEFILE BEATS UDHAY 2025 (LAST YEAR'S SIH WINNER)

| Feature | Udhay 2025 (Last Year) | LifeFile / SCOS (SIH 2026) |
| :--- | :--- | :--- |
| **Queue Logic** | Basic FIFO (First-In, First-Out) static list | **ACPA Engine:** Dynamic Triage Level (1-5) + Wait Aging + Skip Penalty |
| **Triage** | Manual checkbox input | **Real-Time NLP Symptom Classifier** during booking |
| **Crowd Control** | Unrestricted check-in anytime | **Dynamic Time-Lock Check-In Window** (Opens 15m pre-slot) |
| **Safety** | No clinical conflict detection | **Patient Memory Engine** with active allergy warnings |
| **Transparency** | Standard UI | **Live Terminal Database Inspector (`npm run inspect:db`)** |
