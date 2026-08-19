# Memory Data Model Specification (`docs/memory/data-model.md`)

## 1. `PatientMemory` Schema

The `PatientMemory` Mongoose model represents a derived longitudinal health fact or preference.

### Schema Fields

```javascript
const patientMemorySchema = new mongoose.Schema({
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  category: { 
    type: String, 
    enum: ['ALLERGY', 'CONDITION', 'MEDICATION', 'PROCEDURE', 'INVESTIGATION', 'PREFERENCE'], 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['FACT', 'PREFERENCE', 'INFERENCE', 'TEMPORARY_CONTEXT'], 
    default: 'FACT' 
  },
  content: { 
    type: String, 
    required: true 
  },
  normalizedContent: { 
    type: String, 
    required: true,
    index: true 
  },
  sourceRecordIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Prescription' 
  }],
  confidence: { 
    type: String, 
    enum: ['UNVERIFIED', 'SUPPORTED', 'VERIFIED', 'CONFLICTED'], 
    default: 'SUPPORTED' 
  },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'INACTIVE', 'SUPERSEDED', 'CONFLICTED'], 
    default: 'ACTIVE',
    index: true 
  },
  validFrom: { 
    type: Date, 
    default: Date.now 
  },
  validUntil: { 
    type: Date, 
    default: null 
  },
  conflictNotes: {
    type: String,
    default: ''
  }
}, { timestamps: true });
```

---

## 2. `MemoryCorrection` Schema

Stores patient challenge requests submitted against derived memory items.

```javascript
const memoryCorrectionSchema = new mongoose.Schema({
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  memoryId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PatientMemory', 
    required: true 
  },
  patientNote: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'APPROVED', 'REJECTED'], 
    default: 'PENDING' 
  },
  reviewedByDoctorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Doctor', 
    default: null 
  },
  reviewNote: { 
    type: String, 
    default: '' 
  }
}, { timestamps: true });
```

---

## Controlled Vocabulary Definitions

### Categories
- `ALLERGY`: Drug or food allergies (e.g. "Penicillin allergy").
- `CONDITION`: Diagnoses and chronic conditions (e.g. "Acute Hypertension").
- `MEDICATION`: Long-term or active prescribed medications (e.g. "Amlodipine 5mg").
- `PROCEDURE`: Surgical or clinical procedures (e.g. "Appendectomy").
- `INVESTIGATION`: Relevant diagnostic lab or imaging history.
- `PREFERENCE`: Explicit patient choices regarding care.

### Memory Types
- `FACT`: Directly supported by at least 1 verified source record.
- `PREFERENCE`: Explicit statement by patient.
- `INFERENCE`: Derived context from multiple records.
- `TEMPORARY_CONTEXT`: Short-term context bound by `validUntil`.
