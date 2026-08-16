require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Patient = require('./models/Patient');
const User = require('./models/User');
const Appointment = require('./models/Appointment');
const Prescription = require('./models/Prescription');
const Review = require('./models/Review');
const AuditLog = require('./models/AuditLog');

const clearDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear all collections
    console.log('🗑️  Clearing database...');
    
    await Patient.deleteMany({});
    console.log('✅ Cleared all patients');
    
    await User.deleteMany({});
    console.log('✅ Cleared all users/accounts');
    
    await Appointment.deleteMany({});
    console.log('✅ Cleared all appointments');
    
    await Prescription.deleteMany({});
    console.log('✅ Cleared all prescriptions');
    
    await Review.deleteMany({});
    console.log('✅ Cleared all reviews');
    
    await AuditLog.deleteMany({});
    console.log('✅ Cleared all audit logs');

    console.log('\n✅ Database completely cleared! All patients and accounts removed.');
    
    // Disconnect
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error clearing database:', err.message);
    process.exit(1);
  }
};

clearDatabase();
