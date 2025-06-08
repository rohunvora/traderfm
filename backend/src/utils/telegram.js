const axios = require('axios');
const crypto = require('crypto');

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.baseURL = `https://api.telegram.org/bot${this.botToken}`;
    this.isEnabled = !!this.botToken;
    
    if (!this.isEnabled) {
      console.log('⚠️ Telegram notifications disabled - TELEGRAM_BOT_TOKEN not set');
    } else {
      console.log('✅ Telegram notifications enabled');
      this.setBotCommands();
    }
  }

  async setBotCommands() {
    try {
      await axios.post(`${this.baseURL}/setMyCommands`, {
        commands: [
          { command: 'start', description: 'Connect your trader.fm account' },
          { command: 'disconnect', description: 'Disconnect notifications' },
          { command: 'help', description: 'Get help' }
        ]
      });
    } catch (error) {
      console.error('Failed to set bot commands:', error.message);
    }
  }

  generateConnectionToken(userId) {
    // Generate a secure token for connecting Telegram to user account
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    return { token, userId, expiresAt };
  }

  validateConnectionToken(token, storedToken) {
    if (!storedToken) return false;
    if (storedToken.token !== token) return false;
    if (Date.now() > storedToken.expiresAt) return false;
    return true;
  }

  async sendNotification(chatId, message, options = {}) {
    if (!this.isEnabled) return;

    try {
      const payload = {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...options
      };

      const response = await axios.post(`${this.baseURL}/sendMessage`, payload);
      return response.data;
    } catch (error) {
      console.error('Failed to send Telegram notification:', error.message);
      throw error;
    }
  }

  async sendQuestionNotification(chatId, question, userHandle) {
    const message = `
🔔 <b>New Question!</b>

Someone just asked you:
"<i>${this.escapeHtml(question.text)}</i>"

👉 Answer it now: ${process.env.FRONTEND_URL || 'https://trader.fm'}/inbox/${userHandle}

<i>Reply to questions to share your insights with the world!</i>`;

    return this.sendNotification(chatId, message, {
      reply_markup: {
        inline_keyboard: [[
          {
            text: '📝 Answer Now',
            url: `${process.env.FRONTEND_URL || 'https://trader.fm'}/inbox/${userHandle}`
          }
        ]]
      }
    });
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // Process webhook updates from Telegram
  async processUpdate(update) {
    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const username = update.message.from.username;

      if (text.startsWith('/start ')) {
        // Handle connection with token
        const token = text.split(' ')[1];
        return { action: 'connect', chatId, token, username };
      } else if (text === '/start') {
        // No token provided
        await this.sendNotification(chatId, 
          `👋 Welcome to trader.fm notifications!

To connect your account:
1. Go to your trader.fm inbox
2. Click on "Connect Telegram" 
3. Follow the link to complete setup

Need help? Visit ${process.env.FRONTEND_URL || 'https://trader.fm'}`
        );
        return { action: 'welcome' };
      } else if (text === '/disconnect') {
        return { action: 'disconnect', chatId };
      } else if (text === '/help') {
        await this.sendNotification(chatId,
          `<b>trader.fm Telegram Bot Help</b>

🔔 Get instant notifications when someone asks you a question

<b>Commands:</b>
/start - Connect your account
/disconnect - Stop notifications
/help - Show this message

<b>Questions?</b> Visit ${process.env.FRONTEND_URL || 'https://trader.fm'}/help`
        );
        return { action: 'help' };
      }
    }
    
    return { action: 'unknown' };
  }
}

module.exports = new TelegramService(); 