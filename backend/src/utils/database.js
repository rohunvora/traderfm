const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { runMigrations } = require('./migrations');

// Determine data directory based on environment
const isProduction = process.env.NODE_ENV === 'production';
const dataDir = isProduction 
  ? '/data'  // Railway volume mount point
  : path.join(__dirname, '../../data'); // Local development

// Ensure data directory exists
console.log('📁 Database directory:', dataDir);

try {
  if (!fs.existsSync(dataDir)) {
    console.log('📁 Creating data directory...');
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Data directory created');
  } else {
    console.log('✅ Data directory exists');
  }
} catch (error) {
  console.error('❌ Failed to create data directory:', error);
}

// Database file path
const dbPath = path.join(dataDir, 'traderfm.db');
console.log('🗄️ Database path:', dbPath);

// Create database connection with error callback
let db;
try {
  db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
      console.error('❌ Failed to open database:', err);
      console.error('Database path:', dbPath);
      console.error('Directory exists:', fs.existsSync(dataDir));
      console.error('Directory permissions:', fs.existsSync(dataDir) ? fs.statSync(dataDir).mode : 'N/A');
      throw err;
    }
    console.log('✅ SQLite database connection created');
  });
} catch (error) {
  console.error('❌ Failed to create database connection:', error);
  throw error;
}

// Promisify database methods
const runAsync = promisify(db.run.bind(db));
const getAsync = promisify(db.get.bind(db));
const allAsync = promisify(db.all.bind(db));

// Custom run function that properly handles SQLite3 results
const runWithResult = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({
          lastID: this.lastID,
          changes: this.changes
        });
      }
    });
  });
};

