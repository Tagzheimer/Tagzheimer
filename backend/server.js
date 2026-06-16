require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { initializeFirebase } = require('./config/firebase');

const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const locationRoutes = require('./routes/location');

const app = express();
const PORT = process.env.PORT || 5000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later' },
});

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/location', locationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Tagzheimer API is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const startServer = async () => {
  try {
    if (process.env.DEMO_MODE !== 'true') {
      initializeFirebase();
    } else {
      console.log('DEMO MODE: Skipping Firebase initialization');
    }
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Tagzheimer server running on port ${PORT}${process.env.DEMO_MODE === 'true' ? ' (DEMO MODE)' : ''}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
