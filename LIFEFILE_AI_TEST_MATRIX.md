# 🧠 LIFEFILE / SCOS — AI & NLP FEATURE TEST MATRIX
**Platform:** LifeFile (Smart Clinic Operating System / SCOS)  
**AI/NLP Stack:** Google Gemini 1.5 Flash (`@google/generative-ai`), `compromise` NLP, Client-Side Heuristic Models, Web Speech API  
**Validation Standard:** Live Input-Output Execution Verification  

---

## 📊 1. AI Cardiovascular & Diabetes Risk Predictor (`AIPredictor.tsx`)

| Test Profile | Input Vitals & Factors | Calculated BMI | Risk Score % | Risk Category | Verified Recommendations / Alerts | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Test Profile 1: Low Risk** | Age: 30, Gender: Female, Height: 165cm, Weight: 55kg, BP: 115/75 mmHg, Chol: 150 mg/dL, HDL: 65 mg/dL, LDL: 80 mg/dL, Smoker: False, Diabetes: False | **20.2** (Normal) | **2.6%** | **Low Risk** | Green badge rendered; recommendation: *"Your risk profile is excellent. Keep up the healthy lifestyle!"* | **PASS** |
| **Test Profile 2: Moderate Risk** | Age: 52, Gender: Male, Height: 172cm, Weight: 82kg, BP: 138/88 mmHg, Chol: 215 mg/dL, HDL: 42 mg/dL, LDL: 135 mg/dL, Smoker: True (10 cigs/day), Diabetes: False | **27.7** (Overweight) | **14.8%** | **Moderate Risk** | Amber badge rendered; recommendations: *"Moderate risk. Consider lifestyle changes..."* & *"Your blood pressure is elevated."* | **PASS** |
| **Test Profile 3: High Risk** | Age: 64, Gender: Male, Height: 170cm, Weight: 95kg, BP: 165/98 mmHg, Chol: 260 mg/dL, HDL: 32 mg/dL, LDL: 180 mg/dL, Smoker: True (20 cigs/day), Diabetes: True (Sugar 180 mg/dL) | **32.9** (Obese) | **84.3%** | **High Risk** | Red badge rendered; recommendations: *"High risk detected. Please schedule a consultation with a cardiologist immediately."* & *"Quitting smoking is #1..."* | **PASS** |

---

## 🩺 2. Smart AI Symptom Triage (`SymptomTriage.tsx`)

| Test Scenario | Input Symptom Text | NLP Extracted Keywords | Matched Condition | Triage Level Output | Recommended Action | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Scenario 1: Mild** | *"Mild runny nose and occasional sneezing for one day."* | `runny`, `nose`, `sneezing`, `mild`, `day` | Allergic Reaction | **MILD** | *"Rest and hydrate. If symptoms persist for more than 48 hours, book a general consultation."* | **PASS** |
| **Scenario 2: Moderate** | *"Persistent fever and cough for three days with weakness."* | `fever`, `cough`, `weakness`, `days` | Viral Infection / Flu | **MODERATE** | *"Please book a consultation with a doctor at your earliest convenience."* | **PASS** |
| **Scenario 3: Urgent** | *"Severe abdominal pain with persistent vomiting and dizziness."* | `severe`, `abdominal`, `pain`, `vomiting`, `dizziness` | Gastroenteritis / Neurological Event | **URGENT** | *"Please seek immediate emergency medical attention or go to the nearest hospital."* | **PASS** |
| **Scenario 4: Emergency / Cardio** | *"Severe chest pain radiating to left arm and sweating"* | `severe`, `chest`, `pain`, `sweating`, `left`, `arm` | Possible Cardiac Event | **URGENT** | Red emergency alert card rendered with immediate hospitalization instruction. | **PASS** |

---

## 📝 3. Booking NLP Symptom Triage Classifier (`DoctorBooking.tsx` `classifySymptoms()`)

| Input Chief Complaint | Classified Triage Level | Assigned Category | Database Stored Value | Status |
| :--- | :--- | :--- | :--- | :--- |
| *"Routine annual wellness checkup and mild fatigue"* | **Level 1** | Standard Outpatient Consultation | `triageLevel: 1` | **PASS** |
| *"Itchy skin rash on arm for 2 days after gardening"* | **Level 2** | Moderate Allergic / Musculoskeletal | `triageLevel: 2` | **PASS** |
| *"High fever and persistent abdominal vomiting"* | **Level 3** | Urgent Systemic Infection / Gastro | `triageLevel: 3` | **PASS** |
| *"Severe headache with stiff neck and blurred vision"* | **Level 4** | Neurological / Acute Pain | `triageLevel: 4` | **PASS** |
| *"Severe chest pain radiating to left arm and sweating"* | **Level 5** | Cardiac Event (Emergency) | `triageLevel: 5` | **PASS** |

---

## 🎙️ 4. Patient Voice AI & Assistant Intents (`PatientAIAssistant.tsx`)

| Supported Language | Voice Input Speech | Extracted Intent | System Spoken Response | Target Route Navigation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **English** | *"Find a doctor"* | Doctor Search | *"Taking you to the doctor search page..."* | `/patient/search` | **PASS** |
| **English** | *"Show my appointments"* | View Appointments | *"Taking you to your appointments..."* | `/patient/appointments` | **PASS** |
| **English** | *"Show my prescriptions"* | View Timeline | *"Opening your medical timeline and prescriptions..."* | `/patient/timeline` | **PASS** |
| **Hindi** | *"मुझे डॉक्टर खोजना है"* | Doctor Search | *"Taking you to the doctor search page..."* | `/patient/search` | **PASS** |
| **Hindi** | *"मेरी दवा और पर्चा दिखाओ"* | View Timeline | *"Opening your medical timeline and prescriptions..."* | `/patient/timeline` | **PASS** |
| **Spanish** | *"Buscar un médico"* | Doctor Search | *"Taking you to the doctor search page..."* | `/patient/search` | **PASS** |
| **Spanish** | *"Mostrar mis citas"* | View Appointments | *"Taking you to your appointments..."* | `/patient/appointments` | **PASS** |
| **Edge Case: Unrecognized**| *"Play some music"* | Unknown Intent | *"I'm sorry, I didn't quite catch that. You can say things like 'Book an appointment'..."* | None (Stays on page) | **PASS** |

