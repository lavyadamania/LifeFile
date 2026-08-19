# LifeFile Longitudinal Patient Memory Engine (SIH 2026 Master Standard)

## Executive Summary

The **LifeFile Patient Longitudinal Memory Layer** transforms LifeFile from a platform that passively stores medical records into an intelligent, auditable, and source-linked memory system. It automatically extracts, deduplicates, and surfaces recurring clinical facts (allergies, chronic conditions, past medications, procedures, investigations, preferences) across historical medical records while preserving **100% source provenance**.

```text
Original Medical Records
        ↓
Memory Extraction (Deterministic + AI Candidate)
        ↓
Validation Layer (Schema, Patient Scope)
        ↓
Memory Resolver (Deduplication / Merging)
        ↓
Conflict Detection (Contradiction Flagging)
        ↓
Memory Store (PatientMemory)
        ↓
Relevance Ranking & Context Surface
        ↓
Authorized Patient / Clinician UI
        ↓
Direct Traceability Link → Original Source Record
```

---

## The Fundamental Principle

> **MEMORY IS NOT THE MEDICAL RECORD.**
> The original prescription or medical report remains the authoritative source of truth (`Medical Record -> Memory`). Memory is a derived longitudinal context layer. Every memory card links directly to its source `sourceRecordIds` (`Prescription._id` / `MedicalRecord._id`).

---

## Core Value Proposition

When a patient visits a doctor across different healthcare facilities over multiple years:
- **Without Memory:** The clinician must manually inspect dozens of historical PDFs and prescriptions to discover recurring allergies or chronic diagnoses.
- **With LifeFile Memory:** Key clinical context is consolidated into high-value memory cards (e.g. ⚠️ **Penicillin Allergy** — *Supported by 3 source records*). Clicking **"View Sources"** immediately opens the original consultation note.

---

## Feature Matrix

| Feature | Description | Implementation Status |
| :--- | :--- | :--- |
| **Deterministic Extraction** | Parses diagnoses, medications, and free-text notes from prescriptions | ✅ Operational |
| **Deduplication Engine** | Normalizes text and merges identical candidate facts into unified cards | ✅ Operational |
| **Conflict Detection** | Identifies contradictory assertions (e.g. "Penicillin allergy" vs "No known allergy") and flags `status: 'CONFLICTED'` | ✅ Operational |
| **Source Provenance** | Every memory maintains a direct array of source record ObjectIds | ✅ Operational |
| **Role-Based Security** | Enforces patient ownership and clinical authorization (returns 403 Forbidden for cross-patient access) | ✅ Operational |
| **Correction Workflow** | Allows patients to challenge inaccurate memories via `MemoryCorrection` requests | ✅ Operational |
| **Audit Trails** | Logs all memory actions (`MEMORY_CREATED`, `MEMORY_VIEWED`, `MEMORY_MERGED`, `MEMORY_CONFLICTED`, `MEMORY_CORRECTION_REQUESTED`) | ✅ Operational |
