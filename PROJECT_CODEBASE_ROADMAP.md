# 🗺️ LIFEFILE — MASTER CODEBASE ROADMAP & ARCHITECTURE BLOCK DIAGRAM
**Platform:** LifeFile (Smart Clinic Operating System / SCOS)  
**SIH 2026 Master System Architecture & Detailed Code Location Reference**

---

## 📐 1. SYSTEM ARCHITECTURE BLOCK DIAGRAM

```mermaid
flowchart TD
    subgraph CLIENT ["📱 FRONTEND PRESENTATION LAYER (React + Vite + Tailwind)"]
        UI_Login["🔑 Login & Role Selection\n(src/pages/Login.tsx)"]
        UI_Booking["🩺 Doctor Booking & Real-Time NLP Triage\n(src/pages/patient/DoctorBooking.tsx)"]
        UI_PatAppt["🎟️ Patient Ticket & Time-Lock Check-In\n(src/pages/patient/PatientAppointments.tsx)"]
        UI_DocQueue["👨‍⚕️ Doctor ACPA Priority Queue\n(src/pages/doctor/DoctorQueue.tsx)"]
        UI_Memory["🧠 Clinical Memory & Allergy Safety Warning\n(src/components/PatientMemoryModal.tsx)"]
    end

    subgraph CLIENT_COMM ["🔌 FRONTEND COMMUNICATIONS LAYER"]
        API_Client["🌐 Axios HTTP Client\n(src/lib/api.ts)"]
        Socket_Client["⚡ Socket.IO Stream Listener\n(src/services/streaming.ts)"]
    end

    subgraph BACKEND_AUTH ["🔒 BACKEND MIDDLEWARE & SECURITY"]
        Auth_Middleware["🛡️ JWT & Multi-Tenant Facility Isolation\n(middleware/auth.js)"]
    end

    subgraph BACKEND_ROUTES ["⚙️ EXPRESS API ROUTE CONTROLLERS"]
        Route_Auth["🔑 Auth Route\n(routes/auth.js)"]
        Route_Appt["🩺 Appointment & Triage Route\n(routes/appointments.js)"]
        Route_Queue["📊 ACPA Queue Engine Route\n(routes/queue.js)"]
        Route_Mem["🧠 Clinical Memory Route\n(routes/memory.js)"]
    end

    subgraph BACKEND_SERVICES ["🧠 BACKGROUND AI & MESSAGING SERVICES"]
        Service_AI["✨ Gemini 1.5 Flash AI Memory Service\n(services/memoryService.js)"]
        Service_Kafka["📩 Kafka Event Producer\n(services/kafkaProducer.js)"]
    end

    subgraph INFRASTRUCTURE ["💾 DATA & MESSAGE BUS INFRASTRUCTURE"]
        Mongo_DB[("🍃 MongoDB Database\n(Users, Appointments, Memory, Queues)")]
        Kafka_Bus["🚀 Apache Kafka Event Bus\n(Topic: scos.queue.updates)"]
        Socket_Server["📡 Socket.IO Websocket Server\n(Real-Time Room Broadcasts)"]
    end

    %% Connections
    UI_Login & UI_Booking & UI_PatAppt & UI_DocQueue & UI_Memory --> API_Client
    UI_PatAppt & UI_DocQueue <--> Socket_Client

    API_Client -->|HTTP Headers + JWT| Auth_Middleware
    Auth_Middleware --> Route_Auth & Route_Appt & Route_Queue & Route_Mem

    Route_Auth & Route_Appt & Route_Queue --> Mongo_DB
    Route_Mem --> Service_AI
    Service_AI -->|Google Gemini API| Mongo_DB
    
    Route_Queue --> Service_Kafka
    Service_Kafka --> Kafka_Bus
    Kafka_Bus --> Socket_Server
    Socket_Server -->|Websocket Push| Socket_Client
```

---

### 🔍 DETAILED EXPLANATION OF EACH SYSTEM BLOCK

---

