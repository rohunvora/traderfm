const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
require('dotenv').config();

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

// Import routes
const userRoutes = require('./routes/users');
const questionRoutes = require('./routes/questions');
const answerRoutes = require('./routes/answers');
const statsRoutes = require('./routes/stats');
const twitterAuthRoutes = require('./routes/twitter-auth');

// Import database
const db = require('./utils/database');

const app = express();
const PORT = process.env.PORT || 5001;

// Trust proxy for Railway deployment (specific configuration)
if (process.env.NODE_ENV === 'production') {
  // Railway uses specific proxy headers
  app.set('trust proxy', 1); // Trust first proxy
}

// Store recent logs in memory for debugging
const recentLogs = [];
const maxLogs = 50;

// Custom logger that stores logs
const logger = {
  log: (message) => {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} ${message}`;
    console.log(logEntry);
    recentLogs.push(logEntry);
    if (recentLogs.length > maxLogs) {
      recentLogs.shift(); // Remove oldest log
    }
  },
  error: (message, error) => {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} ERROR: ${message} ${error ? error.toString() : ''}`;
    console.error(logEntry);
    recentLogs.push(logEntry);
    if (recentLogs.length > maxLogs) {
      recentLogs.shift();
    }
  }
};

// Make logger available globally
global.logger = logger;

console.log('🚀 Starting TraderFM server...');
console.log('📦 Environment:', process.env.NODE_ENV);
console.log('🔑 JWT_SECRET:', process.env.JWT_SECRET ? 'Set ✅' : 'Missing ❌');

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware - required for Twitter OAuth 1.0a
// Using memory store with short TTL since sessions are only used during OAuth flow
const sessionConfig = {
  secret: process.env.JWT_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 10 * 60 * 1000 // 10 minutes - only needed during OAuth flow
  }
};

app.use(session(sessionConfig));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true, // Return rate limit info in the headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  // Skip successful requests from rate limiting
  skipSuccessfulRequests: false,
  // Use default key generator (req.ip) which respects trust proxy
  keyGenerator: (req) => req.ip
});
app.use('/api/', globalLimiter);

// Question-specific rate limiting
const questionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // limit each IP to 3 questions per minute
  message: 'Too many questions. Please wait before asking again.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // Use IP + handle to rate limit per handle
    return `${req.ip}-${req.params.handle}`;
  }
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/auth', twitterAuthRoutes);

// Apply question rate limiter to ask question endpoint
app.use('/api/questions/:handle', questionLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: PORT
  });
});

// Logs endpoint to view recent application logs
app.get('/api/logs', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    totalLogs: recentLogs.length,
    logs: recentLogs.slice(-20) // Show last 20 logs
  });
});

// Debug endpoint to check database status
app.get('/api/debug', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const dataDir = path.join(__dirname, '../data');
    const dbPath = path.join(dataDir, 'traderfm.db');
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      jwtSecret: process.env.JWT_SECRET ? 'SET' : 'MISSING',
      dataDir: {
        path: dataDir,
        exists: fs.existsSync(dataDir),
        readable: fs.existsSync(dataDir) ? fs.constants.R_OK : false,
        writable: fs.existsSync(dataDir) ? fs.constants.W_OK : false
      },
      database: {
        path: dbPath,
        exists: fs.existsSync(dbPath),
        size: fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0
      },
      workingDirectory: process.cwd(),
      platform: process.platform,
      nodeVersion: process.version
    };
    
    res.json(debugInfo);
  } catch (error) {
    res.status(500).json({
      error: 'Debug endpoint failed',
      message: error.message,
      stack: error.stack
    });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request too large' });
  }
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  console.log('❓ 404 Request:', req.method, req.url);
  res.status(404).json({ message: 'Route not found' });
});

// Initialize database
db.init().then(() => {
  console.log('✅ Database initialized');
  
  // Start server
  app.listen(PORT, () => {
    console.log(`🌟 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
}); 