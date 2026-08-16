const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  patientId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  patientName: { type: String, default: '' },
  doctorName:  { type: String, default: '' },
  diagnosis:   { type: String, default: '' },
  notes:       { type: String, default: '' },
  medications: [{
    name:      { type: String },
    dosage:    { type: String },
    frequency: { type: String },
    duration:  { type: String },
  }],
  hospitalId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', default: null },
  hospitalName: { type: String, default: '' },
  attachments: [{
    filename: { type: String },
    url:      { type: String },
    type:     { type: String },  // 'xray', 'lab', 'mri', 'other'
  }],
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);
