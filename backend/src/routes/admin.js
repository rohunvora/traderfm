const express = require('express');
const { authenticate } = require('../middleware/auth');
const { backupDatabase, listBackups } = require('../utils/backup');

const router = express.Router();

// Admin check middleware
const isAdmin = (req, res, next) => {
  // For now, only allow specific handles to access admin features
  // You can change this to check for a specific admin flag in the database
  const adminHandles = ['satoshi', 'admin']; // Add your handle here
  
  if (!req.user || !adminHandles.includes(req.user.handle.toLowerCase())) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  next();
};

// Create backup
router.post('/backup', authenticate, isAdmin, async (req, res) => {
  try {
    console.log('📦 Admin backup requested by:', req.user.handle);
    
    const result = backupDatabase();
    
    if (result.success) {
      res.json({
        message: 'Backup created successfully',
        backup: {
          filename: result.filename,
          size: (result.size / (1024 * 1024)).toFixed(2) + ' MB'
        }
      });
    } else {
      res.status(500).json({
        message: 'Backup failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Backup endpoint error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// List backups
router.get('/backups', authenticate, isAdmin, async (req, res) => {
  try {
    const backups = listBackups();
    res.json({ backups });
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Database info
router.get('/database-info', authenticate, isAdmin, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const sqlite3 = require('sqlite3').verbose();
    const { promisify } = require('util');
    
    const dbPath = path.join(__dirname, '../../data/traderfm.db');
    
    if (!fs.existsSync(dbPath)) {
      return res.json({
        exists: false,
        message: 'Database file not found'
      });
    }
    
    const stats = fs.statSync(dbPath);
    const { statements } = require('../utils/database');
    
    // Create a direct connection for counting
    const db = new sqlite3.Database(dbPath);
    const getAsync = promisify(db.get.bind(db));
    
    try {
      // Get counts
      const [users, questionCount, answerCount] = await Promise.all([
        statements.getAllUsers.all(),
        getAsync('SELECT COUNT(*) as count FROM questions'),
        getAsync('SELECT COUNT(*) as count FROM answers')
      ]);
      
      db.close();
      
      res.json({
        exists: true,
        path: dbPath,
        size: {
          bytes: stats.size,
          mb: (stats.size / (1024 * 1024)).toFixed(2)
        },
        created: stats.birthtime,
        modified: stats.mtime,
        counts: {
          users: users.length,
          questions: questionCount?.count || 0,
          answers: answerCount?.count || 0
        },
        volumeInfo: {
          railwayVolumePath: process.env.RAILWAY_VOLUME_MOUNT_PATH || 'Not configured',
          isUsingVolume: !!process.env.RAILWAY_VOLUME_MOUNT_PATH
        }
      });
    } catch (queryError) {
      db.close();
      throw queryError;
    }
  } catch (error) {
    console.error('Database info error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 