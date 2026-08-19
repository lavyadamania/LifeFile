# 🔑 LIFEFILE / SCOS — MASTER DEMO CREDENTIALS & APPOINTMENT MATRIX
**Platform:** LifeFile (Smart Clinic Operating System / SCOS)  
**Global Password:** `Demo@123`  
**Execution Environment:** 100% Dynamic 24/7 Clock-Aware Presentation Offset Engine  

---

## 👥 1. Synthetic Demo Accounts Directory

| Account Role | Display Name | Email Address | Password | Facility / Scoping | Key Presentation Highlight |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin** | Admin Lavya | `lavya@admin` | `Demo@123` | Master System Scoped | Master System Analytics, Security Audit Logs, Algorithm Benchmark Suite. |
| **Hospital 1** | LifeFile Central Hospital | `demo.hospital.central@lifefile.test` | `Demo@123` | Primary Facility Scoped | Roster Management, Pending Doctor Approvals, Facility OPD Oversight. |
| **Hospital 2** | LifeFile North Hospital | `demo.hospital.north@lifefile.test` | `Demo@123` | Secondary Facility Scoped | Isolated OPD Queue, Facility Data Isolation Validation. |
| **Doctor 1** | Dr. Ananya Sharma | `demo.doctor.ananya@lifefile.test` | `Demo@123` | Senior Cardiologist @ Central Hospital | ACPA Dynamic Queue Dashboard, Emergency Priority Override, AI Consultation. |
| **Doctor 2** | Dr. Rohan Verma | `demo.doctor.rohan@lifefile.test` | `Demo@123` | Emergency Specialist (Pending Affiliation) | Doctor Join Request Workflow, Cross-Hospital Affiliation. |
| **Doctor 3** | Dr. Sara Khan | `demo.doctor.sara@lifefile.test` | `Demo@123` | General Physician @ North Hospital | Multi-Tenant Data Isolation (Isolated Queue for North Hospital). |
| **Patient 1** | Aarav Sharma | `demo.patient.01@lifefile.test` | `Demo@123` | Primary Patient | Level 5 Resuscitation Emergency, Penicillin Allergy Conflict Warning. |
| **Patient 2** | Diya Patel | `demo.patient.02@lifefile.test` | `Demo@123` | Primary Patient | Active Check-In Window (`NOW + 5m`), Password-Protected Brain MRI Upload. |
| **Patient 3** | Kabir Joshi | `demo.patient.03@lifefile.test` | `Demo@123` | Primary Patient | Locked Check-In Window (`NOW + 45m`), Memory Contradiction Flag. |
| **Patient 4** | Isha Deshmukh | `demo.patient.04@lifefile.test` | `Demo@123` | Secondary Facility Patient | North Hospital Queue Isolation (Token #107). |
| **Patient 5** | Vihaan Kapoor | `demo.patient.05@lifefile.test` | `Demo@123` | Primary Patient | Skipped Queue Penalty (-30 Pts, 1 Missed Call). |
| **Patient 6** | Myra Nair | `demo.patient.06@lifefile.test` | `Demo@123` | Primary Patient | Active `In_Progress` Consultation (`NOW - 15m`). |

---

## 🕒 2. 24/7 Clock-Relative Appointment Offset Matrix

All appointment times are calculated dynamically relative to the execution time ($T_{\text{now}}$):

| Patient Name | Token # | Target Doctor | Scheduled Offset | Configured Window | Calculated Check-In State | ACPA CEP Score | Queue Position |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Aarav Sharma (P01)** | `#101` | Dr. Ananya Sharma | $T_{\text{now}} - 10\text{m}$ | $[-15\text{m}, +15\text{m}]$ | `Checked_In` | **955 Pts** (Level 5 Emergency) | **Position #1** |
| **Diya Patel (P02)** | `#102` | Dr. Ananya Sharma | $T_{\text{now}} + 5\text{m}$ | $[-15\text{m}, +15\text{m}]$ | `Booked` $\rightarrow$ **ACTIVE (`Join Queue`)** | 825 Pts (Level 3 Gastro) | Position #2 (Post Check-In) |
| **Kabir Joshi (P03)** | `#103` | Dr. Ananya Sharma | $T_{\text{now}} + 45\text{m}$ | $[-15\text{m}, +15\text{m}]$ | `Booked` $\rightarrow$ **LOCKED (`Opens in 30m`)** | N/A (Unchecked) | N/A (Outside Window) |
| **Isha Deshmukh (P04)**| `#107` | Dr. Sara Khan | $T_{\text{now}} - 5\text{m}$ | $[-15\text{m}, +15\text{m}]$ | `Checked_In` | 815 Pts (Level 2 Routine) | **Position #1 @ North Hospital** |
| **Vihaan Kapoor (P05)**| `#105` | Dr. Ananya Sharma | $T_{\text{now}} - 25\text{m}$ | $[-15\text{m}, +15\text{m}]$ | `Checked_In` (1 Skipped Call) | **690 Pts** (-30 Penalty Applied) | Position #3 |
| **Myra Nair (P06)** | `#106` | Dr. Ananya Sharma | $T_{\text{now}} - 15\text{m}$ | $[-15\text{m}, +15\text{m}]$ | `In_Progress` | N/A (Currently Serving) | **NOW SERVING** |

---

## 🔒 3. Role Permissions & Data Isolation Matrix

```text
========================================================================================================================
ROLE: PATIENT
Allowed Actions:
  - View & edit own profile and medical vitals
  - Search doctors and hospitals across network
  - Book appointment with real-time NLP symptom triage
  - Check-in to appointment when current clock is within [-15m, +15m] window
  - View live queue position, top token serving, and Zomato-style ETA range
  - View own global medical timeline, prescriptions, and lab reports
  - Upload password-protected lab records (bcrypt hashed)
  - View own AI Clinical Memory cards and submit memory correction requests
  - Interact with Web Speech Voice Assistant (English, Hindi, Spanish)
  - Run AI Cardiovascular & Diabetes Risk Predictor

Forbidden Actions:
  - Access another patient's medical records or profile (Blocked by JWT patientId check)
  - Access doctor queue management or consultation endpoints (Blocked by RBAC role check)
  - Access hospital administrative roster endpoints (Blocked by RBAC role check)
  - Access admin system analytics or security audit logs (Blocked by RBAC role check)
========================================================================================================================

ROLE: DOCTOR
Allowed Actions:
  - View own dynamic ACPA priority queue
  - Call next patient, start consultation, skip patient (missed call), or mark completed
  - Perform live NLP clinical note parsing into structured prescription fields
  - View patient's AI Clinical Memory cards with active allergy conflict warnings
  - Review and approve/reject patient memory correction requests
  - Issue electronic prescriptions with dosage, frequency, and duration
  - Request hospital affiliation (Join Request)

Forbidden Actions:
  - Access queues or appointments of another doctor (Blocked by doctorId scoping)
  - Access patient records without authorized relationship (Blocked by permission check)
  - Approve hospital join requests (Hospital Admin permission required)
  - Access global platform admin settings (Admin permission required)
========================================================================================================================

ROLE: HOSPITAL ADMIN
Allowed Actions:
  - View facility dashboard and doctor roster for assigned hospitalId
  - Review, approve, or reject doctor join requests for assigned hospitalId
  - Monitor facility-level OPD queue statistics and daily patient throughput
  - View aggregated hospital analytics

Forbidden Actions:
  - Access queues, rosters, or appointments of another hospital facility (Enforced by hospitalId JWT scoping)
  - View individual patient medical memories or private prescriptions
  - Access master platform administrative audit logs (Master Admin required)
========================================================================================================================

ROLE: MASTER ADMIN
Allowed Actions:
  - Access platform master analytics, total facility metrics, and revenue/throughput graphs
  - View global security audit logs (AuditLog collection)
  - Execute algorithm benchmark & validation suite (ACPA vs FIFO ablation tests)
  - Manage global hospital networks, doctor verifications, and user roles

Forbidden Actions:
  - Delete master admin account during automated seed resets (Preserved by seed engine)
========================================================================================================================
```