#### 🟢 Block 1: Frontend Presentation Layer (`scos-frontend/src/pages/`)
* **What it does:** Renders the user interfaces for Patients, Doctors, Hospitals, and Admins. Handles form inputs, real-time UI state updates, and interactive feedback.
* **Key Files & Code Locations:**
  1. `Login.tsx`: Includes 1-Click Role Authentication Pills (`👑 Admin`, `🏥 Hospital`, `👨‍⚕️ Doctor`, `👤 Patient 1/2/3`).
  2. `patient/DoctorBooking.tsx`: Contains `classifySymptoms()` which parses chief complaint text in real-time and illuminates the **Level 5 Emergency Badge**.
  3. `patient/PatientAppointments.tsx`: Computes `isCheckInAllowed()` to enforce the **15-minute Time-Lock Window**.
  4. `doctor/DoctorQueue.tsx`: Renders the dynamically sorted queue array ordered by the ACPA Priority CEP score.
  5. `components/PatientMemoryModal.tsx`: Displays parsed medical history cards with red **CONFLICTED / ALLERGY WARNING** badges.

---

#### 🔵 Block 2: Frontend Communications Layer (`scos-frontend/src/lib/` & `src/services/`)
* **What it does:** Acts as the network bridge between the React frontend and the Node.js backend. Handles HTTP REST requests and persistent WebSocket subscriptions.
* **Key Files & Code Locations:**
  1. `lib/api.ts`: Pre-configured Axios instance with base URL `http://localhost:5000/api` and automatic JWT `Authorization` header injection.
  2. `services/streaming.ts`: Socket.IO client connection manager (`io('http://localhost:5000')`). Listens to `queue_update` events and triggers React state refresh without page reloads.

---

#### 🟣 Block 3: Backend Security & Multi-Tenant Middleware (`scos-backend/middleware/`)
* **What it does:** Intercepts incoming HTTP requests, verifies JSON Web Tokens (JWT), extracts user identity, and enforces strict multi-tenant facility isolation (`hospitalId`).
* **Key Files & Code Locations:**
  1. `middleware/auth.js`: Implements `auth()` for token verification and `requireRole(['doctor', 'hospital'])` for route protection. Prevents unauthorized cross-hospital data access.

---

#### 🟡 Block 4: Express API Route Controllers (`scos-backend/routes/`)
* **What it does:** Handles HTTP endpoint logic, validates request payloads, executes database queries, and computes business algorithms.
* **Key Files & Code Locations:**
  1. `routes/auth.js`: Manages user login and registration with specialist fields (Cardiology, Orthopedics, Pathology).
  2. `routes/appointments.js`: Saves appointments with `chiefComplaint` and `triageLevel` into MongoDB.
  3. `routes/queue.js`: Implements the **ACPA Queue Algorithm** (Lines 35–85), computing CEP priority scores:
     $$\text{CEP} = (100 - \text{Token}) \times 10 + \text{Triage Bonus} + (1.5 \times \text{Wait Mins}) - \text{Skip Penalty}$$
  4. `routes/memory.js`: Manages patient memory cards and allergy conflict resolution routes.

---

#### 🔴 Block 5: Background AI & Messaging Services (`scos-backend/services/`)
* **What it does:** Runs asynchronous background processing, external AI model invocations, and Kafka message publishing.
* **Key Files & Code Locations:**
  1. `services/memoryService.js`:
     * `extractAIMemoryCandidates()` (Lines 293–347): Invokes Google Gemini 1.5 Flash API with JSON schema prompt engineering to parse clinical notes.
     * `isContradictory()` (Lines 17–39): Compares past patient assertions against current notes to detect opposing medical assertions (*"No allergy"* vs *"Penicillin allergy"*).
  2. `services/kafkaProducer.js`: Publishes queue state update events to Apache Kafka.

---

#### 🟤 Block 6: Data & Message Bus Infrastructure Layer
* **What it does:** Persistent database storage and high-throughput real-time message broadcasting.
* **Key Components & Code Locations:**
  1. **MongoDB Database:** Stores `Users`, `Doctors`, `Patients`, `Hospitals`, `Appointments`, `Queues`, and `PatientMemories`.
  2. **Apache Kafka Event Bus:** Topic `scos.queue.updates` decoupled queue state changes from websocket distribution.
  3. **Socket.IO Websocket Server:** `server.js` broadcasts real-time `queue_update` events to scoped client rooms.

---

## ⚡ 2. STEP-BY-STEP CALL TRACES (SEQUENCE DIAGRAMS)

---

### 🟢 Call Trace 1: Patient Booking & Real-Time NLP Triage Execution Flow

