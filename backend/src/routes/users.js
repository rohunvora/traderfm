const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { statements } = require('../utils/database');
const { generateToken } = require('../middleware/auth');
const { validate, handleRules, authRules, handleParamRules } = require('../middleware/validation');

const router = express.Router();

// Check if handle exists
router.get('/check/:handle', handleParamRules, validate, async (req, res) => {
  try {
    const { handle } = req.params;
    const user = statements.getUserByHandle.get(handle);
    
    if (!user) {
      return res.status(404).json({ message: 'Handle not found' });
    }
    
    res.json({ exists: true });
  } catch (error) {
    console.error('Check handle error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new handle
router.post('/create', handleRules, validate, async (req, res) => {
  try {
    const { handle } = req.body;
    
    // Check if handle already exists
    const existingUser = statements.getUserByHandle.get(handle);
    if (existingUser) {
      return res.status(400).json({ message: 'Handle already exists' });
    }
    
    // Generate secret key
    const secretKey = uuidv4();
    
    // Create user
    const result = statements.createUser.run({
      handle,
      secret_key: await bcrypt.hash(secretKey, 10)
    });
    
    res.status(201).json({
      message: 'Handle created successfully',
      handle,
      secretKey // Only sent once during creation
    });
  } catch (error) {
    console.error('Create handle error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Authenticate user
router.post('/auth', authRules, validate, async (req, res) => {
  try {
    const { handle, secretKey } = req.body;
    
    // Get user
    const user = statements.getUserByHandle.get(handle);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Verify secret key
    const isValid = await bcrypt.compare(secretKey, user.secret_key);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = generateToken(user.id, user.handle);
    
    res.json({
      message: 'Authentication successful',
      token,
      handle: user.handle
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 