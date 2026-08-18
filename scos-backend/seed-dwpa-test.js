require('dotenv').config(); 
const mongoose = require('mongoose'); 
const Appointment = require('./models/Appointment'); 
const Doctor = require('./models/Doctor'); 
const User = require('./models/User'); 

mongoose.connect(process.env.MONGO_URI).then(async () => { 
  console.log('Connected to DB. Starting DWPA Test Seed...');

  const doc = await Doctor.findOne({ name: { $regex: /lavya damania/i } }); 
  if (!doc) { 
    console.log('Doctor not found'); process.exit(1); 
  } 

  // Clear today's pending queue for a clean test
  const today = '2026-08-19';
  await Appointment.deleteMany({ doctorId: doc._id, date: today, status: 'Pending' });

  // 1. Ensure we have enough mock users
  const mockNames = [
    'Rahul (Standard, Long Wait)',
    'Priya (Emergency Triage 5)',
    'Amit (Skipped Twice)',
    'Sneha (Just arrived)',
    'Vikram (Walkin, Triage 3)'
  ];

  let users = [];
  for (const name of mockNames) {
    let u = await User.findOne({ email: `${name.split(' ')[0].toLowerCase()}@test.com` });
    if (!u) {
      u = await User.create({
        name: name,
        email: `${name.split(' ')[0].toLowerCase()}@test.com`,
        password: 'password123',
        role: 'patient',
        phone: '1234567890'
      });
    } else {
      // Update name just in case
      u.name = name;
      await u.save();
    }
    users.push(u);
  }

  // Calculate times for Wait Time (Aging) test
  const now = new Date();
  
  // Rahul: 3 hours ago (High aging)
  const rahulTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
  
  // Priya: 1 hour ago (High triage)
  const priyaTime = new Date(now.getTime() - (1 * 60 * 60 * 1000));

  // Amit: 4 hours ago (High aging, but HUGE penalty)
  const amitTime = new Date(now.getTime() - (4 * 60 * 60 * 1000));

  // Sneha: 10 mins ago (Standard recent)
  const snehaTime = new Date(now.getTime() - (10 * 60 * 1000));

  // Vikram: Right now (Walkin)
  const vikramTime = new Date();

  const toTimeString = (d) => d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

  const testCases = [
    {
      patient: users[0],
      time: toTimeString(rahulTime),
      baseToken: 1,
      triageLevel: 1,
      missedCalls: 0
    },
    {
      patient: users[1],
      time: toTimeString(priyaTime),
      baseToken: 2,
      triageLevel: 5, // Emergency
      missedCalls: 0
    },
    {
      patient: users[2],
      time: toTimeString(amitTime),
      baseToken: 3,
      triageLevel: 1,
      missedCalls: 2 // Skipped twice
    },
    {
      patient: users[3],
      time: toTimeString(snehaTime),
      baseToken: 4,
      triageLevel: 1,
      missedCalls: 0
    },
    {
      patient: users[4],
      time: toTimeString(vikramTime),
      baseToken: 5,
      triageLevel: 3, // Urgent
      missedCalls: 0
    }
  ];

  for(const t of testCases) { 
    await Appointment.create({ 
      patientId: t.patient._id, 
      patientName: t.patient.name, 
      doctorId: doc._id, 
      doctorName: doc.name, 
      spec: doc.specialization || 'General', 
      date: today, 
      time: t.time, 
      status: 'Pending', 
      baseToken: t.baseToken, 
      triageLevel: t.triageLevel, 
      missedCalls: t.missedCalls 
    }); 
  } 
  
  console.log('Successfully booked 5 diverse DWPA test patients.'); 
  mongoose.disconnect(); 
});
