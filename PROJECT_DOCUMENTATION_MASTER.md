# 🏥 LifeFile / Smart Clinic Operating System (SCOS)
## 📄 Complete Master Project Documentation (End-to-End Technical & Architectural Manual)

---

## 📌 1. Executive Summary & SIH 2026 Objective

The **LifeFile / SCOS (Smart Clinic Operating System)** is an enterprise-grade, ethically-aligned, real-time healthcare management and queue orchestration ecosystem. Designed to meet **ABDM (Ayushman Bharat Digital Mission)** and **NABH (National Accreditation Board for Hospitals & Healthcare Providers)** standards, LifeFile replaces inefficient, static First-Come-First-Served (FIFO) healthcare queues with an intelligent, dynamic clinical priority engine.

### Core Problems Solved:
1. **Clinical Queue Inequity:** Prevents critical emergency patients from waiting behind routine checkups.
2. **Real-Time NLP Symptom Auto-Triage:** Automatically evaluates patient-entered chief complaints during booking to classify severity (Levels 1–5).
3. **Patient Starvation Elimination:** Prevents low-priority patients from being infinitely delayed by continuous emergency arrivals using anti-starvation wait aging (+1.5 pts/min).
4. **Doctor Action Safety:** Eliminates client-side array index race conditions where doctors accidentally start the wrong patient.
5. **Uncontrolled Check-In Clutter:** Enforces strict 15-minute pre-slot check-in window locking to eliminate ghost queues.
6. **Multi-Facility Data Isolation:** Segregates queues strictly by active hospital facility context (*LifeFile Central Hospital* vs *LifeFile North Hospital*).
7. **Doctor-Linked Private Clinics:** Gives every seeded doctor a private clinic record while preserving hospital affiliations as separate facilities.
8. **Operational Healthcare Analytics:** Provides role-specific hospital, private-clinic, doctor, patient, and admin analytics from live MongoDB data.
9. **Patient Feedback & BI:** Captures post-appointment doctor reviews and exposes real LifeFile data to five BI practicals, Streamlit, and Metabase.

---

## 📐 2. System Architecture & Component Design

### High-Level System Architecture (HLD)

```mermaid
flowchart TD
    subgraph Client Layer [Frontend - React 18 + Vite + Tailwind CSS]
        DoctorUI[Doctor Queue & Consultation Dashboard]
        PatientApp[Patient Portal & Live ETA Tracker]
        AdminUI[Hospital Staff Roster & Analytics]
        Toast[Global Notification Toaster]
        OneClick[1-Click Quick Login Pills]
    end

    subgraph Streaming & Middleware Layer [Event-Driven Bus]
        Kafka[Apache Kafka Engine - KafkaJS]
        SocketServer[Socket.io Real-Time WebSocket Server]
    end

    subgraph Service Engine Layer [Backend - Spring Boot 3.4.13 REST API]
        ACPA[Adaptive Clinical Priority Algorithm - ACPA]
        QueueCtrl[Queue Controller /routes/queue.js]
        ApptCtrl[Appointment Controller /routes/appointments.js]
        DoctorCtrl[Doctor Roster Controller /routes/doctors.js]
        HospitalCtrl[Hospital Controller /api/hospitals]
        AnalyticsCtrl[Role Analytics /api/analytics]
        ReviewCtrl[Doctor Reviews /api/reviews]
        ClinicCtrl[Private Clinic Controller /api/clinics]
        NLPTriage[Real-Time NLP Symptom Triage Classifier]
        InspectDB[CLI Database Inspector Matrix Engine]
    end

    subgraph Data & Persistence Layer [MongoDB Local Cluster / Atlas]
        DB_Appt[(Appointments Collection)]
        DB_User[(Users & Patients Collection)]
        DB_Doc[(Doctors Collection)]
        DB_Hosp[(Hospitals Collection)]
        DB_Clinic[(Doctor-Linked Clinics Collection)]
        DB_Review[(Doctor Reviews Collection)]
        DB_Mem[(Patient Clinical Memories)]
        DB_Audit[(Security Audit Logs)]
    end

    OneClick -->|Instant Role Auth| PatientApp & DoctorUI & AdminUI
    PatientApp -->|Input Chief Complaint| NLPTriage
    NLPTriage -->|Calculated Triage Level 1-5| ApptCtrl
    DoctorUI -->|REST: GET /api/queue/list| QueueCtrl
    DoctorUI -->|REST: POST /api/queue/call-next| QueueCtrl
    PatientApp -->|REST: POST /api/appointments| ApptCtrl
    PatientApp -->|REST: Check-In Window Validation| QueueCtrl
    
    QueueCtrl --> ACPA
    QueueCtrl --> DB_Appt
    ApptCtrl --> DB_Appt
    HospitalCtrl --> DB_Hosp
    ClinicCtrl --> DB_Clinic
    ReviewCtrl --> DB_Review
    AnalyticsCtrl --> DB_Appt & DB_Doc & DB_Hosp & DB_Clinic & DB_Review

    QueueCtrl -->|Produce Event: scos.queue.updates| Kafka
    Kafka --> SocketServer
    SocketServer -->|Real-Time WebSocket Push| DoctorUI
    SocketServer -->|Real-Time WebSocket Push| PatientApp
    SocketServer -->|Action Toast Notifications| Toast
    InspectDB -->|CLI Matrix Output| DB_User & DB_Appt & DB_Mem & DB_Audit
```

