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
    console.log(`🔍 Checking handle: ${handle}`);
    const user = await statements.getUserByHandle.get(handle);
    
    if (!user) {
      console.log(`❌ Handle not found: ${handle}`);
      return res.status(404).json({ message: 'Handle not found' });
    }
    
    console.log(`✅ Handle exists: ${handle}`);
    res.json({ exists: true });
  } catch (error) {
    console.error('❌ Check handle error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new handle
router.post('/create', handleRules, validate, async (req, res) => {
  try {
    console.log('🚀 Starting user creation...');
    const { handle } = req.body;
    console.log(`👤 Creating handle: ${handle}`);
    
    // Check if handle already exists
    console.log('🔍 Checking if handle exists...');
    const existingUser = await statements.getUserByHandle.get(handle);
    if (existingUser) {
      console.log(`❌ Handle already exists: ${handle}`);
      return res.status(400).json({ message: 'Handle already exists' });
    }
    console.log('✅ Handle is available');
    
    // Generate secret key
    console.log('🔑 Generating secret key...');
    const secretKey = uuidv4();
    console.log('✅ Secret key generated');
    
    // Hash the secret key
    console.log('🔐 Hashing secret key...');
    const hashedSecretKey = await bcrypt.hash(secretKey, 10);
    console.log('✅ Secret key hashed');
    
    // Create user
    console.log('💾 Creating user in database...');
    const result = await statements.createUser.run({
      handle,
      secret_key: hashedSecretKey
    });
    console.log('✅ User created successfully:', result);
    
    res.status(201).json({
      message: 'Handle created successfully',
      handle,
      secretKey // Only sent once during creation
    });
    console.log(`🎉 User creation completed for: ${handle}`);
  } catch (error) {
    console.error('❌ Create handle error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      errno: error.errno
    });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Authenticate user
router.post('/auth', authRules, validate, async (req, res) => {
  try {
    console.log('🔐 Starting authentication...');
    const { handle, secretKey } = req.body;
    console.log(`👤 Authenticating handle: ${handle}`);
    
    // Get user
    const user = await statements.getUserByHandle.get(handle);
    if (!user) {
      console.log(`❌ User not found for auth: ${handle}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Verify secret key
    console.log('🔑 Verifying secret key...');
    const isValid = await bcrypt.compare(secretKey, user.secret_key);
    if (!isValid) {
      console.log(`❌ Invalid secret key for: ${handle}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    console.log('🎫 Generating JWT token...');
    const token = generateToken(user.id, user.handle);
    
    console.log(`✅ Authentication successful for: ${handle}`);
    res.json({
      message: 'Authentication successful',
      token,
      handle: user.handle
    });
  } catch (error) {
    console.error('❌ Auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 