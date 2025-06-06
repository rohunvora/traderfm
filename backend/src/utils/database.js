const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db = new Database(path.join(dataDir, 'traderfm.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
const init = async () => {
  try {
    // Users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        handle TEXT UNIQUE NOT NULL,
        secret_key TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Questions table
    db.exec(`
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
    db.exec(`
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
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);
      CREATE INDEX IF NOT EXISTS idx_answers_user_id ON answers(user_id);
      CREATE INDEX IF NOT EXISTS idx_answers_created_at ON answers(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_handle ON users(handle);
    `);

    // Create triggers to update the updated_at timestamp
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
      AFTER UPDATE ON users
      BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

// Prepared statements for better performance
const statements = {
  // User queries
  createUser: db.prepare(`
    INSERT INTO users (handle, secret_key) 
    VALUES (@handle, @secret_key)
  `),
  
  getUserByHandle: db.prepare(`
    SELECT * FROM users WHERE handle = ?
  `),
  
  getUserById: db.prepare(`
    SELECT * FROM users WHERE id = ?
  `),
  
  // Question queries
  createQuestion: db.prepare(`
    INSERT INTO questions (user_id, text, ip_address) 
    VALUES (@user_id, @text, @ip_address)
  `),
  
  getUnansweredQuestions: db.prepare(`
    SELECT q.* FROM questions q
    LEFT JOIN answers a ON q.id = a.question_id
    WHERE q.user_id = ? AND a.id IS NULL
    ORDER BY q.created_at DESC
  `),
  
  getQuestionById: db.prepare(`
    SELECT * FROM questions WHERE id = ?
  `),
  
  deleteQuestion: db.prepare(`
    DELETE FROM questions WHERE id = ?
  `),
  
  // Answer queries
  createAnswer: db.prepare(`
    INSERT INTO answers (question_id, user_id, question_text, answer_text) 
    VALUES (@question_id, @user_id, @question_text, @answer_text)
  `),
  
  getAnswersByUserId: db.prepare(`
    SELECT * FROM answers 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `),
  
  countAnswersByUserId: db.prepare(`
    SELECT COUNT(*) as count FROM answers WHERE user_id = ?
  `),
  
  deleteAnswer: db.prepare(`
    DELETE FROM answers WHERE id = ? AND user_id = ?
  `),
  
  // Stats queries
  getUserStats: db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM questions WHERE user_id = ?) as total_questions,
      (SELECT COUNT(*) FROM answers WHERE user_id = ?) as total_answers
  `)
};

module.exports = {
  db,
  init,
  statements
}; 