require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');
const Appointment = require('./models/Appointment');

async function seed100() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/scos');
    console.log('Connected to MongoDB');

    let doctorUser = await User.findOne({ email: 'doctor@gmail.com' });
    if (!doctorUser) {
      console.error("Doctor 'doctor@gmail.com' not found. Please ensure the doctor exists.");
      process.exit(1);
    }
    
    let doctorProfile = await Doctor.findOne({ userId: doctorUser._id });
    if (!doctorProfile) {
      console.error("Doctor 1 profile not found.");
      process.exit(1);
    }

    // Get today's date in local time string format like "2026-04-26"
    const today = new Date().toISOString().split('T')[0];
    const time = '09:00';

    console.log(`Creating 100 patients and appointments for ${doctorProfile.name} on ${today} at ${time}...`);

    for (let i = 1; i <= 100; i++) {
      let email = `bulkpatient${i}@scos.com`;
      let name = `Bulk Patient ${i}`;
      
      let pUser = await User.findOne({ email });
      if (!pUser) {
        pUser = await User.create({
          name: name,
          email: email,
          password: 'password123',
          role: 'patient'
        });
      }

      let pProfile = await Patient.findOne({ userId: pUser._id });
      if (!pProfile) {
        pProfile = await Patient.create({
          userId: pUser._id,
          name: name,
          phone: `555-020${i}`
        });
      }

      const existingAppt = await Appointment.findOne({
        patientId: pUser._id,
        doctorId: doctorProfile._id,
        date: today,
        time: time
      });

      if (!existingAppt) {
        await Appointment.create({
          patientId: pUser._id,
          doctorId: doctorProfile._id,
          doctorName: doctorProfile.name,
          spec: doctorProfile.specialization,
          date: today,
          time: time,
          status: 'Confirmed',
          location: doctorProfile.location
        });
      }
      
      if (i % 20 === 0) {
        console.log(`... ${i} appointments created`);
      }
    }

    console.log('✅ 100 appointments created successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed100();
