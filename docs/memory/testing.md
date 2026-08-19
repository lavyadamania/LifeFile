# Test Suite & Verification Matrix (`docs/memory/testing.md`)

## Automated Test Command

To run the full automated memory test suite:

```bash
cd scos-backend
node test-memory-engine.js
```

---

## Test Cases Covered

### Test 1: Basic Extraction & Creation
- Creates prescription with diagnosis ("Acute Hypertension"), medication ("Amlodipine 5mg"), and note ("Patient reports severe penicillin allergy").
- Verifies `extractDeterministicMemories` generates structured memory cards for `CONDITION`, `MEDICATION`, and `ALLERGY`.

### Test 2: Deduplication & Source Merging
- Creates a second prescription with an identical allergy assertion.
- Verifies the memory engine does NOT create a duplicate row in MongoDB, but instead merges source record IDs (`sourceRecordIds.length === 2`).

### Test 3: Contradiction & Conflict Flagging
- Submits an opposing assertion ("No known allergy").
- Verifies the memory engine flags both prior and new cards as `status: 'CONFLICTED'` and records conflict notes.

### Test 4: Patient Isolation & Security Authorization
- Authenticates Patient A and queries Patient B memories.
- Verifies system returns **403 Forbidden** and prevents cross-patient data access.

---

## Regression Verification

- **`npx tsc --noEmit`**: Verified 0 TypeScript compilation errors in frontend components.
- **`node test-acceptance-queue.js`**: Verified 100% zero regressions on existing SCOS queue and appointment mechanics.
