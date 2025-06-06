const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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

// Import database
const db = require('./utils/database');

const app = express();
const PORT = process.env.PORT || 5001;

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

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', globalLimiter);

// Question-specific rate limiting
const questionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // limit each IP to 3 questions per minute
  message: 'Too many questions. Please wait before asking again.',
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