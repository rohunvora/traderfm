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
    global.logger?.log(`🔍 Checking handle: ${handle}`);
    const user = await statements.getUserByHandle.get(handle);
    
    if (!user) {
      global.logger?.log(`❌ Handle not found: ${handle}`);
      return res.status(404).json({ message: 'Handle not found' });
    }
    
    global.logger?.log(`✅ Handle exists: ${handle}`);
    res.json({ exists: true });
  } catch (error) {
    global.logger?.error('❌ Check handle error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new handle
router.post('/create', handleRules, validate, async (req, res) => {
  try {
    global.logger?.log('🚀 Starting user creation...');
    const { handle } = req.body;
    global.logger?.log(`👤 Creating handle: ${handle}`);
    
    // Check if handle already exists
    global.logger?.log('🔍 Checking if handle exists...');
    const existingUser = await statements.getUserByHandle.get(handle);
    if (existingUser) {
      global.logger?.log(`❌ Handle already exists: ${handle}`);
      return res.status(400).json({ message: 'Handle already exists' });
    }
    global.logger?.log('✅ Handle is available');
    
    // Generate secret key
    global.logger?.log('🔑 Generating secret key...');
    const secretKey = uuidv4();
    global.logger?.log('✅ Secret key generated');
    
    // Hash the secret key
    global.logger?.log('🔐 Hashing secret key...');
    const hashedSecretKey = await bcrypt.hash(secretKey, 10);
    global.logger?.log('✅ Secret key hashed');
    
    // Create user
    global.logger?.log('💾 Creating user in database...');
    const result = await statements.createUser.run({
      handle,
      secret_key: hashedSecretKey
    });
    global.logger?.log(`✅ User created successfully: ${JSON.stringify(result)}`);
    
    res.status(201).json({
      message: 'Handle created successfully',
      handle,
      secretKey // Only sent once during creation
    });
    global.logger?.log(`🎉 User creation completed for: ${handle}`);
  } catch (error) {
    global.logger?.error('❌ Create handle error:', error);
    global.logger?.error(`❌ Error stack: ${error.stack}`);
    global.logger?.error(`❌ Error details: ${JSON.stringify({
      name: error.name,
      message: error.message,
      code: error.code,
      errno: error.errno
    })}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Authenticate user
router.post('/auth', authRules, validate, async (req, res) => {
  try {
    global.logger?.log('🔐 Starting authentication...');
    const { handle, secretKey } = req.body;
    global.logger?.log(`👤 Authenticating handle: ${handle}`);
    
    // Get user
    const user = await statements.getUserByHandle.get(handle);
    if (!user) {
      global.logger?.log(`❌ User not found for auth: ${handle}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Verify secret key
    global.logger?.log('🔑 Verifying secret key...');
    const isValid = await bcrypt.compare(secretKey, user.secret_key);
    if (!isValid) {
      global.logger?.log(`❌ Invalid secret key for: ${handle}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    global.logger?.log('🎫 Generating JWT token...');
    const token = generateToken(user.id, user.handle);
    
    global.logger?.log(`✅ Authentication successful for: ${handle}`);
    res.json({
      message: 'Authentication successful',
      token,
      handle: user.handle
    });
  } catch (error) {
    global.logger?.error('❌ Auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 