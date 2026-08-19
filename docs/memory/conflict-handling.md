# Conflict Detection & Clinical Resolution (`docs/memory/conflict-handling.md`)

## The Contradiction Guarantee

> **A system must NEVER overwrite a prior medical fact with a contradictory assertion, nor let an AI model guess which record is truth.**
> Contradictory medical claims are explicitly preserved and flagged as `status: 'CONFLICTED'` for clinical doctor review.

---

## Contradiction Logic

`isContradictory(contentA, contentB)` compares two assertions for opposing polarity:

1. **Negative Keyword Detection:** Looks for negation phrases (`no known`, `denies`, `none`, `no history`, `negative for`, `nil`).
2. **Polarity Mismatch Check:** Returns `true` if one string is negative and the other is positive regarding the same medical category.
3. **Stop-Word Removal:** Strips filler words (`reports`, `severe`, `patient`, `a`, `an`, `the`, `of`, `to`) to compare underlying subject nouns (e.g. `penicillin`).

---

## Doctor Clinical Resolution Workflow

In `DoctorMemoryPanel.tsx`:
1. When a memory card has `status: 'CONFLICTED'`, it displays a red warning banner (⚠️ **Conflicting Medical Information**).
2. Clicking **"Review Conflict"** opens the source viewer modal showing all opposing consultation notes.
3. Doctor can select:
   - **Confirm Active Fact:** Updates status to `ACTIVE`, confidence to `VERIFIED`.
   - **Mark Superseded:** Updates status to `SUPERSEDED`.
4. Endpoint `PATCH /api/memory/:memoryId/review` records the doctor's action and logs a `MEMORY_REVIEWED` audit log.
