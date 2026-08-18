const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  doctorName: { type: String, required: true },
  spec:       { type: String, default: '' },
  date:       { type: String, required: true },
  time:       { type: String, required: true },
  status:     { type: String, enum: ['Confirmed', 'Pending', 'Cancelled', 'Rescheduled', 'Completed', 'Missed', 'Postponed'], default: 'Pending' },
  location:   { type: String, default: 'Main Clinic' },
  postponedTo: { type: String, default: '' },
  isWalkin:     { type: Boolean, default: false },
  hospitalId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', default: null },
  hospitalName: { type: String, default: '' },
  baseToken:    { type: Number, default: 0 },
  triageLevel:  { type: Number, min: 1, max: 5, default: 1 },
  missedCalls:  { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
