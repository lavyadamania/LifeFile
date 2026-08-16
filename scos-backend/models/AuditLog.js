const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor:     { type: String, required: true },
  actorRole: { type: String, enum: ['admin', 'doctor', 'patient', 'system'], required: true },
  action:    { type: String, required: true },
  target:    { type: String, default: '' },
  severity:  { type: String, enum: ['info', 'success', 'warning', 'critical'], default: 'info' },
  ip:        { type: String, default: '127.0.0.1' },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
