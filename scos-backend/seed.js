require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const hashedPassword = await bcrypt.hash('123456', 10);

    // Find admin by any old email variant
    const existingOld = await User.findOne({ 
      email: { $in: ['lavya@scos.com', 'lavya_admin', 'lavya_admin@'] }
    });

    if (existingOld) {
      // Use updateOne to bypass the pre-save hook (avoids double-hashing bug)
      await User.updateOne(
        { _id: existingOld._id },
        { $set: { email: 'lavya@admin', password: hashedPassword } }
      );
      console.log('✅ Admin updated: lavya@admin / 123456');
      process.exit(0);
    }

    // Already on new email — just reset/confirm the password
    const existing = await User.findOne({ email: 'lavya@admin' });
    if (existing) {
      await User.updateOne(
        { _id: existing._id },
        { $set: { password: hashedPassword } }
      );
      console.log('✅ Admin password reset: lavya@admin / 123456');
      process.exit(0);
    }

    // Create fresh admin
    await User.create({
      name: 'Lavya',
      email: 'lavya@admin',
      password: '123456',
      role: 'admin',
    });

    console.log('✅ Admin seeded: lavya@admin / 123456');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