---

## 🩺 3. Chief Complaint & Real-Time NLP Auto-Triage Engine

During appointment booking (`/patient/book/:doctorId`), patients describe their health problem or symptoms in free text. The client-side & server-side NLP clinical engine classifies urgency in real time:

```mermaid
flowchart LR
    A[Patient enters Chief Complaint] --> B[NLP Clinical Classifier]
    B --> C{Symptom Keywords & Urgency}
    C -->|Chest pain / Left arm pain| D[Level 5: Emergency Resuscitation]
    C -->|Dizziness / Stiff neck / Stroke| E[Level 4: Acute Pain / Emergent]
    C -->|Fever / Vomiting / Abdominal| F[Level 3: Urgent Infection / Gastro]
    C -->|Rash / Allergy / Earache| G[Level 2: Moderate / Semi-Urgent]
    C -->|General checkup / Follow-up| H[Level 1: Standard Routine OPD]
    D & E & F & G & H --> I[Assign Triage Level & Token]
    I --> J[ACPA Queue Priority Engine]
```

### Triage Matrix Rules:
* 🔴 **Level 5 (Resuscitation / Emergency - Red Code):** Symptoms like *"Severe chest pain radiating to left arm"* $\rightarrow$ **Triggers Emergency Queue Override (+1,000 pts)**.
* 🟠 **Level 4 (Emergent / Orange Code):** Symptoms like *"Stiff neck, sudden loss of vision"* $\rightarrow$ **+500 pts**.
* 🟡 **Level 3 (Urgent / Yellow Code):** Symptoms like *"High fever with chills and severe stomach ache"* $\rightarrow$ **+100 pts**.
* 🔵 **Level 2 (Semi-Urgent / Green Code):** Symptoms like *"Mild skin allergy, earache"* $\rightarrow$ **+50 pts**.
* ⚪ **Level 1 (Non-Urgent Routine / Blue Code):** Standard OPD consultation $\rightarrow$ **+0 pts**.

### 🔍 How to Demonstrate NLP & AI to Judges (3 Live Implementation Locations):
1. **Real-Time Booking Auto-Triage (`/patient/book/:doctorId`):**
   * **File:** `scos-frontend/src/pages/patient/DoctorBooking.tsx` (`classifySymptoms()`)
   * **Action:** Type *"Severe chest pain radiating to left arm"* $\rightarrow$ Watch **🔴 Level 5 Emergency** badge illuminate.
