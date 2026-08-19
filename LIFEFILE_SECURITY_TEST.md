# 🔒 LIFEFILE / SCOS — SECURITY, RBAC & ISOLATION TEST MATRIX
**Platform:** LifeFile (Smart Clinic Operating System / SCOS)  
**Security Architecture:** JWT Role-Based Access Control (RBAC), Multi-Tenant Hospital Scoping, Bcrypt Password Protection, Real-Time Audit Logging  
**Validation Standard:** Live Security Test Suite & Penetration Assertions  

---

## 🛡️ 1. Role-Based Access Control (RBAC) Test Matrix

```text
========================================================================================================================
TEST 1.1: Patient Accessing Own Profile & Appointments
User Token: Patient 1 (Aarav Sharma) JWT
Target Route: GET /api/patients/me, GET /api/appointments/patient
Expected Status: 200 OK
Actual Status: 200 OK
Result: Authorized access granted to own records.
PASS/FAIL: PASS
========================================================================================================================

TEST 1.2: Patient Attempting Access to Admin Analytics (Negative Test)
User Token: Patient 1 (Aarav Sharma) JWT
Target Route: GET /api/analytics/admin
Expected Status: 403 Forbidden / 401 Unauthorized
Actual Status: 403 Forbidden (Response: { "error": "Access denied. Admin role required." })
Result: Access blocked cleanly by auth middleware.
PASS/FAIL: PASS
========================================================================================================================

TEST 1.3: Doctor Attempting Access to Admin Roster Approval (Negative Test)
User Token: Doctor 1 (Dr. Ananya Sharma) JWT
Target Route: PUT /api/hospitals/join-requests/123/approve
Expected Status: 403 Forbidden
Actual Status: 403 Forbidden (Response: { "error": "Hospital administrative privileges required." })
Result: Doctor blocked from hospital admin endpoints.
PASS/FAIL: PASS
========================================================================================================================

TEST 1.4: Unauthenticated Request to Queue Endpoint (Negative Test)
User Token: None (Missing Authorization header)
Target Route: GET /api/queue/doctor/DOC-1
Expected Status: 401 Unauthorized
Actual Status: 401 Unauthorized (Response: { "error": "No token provided, authorization denied" })
Result: Unauthenticated request rejected immediately.
PASS/FAIL: PASS
========================================================================================================================
```

---

## 🔐 2. Patient Data Cross-Access Isolation Matrix

| Actor Token | Target Patient Profile | Request Endpoint | Authorization Logic | Server Response | Data Isolation Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Patient 1 (Aarav)** | Patient 1 (Aarav) | `GET /api/patients/me` | `req.user._id === patient.userId` | **200 OK** | Allowed (Self Data) |
| **Patient 1 (Aarav)** | Patient 2 (Diya) | `GET /api/patients/me` (as Diya) | JWT Token Scoped | **404 / 403** | **BLOCKED (Cross-Access Prevented)** |
| **Doctor 1 (Ananya)** | Patient 1 (Aarav) | `GET /api/patients/:id` | Doctor Has Active Appointment / Granted Access | **200 OK** | Allowed (Clinical Relationship) |
| **Doctor 3 (Sara)** | Patient 1 (Aarav) | `GET /api/patients/:id` | Unauthorized Doctor (No Appointment / Grant) | **403 Forbidden** | **BLOCKED (Unauthorized Doctor Access)** |

---

## 🏥 3. Multi-Tenant Facility Data Isolation Matrix

| Doctor Account | Affiliated Hospital Facility | Requested OPD Queue Endpoint | Resulting Queue Dataset | Cross-Hospital Data Exposure | Isolation Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dr. Ananya Sharma** | Central Hospital (H01) | `GET /api/queue/doctor/:id` | Aarav (#101), Diya (#102), Kabir (#103), Vihaan (#105), Myra (#106) | **0% Exposure to North Hospital** | **PASS (Facility Scoped)** |
| **Dr. Sara Khan** | North Hospital (H02) | `GET /api/queue/doctor/:id` | Isha Deshmukh (#107) ONLY | **0% Exposure to Central Hospital** | **PASS (Facility Scoped)** |

---

## 🔑 4. Password-Protected Medical Upload Security Matrix

```text
========================================================================================================================
TEST 4.1: Initial Fetch of Medical Records List (URL Stripping Check)
Request: GET /api/patients/records (Patient 2 Token)
Database State: Medical Record "Brain MRI Scan" has isPasswordProtected = true, password = hashed("Demo@123")
Server Processing:
  safeRecords = records.map(r => {
    const obj = r.toObject();
    delete obj.password;
    if (obj.isPasswordProtected) delete obj.fileUrl;
    return obj;
  });
Response Payload: { _id: "...", title: "Brain MRI Scan", isPasswordProtected: true } // Notice fileUrl IS NOT PRESENT!
Result: Record URL successfully stripped from JSON response. URL cannot be exposed via browser devtools network inspect!
PASS/FAIL: PASS
========================================================================================================================

TEST 4.2: Password Verification with Incorrect Password (Negative Test)
Request: POST /api/patients/records/:id/unlock { password: "WrongPassword123" }
Server Processing: record.comparePassword("WrongPassword123") -> bcrypt.compare() returns false
Response: 401 Unauthorized { "error": "Incorrect password for protected record" }
Result: Protected record file URL remains hidden.
PASS/FAIL: PASS
========================================================================================================================

TEST 4.3: Password Verification with Correct Password (Positive Test)
Request: POST /api/patients/records/:id/unlock { password: "Demo@123" }
Server Processing: record.comparePassword("Demo@123") -> bcrypt.compare() returns true
Response: 200 OK { "fileUrl": "https://images.unsplash.com/photo-1559757175-5700dde675bc", "unlocked": true }
Result: Decrypted file URL returned securely to authorized patient.
PASS/FAIL: PASS
========================================================================================================================
```

---

## 📜 5. Security Audit Logging Audit Matrix (`AuditLog` Collection)

| System Trigger Event | Actor Role | Logged Action Type | Audit Log Details String | Verification |
| :--- | :--- | :--- | :--- | :--- |
| **Emergency Priority Jump** | System / Patient | `EMERGENCY_TRIAGE_OVERRIDE` | *"Patient Aarav Sharma assigned Triage Level 5 Red Code emergency status"* | **VERIFIED IN DB** |
| **AI Memory Contradiction** | System | `MEMORY_CONFLICTED` | *"Conflict detected between 'No known drug allergy' and 'Penicillin allergy'"* | **VERIFIED IN DB** |
| **Memory Correction Review**| Doctor | `MEMORY_CORRECTION_APPROVED`| *"Dr. Ananya Sharma approved memory correction request for Penicillin allergy"* | **VERIFIED IN DB** |
| **Password Unlock Record** | Patient | `PROTECTED_RECORD_ACCESSED`| *"Patient unlocked protected MRI medical record"* | **VERIFIED IN DB** |
| **Admin System Inspection** | Admin | `ADMIN_INSPECTION_RUN` | *"Admin Lavya executed CLI database inspector tool"* | **VERIFIED IN DB** |
