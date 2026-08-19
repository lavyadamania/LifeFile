require('dotenv').config();
const mongoose = require('mongoose');

async function clearDatabase() {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI missing in .env');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    console.log('🗑️ Clearing all collections...');
    const collections = await mongoose.connection.db.collections();

    for (const collection of collections) {
      await collection.deleteMany({});
      console.log(`  - Cleared collection: ${collection.collectionName}`);
    }

    console.log('\n✅ ALL DATABASE DATA CLEARED SUCCESSFULLY.');

    // Re-seed default admin user so you can log in immediately
    const User = require('./models/User');
    await User.create({
      name: 'Admin Lavya',
      email: 'lavya@admin',
      password: '123456',
      role: 'admin',
    });
    console.log('👑 Default Admin created: Email: lavya@admin | Password: 123456');

  } catch (err) {
    console.error('❌ Error clearing database:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

clearDatabase();