2. **Dedicated Interactive AI Symptom Checker (`/patient/triage`):**
   * **File:** `scos-frontend/src/pages/patient/SymptomTriage.tsx` (`import nlp from 'compromise'`)
   * **Action:** Type *"High fever with severe chills and abdominal pain"* $\rightarrow$ View extracted entities, risk score & specialist recommendation.
3. **Backend Medical Memory Extraction & Gemini AI Engine (`memoryService.js`):**
   * **File:** `scos-backend/services/memoryService.js` (`extractAIMemoryCandidates()`)
   * **Action:** Parses unstructured doctor notes & prescriptions into structured `ALLERGY`, `CONDITION`, `MEDICATION` cards with red contradiction warnings.

---

## 🧠 4. Adaptive Clinical Priority Algorithm (ACPA Engine)

The ACPA engine computes a dynamic **Clinical Priority Score (CEP)** for every patient in the queue in real time.

### Mathematical Formulation
$$\text{CEP Score} = \underbrace{(100 - \text{Base Token}) \times 10}_{\text{Base Slot Order}} + \underbrace{\text{Triage Override}}_{\text{Ethical Severity}} + \underbrace{1.5 \times \text{Wait Mins}}_{\text{Anti-Starvation Aging}} - \min(\text{Misses} \times 30, 150)$$

### Formula Breakdown & Rules:
1. **Base Slot Weight:** Derived from initial registration slot order $(100 - \text{Token}) \times 10$.
2. **Ethical Triage Overrides (ESI / NABH Compliant):**
   * **Level 5 (Resuscitation):** $+1,000\text{ pts}$ *(Guarantees top rank ethically)*
   * **Level 4 (Emergency):** $+500\text{ pts}$
   * **Level 3 (Urgent):** $+100\text{ pts}$
   * **Level 2 (Semi-Urgent):** $+50\text{ pts}$
   * **Level 1 (Routine):** $+0\text{ pts}$
3. **Anti-Starvation Aging Factor:** $+1.5\text{ pts}$ accumulated per minute spent in the waiting room. Non-emergency patients naturally rise up the queue over time.
4. **Bounded Skip Penalty Cap:** $-30\text{ pts}$ per missed call, capped at $-150\text{ pts}$ maximum. Ensures skipped patients are penalized fairly without being permanently banished from receiving care.

---

## ⏱️ 5. Patient Check-In Window & Time-Lock Engine

To prevent ghost queues and ensure physical/virtual attendance integrity, LifeFile enforces a strict **3-Stage Check-In Window**:

```mermaid
stateDiagram-v2
    [*] --> TooEarly: >15 Mins Before Slot Time
    TooEarly --> ActiveWindow: Within -15m to +15m of Slot Time
    ActiveWindow --> Expired: >15 Mins After Slot Time
    
    state TooEarly {
        button: Button Disabled (Opens at HH:MM PM)
        banner: Check-In Locked Notice
    }
    state ActiveWindow {
        button: Join Queue / Check In NOW (Active Green)
        action: Updates DB Status to Pending & Emits Kafka Event
    }
    state Expired {
        button: Check-In Closed (Disabled)
        banner: Window Expired Notice Shown
    }
```

---

## 🧠 6. Clinical Memory Safety & Allergy Warning Workflow

```mermaid
flowchart TD
    Doc[Doctor opens Patient Consultation] --> LoadMem[Load Patient Memory Store]
    LoadMem --> CheckAllergy{Allergy Conflict Detection}
    CheckAllergy -->|Conflict Found e.g. Penicillin Allergy| Alert[Display Red Clinical Safety Warning]
    CheckAllergy -->|No Conflict| Safe[Safe Prescription Entry]
    Alert --> Resolution[Doctor Resolves Conflict / Overrides]
```

---

