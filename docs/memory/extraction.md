# Memory Extraction Engine Specification (`docs/memory/extraction.md`)

## Overview

The LifeFile Memory Engine employs a multi-tiered extraction pipeline prioritizing deterministic structured data parsing before applying NLP or AI candidate extraction.

```text
Prescription Record
        │
        ├────────► 1. Structured Field Extraction (Diagnosis, Medications)
        │
        ├────────► 2. Deterministic Regex Text Extraction (Notes, Allergy keywords)
        │
        └────────► 3. AI Candidate Extraction (Gemini 1.5 Flash + Validation)
```

---

## 1. Deterministic Extraction Rules

1. **Diagnoses -> `CONDITION`:**
   - Source: `prescription.diagnosis`.
   - Condition: Non-empty string > 2 characters.
   - Type: `FACT`.

2. **Medications -> `MEDICATION`:**
   - Source: `prescription.medications` array.
   - Extracted Content: `${med.name} (${med.dosage})`.

3. **Allergies -> `ALLERGY`:**
   - Source: `prescription.notes`.
   - Regex Pattern: `/([a-zA-Z0-9\s]+)\s+allergy/i` or `/(?:allergic to|allergy:?|allergic:?)\s+([a-zA-Z0-9\s]+)/i`.
   - Adjective Stripping: Removes filler words (`severe`, `mild`, `known`, `confirmed`, `suspected`, `patient`, `reports`, `history of`).

---

## 2. Gemini AI Candidate Extraction & Hallucination Defense

When processing unstructured doctor notes:

1. **Prompt Isolation:** Requires Gemini to return strictly formatted JSON matching:
   ```json
   {
     "memories": [
       {
         "category": "ALLERGY | CONDITION | MEDICATION | PROCEDURE | INVESTIGATION | PREFERENCE",
         "type": "FACT",
         "content": "concise fact"
       }
     ]
   }
   ```
2. **Schema & Category Validation:** Reject any candidate where `category` or `type` is not in the controlled vocabulary.
3. **Source Linking:** Explicitly sets `sourceRecordIds: [prescriptionId]`. Un-sourced AI assertions are rejected.
4. **Validation Pass:** Passes candidate through `deduplicateAndPersistCandidates` to check for duplicates and contradictions before DB write.
