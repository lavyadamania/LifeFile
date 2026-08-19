require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Hospital = require('./models/Hospital');
const Appointment = require('./models/Appointment');
const PatientMemory = require('./models/PatientMemory');
const AuditLog = require('./models/AuditLog');

async function inspectDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\n====================================================');
    console.log('📊 LIFEFILE / SCOS — LIVE DATABASE INSPECTION MATRIX');
    console.log('====================================================\n');

    // 1. User Summary
    const users = await User.find({}, 'name email role').lean();
    console.log('👥 USERS COLLECTION (Total: ' + users.length + ')');
    console.table(users.map(u => ({ Name: u.name, Email: u.email, Role: u.role })));

    // 2. Queue & Appointment State Matrix
    const appts = await Appointment.find({})
      .populate('patientId', 'name')
      .populate('doctorId', 'name')
      .lean();

    console.log('\n📅 APPOINTMENT & ACPA QUEUE MATRIX (Total: ' + appts.length + ')');
    console.table(appts.map(a => ({
      Token: '#' + a.baseToken,
      Patient: a.patientId?.name || 'N/A',
      Doctor: a.doctorName || 'N/A',
      Status: a.status,
      Triage: 'Level ' + a.triageLevel,
      MissedCalls: a.missedCalls || 0,
      SlotTime: a.time || a.date
    })));

    // 3. Clinical Memory State Matrix
    const memories = await PatientMemory.find({})
      .populate('patientId', 'name')
      .lean();

    console.log('\n🧠 PATIENT CLINICAL MEMORY MATRIX (Total: ' + memories.length + ')');
    console.table(memories.map(m => ({
      Patient: m.patientId?.name || 'N/A',
      Category: m.category,
      MemoryContent: m.content,
      Status: m.status,
      Confidence: m.confidence
    })));

    // 4. Audit Log Summary
    const audits = await AuditLog.find({}).sort({ createdAt: -1 }).limit(5).lean();
    console.log('\n📜 RECENT SECURITY AUDIT TRAIL (Total: ' + audits.length + ')');
    console.table(audits.map(log => ({
      Action: log.action,
      PerformedBy: log.performedBy || 'System',
      Details: JSON.stringify(log.details || {}).substring(0, 50)
    })));

    console.log('\n====================================================\n');
  } catch (err) {
    console.error('Inspection Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

inspectDatabase();