```mermaid
sequenceDiagram
    autonumber
    actor Patient as 👤 Patient (Browser UI)
    participant UI as DoctorBooking.tsx
    participant API as lib/api.ts
    participant Express as routes/appointments.js
    participant DB as MongoDB (Appointment)
    participant Kafka as Kafka Event Bus

    Patient->>UI: Types Chief Complaint ("Severe chest pain radiating to left arm...")
    UI->>UI: classifySymptoms("Severe chest pain...") [Line 25]
    Note over UI: Client-Side NLP parses entities -> Assigns Triage Level = 5 (Emergency)
    Patient->>UI: Selects Slot & Clicks "Confirm & Book Slot"
    UI->>API: createAppointment({ doctorId, chiefComplaint, triageLevel: 5 })
    API->>Express: HTTP POST /api/appointments (Bearer JWT Token)
    Express->>Express: Validate User Role & Hospital Scope (middleware/auth.js)
    Express->>DB: Appointment.create({ doctorId, triageLevel: 5, chiefComplaint })
    Express->>Kafka: sendQueueUpdateEvent("NEW_BOOKING", appointmentId)
    Express-->>API: 201 Created { appointmentId, tokenNumber: 101 }
    API-->>UI: Render Ticket Confirmation with Triage Level 5 Red Badge
```

---

### 🔵 Call Trace 2: OPD Crowd-Control Check-In & ACPA Dynamic Queue Calculation

```mermaid
sequenceDiagram
    autonumber
    actor Patient as 👤 Patient
    participant UI as PatientAppointments.tsx
    participant Express as routes/queue.js
    participant ACPA as ACPA Calculator Formula
    participant DB as MongoDB (Queue Model)
    participant Socket as Socket.IO Server
    actor Doctor as 👨‍⚕️ Doctor (DoctorQueue.tsx)

    Patient->>UI: Clicks "Check In Now" (Validates Time Lock <= 15 mins)
    UI->>Express: HTTP POST /api/queue/checkin { appointmentId }
    Express->>Express: Verify Slot Time & Active Window
    Express->>ACPA: Compute CEP Priority Score
    Note over ACPA: CEP = (100 - Token)*10 + TriageBonus(1000) + 1.5*WaitMins - Penalty
    Express->>DB: Queue.create({ token: 101, status: 'WAITING', cepScore: 1005 })
    Express->>Socket: io.to(doctorId).emit('queue_update', updatedQueue)
    Socket-->>Doctor: Real-Time Websocket Push Updates Queue State
    Note over Doctor: Token #101 jumps to Position #1 (Emergency Priority Override)
```

---

## 📂 3. COMPLETE DIRECTORY FILE MAP

