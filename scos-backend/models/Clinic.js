const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  address: { type: String, required: true },
  phone:   { type: String, required: true },
  doctors: { type: Number, default: 0 },
  status:  { type: String, enum: ['active', 'maintenance'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Clinic', clinicSchema);
