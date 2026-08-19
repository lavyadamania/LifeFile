const mongoose = require('mongoose');

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

module.exports = mongoose.model('MemoryCorrection', memoryCorrectionSchema);
