require('dotenv').config(); 
const mongoose = require('mongoose'); 
const Appointment = require('./models/Appointment'); 
const Doctor = require('./models/Doctor'); 
const User = require('./models/User'); 

const realisticPatients = [
  { name: 'Aarav Patel', triage: 1, waitMins: 10 },
  { name: 'Diya Sharma', triage: 2, waitMins: 45 },
  { name: 'Vihaan Singh', triage: 5, waitMins: 5 },  // Emergency walk-in
  { name: 'Ananya Gupta', triage: 1, waitMins: 120 }, // Starvation test (long wait)
  { name: 'Arjun Kumar', triage: 3, waitMins: 20 },
  { name: 'Meera Reddy', triage: 1, waitMins: 0 },
  { name: 'Rohan Joshi', triage: 1, waitMins: 15 },
  { name: 'Kavya Desai', triage: 4, waitMins: 30 },  // High triage
  { name: 'Ishaan Verma', triage: 1, waitMins: 180 }, // Massive wait time
  { name: 'Zara Khan', triage: 1, waitMins: -30 },    // Arrived 30 mins early
  { name: 'Aryan Mehta', triage: 2, waitMins: 60 },
  { name: 'Neha Trivedi', triage: 1, waitMins: 50 },
  { name: 'Kabir Das', triage: 5, waitMins: 0 },     // Emergency right now
  { name: 'Pooja Iyer', triage: 1, waitMins: 10 },
  { name: 'Ayaan Nair', triage: 3, waitMins: 90 },   // Urgent and waiting a while
  { name: 'Sara Kapoor', triage: 1, waitMins: -15 },  // Early
  { name: 'Vivaan Bhatia', triage: 1, waitMins: 20 },
  { name: 'Kiara Sen', triage: 4, waitMins: 10 },
  { name: 'Rudra Chatterjee', triage: 1, waitMins: 40 },
  { name: 'Myra Agarwal', triage: 2, waitMins: 75 }
];

mongoose.connect(process.env.MONGO_URI).then(async () => { 
  console.log('Connected to DB. Starting 20 Realistic Patient Seed...');

  const doc = await Doctor.findOne({ name: { $regex: /lavya damania/i } }); 
  if (!doc) { 
    console.log('Doctor not found'); process.exit(1); 
  } 

  // Clear today's pending/confirmed queue
  const today = '2026-08-19';
  await Appointment.deleteMany({ doctorId: doc._id, date: today, status: { $in: ['Pending', 'Confirmed'] } });

  let users = [];
  for (const p of realisticPatients) {
    const email = `${p.name.split(' ')[0].toLowerCase()}@test.com`;
    let u = await User.findOne({ email });
    if (!u) {
      u = await User.create({
        name: p.name,
        email: email,
        password: 'password123',
        role: 'patient',
        phone: '1234567890'
      });
    } else {
      u.name = p.name;
      await u.save();
    }
    users.push(u);
  }

  const now = new Date();
  const toTimeString = (d) => d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

  for(let i = 0; i < 20; i++) { 
    const pData = realisticPatients[i];
    
    // Calculate their scheduled appointment time based on their waitMins
    const scheduledTime = new Date(now.getTime() - (pData.waitMins * 60 * 1000));
    
    // 2 of them will have missed calls to test the skip penalty
    let missed = 0;
    if (i === 1 || i === 11) missed = 2; // Diya and Neha skipped twice

    await Appointment.create({ 
      patientId: users[i]._id, 
      patientName: users[i].name, 
      doctorId: doc._id, 
      doctorName: doc.name, 
      spec: doc.specialization || 'General', 
      date: today, 
      time: toTimeString(scheduledTime), 
      status: 'Pending', 
      baseToken: i + 1, 
      triageLevel: pData.triage, 
      missedCalls: missed 
    }); 
  } 
  
  console.log(`Successfully booked 20 REALISTIC patients for ${doc.name} with highly varied DWPA parameters.`); 
  mongoose.disconnect(); 
});
