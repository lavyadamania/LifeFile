require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existing = await User.findOne({ email: 'lavya@scos.com' });
    if (existing) {
      console.log('Admin user already exists. Skipping seed.');
      process.exit(0);
    }

    // Create admin
    await User.create({
      name: 'Lavya',
      email: 'lavya@scos.com',
      password: 'admin123',
      role: 'admin',
    });

    console.log('✅ Admin seeded: lavya@scos.com / admin123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
