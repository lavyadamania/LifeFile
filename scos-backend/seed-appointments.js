require('dotenv').config(); 
const mongoose = require('mongoose'); 
const Appointment = require('./models/Appointment'); 
const Doctor = require('./models/Doctor'); 
const User = require('./models/User'); 

mongoose.connect(process.env.MONGO_URI).then(async () => { 
  // Prefer the original demo doctor, then use the first seeded doctor.
  const doc = await Doctor.findOne({ name: { $regex: /ananya sharma/i } })
    || await Doctor.findOne({ name: { $regex: /lavya damania/i } })
    || await Doctor.findOne().sort({ name: 1 });
  if (!doc) { 
    console.log('No doctor found matching "Lavya Damania". Available doctors:'); 
    const allDocs = await Doctor.find({});
    allDocs.forEach(d => console.log(d.name));
    process.exit(1); 
  } 

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const patients = await User.find({ role: 'patient' }).limit(10); 
  console.log('Found ' + patients.length + ' patients'); 
  
  for(let i = 0; i < patients.length; i++) { 
    await Appointment.create({ 
      patientId: patients[i]._id, 
      patientName: patients[i].name, 
      doctorId: doc._id, 
      doctorName: doc.name, 
      spec: doc.specialization || 'General', 
      date: today,
      time: '02:50', 
      status: 'Pending', 
      baseToken: i + 1, 
      triageLevel: 1, 
      missedCalls: 0 
    }); 
  } 
  
  console.log('Successfully booked ' + patients.length + ' appointments specifically for ' + doc.name + ' at 02:50 on ' + today);
  mongoose.disconnect(); 
});
