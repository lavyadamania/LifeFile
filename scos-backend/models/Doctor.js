const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name:           { type: String, required: true },
  specialization: { type: String, required: true },
  status:         { type: String, enum: ['Active', 'On Leave'], default: 'Active' },
  hours:          { type: String, default: 'Mon-Fri, 9AM-5PM' },
  schedule: {
    isSameEveryday: { type: Boolean, default: true },
    days: [{
      day: { type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
      isAvailable: { type: Boolean, default: true },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' }
    }]
  },
  rating:         { type: Number, default: 0 },
  reviewCount:    { type: Number, default: 0 },
  location:       { type: String, default: 'Main Clinic' },
  nextSlot:       { type: String, default: '' },
  bio:            { type: String, default: '' },
  experience:     { type: Number, default: 0 },
  educations:     [{ degree: String, institution: String, year: String }],
  experiences:    [{ title: String, hospital: String, duration: String, description: String }],
  certifications: [{ name: String, issuer: String, year: String }],
  skills:         [{ type: String }],
  hospitals:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }],
  unavailableDates: [{
    date: { type: String, required: true },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    reason: { type: String, default: '' }
  }],
  signatureImage: { type: String, default: '' },
  prescriptionTemplate: {
    clinicName:    { type: String, default: 'LifeFile' },
    clinicAddress: { type: String, default: '123 Health Ave, Medical District, NY 10001' },
    clinicPhone:   { type: String, default: '(555) 123-4567' },
  },
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);
