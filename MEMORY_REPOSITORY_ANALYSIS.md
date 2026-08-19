# LifeFile Memory Feature — Repository Analysis Report (`MEMORY_REPOSITORY_ANALYSIS.md`)

This analysis inspects the existing LifeFile repository structure and models to prepare for the implementation of the **Patient Longitudinal Memory Layer**.

---

## 1. Existing System Components Mapping

| Component | File Path | Existing Implementation Details | How Memory Uses It |
| :--- | :--- | :--- | :--- |
| **Patient Identity & Profile** | [`scos-backend/models/User.js`](file:///e:/ie%20proj/scos-backend/models/User.js)<br>[`scos-backend/models/Patient.js`](file:///e:/ie%20proj/scos-backend/models/Patient.js) | `User` holds auth credentials & `role: 'patient'`. `Patient` holds clinical demographics (`userId`, `grantedDoctors`, `hospitalHistory`). | `patientId` (referencing `User._id` / `Patient._id`) anchors all memory items. Memory is strictly scoped per patient. |
| **Medical Records & Consultations** | [`scos-backend/models/Prescription.js`](file:///e:/ie%20proj/scos-backend/models/Prescription.js)<br>[`scos-backend/models/MedicalRecord.js`](file:///e:/ie%20proj/scos-backend/models/MedicalRecord.js)<br>[`scos-backend/models/Appointment.js`](file:///e:/ie%20proj/scos-backend/models/Appointment.js) | `Prescription` contains `diagnosis`, `notes`, `medications` array (`name`, `dosage`, `frequency`, `duration`), `attachments`. `Appointment` contains `chiefComplaint`, `triageLevel`. | Memory items derive context from these records. Every memory stores `sourceRecordIds` referencing `Prescription._id` or `MedicalRecord._id`. |
| **Authentication & Session** | [`scos-backend/middleware/auth.js`](file:///e:/ie%20proj/scos-backend/middleware/auth.js)<br>[`scos-backend/routes/auth.js`](file:///e:/ie%20proj/scos-backend/routes/auth.js) | JWT auth middleware attaches `req.user` (`_id`, `role`, `name`, `email`). `requireRole()` enforces RBAC. | All memory API endpoints enforce `auth` middleware. Access is validated using `req.user`. |
| **Authorization & Facility Scope** | [`scos-backend/routes/patients.js`](file:///e:/ie%20proj/scos-backend/routes/patients.js)<br>[`scos-backend/routes/prescriptions.js`](file:///e:/ie%20proj/scos-backend/routes/prescriptions.js) | Checks if patient matches `req.user._id` OR if doctor has active appointment / roster access / `grantedDoctors` entry. | Memory endpoints verify clinical authorization. Patient A cannot access Patient B's memories (403 Forbidden). |
| **Timeline Infrastructure** | [`scos-frontend/src/pages/patient/MedicalTimeline.tsx`](file:///e:/ie%20proj/scos-frontend/src/pages/patient/MedicalTimeline.tsx) | Retrieves historical prescriptions and medical records sorted by date. | Memory source linking points directly into existing timeline items for instant source verification. |
| **Audit Logging System** | [`scos-backend/models/AuditLog.js`](file:///e:/ie%20proj/scos-backend/models/AuditLog.js)<br>[`scos-backend/routes/auditLogs.js`](file:///e:/ie%20proj/scos-backend/routes/auditLogs.js) | Records security events (`action`, `actorId`, `actorRole`, `details`, `timestamp`). | Records `MEMORY_CREATED`, `MEMORY_VIEWED`, `MEMORY_UPDATED`, `MEMORY_MERGED`, `MEMORY_CONFLICTED`, `MEMORY_CORRECTION_REQUESTED`. |

---

## 2. Core Architectural Principles Enforced

1. **Medical Record is Source of Truth:** Memory is derived *from* medical records (`Medical Record -> Memory`), never vice versa.
2. **Mandatory Source Traceability:** Every memory object MUST contain `sourceRecordIds: [ObjectId]` pointing to original prescriptions/records.
3. **No Unvalidated AI Assertions:** AI memory candidate extraction passes through schema validation, source verification, and conflict detection before persistence.
4. **Deterministic Deduplication & Conflict Detection:** Matching records are merged into single memory cards with multiple sources; contradictory evidence triggers `status: 'CONFLICTED'`.
5. **Zero Disruption to SCOS Queue:** The Memory feature adds a longitudinal memory layer without modifying or breaking existing ACPA queue mechanics.