// Initialize database schema
const init = async () => {
  try {
    console.log('🔧 Initializing database schema...');
    
    // Wait for database to be ready
    await new Promise((resolve) => {
      db.on('open', () => {
        console.log('✅ Database is open and ready');
        resolve();
      });
      // If already open, resolve immediately
      if (db.open) {
        resolve();
      }
    });
    
    // Enable foreign keys
    await runAsync('PRAGMA foreign_keys = ON');
    console.log('✅ Foreign keys enabled');

    // Users table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        handle TEXT UNIQUE NOT NULL,
        secret_key TEXT,
        twitter_id TEXT UNIQUE,
        twitter_username TEXT UNIQUE,
        twitter_name TEXT,
        twitter_profile_image TEXT,
        auth_type TEXT DEFAULT 'secret_key' CHECK (auth_type IN ('secret_key', 'twitter')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table ready');

    // Questions table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Questions table ready');

    // Answers table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        answer_text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Answers table ready');

    // Create indexes for better performance
    await runAsync('CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_answers_user_id ON answers(user_id)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_answers_created_at ON answers(created_at)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_users_handle ON users(handle)');
    console.log('✅ Database indexes created');

    // Create triggers to update the updated_at timestamp
    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
      AFTER UPDATE ON users
      BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);
    console.log('✅ Database triggers created');

    // Run migrations AFTER tables are created to update existing databases
    await runMigrations(db);

    console.log('🎉 Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
};

// Helper functions for database operations with error handling
const dbOperations = {
  // User operations
  createUser: async (handle, secretKey) => {
    try {
      const result = await runWithResult(
        'INSERT INTO users (handle, secret_key, auth_type) VALUES (?, ?, ?)',
        [handle, secretKey, 'secret_key']
      );
      return { lastInsertRowid: result.lastID };
    } catch (error) {
      console.error('❌ createUser error:', error);
      throw error;
    }
  },

  createTwitterUser: async (handle, twitterId, twitterUsername, twitterName, profileImage) => {
    try {
      const result = await runWithResult(
        'INSERT INTO users (handle, twitter_id, twitter_username, twitter_name, twitter_profile_image, auth_type) VALUES (?, ?, ?, ?, ?, ?)',
        [handle, twitterId, twitterUsername, twitterName, profileImage, 'twitter']
      );
      return { lastInsertRowid: result.lastID };
    } catch (error) {
      console.error('❌ createTwitterUser error:', error);
      throw error;
    }
  },

  getUserByTwitterId: async (twitterId) => {
    try {
      return await getAsync('SELECT * FROM users WHERE twitter_id = ?', [twitterId]);
    } catch (error) {
      console.error('❌ getUserByTwitterId error:', error);
      throw error;
    }
  },

  getUserByHandle: async (handle) => {
    try {
      return await getAsync('SELECT * FROM users WHERE handle = ?', [handle]);
    } catch (error) {
      console.error('❌ getUserByHandle error:', error);
      throw error;
    }
  },

  getUserById: async (id) => {
    try {
      return await getAsync('SELECT * FROM users WHERE id = ?', [id]);
    } catch (error) {
      console.error('❌ getUserById error:', error);
      throw error;
    }
  },

  // Question operations
  createQuestion: async (userId, text, ipAddress) => {
    try {
      const result = await runWithResult(
        'INSERT INTO questions (user_id, text, ip_address) VALUES (?, ?, ?)',
        [userId, text, ipAddress]
      );
      return { lastInsertRowid: result.lastID };
    } catch (error) {
      console.error('❌ createQuestion error:', error);
      throw error;
    }
  },

  getUnansweredQuestions: async (userId) => {
    try {
      return await allAsync(`
        SELECT q.* FROM questions q
        LEFT JOIN answers a ON q.id = a.question_id
        WHERE q.user_id = ? AND a.id IS NULL
        ORDER BY q.created_at DESC
      `, [userId]);
    } catch (error) {
      console.error('❌ getUnansweredQuestions error:', error);
      throw error;
    }
  },

  getQuestionById: async (id) => {
    try {
      return await getAsync('SELECT * FROM questions WHERE id = ?', [id]);
    } catch (error) {
      console.error('❌ getQuestionById error:', error);
      throw error;
    }
  },

  deleteQuestion: async (id) => {
    try {
      const result = await runWithResult('DELETE FROM questions WHERE id = ?', [id]);
      return { changes: result.changes };
    } catch (error) {
      console.error('❌ deleteQuestion error:', error);
      throw error;
    }
  },

  // Answer operations
  createAnswer: async (questionId, userId, questionText, answerText) => {
    try {
      const result = await runWithResult(
        'INSERT INTO answers (question_id, user_id, question_text, answer_text) VALUES (?, ?, ?, ?)',
        [questionId, userId, questionText, answerText]
      );
      return { lastInsertRowid: result.lastID };
    } catch (error) {
      console.error('❌ createAnswer error:', error);
      throw error;
    }
  },

  getAnswersByUserId: async (userId, limit, offset) => {
    try {
      return await allAsync(
        'SELECT * FROM answers WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [userId, limit, offset]
      );
    } catch (error) {
      console.error('❌ getAnswersByUserId error:', error);
      throw error;
    }
  },

  getAnswerById: async (id) => {
    try {
      return await getAsync('SELECT * FROM answers WHERE id = ?', [id]);
    } catch (error) {
      console.error('❌ getAnswerById error:', error);
      throw error;
    }
  },

  countAnswersByUserId: async (userId) => {
    try {
      return await getAsync(
        'SELECT COUNT(*) as count FROM answers WHERE user_id = ?',
        [userId]
      );
    } catch (error) {
      console.error('❌ countAnswersByUserId error:', error);
      throw error;
    }
  },

  deleteAnswer: async (id, userId) => {
    try {
      const result = await runWithResult(
        'DELETE FROM answers WHERE id = ? AND user_id = ?',
        [id, userId]
      );
      return { changes: result.changes };
    } catch (error) {
      console.error('❌ deleteAnswer error:', error);
      throw error;
    }
  },

  // Update answer
  updateAnswer: async (answerText, id, userId) => {
    try {
      const result = await runWithResult(
        'UPDATE answers SET answer_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [answerText, id, userId]
      );
      return { changes: result.changes };
    } catch (error) {
      console.error('❌ updateAnswer error:', error);
      throw error;
    }
  },

  // Stats operations
  getUserStats: async (userId) => {
    try {
      return await getAsync(`
        SELECT 
          (SELECT COUNT(*) FROM questions WHERE user_id = ?) as total_questions,
          (SELECT COUNT(*) FROM answers WHERE user_id = ?) as total_answers
      `, [userId, userId]);
    } catch (error) {
      console.error('❌ getUserStats error:', error);
      throw error;
    }
  },

  // Get all users for directory
  getAllUsers: async () => {
    try {
      return await allAsync(`
        SELECT 
          users.id,
          users.handle, 
          users.twitter_username, 
          users.twitter_name, 
          users.twitter_profile_image,
          users.auth_type,
          users.created_at,
          COUNT(DISTINCT answers.id) as answer_count
        FROM users 
        LEFT JOIN answers ON users.id = answers.user_id
        GROUP BY users.id
        ORDER BY users.created_at DESC 
        LIMIT 50
      `);
    } catch (error) {
      console.error('❌ getAllUsers error:', error);
      throw error;
    }
  },

  // Get recent questions
  getRecentQuestions: async (since) => {
    try {
      return await allAsync(`
        SELECT 
          q.id,
          q.text,
          q.created_at,
          u.handle as user_handle
        FROM questions q
        JOIN users u ON q.user_id = u.id
        WHERE q.created_at > ?
        ORDER BY q.created_at DESC
        LIMIT 10
      `, [since]);
    } catch (error) {
      console.error('❌ getRecentQuestions error:', error);
      throw error;
    }
  },

  // Get recent answers
  getRecentAnswers: async (since) => {
    try {
      return await allAsync(`
        SELECT 
          a.id,
          a.question_text,
          a.answer_text,
          a.created_at,
          u.handle as user_handle,
          u.twitter_profile_image
        FROM answers a
        JOIN users u ON a.user_id = u.id
        WHERE a.created_at > ?
        ORDER BY a.created_at DESC
        LIMIT 10
      `, [since]);
    } catch (error) {
      console.error('❌ getRecentAnswers error:', error);
      throw error;
    }
  },

  // Get recent users
  getRecentUsers: async (since) => {
    try {
      return await allAsync(`
        SELECT 
          id,
          handle,
          twitter_username,
          twitter_name,
          twitter_profile_image,
          auth_type,
          created_at
        FROM users
        WHERE created_at > ?
        ORDER BY created_at DESC
        LIMIT 10
      `, [since]);
    } catch (error) {
      console.error('❌ getRecentUsers error:', error);
      throw error;
    }
  },

  // Telegram operations
  updateUserTelegramId: async (userId, telegramChatId) => {
    try {
      const result = await runWithResult(
        'UPDATE users SET telegram_chat_id = ? WHERE id = ?',
        [telegramChatId, userId]
      );
      return { changes: result.changes };
    } catch (error) {
      console.error('❌ updateUserTelegramId error:', error);
      throw error;
    }
  },

  getUserByTelegramId: async (telegramChatId) => {
    try {
      return await getAsync('SELECT * FROM users WHERE telegram_chat_id = ?', [telegramChatId]);
    } catch (error) {
      console.error('❌ getUserByTelegramId error:', error);
      throw error;
    }
  },

  // Transaction helper
  runTransaction: async (callback) => {
    await runAsync('BEGIN TRANSACTION');
    try {
      await callback();
      await runAsync('COMMIT');
    } catch (error) {
      await runAsync('ROLLBACK');
      throw error;
    }
  }
};

// Wrap all operations to match the original API
const statements = {
  createUser: {
    run: (params) => dbOperations.createUser(params.handle, params.secret_key)
  },
  createTwitterUser: {
    run: (params) => dbOperations.createTwitterUser(params.handle, params.twitter_id, params.twitter_username, params.twitter_name, params.twitter_profile_image)
  },
  getUserByHandle: {
    get: (handle) => dbOperations.getUserByHandle(handle)
  },
  getUserById: {
    get: (id) => dbOperations.getUserById(id)
  },
  getUserByTwitterId: {
    get: (twitterId) => dbOperations.getUserByTwitterId(twitterId)
  },
  createQuestion: {
    run: (params) => dbOperations.createQuestion(params.user_id, params.text, params.ip_address)
  },
  getUnansweredQuestions: {
    all: (userId) => dbOperations.getUnansweredQuestions(userId)
  },
  getQuestionById: {
    get: (id) => dbOperations.getQuestionById(id)
  },
  deleteQuestion: {
    run: (id) => dbOperations.deleteQuestion(id)
  },
  createAnswer: {
    run: (params) => dbOperations.createAnswer(params.question_id, params.user_id, params.question_text, params.answer_text)
  },
  getAnswersByUserId: {
    all: (userId, limit, offset) => dbOperations.getAnswersByUserId(userId, limit, offset)
  },
  getAnswerById: {
    get: (id) => dbOperations.getAnswerById(id)
  },
  countAnswersByUserId: {
    get: (userId) => dbOperations.countAnswersByUserId(userId)
  },
  deleteAnswer: {
    run: (id, userId) => dbOperations.deleteAnswer(id, userId)
  },
  updateAnswer: {
    run: (answerText, id, userId) => dbOperations.updateAnswer(answerText, id, userId)
  },
  getUserStats: {
    get: (userId1, userId2) => dbOperations.getUserStats(userId1)
  },
  getAllUsers: {
    all: () => dbOperations.getAllUsers()
  },
  getRecentQuestions: {
    all: (since) => dbOperations.getRecentQuestions(since)
  },
  getRecentAnswers: {
    all: (since) => dbOperations.getRecentAnswers(since)
  },
  getRecentUsers: {
    all: (since) => dbOperations.getRecentUsers(since)
  },
  updateUserTelegramId: {
    run: (userId, telegramChatId) => dbOperations.updateUserTelegramId(userId, telegramChatId)
  },
  getUserByTelegramId: {
    get: (telegramChatId) => dbOperations.getUserByTelegramId(telegramChatId)
  }
};

module.exports = {
  db: {
    transaction: (callback) => {
      return () => dbOperations.runTransaction(callback);
    }
  },
  init,
  statements
}; 