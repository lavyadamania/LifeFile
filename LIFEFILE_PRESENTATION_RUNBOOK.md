# 🏆 LIFEFILE / SCOS — LIVE SIH 2026 PRESENTATION RUNBOOK & SCRIPT
**Platform:** LifeFile (Smart Clinic Operating System / SCOS)  
**Target Duration:** 8–10 Minutes Live Demo + Q&A Defense  
**Backup Environment:** Dual Kafka + Socket.IO + 4s Auto-Polling Resilience  

---

## ⚡ 1. Pre-Presentation Setup (Run 2 Minutes Before Judges Arrive)

Open Windows PowerShell in the root directory (`cd "e:\ie proj"`):

```powershell
# 1. Terminate any stale node background processes
npm run stop:all

# 2. Completely clear database & reinstate default admin
npm run clear-db

# 3. Seed dynamic 24/7 clock-relative presentation dataset
npm run seed:presentation -- --confirm

# 4. Launch Frontend & Backend concurrently
npm run dev
```

---

## 📍 2. Step-by-Step 24-Step Live Presentation Sequence

```text
========================================================================================================================
STEP 01: Startup Verification
Action: Open browser at http://localhost:5173/login. Verify terminal shows zero backend errors.
Speaking Track: "Respected Judges, welcome to LifeFile—an Autonomous Enterprise Smart Clinic Operating System."

STEP 02: 1-Click Demo Login Pills
Action: Point to the Quick Login Pills at top of Login page (Admin, Hospital 1/2, Doctor 1/2/3, Patient 1/2/3).
Speaking Track: "To ensure a zero-friction live demonstration, LifeFile includes 1-Click Role Pills that instantly authenticate any actor while demonstrating full JWT role-based security."

STEP 03: Patient Chief Complaint & Real-Time NLP Auto-Triage (THE HOOK - FIRST 20 SECONDS!)
Action: Click 'Patient 1 (Aarav)' pill -> Navigate to Search Doctors -> Click Book Appointment on Dr. Ananya Sharma.
Input: Type in symptom box: "Severe chest pain radiating to left arm and sweating"
Highlight: Watch dynamic badge illuminate instantly to 🔴 ⚡ Level 5: Cardiac Event (Emergency).
Speaking Track: "Judges, watch what happens as the patient types their symptoms. Our real-time NLP Clinical Classifier instantly evaluates urgency, flagging this as a Level 5 Resuscitation Emergency."

STEP 04: Patient Booking Submission
Action: Click 'Confirm & Book Appointment'.
Speaking Track: "Rather than assigning a static appointment slot, the system embeds this Level 5 clinical triage directly into the appointment payload."

STEP 05: Crowd Control Check-In Window Locks
Action: Log in as Patient 2 (Diya) vs Patient 3 (Kabir) on Patient Appointments page.
Highlight: Show Diya's slot (NOW + 5m) has ACTIVE 'Join Queue / Check In Now' button. Show Kabir's slot (NOW + 45m) has LOCKED 'Opens at HH:MM PM' button.
Speaking Track: "To eliminate chaotic hospital waiting rooms, LifeFile enforces dynamic time-lock check-in windows. Diya's appointment is in 5 minutes, so check-in is active. Kabir's appointment is in 45 minutes, so check-in is locked."

STEP 06: Doctor Queue & ACPA Emergency Override
Action: Open Doctor Queue Dashboard as Doctor 1 (Dr. Ananya Sharma).
Highlight: Point out Aarav Sharma (Token #101) standing at Position #1 in the queue despite earlier bookings.
Speaking Track: "Here on Dr. Ananya Sharma's Queue Dashboard, observe that Aarav Sharma holds Position #1 despite earlier bookings. This is our ACPA Engine—Adaptive Clinical Priority Allocation. It calculates CEP priority scores combining Triage Level, Wait Time Aging, and Missed Call penalties."

STEP 07: Dual Real-Time Synchronization (Kafka + Socket.IO)
Action: Keep Doctor Dashboard open in Window 1. Open Window 2 (Incognito) as Patient 1 (Aarav). Click 'START Consultation' on Aarav in Doctor Window 1.
Highlight: Patient Window 2 updates instantly in real time to NOW SERVING without manual refresh.
Speaking Track: "Watch both screens: as the doctor clicks 'Start Consultation', our Kafka event bus dispatches a state transition through Socket.IO. The patient's mobile device updates instantly in real time."

STEP 08: Patient AI Clinical Memory & Allergy Contradiction Guard
Action: In Doctor Consultation view for Aarav, view the AI Clinical Memory panel.
Highlight: Show red CONFLICTED / ALLERGY WARNING badge on Penicillin.
Speaking Track: "LifeFile features an AI-powered Patient Clinical Memory Engine powered by Google Gemini 1.5 Flash. It aggregates medical history across past visits. Here, it flags an active Penicillin allergy conflict before the doctor prescribes medication, preventing dangerous drug interaction errors."

STEP 09: Doctor Consultation NLP Note Parser
Action: In Doctor Consultation view, paste clinical note: "Patient has acute bronchitis. Prescribe Amoxicillin 500mg twice daily for 7 days." -> Click 'Process Note with NLP'.
Highlight: Watch Diagnosis ("Acute bronchitis"), Drug ("Amoxicillin"), Dosage ("500mg"), Frequency ("Twice daily"), Duration ("7 days") auto-fill into prescription form fields.
Speaking Track: "Our doctor consultation parser transforms raw unstructured clinical notes into structured prescription fields instantly using NLP sentence parsing."

STEP 10: Electronic Prescription Issue
Action: Click 'Issue Electronic Prescription & Complete Visit'.
Speaking Track: "The prescription is generated, stored in MongoDB, and pushed to the patient's digital wallet."

STEP 11: Global Chronological Medical Timeline
Action: Log in as Patient 1 -> Open Medical Timeline page.
Highlight: Show chronological feed combining prescriptions, hospital visits, and lab reports.
Speaking Track: "The patient views their unified global medical timeline combining past OPD visits, prescriptions, and lab reports chronologically."

STEP 12: Memory Correction Workflow
Action: On Patient Memory View page, click 'Request Correction' on a memory card -> Type "No longer allergic". Switch to Doctor Memory Panel -> Show pending correction request -> Click Approve.
Speaking Track: "Patients can request memory corrections, which enter a doctor review queue for clinical validation before memory cards are updated."

STEP 13: Password-Protected Secure Medical Records
Action: Go to Patient Records page -> Point to "Brain MRI Scan" -> Show URL is hidden. Enter password "Demo@123" -> Click Unlock.
Highlight: Record unlocks and displays full MRI scan image.
Speaking Track: "LifeFile secures sensitive medical uploads with bcrypt password protection. Network inspectors cannot see the file URL until the correct password is provided."

STEP 14: AI Cardiovascular & Diabetes Risk Predictor
Action: Open AI Risk Predictor page -> Adjust sliders (Age 64, BP 165/98, Smoker, Diabetes) -> Click 'Calculate AI Risk Score'.
Highlight: SVG circular chart renders 84.3% High Risk with targeted clinical advice.
Speaking Track: "Our predictive analytics engine estimates 10-year cardiovascular risk based on Framingham vitals heuristics, providing preventive health insights."

STEP 15: Voice AI Navigation
Action: Click Mic floating action button -> Speak "Find a doctor" (or Hindi "मुझे डॉक्टर खोजना है").
Highlight: Assistant transcribes speech, speaks response, and navigates to '/patient/search'.
Speaking Track: "LifeFile integrates multi-lingual Web Speech voice navigation supporting English, Hindi, and Spanish for accessibility."

STEP 16: Missed Call Skip Penalty & Call Now Action
Action: In Doctor Queue, click 'SKIP' on Patient 5 (Vihaan Kapoor).
Highlight: Vihaan's missed call count increments to 1, apply -30 CEP penalty, moves down queue. Click 'CALL NOW' to resume.
Speaking Track: "If a patient misses their call, the doctor clicks Skip. The patient receives a bounded penalty so the OPD isn't stalled, but retains their token to be called when they return."

STEP 17: Multi-Tenant Facility Isolation
Action: Log in as Doctor 3 (Dr. Sara Khan) at LifeFile North Hospital.
Highlight: Queue displays strictly North Hospital patient (Isha Deshmukh). Zero data from Central Hospital.
Speaking Track: "LifeFile enforces strict multi-tenant facility isolation at the database layer. Doctor queues are strictly scoped to the active hospital facility context."

STEP 18: Hospital Roster & Doctor Join Request Workflow
Action: Log in as Hospital 2 (North Hospital) -> View Join Requests -> Click Approve on Dr. Rohan Verma.
Speaking Track: "Hospitals manage their clinical rosters dynamically, approving or rejecting doctor affiliation requests."

STEP 19: Master Admin System Oversight & Analytics
Action: Log in as Admin Lavya -> View Master Analytics dashboard.
Highlight: Show platform patient volume, hospital networks, doctor counts, and system metrics.
Speaking Track: "Master admin dashboards provide healthcare department officials with macro-level facility analytics and system oversight."

STEP 20: Security Audit Trail
Action: Open Admin Audit Logs page.
Highlight: Point out logged emergency overrides, memory conflicts, password unlocks, and login events.
Speaking Track: "Every sensitive clinical override, memory conflict, and authentication event is recorded in a real-time immutable security audit log."

STEP 21: Live Terminal Database Inspection Matrix (`npm run inspect:db`)
Action: Open PowerShell terminal side-by-side -> Run `npm run inspect:db`.
Highlight: Point out ASCII tabular output showing raw MongoDB collections, queue CEP scores, and memories.
Speaking Track: "For complete technical transparency, our CLI inspector gives judges an instant, real-time audit matrix of database state."

STEP 22: Algorithm Benchmark & Ablation Suite
Action: Open Admin Benchmark Dashboard.
Highlight: Point to ACPA vs FIFO comparative graphs showing 42% wait time reduction for emergency cases.
Speaking Track: "Our validation engine executes empirical ablation tests comparing ACPA against traditional FIFO queue baselines."

STEP 23: Zomato-Style Live Patient ETA Range
Action: Switch to Patient 2 Live Queue screen.
Highlight: Show current queue position, top token serving, and bounded min-max wait window (e.g. 15-25 mins).
Speaking Track: "Patients track their position in real-time with bounded min-max ETAs that update automatically when the queue advances."

STEP 24: Conclusion & Q&A Open
Action: Display main dashboard summary.
Speaking Track: "LifeFile is presentation-ready, resilient, and production-architected. We are ready for judge Q&A!"
========================================================================================================================
```

---

## 🛠️ 3. Emergency Recovery Runbook (If Anything Unexpected Happens)

```powershell
# Scenario 1: Wi-Fi or Network Drops during demo
# Solution: System automatically falls back to 4-second HTTP polling background sync! 
# No action needed.

# Scenario 2: Database state gets messy during testing before judges arrive
# Solution: Run standard reset command (takes 3 seconds):
npm run clear-db
npm run seed:presentation -- --confirm

# Scenario 3: Port 5000 or 5173 blocked by old process
# Solution: Force kill all node processes:
npm run stop:all
npm run dev
```
