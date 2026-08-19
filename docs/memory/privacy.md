# Privacy-by-Design & Data Protection (`docs/memory/privacy.md`)

## Principles

1. **Data Minimization:** Memory entities store normalized summary cards (e.g. `"Penicillin allergy"`), not full PDF records or raw clinical notes.
2. **Provenance Traceability:** Every memory card maintains an array of `sourceRecordIds` referencing original records stored securely in MongoDB.
3. **No Unnecessary External Data Egress:** Deterministic extraction runs 100% locally inside Node.js. If Gemini AI candidate extraction is invoked, only un-identified clinical notes text is sent for JSON parsing.
4. **Synthetic Development Data:** All automated test suites (`test-memory-engine.js`) run exclusively on synthetic test patients (`Patient A (Test)`, `Patient B (Test)`). No real patient data is committed to Git.

---

## Defensive Language Notice

> **Designed with Privacy-by-Design and relevant ABDM / NABH aligned principles.**
> Formal production deployment requires independent health authority audit and compliance verification.
