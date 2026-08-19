# 🔑 LIFEFILE (SCOS) — MASTER DEMO ACCOUNTS & CREDENTIALS DIRECTORY

> **Global Password for All Accounts:** `Demo@123`  
> **Frontend URL:** `http://localhost:5173/login`  
> **1-Click Shortcut:** Use the 1-Click Login Pills on the login screen for instant access!

---

## 👑 1. SYSTEM ADMIN ACCOUNT

| Role | Full Name | Email Address | Password | Key Demo Features & Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Admin Lavya | `lavya@admin` | `Demo@123` | Master platform analytics, system-wide audit logs, national health compliance benchmarks, multi-hospital oversight. |

---

## 🏥 2. HOSPITAL FACILITY ACCOUNTS (5 HOSPITALS)

| Hospital Name | Facility Email Address | Password | City / Location | Specialty Focus |
| :--- | :--- | :--- | :--- | :--- |
| **LifeFile Central Hospital** | `demo.hospital.central@lifefile.test` | `Demo@123` | Central Metro | Multi-Specialty & Emergency Trauma Hub |
| **LifeFile North Hospital** | `demo.hospital.north@lifefile.test` | `Demo@123` | North Region | Orthopedics, Gastro & General OPD |
| **Metro City Trauma Institute** | `demo.hospital.metro@lifefile.test` | `Demo@123` | Downtown Metro | Neurosurgery & Critical Care |
| **Apex Suburb Specialty Care** | `demo.hospital.apex@lifefile.test` | `Demo@123` | Apex Suburbs | Oncology, Psychiatry & ENT |
| **St. Jude Children & Family** | `demo.hospital.stjude@lifefile.test` | `Demo@123` | Family Sector | Pediatrics, Allergy & Dermatology |

---

## 👨‍⚕️ 3. DOCTOR SPECIALIST ACCOUNTS (15 SPECIALISTS)

| Doctor Name | Email Address | Password | Medical Specialization | Primary Hospital Facility | Active OPD Queue Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dr. Ananya Sharma** | `demo.doctor.ananya@lifefile.test` | `Demo@123` | Cardiology | LifeFile Central Hospital | Active (4 Patients in Queue) |
| **Dr. Rohan Verma** | `demo.doctor.rohan@lifefile.test` | `Demo@123` | Emergency Medicine | LifeFile Central Hospital | Active (4 Patients in Queue) |
| **Dr. Sara Khan** | `demo.doctor.sara@lifefile.test` | `Demo@123` | General Medicine | LifeFile North Hospital | Active (4 Patients in Queue) |
| **Dr. Vikram Rao** | `demo.doctor.vikram@lifefile.test` | `Demo@123` | Pulmonology & Endocrinology | LifeFile Central Hospital | Active (3 Patients in Queue) |
| **Dr. Priya Deshmukh** | `demo.doctor.priya@lifefile.test` | `Demo@123` | Neurology | Metro City Trauma Institute | Active (4 Patients in Queue) |
| **Dr. Amit Patel** | `demo.doctor.amit@lifefile.test` | `Demo@123` | Orthopedics | LifeFile North Hospital | Active (3 Patients in Queue) |
| **Dr. Neha Gupta** | `demo.doctor.neha@lifefile.test` | `Demo@123` | Gastroenterology | LifeFile North Hospital | Active (3 Patients in Queue) |
| **Dr. Rajesh Iyer** | `demo.doctor.rajesh@lifefile.test` | `Demo@123` | Nephrology | Metro City Trauma Institute | Active (3 Patients in Queue) |
| **Dr. Meera Nambiar** | `demo.doctor.meera@lifefile.test` | `Demo@123` | Dermatology | St. Jude Children & Family | Active (3 Patients in Queue) |
| **Dr. Sanjay Saxena** | `demo.doctor.sanjay@lifefile.test` | `Demo@123` | Rheumatology | LifeFile North Hospital | Active (3 Patients in Queue) |
| **Dr. Kavita Singhania** | `demo.doctor.kavita@lifefile.test` | `Demo@123` | Pediatrics | St. Jude Children & Family | Active (3 Patients in Queue) |
| **Dr. Alok Bhatia** | `demo.doctor.alok@lifefile.test` | `Demo@123` | ENT & Otolaryngology | Apex Suburb Specialty Care | Active (4 Patients in Queue) |
| **Dr. Sunita Rastogi** | `demo.doctor.sunita@lifefile.test` | `Demo@123` | Endocrinology | Apex Suburb Specialty Care | Active (3 Patients in Queue) |
| **Dr. Deepa Menon** | `demo.doctor.deepa@lifefile.test` | `Demo@123` | Oncology | Apex Suburb Specialty Care | Active (3 Patients in Queue) |
| **Dr. Tarun Kulkarni** | `demo.doctor.tarun@lifefile.test` | `Demo@123` | Psychiatry | Apex Suburb Specialty Care | Active (3 Patients in Queue) |

