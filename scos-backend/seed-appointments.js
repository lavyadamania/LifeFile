require('dotenv').config(); 
const mongoose = require('mongoose'); 
const Appointment = require('./models/Appointment'); 
const Doctor = require('./models/Doctor'); 
const User = require('./models/User'); 

mongoose.connect(process.env.MONGO_URI).then(async () => { 
  // Find Dr. Lavya Damania
  const doc = await Doctor.findOne({ name: { $regex: /lavya damania/i } }); 
  if (!doc) { 
    console.log('No doctor found matching "Lavya Damania". Available doctors:'); 
    const allDocs = await Doctor.find({});
    allDocs.forEach(d => console.log(d.name));
    process.exit(1); 
  } 

  // Clean up the 10 appointments we just created in the previous script (from today at 02:50)
  // Just in case they were booked for someone else.
  await Appointment.deleteMany({ date: '2026-08-19', time: '02:50', status: 'Pending' });

  const patients = await User.find({ role: 'patient' }).limit(10); 
  console.log('Found ' + patients.length + ' patients'); 
  
  for(let i = 0; i < patients.length; i++) { 
    await Appointment.create({ 
      patientId: patients[i]._id, 
      patientName: patients[i].name, 
      doctorId: doc._id, 
      doctorName: doc.name, 
      spec: doc.specialization || 'General', 
      date: '2026-08-19', 
      time: '02:50', 
      status: 'Pending', 
      baseToken: i + 1, 
      triageLevel: 1, 
      missedCalls: 0 
    }); 
  } 
  
  console.log('Successfully booked ' + patients.length + ' appointments specifically for ' + doc.name + ' at 02:50 AM on 2026-08-19'); 
  mongoose.disconnect(); 
});