## 📊 7. Live Database CLI Inspection Matrix (`npm run inspect:db`)

For live presentation transparency, judges can inspect the real-time database state directly from the CLI:

```powershell
npm run inspect:db
```

### CLI Output Preview:
```text
====================================================
📊 LIFEFILE — LIVE DATABASE INSPECTION MATRIX
====================================================

👥 USERS COLLECTION (Total: 10)
┌─────────┬─────────────────────────────────────┬──────────┐
│ Name    │ Email                               │ Role     │
├─────────┼─────────────────────────────────────┼──────────┤
│ Aarav   │ demo.patient.01@lifefile.test       │ patient  │
│ Dr.Ana  │ demo.doctor.ananya@lifefile.test    │ doctor   │
└─────────┴─────────────────────────────────────┴──────────┘

📅 APPOINTMENT & ACPA QUEUE MATRIX (Total: 6)
┌───────┬──────────────┬───────────┬───────────┬───────────┬─────────────┐
│ Token │ Patient      │ Doctor    │ Status    │ Triage    │ MissedCalls │
├───────┼──────────────┼───────────┼───────────┼───────────┼─────────────┤
│ #101  │ Aarav Sharma │ Dr.Ananya │ Pending   │ Level 5   │ 0           │
│ #102  │ Diya Patel   │ Dr.Ananya │ Confirmed │ Level 1   │ 0           │
└───────┴──────────────┴───────────┴───────────┴───────────┴─────────────┘
```

---

## 💻 7B. Live Backend Code & Terminal Demonstration Manual

When technical judges request to see the backend logic, ACPA mathematical formulation, or streaming logs, demonstrate these exact code modules:

1. **ACPA Mathematical Priority Queue Engine (`scos-backend/routes/queue.js`):**
   * **Location:** Lines 35–85 in `routes/queue.js`
   * **Formula:** $\text{CEP Score} = (100 - \text{Base Token}) \times 10 + \text{Triage Bonus} + 1.5 \times \text{Wait Mins} - \min(\text{Misses} \times 30, 150)$
2. **AI Medical Memory Extractor & Conflict Guard (`scos-backend/services/memoryService.js`):**
   * **Location:** `extractAIMemoryCandidates()` (Lines 293–347) using Google Gemini 1.5 Flash.
   * **Location:** `isContradictory()` (Lines 17–39) detecting allergy assertion conflicts (*"No known allergy"* vs *"Penicillin allergy"*).
3. **Kafka Event Bus & Real-Time Sync Console Logs (`scos-backend/routes/queue.js`):**
   * Demonstrate real-time backend terminal log output during consultation actions:
     ```text
     [Kafka Producer] Event published to topic: scos.queue.updates (Action: CALL_NEXT)
     [ACPA Engine] Recalculated dynamic priority queue for Doctor ID 66c...
     [Socket.IO] Broadcasted queue_update to room doctor_66c...
     ```

---

## 🛠️ 8. Database Schema & Data Models

The active production path is Spring Boot with Spring Data MongoDB. The original Node/Mongoose models remain compatible with the same `scos` collections for scripts, seeders, and migration support.

### Appointment Model (`models/Appointment.js`)
```javascript
const appointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  doctorName: { type: String, required: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', default: null },
  hospitalName: { type: String, default: 'Private Practice' },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  time: { type: String, required: true }, // Format: HH:MM AM/PM
  baseToken: { type: Number, required: true }, // Permanent Token Number
  status: { 
    type: String, 
    enum: ['Pending', 'Confirmed', 'In_Progress', 'Completed', 'Cancelled', 'Rescheduled', 'Missed', 'Postponed'], 
    default: 'Pending' 
  },
  triageLevel: { type: Number, min: 1, max: 5, default: 1 },
  missedCalls: { type: Number, default: 0 },
  chiefComplaint: { type: String, default: '' },
  isWalkin: { type: Boolean, default: false }
}, { timestamps: true });
```

