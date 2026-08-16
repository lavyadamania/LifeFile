const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name:        { type: String, required: true },
  address:     { type: String, required: true },
  phone:       { type: String, required: true },
  email:       { type: String, default: '' },
  description: { type: String, default: '' },
  departments: [{ type: String }],
  doctors:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }],
  status:      { type: String, enum: ['active', 'maintenance'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Hospital', hospitalSchema);
