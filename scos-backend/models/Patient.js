const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:             { type: String, required: true },
  phone:            { type: String, default: '' },
  address:          { type: String, default: '' },
  emergencyContact: { type: String, default: '' },
  grantedDoctors:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }],
  currentHospital:  { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', default: null },
  hospitalHistory:  [{
    hospitalId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    hospitalName: { type: String, default: '' },
    joinedAt:     { type: Date, default: Date.now },
    leftAt:       { type: Date, default: null },
  }]
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);