### Doctor-Linked Private Clinic Model

Each private clinic is linked to one real doctor and is created by `seed-clinics.js` or the presentation seeder. Hospital affiliations are stored separately on the doctor and hospital documents.

```javascript
const clinicSchema = new mongoose.Schema({
    name: String,                 // e.g. "Dr. Ananya Sharma Private Clinic"
    doctorId: ObjectId,           // ref Doctor
    doctorName: String,
    address: String,
    phone: String,
    doctors: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'maintenance'], default: 'active' }
}, { timestamps: true });
```

### Doctor Reviews

Completed appointments can produce a one-time patient review containing a rating and public comment. Doctor profiles expose the aggregated rating, review count, and public review list.

### Analytics API

The Spring analytics controller exposes role-specific live aggregates:

* `GET /api/analytics/admin` — system KPIs, hospital load, private-clinic load, status, peak hours, and walk-in/booked ratios.
* `GET /api/analytics/doctor` — doctor workload, hospital distribution, prescriptions, and linked private-clinic activity.
* `GET /api/analytics/hospital` — hospital doctors, patients, appointments, prescriptions, department load, status, walk-ins, and peak hours.
* `GET /api/analytics/patient` — appointment history, doctors visited, hospitals visited, and medications.

Private-clinic appointments are identified by the absence of a `hospitalId` and are grouped through the appointment's `doctorId` and the linked clinic record.

## 📈 9. Healthcare BI Practicals & Metabase

The `bi-labs` module operates on real LifeFile MongoDB collections; it does not generate unrelated sample sales data. `pipeline.py` performs five practicals:

1. Plotly visualizations for appointments, doctors, hospitals, and reviews.
2. Pandas cleaning, duplicate removal, status normalization, and triage validation.
3. Streamlit dashboard filters for hospital, specialization, status, and walk-ins.
4. SQLite warehouse tables and SQL reports for patient, doctor, hospital, appointment, and review facts/dimensions.
5. TextBlob sentiment scoring for real patient review comments.

Run the BI pipeline from `bi-labs`:

```powershell
python pipeline.py
streamlit run dashboard.py
docker compose -f docker-compose.metabase.yml up -d
```

Metabase runs at `http://localhost:3000` and connects to MongoDB through `host.docker.internal:27017`, database `scos`. The Streamlit dashboard links directly to Metabase.

---

## 🚀 10. Quick Start & Presentation Execution Commands

### 1. Launch Dev Ecosystem (Spring Backend + Frontend)
```bash
npm run dev
```

The root `dev` command seeds the live Ananya presentation data and starts Spring Boot on port `8080` plus Vite on port `5173`. To run the legacy Node backend separately, use `npm run dev:backend:node`.

### 2. Seed 24/7 Time-Aware Presentation Data
```bash
npm run seed:presentation -- --confirm
```

### 3. Inspect Live Database State
```bash
npm run inspect:db
```

### 4. Synchronize Doctor-Linked Private Clinics
```powershell
npm run seed:clinics --prefix scos-backend
```

This non-destructive seeder removes unlinked clinic records and upserts one private clinic per existing doctor.

### 5. Reset Demo Data from Login

The local demo reset control calls the protected demo-data endpoint and reseeds the presentation dataset. Use it only when a full demo reset is acceptable.

### 6. Stop / Cleanup Background Processes
```bash
npm run stop:all
```

---

### 📄 Document Metadata & Versioning
* **Document Version:** `4.0.0-FINAL`
* **System Code:** `LifeFile / SCOS Clinical Operating System`
* **Build Verification:** Spring Maven compile and frontend TypeScript/Vite build pass
* **Data Store:** MongoDB database `scos` at `mongodb://localhost:27017/scos`
* **Runtime Ports:** Spring `8080`, Vite `5173`, Streamlit `8511`, Metabase `3000`
