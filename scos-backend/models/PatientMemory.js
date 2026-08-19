const mongoose = require('mongoose');

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

// Compound index to quickly fetch active memories for a patient by category
patientMemorySchema.index({ patientId: 1, category: 1, status: 1 });

module.exports = mongoose.model('PatientMemory', patientMemorySchema);
