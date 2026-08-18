require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const Doctor = require('./models/Doctor');
const User = require('./models/User');
const Patient = require('./models/Patient');
const Hospital = require('./models/Hospital');

const distinctPatients = [
  { name: 'Vihaan Singh', email: 'vihaan@test.com', age: 65, gender: 'Male', height: '165 cm', weight: '82 kg', bg: 'B+', prob: 'Acute chest pain & shortness of breath', triage: 5, waitMins: 15, env: 'hospital', missed: 0 },
  { name: 'Diya Sharma', email: 'diya@test.com', age: 8, gender: 'Female', height: '120 cm', weight: '25 kg', bg: 'A+', prob: 'Severe abdominal pain & high fever', triage: 4, waitMins: 30, env: 'clinic', missed: 0 },
  { name: 'Aarav Patel', email: 'aarav@test.com', age: 34, gender: 'Male', height: '175 cm', weight: '70 kg', bg: 'O+', prob: 'Persistent cough and fever', triage: 2, waitMins: 45, env: 'hospital', missed: 0 },
  { name: 'Zara Khan', email: 'zara@test.com', age: 24, gender: 'Female', height: '162 cm', weight: '58 kg', bg: 'B+', prob: 'Migraine for 3 days - SKIPPED CASE', triage: 3, waitMins: 60, env: 'clinic', missed: 1 },
  { name: 'Vikram Bose', email: 'vikram@test.com', age: 58, gender: 'Male', height: '168 cm', weight: '85 kg', bg: 'AB-', prob: 'Hypertension spike - SKIPPED CASE', triage: 4, waitMins: 90, env: 'hospital', missed: 2 },
  { name: 'Ananya Gupta', email: 'ananya@test.com', age: 28, gender: 'Female', height: '160 cm', weight: '55 kg', bg: 'AB+', prob: 'Routine pregnancy checkup', triage: 1, waitMins: 20, env: 'clinic', missed: 0 },
  { name: 'Arjun Kumar', email: 'arjun@test.com', age: 45, gender: 'Male', height: '180 cm', weight: '90 kg', bg: 'O-', prob: 'Back pain radiating to leg', triage: 3, waitMins: 35, env: 'hospital', missed: 0 },
  { name: 'Meera Reddy', email: 'meera@test.com', age: 52, gender: 'Female', height: '155 cm', weight: '65 kg', bg: 'A-', prob: 'Diabetes routine follow-up', triage: 1, waitMins: 10, env: 'clinic', missed: 0 },
  { name: 'Rohan Joshi', email: 'rohan@test.com', age: 19, gender: 'Male', height: '178 cm', weight: '68 kg', bg: 'B-', prob: 'Sports injury, sprained ankle', triage: 3, waitMins: 50, env: 'hospital', missed: 0 },
  { name: 'Kavya Desai', email: 'kavya@test.com', age: 71, gender: 'Female', height: '150 cm', weight: '50 kg', bg: 'O+', prob: 'Dizziness and fainting spell', triage: 4, waitMins: 25, env: 'clinic', missed: 0 },
  { name: 'Priya Iyer', email: 'priya@test.com', age: 12, gender: 'Female', height: '140 cm', weight: '35 kg', bg: 'O+', prob: 'Asthma attack with wheezing', triage: 5, waitMins: 10, env: 'clinic', missed: 0 },
  { name: 'Ishaan Verma', email: 'ishaan@test.com', age: 31, gender: 'Male', height: '170 cm', weight: '75 kg', bg: 'A+', prob: 'Allergic skin rash', triage: 2, waitMins: 40, env: 'hospital', missed: 0 },
  { name: 'Kabir Das', email: 'kabir@test.com', age: 41, gender: 'Male', height: '172 cm', weight: '78 kg', bg: 'A+', prob: 'Acid reflux and severe heartburn', triage: 2, waitMins: 55, env: 'hospital', missed: 0 },
  { name: 'Neha Trivedi', email: 'neha@test.com', age: 36, gender: 'Female', height: '165 cm', weight: '62 kg', bg: 'B+', prob: 'Urinary tract infection', triage: 3, waitMins: 15, env: 'clinic', missed: 0 },
  { name: 'Aditya Sen', email: 'aditya@test.com', age: 80, gender: 'Male', height: '160 cm', weight: '55 kg', bg: 'O-', prob: 'Severe joint pain', triage: 3, waitMins: 65, env: 'hospital', missed: 0 }
];

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to DB. Seeding rich test data...');

  const doc = await Doctor.findOne({ name: { $regex: /lavya damania/i } });
  if (!doc) {
    console.log('Doctor not found'); process.exit(1);
  }

  // Find or create a hospital
  let hospital = await Hospital.findOne({ name: 'Apollo General' });
  if (!hospital) {
    hospital = await Hospital.create({
      name: 'Apollo General',
      address: '123 Health St',
      contactEmail: 'apollo@test.com',
      phone: '1234567890'
    });
  }

  // Clear today's pending/confirmed queue
  const today = new Date().toLocaleDateString('en-CA');
  await Appointment.deleteMany({ doctorId: doc._id, date: today });
  await Appointment.deleteMany({ doctorId: doc._id, date: '2026-08-18' });
  await Appointment.deleteMany({ doctorId: doc._id, date: '2026-08-19' });

  let users = [];
  for (const p of distinctPatients) {
    let u = await User.findOne({ email: p.email });
    if (!u) {
      u = await User.create({
        name: p.name,
        email: p.email,
        password: 'password123',
        role: 'patient'
      });
    }

    // Upsert Patient Profile
    await Patient.findOneAndUpdate(
      { userId: u._id },
      { 
        name: p.name, 
        age: p.age, 
        gender: p.gender, 
        height: p.height, 
        weight: p.weight, 
        bloodGroup: p.bg 
      },
      { upsert: true }
    );
    users.push(u);
  }

  const now = new Date();

  for(let i = 0; i < distinctPatients.length; i++) {
    const pData = distinctPatients[i];
    // Calculate scheduled time based on waitMins before current local time
    const schedDate = new Date(now.getTime() - pData.waitMins * 60 * 1000);
    const hours = String(schedDate.getHours()).padStart(2, '0');
    const mins = String(schedDate.getMinutes()).padStart(2, '0');
    const scheduledTime = `${hours}:${mins}`;

    await Appointment.create({
      patientId: users[i]._id,
      patientName: users[i].name,
      doctorId: doc._id,
      doctorName: doc.name,
      spec: doc.specialization || 'General',
      date: today,
      time: scheduledTime,
      status: 'Pending',
      baseToken: i + 1,
      triageLevel: pData.triage,
      missedCalls: pData.missed,
      chiefComplaint: pData.prob,
      hospitalId: pData.env === 'hospital' ? hospital._id : null,
      hospitalName: pData.env === 'hospital' ? hospital.name : 'Private Clinic'
    });
  }
  
  console.log(`Successfully seeded 15 distinct patients with realistic wait times, triage levels, skipped cases, and facility contexts for ${doc.name}.`);
  mongoose.disconnect();
});
