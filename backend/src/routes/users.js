const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { statements } = require('../utils/database');
const { generateToken, authenticate } = require('../middleware/auth');
const { validate, handleRules, authRules, handleParamRules } = require('../middleware/validation');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get all active users (directory)
router.get('/directory', async (req, res) => {
  try {
    const users = await statements.getAllUsers.all();
    res.json({ users });
  } catch (error) {
    console.error('Error fetching user directory:', error);
    res.status(500).json({ 
      message: 'Failed to fetch user directory', 
      error: error.message 
    });
  }
});

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
    
    // Return public profile info for Twitter users
    const publicInfo = {
      exists: true,
      handle: user.handle,
      auth_type: user.auth_type
    };
    
    if (user.auth_type === 'twitter') {
      publicInfo.twitter_username = user.twitter_username;
      publicInfo.twitter_name = user.twitter_name;
      publicInfo.twitter_profile_image = user.twitter_profile_image;
    }
    
    res.json(publicInfo);
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
    
    // Check if user is Twitter-only
    if (user.auth_type === 'twitter') {
      global.logger?.log(`❌ User ${handle} is Twitter-only, cannot use secret key auth`);
      return res.status(401).json({ message: 'This account uses Twitter authentication. Please sign in with Twitter.' });
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
      handle: user.handle,
      authType: user.auth_type
    });
  } catch (error) {
    global.logger?.error('❌ Auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Connect wallet address
router.post('/connect-wallet',
  authenticate,
  [
    body('wallet_address').notEmpty().trim()
      .matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
      .withMessage('Invalid Solana wallet address')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: errors.array() 
        });
      }

      const { wallet_address } = req.body;

      // Update user's wallet address
      await statements.updateUserWallet.run({
        user_id: req.user.id,
        wallet_address
      });

      global.logger?.log(`💳 Wallet connected: ${req.user.handle} - ${wallet_address}`);

      res.json({ 
        message: 'Wallet connected successfully',
        wallet_address
      });
    } catch (error) {
      global.logger?.error('❌ Error connecting wallet:', error);
      res.status(500).json({ 
        message: 'Failed to connect wallet',
        error: error.message 
      });
    }
  }
);

// Update KOL status
router.post('/kol-status',
  authenticate,
  [
    body('is_kol').isBoolean().withMessage('KOL status must be true or false'),
    body('description').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: errors.array() 
        });
      }

      const { is_kol, description } = req.body;

      // Update user's KOL status
      await statements.updateUserKOLStatus.run({
        user_id: req.user.id,
        is_kol,
        description
      });

      global.logger?.log(`🌟 KOL status updated: ${req.user.handle} - ${is_kol ? 'KOL' : 'Not KOL'}`);

      res.json({ 
        message: 'KOL status updated successfully',
        is_kol,
        description
      });
    } catch (error) {
      global.logger?.error('❌ Error updating KOL status:', error);
      res.status(500).json({ 
        message: 'Failed to update KOL status',
        error: error.message 
      });
    }
  }
);

// Get all KOLs
router.get('/kols', async (req, res) => {
  try {
    const kols = await statements.getKOLs.all();
    res.json({ 
      kols,
      count: kols.length
    });
  } catch (error) {
    global.logger?.error('❌ Error fetching KOLs:', error);
    res.status(500).json({ 
      message: 'Failed to fetch KOLs',
      error: error.message 
    });
  }
});

module.exports = router; 