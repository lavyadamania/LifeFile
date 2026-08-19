# LifeFile Memory Engine — Architecture Specification

## Architectural Overview

The Memory Engine is designed as an additive, non-breaking longitudinal context layer sitting on top of the existing LifeFile / SCOS clinical database.

```text
                     LIFEFILE ECOSYSTEM
                             │
                      Medical Records
                             │
                             ▼
                    Memory Extraction
                             │
             ┌───────────────┴───────────────┐
             │                               │
       Structured Data               Free-Text / AI
             │                               │
             └───────────────┬───────────────┘
                             ▼
                      Validation Layer
                             │
                             ▼
                      Memory Resolver
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
         NEW              DUPLICATE          CONFLICT
          │                  │                  │
       CREATE               MERGE             REVIEW
          │                  │                  │
          └──────────────────┼──────────────────┘
                             ▼
                       Memory Store
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
       Patient View                      Doctor View
            │                                 │
            └────────────────┬────────────────┘
                             ▼
                      Source Records
                             │
                             ▼
                        Audit Trail
```

---

## Component Layers

### 1. Data Layer (`models/PatientMemory.js` & `models/MemoryCorrection.js`)
- Stores persisted memory cards and patient-submitted correction review requests.
- Indexed by `patientId`, `category`, `status`, and `normalizedContent` for fast MongoDB retrieval ($O(1)$ lookup per category).

### 2. Service Layer (`services/memoryService.js`)
- **`extractDeterministicMemories`**: Normalizes and parses prescriptions. Resolves dual identity references (`User._id` and `Patient._id`).
- **`deduplicateAndPersistCandidates`**: Normalizes strings, compares existing category records, merges `sourceRecordIds`, or flags contradictions.
- **`extractAIMemoryCandidates`**: Integrates Gemini 1.5 Flash for parsing un-structured consultation notes into strict JSON schema representations with validation fallback.

### 3. API & Security Layer (`routes/memory.js`)
- REST API exposing memory retrieval, source record fetching, manual re-extraction, correction submissions, and doctor clinical review.
- Enforces JWT `auth` middleware and RBAC authorization helper `authorizeMemoryAccess`.

### 4. Presentation Layer (`DoctorMemoryPanel.tsx` & `PatientMemoryView.tsx`)
- **Doctor Consultation View:** Displays high-priority warning cards (conflicts, allergies) and source inspection modals.
- **Patient Dashboard View:** Full "My Health Memory" interface allowing patients to review derived facts and submit correction notes.
