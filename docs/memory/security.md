# Security & Role-Based Access Control (`docs/memory/security.md`)

## Security Architecture

The Memory Engine enforces multi-layered authorization for every memory API request.

```text
Request (JWT Token)
       │
       ▼
1. auth Middleware (Verifies JWT & attaches req.user)
       │
       ▼
2. authorizeMemoryAccess(req.user, patientId)
       │
       ├────────► Is req.user.role === 'patient'?
       │          └─► req.user._id === patientId? ──► ALLOWED
       │          └─► Cross-patient attempt? ────────► 403 FORBIDDEN
       │
       ├────────► Is req.user.role === 'doctor'?
       │          └─► Valid clinical profile / roster access? ──► ALLOWED
       │
       └────────► Is req.user.role === 'admin' / 'hospital'? ──► ALLOWED
```

---

## Access Control Matrix

| User Role | Endpoint | Allowed Action | Security Guard |
| :--- | :--- | :--- | :--- |
| **Patient** | `GET /api/memory/patient/:id` | View own health memories | Blocked if target ID !== authenticated user ID (403) |
| **Patient** | `POST /api/memory/:id/correction` | Submit correction request | Blocked if memory belongs to another patient (403) |
| **Doctor** | `GET /api/memory/patient/:id` | View patient memory during consultation | Allowed for authorized attending doctors |
| **Doctor** | `PATCH /api/memory/:id/review` | Resolve conflicted/superseded status | Enforces `requireRole('doctor', 'admin')` |

---

## Security Verification Test

Running `node test-memory-engine.js` verifies Test 4:
- Authenticates Patient A (`test_patient_a@lifefile.com`).
- Attempts to query Patient B (`test_patient_b@lifefile.com`) memories.
- Verifies system returns **403 Forbidden** with zero data leakage.
