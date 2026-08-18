require('dotenv').config(); 
const mongoose = require('mongoose'); 
const Appointment = require('./models/Appointment'); 
const Doctor = require('./models/Doctor'); 
const User = require('./models/User'); 

mongoose.connect(process.env.MONGO_URI).then(async () => { 
  console.log('Connected to DB. Starting 20 Patient Seed...');

  const doc = await Doctor.findOne({ name: { $regex: /lavya damania/i } }); 
  if (!doc) { 
    console.log('Doctor not found'); process.exit(1); 
  } 

  // Clear today's pending queue
  const today = '2026-08-19';
  await Appointment.deleteMany({ doctorId: doc._id, date: today, status: 'Pending' });

  // Make sure we have 20 mock users
  let users = [];
  for (let i = 1; i <= 20; i++) {
    const name = `Test Patient ${i}`;
    const email = `patient${i}@test.com`;
    let u = await User.findOne({ email });
    if (!u) {
      u = await User.create({
        name: name,
        email: email,
        password: 'password123',
        role: 'patient',
        phone: '1234567890'
      });
    }
    users.push(u);
  }

  // Get EXACT current PC time
  const now = new Date();
  const toTimeString = (d) => d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const currentTimeStr = toTimeString(now);

  for(let i = 0; i < 20; i++) { 
    // Randomize triage level slightly to make it interesting
    // 80% normal (1), 20% urgent (3 or 4)
    let triage = 1;
    if (i % 5 === 0) triage = 3;
    if (i === 13) triage = 5;

    await Appointment.create({ 
      patientId: users[i]._id, 
      patientName: users[i].name, 
      doctorId: doc._id, 
      doctorName: doc.name, 
      spec: doc.specialization || 'General', 
      date: today, 
      time: currentTimeStr, 
      status: 'Pending', 
      baseToken: i + 1, 
      triageLevel: triage, 
      missedCalls: 0 
    }); 
  } 
  
  console.log(`Successfully booked 20 patients for ${doc.name} at EXACTLY ${currentTimeStr} on ${today}.`); 
  mongoose.disconnect(); 
});
