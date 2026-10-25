const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
  doctorName: { type: String, default: '' },
  address: { type: String, required: true },
  mapsUrl: { type: String, default: '' },
  phone:   { type: String, required: true },
  doctors: { type: Number, default: 0 },
  status:  { type: String, enum: ['active', 'maintenance'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Clinic', clinicSchema);
