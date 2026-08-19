# Memory Resolution & Deduplication Specification (`docs/memory/resolution.md`)

## Resolution Flow

The resolution engine receives candidate memories and resolves them against existing active memories in MongoDB.

```text
Candidate Memory
       │
       ▼
Normalize Content (lowercase, strip punctuation)
       │
       ▼
Query Patient Memories (patientId, category)
       │
       ├────────► Is Contradictory? ─────► FLAG BOTH AS CONFLICTED
       │
       ├────────► Exact / String Match? ──► MERGE SOURCE RECORD IDs
       │
       └────────► No Match ─────────────► CREATE NEW ACTIVE MEMORY
```

---

## Normalization Algorithm

```javascript
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ');
}
```

---

## Idempotent Source Merging

When a candidate matches an existing memory card:
1. Converts `sourceRecordIds` to a `Set` of string ObjectIds.
2. Adds candidate source record ID to the set.
3. If `sourceRecordIds.length > 1`, upgrades `confidence` to `'SUPPORTED'`.
4. Saves memory document.
5. Records `MEMORY_MERGED` audit event.
6. Does NOT create duplicate memory rows in MongoDB.