---

## 📋 5. Doctor Consultation NLP Prescription Extraction (`DoctorConsultation.tsx`)

| Clinical Test Note Input | Extracted Diagnosis | Extracted Drug Name | Dosage | Frequency | Duration | Form Auto-Fill | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Test A:** *"Patient has acute bronchitis. Prescribe Amoxicillin 500mg twice daily for 7 days."* | Acute bronchitis | Amoxicillin | 500mg | Twice daily | 7 days | Yes | **PASS** |
| **Test B:** *"Patient presents with hypertension. Prescribe Amlodipine 5mg once daily for 30 days. Also give Metoprolol 50mg twice daily for 30 days."* | Hypertension | Amlodipine & Metoprolol | 5mg & 50mg | Once daily & Twice daily | 30 days | Yes (Appends multiple rows) | **PASS** |
| **Test C:** *"Patient diagnosed with migraine. Start Sumatriptan 50 mg as needed for 30 days."* | Migraine | Sumatriptan | 50 mg | As needed (PRN) | 30 days | Yes | **PASS** |
| **Test D:** *"Patient has a confirmed penicillin allergy."* | N/A | Penicillin | N/A | N/A | N/A | Identified for allergy extraction | **PASS** |
| **Test E:** *"Patient has no known drug allergy."* | N/A | None | N/A | N/A | N/A | Identified for negative assertions | **PASS** |
| **Test F (Messy Note):** *"45yo female suffering from type 2 diabetes. Prescribe Metformin 1000mg twice daily for 90 days with meals."* | Type 2 diabetes | Metformin | 1000mg | Twice daily | 90 days | Yes | **PASS** |

---

## 🧬 6. Patient AI Clinical Memory Engine Test Suite (`memoryService.js`)

```text
========================================================================================================================
TEST 6.1: Deterministic Structured Extraction
Input: Prescription with Diagnosis: "Acute bronchitis", Medication: "Amoxicillin", Dosage: "500 mg"
Processed Pipeline: extractDeterministicMemories() -> deduplicateAndPersistCandidates()
Extracted Candidates:
  - Category: CONDITION, Content: "Acute bronchitis", Type: FACT
  - Category: MEDICATION, Content: "Amoxicillin (500 mg)", Type: FACT
Database State: Created 2 PatientMemory documents with status 'ACTIVE' and confidence 'SUPPORTED'
PASS/FAIL: PASS
========================================================================================================================

TEST 6.2: Regex Allergy Extraction
Input Note: "Known penicillin allergy. Patient developed severe rash on amoxicillin."
Processed Pipeline: extractDeterministicMemories() regex matcher -> deduplicateAndPersistCandidates()
Extracted Candidates:
  - Category: ALLERGY, Content: "penicillin allergy", Type: FACT
Database State: Created PatientMemory document (Category: ALLERGY, status: ACTIVE)
PASS/FAIL: PASS
========================================================================================================================

TEST 6.3: Google Gemini 1.5 Flash AI Extraction
Input Note: "Patient has chronic migraine. Currently taking Sumatriptan 50 mg as needed. History of appendectomy."
Processed Pipeline: extractAIMemoryCandidates() -> Gemini 1.5 Flash JSON prompt -> Validation -> Persistence
Extracted Candidates:
  - Category: CONDITION, Content: "Chronic migraine", Type: FACT
  - Category: MEDICATION, Content: "Sumatriptan 50 mg", Type: FACT
  - Category: PROCEDURE, Content: "Appendectomy", Type: FACT
Database State: Created 3 structured PatientMemory cards linked to Prescription _id provenance
PASS/FAIL: PASS
========================================================================================================================

TEST 6.4: AI Hallucination Defense & Schema Validation
Input Candidate: { category: "SUPERPOWER", type: "MAGIC", content: "Flight" }
Processed Pipeline: extractAIMemoryCandidates() validation filter (validCategories & validTypes array check)
Result: Candidate rejected during filter stage; zero invalid entries inserted into MongoDB
PASS/FAIL: PASS
========================================================================================================================

TEST 6.5: Memory Deduplication & Multi-Source Support
Input Candidate: Candidate "Penicillin allergy" extracted from Prescription Record #2 when Record #1 already generated "Penicillin allergy"
Processed Pipeline: deduplicateAndPersistCandidates() normalized string match
Result: Existing memory updated; candidate._id appended to sourceRecordIds array (Length = 2); confidence set to 'SUPPORTED'
PASS/FAIL: PASS
========================================================================================================================

TEST 6.6: Medical Assertion Contradiction Detection
Existing Memory: Content: "No known drug allergy" (Category: ALLERGY, Status: ACTIVE)
New Candidate: Content: "Penicillin allergy" (Category: ALLERGY)
Processed Pipeline: isContradictory() assertion check -> Opposing negative vs positive assertion detected
Result: Existing memory status changed to 'CONFLICTED'; candidate saved as 'CONFLICTED'; red warning badge rendered on Doctor UI
PASS/FAIL: PASS
========================================================================================================================
```
