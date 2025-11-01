const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const http = require('http');
const https = require('https');
const { URL } = require('url');
require('dotenv').config();

const timezone = require('./utils/timezone');
const User = require('./models/User');
const TimeData = require('./models/TimeData');

const app = express();

// Middleware
app.use(express.json({ limit: '2mb' }));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.BACKEND_URL,
      'http://localhost:8080',
      'http://localhost:3000',
      ...(process.env.NODE_ENV === 'development' ? ['chrome-extension://*'] : ['chrome-extension://your-extension-id'])
    ].filter(Boolean);
    if (!origin || allowedOrigins.some(allowed => 
      allowed === origin || (allowed.includes('chrome-extension://') && origin.startsWith('chrome-extension://'))
    )) {
      callback(null, true);
    } else {
      console.log(`CORS blocked request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// MongoDB connection with retry
const connectWithRetry = (retries = 5, delay = 5000) => {
  mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 15000
  }).then(() => {
    console.log('Connected to MongoDB');
  }).catch(err => {
    console.error(`MongoDB connection error (attempt ${6 - retries}):`, err.message);
    if (retries > 1) {
      setTimeout(() => connectWithRetry(retries - 1, delay * 2), delay);
    } else {
      console.error('MongoDB connection failed after retries');
      process.exit(1);
    }
  });
};

connectWithRetry();

// Routes
const { authenticateToken } = require('./routes/auth');
const timeDataRoutes = require('./routes/timeData');
const authRoutes = require('./routes/auth');
const feedbackRoutes = require('./routes/feedback');
const reportRoutes = require('./routes/report');
const focusSessionRoutes = require('./routes/focusSessions');
const blockedSitesRoutes = require('./routes/blockedSites');
const blockedKeywordsRoutes = require('./routes/blockedKeywords');
const problemSessionRoutes = require('./routes/problemSessions');
const mailRoutes = require('./routes/mail');

app.use('/api/auth', authRoutes);
app.use('/api/time-data', authenticateToken, timeDataRoutes);
app.use('/api/feedback', authenticateToken, feedbackRoutes);
app.use('/api/report', authenticateToken, reportRoutes);
app.use('/api/focus-sessions', authenticateToken, focusSessionRoutes);
app.use('/api/blocked-sites', authenticateToken, blockedSitesRoutes);
app.use('/api/blocked-keywords', authenticateToken, blockedKeywordsRoutes);
app.use('/api/problem-sessions', authenticateToken, problemSessionRoutes);
app.use('/api/mail',authenticateToken, mailRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Status endpoint for admin
app.get('/status', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.status(200).json({
    status: 'running',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    features: {
      authentication: 'email-password',
      timeTracking: true,
      feedback: true,
      cors: 'enabled'
    }
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(`Server error (${statusCode}):`, err.message);
  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  mongoose.connection.close().then(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  }).catch(err => {
    console.error('Error closing MongoDB connection:', err.message);
    process.exit(1);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);

  // Daily midnight processing cron
  cron.schedule('0 0 * * *', async () => {
    try {
      await processMidnightResetForAllTimezones();
    } catch (error) {
      console.error('Error in midnight processing:', error.message);
    }
  }, { timezone: 'UTC' });
  console.log('Timezone-aware midnight processing cron scheduled (daily at 00:00 UTC)');

  // Keep-alive cron
  if (process.env.DISABLE_KEEPALIVE !== 'true') {
    const baseEnv = (process.env.HEALTH_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');
    let healthUrl = process.env.HEALTH_URL || (process.env.RENDER_EXTERNAL_URL ? `${baseEnv}/health` : null);

    try {
      if (healthUrl) new URL(healthUrl);
    } catch (e) {
      console.warn('Invalid HEALTH_URL or RENDER_EXTERNAL_URL:', e.message);
      healthUrl = null;
    }

    if (!healthUrl) {
      console.log('Keep-alive cron disabled (no valid HEALTH_URL or RENDER_EXTERNAL_URL set).');
    } else {
      console.log(`Keep-alive cron enabled: pinging ${healthUrl} every hour`);
      cron.schedule('0 * * * *', () => {
        try {
          const started = Date.now();
          const urlObj = new URL(healthUrl);
          const client = urlObj.protocol === 'https:' ? https : http;
          const req = client.get({
            protocol: urlObj.protocol,
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            headers: { 'User-Agent': 'TimeMachine-keepalive/1.0' },
            timeout: 8000
          }, (res) => {
            res.resume();
            const dur = Date.now() - started;
            if (res.statusCode >= 200 && res.statusCode < 400) {
              console.log(`[keepalive] OK ${res.statusCode} in ${dur}ms`);
            } else {
              console.warn(`[keepalive] Non-OK ${res.statusCode} in ${dur}ms`);
            }
          });
          req.on('timeout', () => req.destroy(new Error('timeout')));
          req.on('error', (err) => console.warn('[keepalive] error:', err.message));
        } catch (e) {
          console.warn('[keepalive] invalid URL:', e.message);
        }
      }, { timezone: 'UTC' });
    }
  } else {
    console.log('Keep-alive cron disabled via DISABLE_KEEPALIVE env var');
  }
});

async function processMidnightResetForAllTimezones() {
  try {
    const midnightTimezones = timezone.getTimezonesAtMidnight(5);
    if (midnightTimezones.length === 0) {
      return;
    }
    console.log(`Midnight detected for timezone offsets: ${midnightTimezones.join(', ')}`);

    for (const timezoneOffset of midnightTimezones) {
      await processMidnightForTimezone(timezoneOffset);
    }
  } catch (error) {
    console.error('Error processing midnight reset for all timezones:', error.message);
  }
}

async function processMidnightForTimezone(timezoneOffset) {
  try {
    if (!Number.isInteger(timezoneOffset) || timezoneOffset < -720 || timezoneOffset > 840) {
      throw new Error('Invalid timezone offset');
    }
    const timezoneName = timezone.getTimezoneNameFromOffset(timezoneOffset);
    console.log(`Processing midnight for timezone ${timezoneName} (offset: ${timezoneOffset})`);

    const batchSize = 100;
    let skip = 0;
    let users;

    do {
      users = await User.find({ 'timezone.offset': timezoneOffset })
        .limit(batchSize)
        .skip(skip)
        .lean();
      skip += batchSize;

      for (const user of users) {
        await processMidnightForUser(user, timezoneOffset, timezoneName);
      }
    } while (users.length === batchSize);

    console.log(`Processed ${skip} users in timezone ${timezoneName}`);
  } catch (error) {
    console.error(`Error processing midnight for timezone offset ${timezoneOffset}:`, error.message);
  }
}

async function processMidnightForUser(user, timezoneOffset, timezoneName) {
  try {
    const userEmail = user.email;
    const now = Date.now();
    const yesterday = now - (24 * 60 * 60 * 1000);
    const todayUserDate = timezone.getUserTimezoneDate(now, timezoneOffset);
    const yesterdayUserDate = timezone.getUserTimezoneDate(yesterday, timezoneOffset);

    console.log(`Processing midnight for user ${userEmail}: ${yesterdayUserDate} -> ${todayUserDate}`);

    const yesterdayActivity = await TimeData.find({
      userEmail: user.email,
      userLocalDate: yesterdayUserDate
    }).lean();

    if (yesterdayActivity.length > 0) {
      console.log(`User ${userEmail} had ${yesterdayActivity.length} domain activities yesterday`);
      const totalTime = yesterdayActivity.reduce((sum, activity) => sum + (activity.totalTime || 0), 0);
      const formattedTime = timezone.formatDuration(totalTime);
      console.log(`User ${userEmail} total time yesterday: ${formattedTime}`);
      // Add logic for daily summaries, notifications, or archiving here
    }

    await User.updateOne(
      { email: userEmail },
      { lastActive: new Date(), updatedAt: new Date() }
    );
  } catch (error) {
    console.error(`Error processing midnight for user ${user.email}:`, error.message);
  }
}
