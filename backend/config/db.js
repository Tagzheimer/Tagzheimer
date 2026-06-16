const mongoose = require('mongoose');
const { isDemoMode } = require('./demoMode');

const connectDB = async () => {
  if (isDemoMode()) {
    console.log('DEMO MODE: Skipping MongoDB connection');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
