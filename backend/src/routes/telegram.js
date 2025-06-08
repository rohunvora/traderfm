const express = require('express');
const { statements } = require('../utils/database');
const { authenticate } = require('../middleware/auth');
const telegramService = require('../utils/telegram');

const router = express.Router();

// In-memory store for connection tokens (in production, use Redis)
const connectionTokens = new Map();

// Generate connection link for authenticated user
router.post('/connect', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if already connected
    if (req.user.telegram_chat_id) {
      return res.status(400).json({ 
        message: 'Telegram already connected',
        connected: true 
      });
    }
    
    // Generate connection token
    const tokenData = telegramService.generateConnectionToken(userId);
    connectionTokens.set(tokenData.token, tokenData);
    
    // Clean up expired tokens
    for (const [token, data] of connectionTokens) {
      if (Date.now() > data.expiresAt) {
        connectionTokens.delete(token);
      }
    }
    
    // Generate bot link
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'traderfm_bot';
    const connectUrl = `https://t.me/${botUsername}?start=${tokenData.token}`;
    
    res.json({
      connectUrl,
      expiresIn: 600 // 10 minutes
    });
  } catch (error) {
    console.error('Generate connect link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Disconnect Telegram
router.post('/disconnect', authenticate, async (req, res) => {
  try {
    await statements.updateUserTelegramId.run(req.user.id, null);
    res.json({ message: 'Telegram disconnected successfully' });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Telegram webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    const result = await telegramService.processUpdate(update);
    
    if (result.action === 'connect' && result.token) {
      // Validate token
      const tokenData = connectionTokens.get(result.token);
      
      if (telegramService.validateConnectionToken(result.token, tokenData)) {
        // Update user with telegram chat ID
        await statements.updateUserTelegramId.run(tokenData.userId, result.chatId);
        
        // Get user info
        const user = await statements.getUserById.get(tokenData.userId);
        
        // Send success message
        await telegramService.sendNotification(result.chatId, 
          `✅ Success! Your trader.fm account (@${user.handle}) is now connected.

You'll receive notifications here whenever someone asks you a question.

Happy answering! 🎯`
        );
        
        // Clean up token
        connectionTokens.delete(result.token);
      } else {
        await telegramService.sendNotification(result.chatId, 
          '❌ Invalid or expired connection link. Please generate a new one from your trader.fm inbox.'
        );
      }
    } else if (result.action === 'disconnect') {
      // Find user by telegram chat ID
      const user = await statements.getUserByTelegramId.get(result.chatId);
      
      if (user) {
        await statements.updateUserTelegramId.run(user.id, null);
        await telegramService.sendNotification(result.chatId, 
          '👋 Notifications disconnected. You can reconnect anytime from your trader.fm inbox.'
        );
      } else {
        await telegramService.sendNotification(result.chatId, 
          '❓ No connected account found.'
        );
      }
    }
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.json({ ok: true }); // Always return 200 to Telegram
  }
});

// Get connection status
router.get('/status', authenticate, async (req, res) => {
  try {
    res.json({
      connected: !!req.user.telegram_chat_id,
      botUsername: process.env.TELEGRAM_BOT_USERNAME || 'traderfm_bot'
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 