---

## 👤 4. PATIENT ACCOUNTS DIRECTORY (50 UNIQUE PATIENTS)

> All 50 Patients are **automatically seeded directly into active OPD queues** across the 15 doctors above immediately upon running `npm run seed:presentation -- --confirm`.

| # | Patient Name | Email Address | Password | Triage Urgency Level | Assigned Doctor | OPD Queue Position & Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | Aarav Sharma | `demo.patient.01@lifefile.test` | `Demo@123` | 🔴 **Level 5: Emergency (Resuscitation)** | Dr. Ananya Sharma (Cardiology) | **Position #1 (`In_Progress`)** |
| **02** | Diya Patel | `demo.patient.02@lifefile.test` | `Demo@123` | 🟢 Level 2: Routine Checkup | Dr. Ananya Sharma (Cardiology) | **Position #2 (`Confirmed` - Active Check-In Window)** |
| **03** | Kabir Joshi | `demo.patient.03@lifefile.test` | `Demo@123` | 🟡 Level 3: Acute Consult | Dr. Ananya Sharma (Cardiology) | **Position #3 (`Confirmed` - Locked Window)** |
| **04** | Isha Nair | `demo.patient.04@lifefile.test` | `Demo@123` | 🟢 Level 2: Routine Consult | Dr. Ananya Sharma (Cardiology) | Position #4 (`Pending`) |
| **05** | Vihaan Malhotra | `demo.patient.05@lifefile.test` | `Demo@123` | 🟡 Level 3: Skipped Call | Dr. Rohan Verma (Emergency) | Position #1 (`In_Progress`) |
| **06** | Myra Kapoor | `demo.patient.06@lifefile.test` | `Demo@123` | 🔴 **Level 4: Urgent Trauma** | Dr. Rohan Verma (Emergency) | Position #2 (`Confirmed`) |
| **07** | Rohan Mehta | `demo.patient.07@lifefile.test` | `Demo@123` | 🟢 Level 2: Followup | Dr. Rohan Verma (Emergency) | Position #3 (`Confirmed`) |
| **08** | Ananya Sen | `demo.patient.08@lifefile.test` | `Demo@123` | 🟡 Level 3: Asthma Flare | Dr. Vikram Sethi (Pulmonology) | Position #1 (`In_Progress`) |
| **09** | Kian Reddy | `demo.patient.09@lifefile.test` | `Demo@123` | 🟢 Level 1: Minor Symptoms | Dr. Vikram Sethi (Pulmonology) | Position #2 (`Confirmed`) |
| **10** | Advait Bose | `demo.patient.10@lifefile.test` | `Demo@123` | 🟡 Level 3: Chronic Cough | Dr. Vikram Sethi (Pulmonology) | Position #3 (`Confirmed`) |
| **11** | Sanya Deshmukh | `demo.patient.11@lifefile.test` | `Demo@123` | 🟢 Level 2: Routine Checkup | Dr. Sara Khan (General Medicine) | Position #1 (`In_Progress`) |
| **12** | Dhruv Saxena | `demo.patient.12@lifefile.test` | `Demo@123` | 🟡 Level 3: Viral Fever | Dr. Sara Khan (General Medicine) | Position #2 (`Confirmed`) |
| **13** | Anaya Pillai | `demo.patient.13@lifefile.test` | `Demo@123` | 🟢 Level 2: Annual Checkup | Dr. Sara Khan (General Medicine) | Position #3 (`Confirmed`) |
| **14** | Reyansh Bhatia | `demo.patient.14@lifefile.test` | `Demo@123` | 🟢 Level 2: Joint Pain | Dr. Rajesh Iyer (Orthopedics) | Position #1 (`In_Progress`) |
| **15** | Shanaya Chawla | `demo.patient.15@lifefile.test` | `Demo@123` | 🟡 Level 3: Ligament Strain | Dr. Rajesh Iyer (Orthopedics) | Position #2 (`Confirmed`) |
| **16** | Ishaan Aggarwal | `demo.patient.16@lifefile.test` | `Demo@123` | 🟢 Level 2: Post-Op Followup | Dr. Rajesh Iyer (Orthopedics) | Position #3 (`Confirmed`) |
| **17** | Samaira Kaushik | `demo.patient.17@lifefile.test` | `Demo@123` | 🟡 Level 3: Acid Reflux | Dr. Meera Patel (Gastroenterology) | Position #1 (`In_Progress`) |
| **18** | Armaan Pandey | `demo.patient.18@lifefile.test` | `Demo@123` | 🟢 Level 2: Routine Consult | Dr. Meera Patel (Gastroenterology) | Position #2 (`Confirmed`) |
| **19** | Tara Sengupta | `demo.patient.19@lifefile.test` | `Demo@123` | 🟡 Level 3: Abdominal Pain | Dr. Meera Patel (Gastroenterology) | Position #3 (`Confirmed`) |
| **20** | Yash Nanda | `demo.patient.20@lifefile.test` | `Demo@123` | 🟢 Level 2: Arthritis Followup | Dr. Suresh Nambiar (Rheumatology) | Position #1 (`In_Progress`) |
| **21** | Zoya Hegde | `demo.patient.21@lifefile.test` | `Demo@123` | 🟡 Level 3: Joint Stiffness | Dr. Suresh Nambiar (Rheumatology) | Position #2 (`Confirmed`) |
| **22** | Parth Kulkarni | `demo.patient.22@lifefile.test` | `Demo@123` | 🟢 Level 2: Annual Checkup | Dr. Suresh Nambiar (Rheumatology) | Position #3 (`Confirmed`) |
| **23** | Riya Menon | `demo.patient.23@lifefile.test` | `Demo@123` | 🔴 **Level 5: Migraine/Neuro Event** | Dr. Arjun Kapoor (Neurology) | Position #1 (`In_Progress`) |
| **24** | Aryan Dutt | `demo.patient.24@lifefile.test` | `Demo@123` | 🟢 Level 2: Nerve Pain Check | Dr. Arjun Kapoor (Neurology) | Position #2 (`Confirmed`) |
| **25** | Kiara Gill | `demo.patient.25@lifefile.test` | `Demo@123` | 🟡 Level 3: Memory Check | Dr. Arjun Kapoor (Neurology) | Position #3 (`Confirmed`) |
| **26** | Dev Chaudhry | `demo.patient.26@lifefile.test` | `Demo@123` | 🟡 Level 3: Kidney Function | Dr. Priyanka Roy (Nephrology) | Position #1 (`In_Progress`) |
| **27** | Navya Varma | `demo.patient.27@lifefile.test` | `Demo@123` | 🟢 Level 2: Routine Dialysis | Dr. Priyanka Roy (Nephrology) | Position #2 (`Confirmed`) |
| **28** | Kabir Suri | `demo.patient.28@lifefile.test` | `Demo@123` | 🟡 Level 3: Lab Review | Dr. Priyanka Roy (Nephrology) | Position #3 (`Confirmed`) |
| **29** | Avani Sundaram | `demo.patient.29@lifefile.test` | `Demo@123` | 🟢 Level 2: Sinus Consult | Dr. Neha Gupta (ENT) | Position #1 (`In_Progress`) |
| **30** | Shivansh Tandon | `demo.patient.30@lifefile.test` | `Demo@123` | 🟡 Level 3: Ear Infection | Dr. Neha Gupta (ENT) | Position #2 (`Confirmed`) |
| **31** | Prisha Bansal | `demo.patient.31@lifefile.test` | `Demo@123` | 🟢 Level 2: Throat Check | Dr. Neha Gupta (ENT) | Position #3 (`Confirmed`) |
| **32** | Aravind Swamy | `demo.patient.32@lifefile.test` | `Demo@123` | 🟢 Level 2: Thyroid Check | Dr. Tariq Hussain (Endocrinology) | Position #1 (`In_Progress`) |
| **33** | Bhavna Mathur | `demo.patient.33@lifefile.test` | `Demo@123` | 🟡 Level 3: Diabetes Followup | Dr. Tariq Hussain (Endocrinology) | Position #2 (`Confirmed`) |
| **34** | Chirag Ahuja | `demo.patient.34@lifefile.test` | `Demo@123` | 🟢 Level 2: Routine Checkup | Dr. Tariq Hussain (Endocrinology) | Position #3 (`Confirmed`) |
| **35** | Divya Solanki | `demo.patient.35@lifefile.test` | `Demo@123` | 🔴 **Level 4: Oncology Review** | Dr. Sunita Rao (Oncology) | Position #1 (`In_Progress`) |
| **36** | Ehan Farooqui | `demo.patient.36@lifefile.test` | `Demo@123` | 🟢 Level 2: Blood Work Review | Dr. Sunita Rao (Oncology) | Position #2 (`Confirmed`) |
| **37** | Falguni Shah | `demo.patient.37@lifefile.test` | `Demo@123` | 🟡 Level 3: Routine Consult | Dr. Sunita Rao (Oncology) | Position #3 (`Confirmed`) |
| **38** | Gautam Gambhir | `demo.patient.38@lifefile.test` | `Demo@123` | 🟢 Level 2: Anxiety Consult | Dr. Alok Nath (Psychiatry) | Position #1 (`In_Progress`) |
| **39** | Hina Khan | `demo.patient.39@lifefile.test` | `Demo@123` | 🟡 Level 3: Sleep Evaluation | Dr. Alok Nath (Psychiatry) | Position #2 (`Confirmed`) |
| **40** | Inderjit Singh | `demo.patient.40@lifefile.test` | `Demo@123` | 🟢 Level 2: Stress Management | Dr. Alok Nath (Psychiatry) | Position #3 (`Confirmed`) |
| **41** | Juhi Chawla | `demo.patient.41@lifefile.test` | `Demo@123` | 🟢 Level 2: Child Wellness | Dr. Kavita Joshi (Pediatrics) | Position #1 (`In_Progress`) |
| **42** | Kunal Kapoor | `demo.patient.42@lifefile.test` | `Demo@123` | 🟡 Level 3: Pediatric Fever | Dr. Kavita Joshi (Pediatrics) | Position #2 (`Confirmed`) |
| **43** | Lavanya Tripathi | `demo.patient.43@lifefile.test` | `Demo@123` | 🟢 Level 2: Growth Checkup | Dr. Kavita Joshi (Pediatrics) | Position #3 (`Confirmed`) |
| **44** | Manan Shroff | `demo.patient.44@lifefile.test` | `Demo@123` | 🟢 Level 2: Rash Evaluation | Dr. Deepak Shah (Dermatology) | Position #1 (`In_Progress`) |
| **45** | Niharika Konidela | `demo.patient.45@lifefile.test` | `Demo@123` | 🟡 Level 3: Skin Allergy | Dr. Deepak Shah (Dermatology) | Position #2 (`Confirmed`) |
| **46** | Omkar Das | `demo.patient.46@lifefile.test` | `Demo@123` | 🟢 Level 2: Acne Followup | Dr. Deepak Shah (Dermatology) | Position #3 (`Confirmed`) |
| **47** | Pooja Hegde | `demo.patient.47@lifefile.test` | `Demo@123` | 🟢 Level 2: Routine Checkup | Dr. Ananya Sharma (Cardiology) | Position #5 (`Pending`) |
| **48** | Qasim Sheikh | `demo.patient.48@lifefile.test` | `Demo@123` | 🟡 Level 3: General Fever | Dr. Sara Khan (General Medicine) | Position #4 (`Pending`) |
| **49** | Radhika Apte | `demo.patient.49@lifefile.test` | `Demo@123` | 🟢 Level 2: Routine Consult | Dr. Rajesh Iyer (Orthopedics) | Position #4 (`Pending`) |
| **50** | Siddharth Roy | `demo.patient.50@lifefile.test` | `Demo@123` | 🟡 Level 3: Cardiac Checkup | Dr. Ananya Sharma (Cardiology) | Position #6 (`Pending`) |

---

## ⚡ 5. PRE-PRESENTATION SETUP COMMANDS CHEAT SHEET

Run these 3 simple commands in your terminal to initialize or reset all 50 patient queues:

```powershell
# 1. Stop background processes
npm run stop:all

# 2. Clear database & seed all 50 patients, 15 doctors, 5 hospitals
npm run seed:presentation -- --confirm

# 3. Start Frontend & Backend
npm run dev
```
