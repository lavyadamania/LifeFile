# Memory Engine Known Limitations (`docs/memory/limitations.md`)

## System Limitations

1. **Clinical Responsibility:** The Memory Engine is a longitudinal context utility. Clinical decision-making, diagnosis, and prescribing remain the sole responsibility of the attending physician.
2. **AI Candidate Review:** Candidate memories extracted from free-text notes via external LLM must undergo validation before auto-verifying as confirmed clinical facts.
3. **Contradiction Resolution:** The system automatically flags contradictory medical assertions (`status: 'CONFLICTED'`), but requires human doctor intervention to select the final active truth.
4. **Source Record Quality:** The completeness of derived longitudinal memory depends on the quality and accuracy of inputted consultation notes and prescriptions.
