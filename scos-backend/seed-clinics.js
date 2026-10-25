require('dotenv').config();
const mongoose = require('mongoose');
const Clinic = require('./models/Clinic');
const Doctor = require('./models/Doctor');

async function seedClinics() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI missing in .env');
  await mongoose.connect(process.env.MONGO_URI);
  const doctors = await Doctor.find({}).lean();
  await Clinic.deleteMany({ doctorId: { $exists: false } });
  for (const doctor of doctors) {
    await Clinic.updateOne(
      { doctorId: doctor._id },
      {
        $set: {
          name: `${doctor.name} Private Clinic`,
          doctorId: doctor._id,
          doctorName: doctor.name,
          address: doctor.location || 'Private consultation room',
          phone: '(555) 010-2025',
          doctors: 1,
          status: 'active'
        }
      },
      { upsert: true }
    );
  }
  console.log(`Seeded ${doctors.length} doctor-linked private clinics.`);
  await mongoose.disconnect();
}

seedClinics().catch(async error => {
  console.error('Clinic seed failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
