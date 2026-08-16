const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const medicalRecordSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['xray', 'mri', 'blood', 'other'], default: 'other' },
  fileUrl: { type: String, required: true },
  isPasswordProtected: { type: Boolean, default: false },
  password: { type: String, default: null } // Hashed if isPasswordProtected is true
}, { timestamps: true });

// Pre-save hook to hash password if it was modified
medicalRecordSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.isPasswordProtected || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to verify password
medicalRecordSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
