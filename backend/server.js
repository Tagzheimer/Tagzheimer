require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { isDemoMode, getDemoStore } = require('./config/demoMode');
const { isSupabaseConfigured, getServiceClient } = require('./config/supabase');

const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const locationRoutes = require('./routes/location');

const app = express();
const PORT = process.env.PORT || 5000;

// === Rate limiters ===
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});

const updateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Update rate limit exceeded' },
});

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:8080').split(',').map(s=>s.trim());
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return cb(null, true);
    return cb(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '256kb' }));
app.use('/api/', limiter);
app.use('/api/location/update', updateLimiter);
app.use('/api/location/batch',  updateLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/location', locationRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Tagzheimer API is running',
    version: '3.0.0',
    mode: isDemoMode() ? 'demo' : 'production',
    database: isDemoMode() ? 'in-memory' : (isSupabaseConfigured() ? 'supabase' : 'unconfigured'),
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Tagzheimer API',
    version: '3.0.0',
    docs: '/api/health',
    endpoints: [
      'POST /api/auth/verify',
      'POST /api/devices/pair',
      'POST /api/devices/:id/claim',
      'GET  /api/devices/serial/:serialNumber',
      'CRUD /api/devices',
      'POST /api/location/update',
      'POST /api/location/batch',
      'GET  /api/location/:deviceId',
      'GET  /api/location/:deviceId/history',
    ],
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// === Graceful shutdown ===
let server;

const startServer = async () => {
  try {
    if (isDemoMode()) {
      console.log('DEMO MODE: Using in-memory store (no Supabase connection)');
      // touch getDemoStore() so it initializes
      getDemoStore();
    } else {
      if (!isSupabaseConfigured()) {
        console.error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_KEY are required in production mode.');
        console.error('       Set them in .env, or set DEMO_MODE=true for local testing.');
        process.exit(1);
      }
      // Verify Supabase connection (lightweight query)
      const supabase = getServiceClient();
      const { error } = await supabase.from('devices').select('count', { count: 'exact', head: true });
      if (error) {
        console.warn('⚠ Supabase connection test failed:', error.message);
        console.warn('  Continuing anyway — first request will retry.');
      } else {
        console.log('✓ Supabase connection verified');
      }
    }

    server = app.listen(PORT, () => {
      console.log(`Tagzheimer server v3.0.0 running on port ${PORT}${isDemoMode() ? ' (DEMO MODE)' : ''}`);
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      if (server) {
        server.close(() => {
          console.log('HTTP server closed.');
          process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000).unref();
      } else {
        process.exit(0);
      }
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, exiting...');
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

if (require.main === module && process.env.NODE_ENV !== 'test') startServer();

module.exports = { app, startServer };