```text
e:\ie proj\
├── PRESENTATION_FLOW.md                   # 🎤 Master judge speaking points & presentation script
├── PROJECT_DOCUMENTATION_MASTER.md        # 📘 Master technical architecture document
├── PROJECT_CODEBASE_ROADMAP.md            # 🗺️ Codebase block diagram & execution map (THIS FILE)
│
├── scos-backend/                          # ⚙️ Node.js + Express Backend
│   ├── inspect-db.js                      # 📊 CLI Database Inspector (npm run inspect:db)
│   ├── seed-10-distinct.js                # 🕒 24/7 Presentation Seeding Engine
│   ├── server.js                          # 🌐 Server Entrypoint & Socket.IO initialization
│   │
│   ├── middleware/
│   │   └── auth.js                        # 🔒 JWT Authentication & Multi-Tenant Role Isolation
│   │
│   ├── models/                            # 💾 Mongoose Schemas
│   │   ├── User.js                        # System User credentials & roles
│   │   ├── Doctor.js                      # Doctor profile, specializations, schedules
│   │   ├── Patient.js                     # Patient profile & medical history
│   │   ├── Hospital.js                    # Hospital facility metadata & address
│   │   ├── Appointment.js                 # Appointment slots, chief complaints, triage levels
│   │   ├── Queue.js                       # Active OPD Queue tokens & ACPA CEP scores
│   │   └── PatientMemory.js               # Structured medical memory facts & conflict flags
│   │
│   ├── routes/                            # 🚀 REST API Controllers
│   │   ├── auth.js                        # Login, Registration (Specialist selection), Roles
│   │   ├── appointments.js                # Booking, NLP Triage level storage, Status update
│   │   ├── queue.js                       # ACPA priority algorithm, check-in, call next
│   │   ├── memory.js                      # Clinical memory retrieval, conflict resolution
│   │   ├── doctors.js                     # Doctor profiles, search, hospital affiliation
│   │   └── hospitals.js                   # Facility management & doctor roster approvals
│   │
│   └── services/                          # 🧠 Background Services & AI Engines
│       ├── memoryService.js               # Gemini 1.5 Flash AI extraction & conflict check
│       └── kafkaProducer.js               # Kafka message bus producer service
│
└── scos-frontend/                         # 💻 React + TypeScript + Vite Frontend
    ├── src/
    │   ├── lib/
    │   │   └── api.ts                     # Axios HTTP API client for backend communication
    │   │
    │   ├── services/
    │   │   └── streaming.ts               # Socket.IO real-time websocket listener
    │   │
    │   ├── components/
    │   │   └── PatientMemoryModal.tsx     # Clinical memory cards & red allergy alert modal
    │   │
    │   ├── layouts/                       # Navigation sidebars & role layout wrappers
    │   │   ├── AdminLayout.tsx            # System Admin Portal layout
    │   │   ├── DoctorLayout.tsx           # Doctor Clinical Portal layout
    │   │   ├── HospitalLayout.tsx         # Hospital Facility Portal layout
    │   │   └── PatientLayout.tsx          # Patient Portal layout
    │   │
    │   └── pages/                         # Core UI Screen Views
    │       ├── Login.tsx                  # 1-Click Role Login Pills (`/login`)
    │       ├── Register.tsx               # Specialist Doctor / Hospital sign-up
    │       │
    │       ├── patient/
    │       │   ├── SearchDoctors.tsx      # Specialist search & filter (`/patient/search`)
    │       │   ├── DoctorBooking.tsx      # Real-time NLP Triage booking (`/patient/book/:id`)
    │       │   ├── PatientAppointments.tsx# Live digital ticket & time-lock check-in
    │       │   └── SymptomTriage.tsx      # AI NLP Symptom Checker portal (`/patient/triage`)
    │       │
    │       ├── doctor/
    │       │   ├── DoctorQueue.tsx        # ACPA priority queue dashboard
    │       │   └── DoctorSchedule.tsx     # Doctor OPD schedule manager
    │       │
    │       ├── hospital/
    │       │   ├── HospitalDashboard.tsx  # Hospital facility analytics & doctor roster
    │       │   └── DoctorApproval.tsx     # Doctor affiliation request manager
    │       │
    │       └── admin/
    │           ├── AdminDashboard.tsx     # System analytics & usage stats
    │           └── AuditLogs.tsx          # Immutable security audit log view
```

---

## ⚡ 4. HOW TO FIND ANY CODE IN 5 SECONDS DURING JUDGING

| If Judge Asks For: | Open This File: | Key Line Range / Function: |
| :--- | :--- | :--- |
| **"Show me the NLP Triage classifier code"** | `scos-frontend/src/pages/patient/DoctorBooking.tsx` | `classifySymptoms()` (Lines 25–65) |
| **"Show me the backend Gemini AI code"** | `scos-backend/services/memoryService.js` | `extractAIMemoryCandidates()` (Lines 293–347) |
| **"Show me the ACPA Queue Priority formula"** | `scos-backend/routes/queue.js` | CEP Score Calculation (Lines 35–85) |
| **"Show me how allergy conflicts are flagged"** | `scos-backend/services/memoryService.js` | `isContradictory()` (Lines 17–39) |
| **"Show me the Time-Lock Check-In logic"** | `scos-frontend/src/pages/patient/PatientAppointments.tsx` | `isCheckInAllowed()` (Lines 30–55) |
| **"Show me doctor registration specializations"** | `scos-frontend/src/pages/Register.tsx` | Specialization `<select>` dropdown (Lines 120–145) |
| **"Show me Kafka event generation"** | `scos-backend/routes/queue.js` | `kafkaProducer.send()` calls |
| **"Show me Multi-tenant database isolation"** | `scos-backend/middleware/auth.js` | `requireRole()` and `req.user.hospitalId` |
