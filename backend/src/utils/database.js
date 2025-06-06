const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(path.join(dataDir, 'traderfm.db'));

// Promisify database methods
const runAsync = promisify(db.run.bind(db));
const getAsync = promisify(db.get.bind(db));
const allAsync = promisify(db.all.bind(db));

// Initialize database schema
const init = async () => {
  try {
    // Enable foreign keys
    await runAsync('PRAGMA foreign_keys = ON');

    // Users table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        handle TEXT UNIQUE NOT NULL,
        secret_key TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

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

    // Answers table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        answer_text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await runAsync('CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_answers_user_id ON answers(user_id)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_answers_created_at ON answers(created_at)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_users_handle ON users(handle)');

    // Create triggers to update the updated_at timestamp
    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
      AFTER UPDATE ON users
      BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

// Helper functions for database operations
const dbOperations = {
  // User operations
  createUser: async (handle, secretKey) => {
    const result = await runAsync(
      'INSERT INTO users (handle, secret_key) VALUES (?, ?)',
      [handle, secretKey]
    );
    return { lastInsertRowid: result.lastID };
  },

  getUserByHandle: async (handle) => {
    return await getAsync('SELECT * FROM users WHERE handle = ?', [handle]);
  },

  getUserById: async (id) => {
    return await getAsync('SELECT * FROM users WHERE id = ?', [id]);
  },

  // Question operations
  createQuestion: async (userId, text, ipAddress) => {
    const result = await runAsync(
      'INSERT INTO questions (user_id, text, ip_address) VALUES (?, ?, ?)',
      [userId, text, ipAddress]
    );
    return { lastInsertRowid: result.lastID };
  },

  getUnansweredQuestions: async (userId) => {
    return await allAsync(`
      SELECT q.* FROM questions q
      LEFT JOIN answers a ON q.id = a.question_id
      WHERE q.user_id = ? AND a.id IS NULL
      ORDER BY q.created_at DESC
    `, [userId]);
  },

  getQuestionById: async (id) => {
    return await getAsync('SELECT * FROM questions WHERE id = ?', [id]);
  },

  deleteQuestion: async (id) => {
    const result = await runAsync('DELETE FROM questions WHERE id = ?', [id]);
    return { changes: result.changes };
  },

  // Answer operations
  createAnswer: async (questionId, userId, questionText, answerText) => {
    const result = await runAsync(
      'INSERT INTO answers (question_id, user_id, question_text, answer_text) VALUES (?, ?, ?, ?)',
      [questionId, userId, questionText, answerText]
    );
    return { lastInsertRowid: result.lastID };
  },

  getAnswersByUserId: async (userId, limit, offset) => {
    return await allAsync(
      'SELECT * FROM answers WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );
  },

  countAnswersByUserId: async (userId) => {
    return await getAsync(
      'SELECT COUNT(*) as count FROM answers WHERE user_id = ?',
      [userId]
    );
  },

  deleteAnswer: async (id, userId) => {
    const result = await runAsync(
      'DELETE FROM answers WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return { changes: result.changes };
  },

  // Stats operations
  getUserStats: async (userId) => {
    return await getAsync(`
      SELECT 
        (SELECT COUNT(*) FROM questions WHERE user_id = ?) as total_questions,
        (SELECT COUNT(*) FROM answers WHERE user_id = ?) as total_answers
    `, [userId, userId]);
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
  getUserByHandle: {
    get: (handle) => dbOperations.getUserByHandle(handle)
  },
  getUserById: {
    get: (id) => dbOperations.getUserById(id)
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
  countAnswersByUserId: {
    get: (userId) => dbOperations.countAnswersByUserId(userId)
  },
  deleteAnswer: {
    run: (id, userId) => dbOperations.deleteAnswer(id, userId)
  },
  getUserStats: {
    get: (userId1, userId2) => dbOperations.getUserStats(userId1)
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