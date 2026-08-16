require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');
const Appointment = require('./models/Appointment');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/scos');
    console.log('Connected to MongoDB');

    // 1. Find or create Doctor 1
    let doctorUser = await User.findOne({ email: 'doctor1@scos.com' });
    if (!doctorUser) {
      doctorUser = await User.create({
        name: 'Dr. Doctor 1',
        email: 'doctor1@scos.com',
        password: 'password123',
        role: 'doctor'
      });
      console.log('Created Doctor 1 User');
    }

    let doctorProfile = await Doctor.findOne({ userId: doctorUser._id });
    if (!doctorProfile) {
      doctorProfile = await Doctor.create({
        userId: doctorUser._id,
        name: 'Dr. Doctor 1',
        specialization: 'General Practice',
        location: 'Main Clinic'
      });
      console.log('Created Doctor 1 Profile');
    }

    // 2. Find or create a few patients
    const patientNames = ['Alice Smith', 'Bob Johnson', 'Charlie Brown'];
    const patients = [];

    for (let i = 0; i < patientNames.length; i++) {
      let email = `patient${i+1}@scos.com`;
      let pUser = await User.findOne({ email });
      if (!pUser) {
        pUser = await User.create({
          name: patientNames[i],
          email: email,
          password: 'password123',
          role: 'patient'
        });
      }

      let pProfile = await Patient.findOne({ userId: pUser._id });
      if (!pProfile) {
        pProfile = await Patient.create({
          userId: pUser._id,
          name: patientNames[i],
          phone: `555-010${i}`
        });
      }
      patients.push(pUser); // We need the user ID for appointment (Appointment model says patientId: User ref)
    }
    console.log('Patients ensured.');

    // 3. Create appointments for Doctor 1
    const today = new Date();
    const dates = [
      today.toISOString().split('T')[0], // Today
      new Date(today.getTime() + 86400000).toISOString().split('T')[0], // Tomorrow
      new Date(today.getTime() + 86400000 * 2).toISOString().split('T')[0], // Day after tomorrow
    ];
    
    const times = ['09:00', '10:30', '14:00'];
    const statuses = ['Confirmed', 'Pending', 'Confirmed'];

    for (let i = 0; i < patients.length; i++) {
      // check if appointment already exists to prevent duplicates
      const existingAppt = await Appointment.findOne({
        patientId: patients[i]._id,
        doctorId: doctorProfile._id,
        date: dates[i],
        time: times[i]
      });

      if (!existingAppt) {
        await Appointment.create({
          patientId: patients[i]._id,
          doctorId: doctorProfile._id,
          doctorName: doctorProfile.name,
          spec: doctorProfile.specialization,
          date: dates[i],
          time: times[i],
          status: statuses[i],
          location: doctorProfile.location
        });
        console.log(`Created appointment for ${patients[i].name} on ${dates[i]} at ${times[i]}`);
      }
    }

    console.log('✅ Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
