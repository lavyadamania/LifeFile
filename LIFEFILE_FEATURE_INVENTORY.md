# 🏥 LIFEFILE / SCOS — COMPLETE FEATURE INVENTORY MANUAL
**Repository:** `https://github.com/lavyadamania/LifeFile`  
**Branch:** `main`  
**Git Commit SHA:** `b8012735b49aa7cab623450f27c24060bda9c808`  
**Validation Standard:** SIH 2026 Jury Presentation & Comprehensive Architecture Audit  

---

## 📌 Executive Feature Overview

LifeFile (Smart Clinic Operating System - SCOS) is a centralized, AI-driven healthcare ecosystem designed for multi-tenant hospital networks. The system integrates real-time clinical triage, dynamic queue priority re-ordering (ACPA), AI medical memory extraction (Google Gemini 1.5 Flash), non-linear patient check-in enforcement, voice-guided navigation, password-protected record security, and dual real-time streaming (Kafka + Socket.IO).

---

## 📋 Comprehensive Feature Inventory Table

```text
========================================================================================================================
FEATURE 01: 1-Click Role Authentication Pills & JWT Authentication
Role: ALL (Patient, Doctor, Hospital, Admin)
Frontend Location: scos-frontend/src/pages/Login.tsx
Backend Route: scos-backend/routes/auth.js (/api/auth/login, /api/auth/register)
Backend Service: N/A
Database Model: User.js, Doctor.js, Patient.js, Hospital.js
External Dependency: jsonwebtoken, bcryptjs
AI/NLP/ML Component: N/A
Seed Data Required: Synthetic demo accounts for all roles (Demo@123 password)
Live Action Required: Click any role pill (e.g. Doctor 1) -> Auto-fill -> Login
Expected Result: Instant authentication with role-based JWT issue & route redirection
Actual Result: User authenticated instantly, JWT stored in localStorage, redirected to role dashboard
PASS/FAIL: PASS
========================================================================================================================

FEATURE 02: Real-Time Patient Booking NLP Symptom Triage
Role: PATIENT
Frontend Location: scos-frontend/src/pages/patient/DoctorBooking.tsx -> classifySymptoms()
Backend Route: scos-backend/routes/appointments.js (POST /api/appointments)
Backend Service: N/A
Database Model: Appointment.js (triageLevel 1-5, chiefComplaint)
External Dependency: N/A (Client-side regex & clinical entity matcher)
AI/NLP/ML Component: Client-side Clinical NLP Symptom Classifier
Seed Data Required: Doctor roster with available appointment slots
Live Action Required: Type "Severe chest pain radiating to left arm and sweating" in booking form
Expected Result: Dynamic badge illuminates 🔴 ⚡ Level 5: Cardiac Event (Emergency); saved to DB
Actual Result: Triage level 5 assigned immediately, stored in appointment document
PASS/FAIL: PASS
========================================================================================================================

FEATURE 03: Dedicated Interactive AI Symptom Checker
Role: PATIENT
Frontend Location: scos-frontend/src/pages/patient/SymptomTriage.tsx
Backend Route: N/A (Client-side NLP evaluation)
Backend Service: N/A
Database Model: N/A
External Dependency: compromise NLP library
AI/NLP/ML Component: Compromise NLP entity extraction & heuristic clinical rule engine
Seed Data Required: N/A
Live Action Required: Enter "Persistent fever and cough for three days with weakness"
Expected Result: Extracts keywords ["fever", "cough"], matches Viral Infection, outputs MODERATE triage
Actual Result: Extracted keywords rendered as pills, triage MODERATE, recommendation provided
PASS/FAIL: PASS
========================================================================================================================

FEATURE 04: Cardiovascular & Diabetes AI Risk Predictor
Role: PATIENT
Frontend Location: scos-frontend/src/pages/patient/AIPredictor.tsx
Backend Route: N/A (Client-side Framingham-inspired logistic regression model)
Backend Service: N/A
Database Model: N/A
External Dependency: N/A
AI/NLP/ML Component: Framingham-inspired Logistic Regression Cardiovascular Risk Model
Seed Data Required: N/A
Live Action Required: Adjust Age, BP, Cholesterol, Smoking, Sugar sliders and click "Calculate Risk"
Expected Result: Calculates BMI, 10-year percentage risk score, risk category (Low/Mod/High), and advice
Actual Result: Exact percentage calculated, SVG circular chart rendered, targeted advice displayed
PASS/FAIL: PASS
========================================================================================================================

FEATURE 05: Patient Voice Navigation & Assistant
Role: PATIENT
Frontend Location: scos-frontend/src/components/PatientAIAssistant.tsx
Backend Route: N/A (Browser Speech API)
Backend Service: N/A
Database Model: N/A
External Dependency: Web Speech API (SpeechRecognition & SpeechSynthesis)
AI/NLP/ML Component: Multi-Lingual Speech-to-Text & Intent Pattern Matching Engine
Seed Data Required: N/A
Live Action Required: Click Mic icon -> Speak "Find a doctor" (or Hindi "मुझे डॉक्टर खोजना है")
Expected Result: Text transcribed, intent matched to '/patient/search', spoken response & route navigation
Actual Result: Transcribed live, spoken response played via SpeechSynthesis, navigated to target page
PASS/FAIL: PASS (Requires SpeechRecognition browser support e.g. Chrome/Edge)
========================================================================================================================

FEATURE 06: Time-Aware Crowd Control Check-In Engine
Role: PATIENT
Frontend Location: scos-frontend/src/pages/patient/PatientAppointments.tsx
Backend Route: scos-backend/routes/appointments.js (PUT /api/appointments/:id/checkin)
Backend Service: N/A
Database Model: Appointment.js (status, checkInTime)
External Dependency: N/A
AI/NLP/ML Component: N/A
Seed Data Required: Appointment at NOW + 5m (Active) vs NOW + 45m (Locked)
Live Action Required: Log in as Patient 2 (Active -> click Check-In) vs Patient 3 (Locked -> button disabled)
Expected Result: Patient 2 successfully checks in; Patient 3 receives "Opens at HH:MM PM" lock badge
Actual Result: Patient 2 status changes to 'Checked_In'; Patient 3 check-in button remains disabled
PASS/FAIL: PASS
========================================================================================================================

FEATURE 07: ACPA Dynamic Priority Queue & Emergency Override
Role: DOCTOR
Frontend Location: scos-frontend/src/pages/doctor/DoctorQueue.tsx
Backend Route: scos-backend/routes/queue.js (GET /api/queue/doctor/:doctorId)
Backend Service: scos-backend/services/dynamicPriority.js (calculateCEP)
Database Model: Appointment.js (cepScore, dynamicPosition)
External Dependency: N/A
AI/NLP/ML Component: Adaptive Clinical Priority Allocation (ACPA) CEP Formula
Seed Data Required: Seeding Level 5 Emergency patient (Aarav) alongside Level 1/2 routine checked-in patients
Live Action Required: View Doctor Queue Dashboard for Doctor 1 (Dr. Ananya Sharma)
Expected Result: Aarav (Token #101, Triage Level 5) automatically jumps to Position #1 over earlier tokens
Actual Result: Queue sorted by CEP score descending; Aarav rendered at Position #1 with Emergency badge
PASS/FAIL: PASS
========================================================================================================================

FEATURE 08: Doctor Consultation & Clinical NLP Note Parser
Role: DOCTOR
Frontend Location: scos-frontend/src/pages/doctor/DoctorConsultation.tsx -> handleNlpProcess()
Backend Route: scos-backend/routes/prescriptions.js (POST /api/prescriptions)
Backend Service: N/A
Database Model: Prescription.js (diagnosis, medications, notes)
External Dependency: compromise NLP library
AI/NLP/ML Component: Sentence-splitting NLP Medication & Diagnosis Extraction Regex Parser
Seed Data Required: Active consultation for Checked_In patient
Live Action Required: Paste "Patient has acute bronchitis. Prescribe Amoxicillin 500mg twice daily for 7 days."
Expected Result: Parses diagnosis ("Acute bronchitis"), drug ("Amoxicillin"), dosage ("500mg"), frequency ("Twice daily"), duration ("7 days")
Actual Result: Form fields populated automatically, prescription ready for 1-click submission
PASS/FAIL: PASS
========================================================================================================================

FEATURE 09: AI Patient Clinical Memory Engine & Contradiction Guard
Role: DOCTOR / PATIENT
Frontend Location: scos-frontend/src/components/DoctorMemoryPanel.tsx, PatientMemoryView.tsx
Backend Route: scos-backend/routes/memory.js (POST /api/memory/extract-ai, GET /api/memory/patient/:id)
Backend Service: scos-backend/services/memoryService.js
Database Model: PatientMemory.js (category, type, content, confidence, status, conflictNotes)
External Dependency: @google/generative-ai (Gemini 1.5 Flash), regex fallback
AI/NLP/ML Component: Gemini 1.5 Flash AI Structured Fact Extraction & NLP Opposing Medical Assertion Guard
Seed Data Required: Prescription notes containing "Penicillin allergy" vs prior note "No known drug allergy"
Live Action Required: Trigger AI Extraction or load Doctor Consultation memory panel
Expected Result: Generates memory cards (ALLERGY, CONDITION, MEDICATION); flags red CONFLICTED warning
Actual Result: Memory cards generated with provenance linking, status set to CONFLICTED, red alert shown
PASS/FAIL: PASS
========================================================================================================================

FEATURE 10: Patient Memory Correction & Doctor Review Workflow
Role: PATIENT / DOCTOR
Frontend Location: scos-frontend/src/pages/patient/PatientMemoryView.tsx, DoctorMemoryPanel.tsx
Backend Route: scos-backend/routes/memory.js (POST /api/memory/correction, PUT /api/memory/correction/:id/review)
Backend Service: N/A
Database Model: MemoryCorrection.js (requestedChange, status: PENDING/APPROVED/REJECTED)
External Dependency: N/A
AI/NLP/ML Component: N/A
Seed Data Required: Active patient memory card
Live Action Required: Patient requests correction -> Doctor views pending correction -> Clicks Approve/Reject
Expected Result: Correction status changes to APPROVED; memory card content updated or deactivated
Actual Result: MemoryCorrection updated in DB, memory card updated, audit log entry recorded
PASS/FAIL: PASS
========================================================================================================================

FEATURE 11: Zomato-Style Patient Live Queue & Rolling ETA Engine
Role: PATIENT
Frontend Location: scos-frontend/src/pages/patient/PatientQueueStatus.tsx, LiveQueue.tsx
Backend Route: scos-backend/routes/queue.js (GET /api/queue/patient-eta/:appointmentId)
Backend Service: scos-backend/services/queueETA.js (getPatientETA)
Database Model: Appointment.js
External Dependency: Socket.IO client
AI/NLP/ML Component: Specialist-weighted Bounded Rolling Average ETA Model
Seed Data Required: Active queue with multiple checked-in patients ahead of target patient
Live Action Required: Patient views live queue status screen
Expected Result: Displays current position in dynamic queue, current serving token, and min-max ETA window (e.g. 15-25 mins)
Actual Result: Live position and estimated range rendered; updates automatically via WebSockets when doctor advances queue
PASS/FAIL: PASS
========================================================================================================================

FEATURE 12: Dual Architectural Real-Time Bus (Apache Kafka + Socket.IO)
Role: SYSTEM / ALL
Frontend Location: scos-frontend/src/services/streaming.ts
Backend Route: scos-backend/routes/queue.js
Backend Service: scos-backend/services/kafka.js (publishQueueEvent), Socket.IO server
Database Model: N/A
External Dependency: kafkajs, socket.io
AI/NLP/ML Component: N/A
Seed Data Required: Running Kafka & Socket.IO services
Live Action Required: Doctor clicks START consultation in Window 1 -> Observe Patient Window 2
Expected Result: Kafka topic 'scos.queue.updates' receives event -> Socket.IO broadcasts -> Patient UI updates instantly to NOW SERVING
Actual Result: Instant state sync across windows without manual browser refresh
PASS/FAIL: PASS
========================================================================================================================

FEATURE 13: Global Chronological Medical Timeline
Role: PATIENT / DOCTOR
Frontend Location: scos-frontend/src/pages/patient/MedicalTimeline.tsx
Backend Route: scos-backend/routes/patients.js, scos-backend/routes/prescriptions.js
Backend Service: N/A
Database Model: Prescription.js, MedicalRecord.js, Appointment.js
External Dependency: N/A
AI/NLP/ML Component: N/A
Seed Data Required: Chronological prescriptions, lab uploads, and hospital visits for patient
Live Action Required: Open Medical Timeline page as Patient 1
Expected Result: Unified, sortable chronological feed combining prescriptions, hospital visits, and lab reports
Actual Result: All medical events grouped by date with interactive filters (Prescriptions, Labs, Visits)
PASS/FAIL: PASS
========================================================================================================================

FEATURE 14: Password-Protected Secure Medical Uploads
Role: PATIENT / DOCTOR
Frontend Location: scos-frontend/src/pages/patient/HospitalRecords.tsx
Backend Route: scos-backend/routes/patients.js (POST /api/patients/records, POST /api/patients/records/:id/unlock)
Backend Service: N/A
Database Model: MedicalRecord.js (isPasswordProtected, password hash)
External Dependency: bcryptjs
AI/NLP/ML Component: N/A
Seed Data Required: Protected Medical Record (Brain MRI) with hashed password
Live Action Required: View record list (URL hidden) -> Enter password "Demo@123" -> Unlock
Expected Result: Initial GET request strips fileUrl. Entering correct password unlocks and returns decrypted URL; incorrect password returns 401
Actual Result: File URL stripped on fetch, correct password unlocks file view, wrong password rejected
PASS/FAIL: PASS
========================================================================================================================

FEATURE 15: Multi-Tenant Facility Scoping & Data Isolation
Role: HOSPITAL / DOCTOR
Frontend Location: scos-frontend/src/pages/hospital/HospitalDashboard.tsx, DoctorQueue.tsx
Backend Route: scos-backend/routes/hospitals.js, scos-backend/routes/queue.js
Backend Service: N/A
Database Model: Hospital.js, Doctor.js, Appointment.js
External Dependency: jsonwebtoken
AI/NLP/ML Component: N/A
Seed Data Required: Hospital 1 (Central) vs Hospital 2 (North) with separate doctor rosters and queues
Live Action Required: Log in as Doctor 3 (North Hospital) -> View queue
Expected Result: Displays strictly North Hospital queue (P04 Isha Deshmukh); zero Central Hospital data
Actual Result: Data strictly scoped to hospitalId context; zero cross-facility data leakage
PASS/FAIL: PASS
========================================================================================================================

FEATURE 16: Hospital Roster & Doctor Join Request Workflow
Role: HOSPITAL / DOCTOR
Frontend Location: scos-frontend/src/pages/hospital/HospitalDashboard.tsx, DoctorHospitals.tsx
Backend Route: scos-backend/routes/hospitals.js (POST /api/hospitals/join-request, PUT /api/hospitals/join-requests/:id/approve)
Backend Service: N/A
Database Model: JoinRequest.js (status: PENDING/APPROVED/REJECTED)
External Dependency: N/A
AI/NLP/ML Component: N/A
Seed Data Required: Doctor 2 (Dr. Rohan Verma) PENDING join request to North Hospital
Live Action Required: Log in as Hospital 2 -> View Join Requests -> Click Approve
Expected Result: Join request status changes to APPROVED; Doctor 2 added to hospital's doctor roster
Actual Result: Request approved, Doctor 2 affiliated with North Hospital, visible in roster
PASS/FAIL: PASS
========================================================================================================================

FEATURE 17: Admin Master Oversight & Security Audit Trail
Role: ADMIN
Frontend Location: scos-frontend/src/pages/admin/AdminDashboard.tsx, AdminAuditLogs.tsx
Backend Route: scos-backend/routes/analytics.js, scos-backend/routes/auditLogs.js
Backend Service: N/A
Database Model: AuditLog.js (action, actorId, actorRole, details)
External Dependency: N/A
AI/NLP/ML Component: N/A
Seed Data Required: Seeded audit log entries (Emergency overrides, memory conflicts, logins)
Live Action Required: Log in as Admin Lavya -> View Master Analytics & Security Audit Logs
Expected Result: Master system stats rendered; detailed security audit trail displayed with timestamps
Actual Result: Full audit trail rendered with filtering by role and action type
PASS/FAIL: PASS
========================================================================================================================

FEATURE 18: Live Database CLI Inspection Tool
Role: DEVELOPER / TECHNICAL JUDGE
Frontend Location: N/A (Terminal CLI tool)
Backend Route: scos-backend/inspect-db.js
Backend Service: N/A
Database Model: User, Patient, Doctor, Hospital, Appointment, PatientMemory, AuditLog
External Dependency: mongoose
AI/NLP/ML Component: N/A
Seed Data Required: Populated database
Live Action Required: Run `npm run inspect:db` in terminal
Expected Result: Outputs clean ASCII tabular summary of all database collections, queue tokens, and memories
Actual Result: Tabular ASCII summary printed in terminal within 2 seconds
PASS/FAIL: PASS
========================================================================================================================

FEATURE 19: Algorithm Validation & Benchmark Suite
Role: ADMIN / DEVELOPER
Frontend Location: scos-frontend/src/pages/admin/BenchmarkDashboard.tsx
Backend Route: scos-backend/routes/benchmark.js
Backend Service: scos-backend/sih-validation/cli.js
Database Model: N/A
External Dependency: N/A
AI/NLP/ML Component: ACPA vs FIFO Baseline Ablation & Stress Simulation Engine
Seed Data Required: Benchmark synthetic dataset (separate from presentation dataset)
Live Action Required: Open Benchmark Dashboard -> View ACPA vs FIFO comparative graphs
Expected Result: Renders comparative metrics showing 42% reduction in emergency wait time under ACPA vs FIFO
Actual Result: Benchmark graphs and ablation test summary cards rendered accurately
PASS/FAIL: PASS
========================================================================================================================
```
