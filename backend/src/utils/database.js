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

    // OpenAdvisor Tables
    
    // Projects table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        token_symbol TEXT NOT NULL,
        token_address TEXT,
        description TEXT,
        website TEXT,
        twitter_handle TEXT,
        logo_url TEXT,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Projects table ready');

    // Deals/Offers table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS deals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        kol_user_id INTEGER,
        token_amount TEXT NOT NULL,
        vesting_schedule TEXT NOT NULL,
        cliff_days INTEGER DEFAULT 0,
        total_vesting_days INTEGER NOT NULL,
        deliverables TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'revoked')),
        offer_expires_at DATETIME,
        accepted_at DATETIME,
        on_chain_tx TEXT,
        vesting_contract_address TEXT,
        ipfs_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (kol_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Deals table ready');

    // Add wallet address to users table
    // SQLite doesn't support IF NOT EXISTS in ALTER TABLE, so we need to check first
    try {
      await getAsync("SELECT wallet_address FROM users LIMIT 1");
    } catch (error) {
      if (error.message.includes('no such column')) {
        await runAsync('ALTER TABLE users ADD COLUMN wallet_address TEXT');
        console.log('✅ Added wallet_address column to users table');
      }
    }

    try {
      await getAsync("SELECT wallet_verified FROM users LIMIT 1");
    } catch (error) {
      if (error.message.includes('no such column')) {
        await runAsync('ALTER TABLE users ADD COLUMN wallet_verified BOOLEAN DEFAULT 0');
        console.log('✅ Added wallet_verified column to users table');
      }
    }

    try {
      await getAsync("SELECT is_kol FROM users LIMIT 1");
    } catch (error) {
      if (error.message.includes('no such column')) {
        await runAsync('ALTER TABLE users ADD COLUMN is_kol BOOLEAN DEFAULT 0');
        console.log('✅ Added is_kol column to users table');
      }
    }

    try {
      await getAsync("SELECT kol_description FROM users LIMIT 1");
    } catch (error) {
      if (error.message.includes('no such column')) {
        await runAsync('ALTER TABLE users ADD COLUMN kol_description TEXT');
        console.log('✅ Added kol_description column to users table');
      }
    }

    console.log('✅ User table extensions ready');

    // Deal disclosures table (for compliance tracking)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS deal_disclosures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deal_id INTEGER NOT NULL,
        tweet_id TEXT,
        tweet_url TEXT,
        disclosure_text TEXT,
        posted_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Deal disclosures table ready');

    // Create indexes for OpenAdvisor tables
    await runAsync('CREATE INDEX IF NOT EXISTS idx_deals_project_id ON deals(project_id)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_deals_kol_user_id ON deals(kol_user_id)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status)');
    await runAsync('CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address)');
    console.log('✅ OpenAdvisor indexes created');

    // Create triggers to update the updated_at timestamp
    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
      AFTER UPDATE ON users
      BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);
    
    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS update_projects_timestamp 
      AFTER UPDATE ON projects
      BEGIN
        UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);
    
    await runAsync(`
      CREATE TRIGGER IF NOT EXISTS update_deals_timestamp 
      AFTER UPDATE ON deals
      BEGIN
        UPDATE deals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
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
  },

  // OpenAdvisor Operations
  
  // Wallet operations
  updateUserWallet: async (userId, walletAddress) => {
    try {
      const result = await runWithResult(
        'UPDATE users SET wallet_address = ?, wallet_verified = 1 WHERE id = ?',
        [walletAddress, userId]
      );
      return { changes: result.changes };
    } catch (error) {
      console.error('❌ updateUserWallet error:', error);
      throw error;
    }
  },

  updateUserKOLStatus: async (userId, isKol, description) => {
    try {
      const result = await runWithResult(
        'UPDATE users SET is_kol = ?, kol_description = ? WHERE id = ?',
        [isKol ? 1 : 0, description, userId]
      );
      return { changes: result.changes };
    } catch (error) {
      console.error('❌ updateUserKOLStatus error:', error);
      throw error;
    }
  },

  // Project operations
  createProject: async (name, tokenSymbol, tokenAddress, description, website, twitterHandle, logoUrl, createdBy) => {
    try {
      const result = await runWithResult(
        'INSERT INTO projects (name, token_symbol, token_address, description, website, twitter_handle, logo_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, tokenSymbol, tokenAddress, description, website, twitterHandle, logoUrl, createdBy]
      );
      return { lastInsertRowid: result.lastID };
    } catch (error) {
      console.error('❌ createProject error:', error);
      throw error;
    }
  },

  getProjectById: async (id) => {
    try {
      return await getAsync('SELECT * FROM projects WHERE id = ?', [id]);
    } catch (error) {
      console.error('❌ getProjectById error:', error);
      throw error;
    }
  },

  getProjectsByUser: async (userId) => {
    try {
      return await allAsync('SELECT * FROM projects WHERE created_by = ? ORDER BY created_at DESC', [userId]);
    } catch (error) {
      console.error('❌ getProjectsByUser error:', error);
      throw error;
    }
  },

  // Deal operations
  createDeal: async (projectId, kolUserId, tokenAmount, vestingSchedule, cliffDays, totalVestingDays, deliverables, offerExpiresAt) => {
    try {
      const result = await runWithResult(
        `INSERT INTO deals (project_id, kol_user_id, token_amount, vesting_schedule, cliff_days, total_vesting_days, deliverables, offer_expires_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [projectId, kolUserId, tokenAmount, vestingSchedule, cliffDays, totalVestingDays, deliverables, offerExpiresAt]
      );
      return { lastInsertRowid: result.lastID };
    } catch (error) {
      console.error('❌ createDeal error:', error);
      throw error;
    }
  },

  getDealById: async (id) => {
    try {
      return await getAsync(`
        SELECT d.*, p.name as project_name, p.token_symbol, p.logo_url,
               u.handle as kol_handle, u.twitter_username as kol_twitter_username,
               u.twitter_profile_image as kol_profile_image
        FROM deals d
        JOIN projects p ON d.project_id = p.id
        LEFT JOIN users u ON d.kol_user_id = u.id
        WHERE d.id = ?
      `, [id]);
    } catch (error) {
      console.error('❌ getDealById error:', error);
      throw error;
    }
  },

  getDealsByKOL: async (kolUserId, status = null) => {
    try {
      let query = `
        SELECT d.*, p.name as project_name, p.token_symbol, p.logo_url
        FROM deals d
        JOIN projects p ON d.project_id = p.id
        WHERE d.kol_user_id = ?
      `;
      const params = [kolUserId];
      
      if (status) {
        query += ' AND d.status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY d.created_at DESC';
      
      return await allAsync(query, params);
    } catch (error) {
      console.error('❌ getDealsByKOL error:', error);
      throw error;
    }
  },

  getDealsByProject: async (projectId, status = null) => {
    try {
      let query = `
        SELECT d.*, u.handle as kol_handle, u.twitter_username as kol_twitter_username,
               u.twitter_profile_image as kol_profile_image
        FROM deals d
        LEFT JOIN users u ON d.kol_user_id = u.id
        WHERE d.project_id = ?
      `;
      const params = [projectId];
      
      if (status) {
        query += ' AND d.status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY d.created_at DESC';
      
      return await allAsync(query, params);
    } catch (error) {
      console.error('❌ getDealsByProject error:', error);
      throw error;
    }
  },

  updateDealStatus: async (dealId, status, onChainTx = null, vestingContractAddress = null, ipfsHash = null) => {
    try {
      let query = 'UPDATE deals SET status = ?';
      const params = [status];
      
      if (status === 'accepted') {
        query += ', accepted_at = CURRENT_TIMESTAMP';
      }
      
      if (onChainTx) {
        query += ', on_chain_tx = ?';
        params.push(onChainTx);
      }
      
      if (vestingContractAddress) {
        query += ', vesting_contract_address = ?';
        params.push(vestingContractAddress);
      }
      
      if (ipfsHash) {
        query += ', ipfs_hash = ?';
        params.push(ipfsHash);
      }
      
      query += ' WHERE id = ?';
      params.push(dealId);
      
      const result = await runWithResult(query, params);
      return { changes: result.changes };
    } catch (error) {
      console.error('❌ updateDealStatus error:', error);
      throw error;
    }
  },

  // Get all KOLs
  getKOLs: async () => {
    try {
      return await allAsync(`
        SELECT u.*, COUNT(DISTINCT d.id) as deal_count
        FROM users u
        LEFT JOIN deals d ON u.id = d.kol_user_id AND d.status = 'accepted'
        WHERE u.is_kol = 1
        GROUP BY u.id
        ORDER BY deal_count DESC, u.created_at DESC
      `);
    } catch (error) {
      console.error('❌ getKOLs error:', error);
      throw error;
    }
  },

  // Get live deals feed
  getLiveDeals: async (limit = 10) => {
    try {
      return await allAsync(`
        SELECT d.*, p.name as project_name, p.token_symbol, p.logo_url,
               u.handle as kol_handle, u.twitter_username as kol_twitter_username,
               u.twitter_profile_image as kol_profile_image
        FROM deals d
        JOIN projects p ON d.project_id = p.id
        JOIN users u ON d.kol_user_id = u.id
        WHERE d.status = 'accepted'
        ORDER BY d.accepted_at DESC
        LIMIT ?
      `, [limit]);
    } catch (error) {
      console.error('❌ getLiveDeals error:', error);
      throw error;
    }
  },

  // Deal disclosure operations
  createDealDisclosure: async (dealId, tweetId, tweetUrl, disclosureText, postedAt) => {
    try {
      const result = await runWithResult(
        'INSERT INTO deal_disclosures (deal_id, tweet_id, tweet_url, disclosure_text, posted_at) VALUES (?, ?, ?, ?, ?)',
        [dealId, tweetId, tweetUrl, disclosureText, postedAt]
      );
      return { lastInsertRowid: result.lastID };
    } catch (error) {
      console.error('❌ createDealDisclosure error:', error);
      throw error;
    }
  },

  getDealDisclosures: async (dealId) => {
    try {
      return await allAsync(
        'SELECT * FROM deal_disclosures WHERE deal_id = ? ORDER BY posted_at DESC',
        [dealId]
      );
    } catch (error) {
      console.error('❌ getDealDisclosures error:', error);
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
  },
  updateUserWallet: {
    run: (params) => dbOperations.updateUserWallet(params.user_id, params.wallet_address)
  },
  updateUserKOLStatus: {
    run: (params) => dbOperations.updateUserKOLStatus(params.user_id, params.is_kol, params.description)
  },
  createProject: {
    run: (params) => dbOperations.createProject(params.name, params.token_symbol, params.token_address, params.description, params.website, params.twitter_handle, params.logo_url, params.created_by)
  },
  getProjectById: {
    get: (id) => dbOperations.getProjectById(id)
  },
  getProjectsByUser: {
    all: (userId) => dbOperations.getProjectsByUser(userId)
  },
  createDeal: {
    run: (params) => dbOperations.createDeal(params.project_id, params.kol_user_id, params.token_amount, params.vesting_schedule, params.cliff_days, params.total_vesting_days, params.deliverables, params.offer_expires_at)
  },
  getDealById: {
    get: (id) => dbOperations.getDealById(id)
  },
  getDealsByKOL: {
    all: (kolUserId, status) => dbOperations.getDealsByKOL(kolUserId, status)
  },
  getDealsByProject: {
    all: (projectId, status) => dbOperations.getDealsByProject(projectId, status)
  },
  updateDealStatus: {
    run: (params) => dbOperations.updateDealStatus(params.deal_id, params.status, params.on_chain_tx, params.vesting_contract_address, params.ipfs_hash)
  },
  getKOLs: {
    all: () => dbOperations.getKOLs()
  },
  getLiveDeals: {
    all: (limit) => dbOperations.getLiveDeals(limit)
  },
  createDealDisclosure: {
    run: (params) => dbOperations.createDealDisclosure(params.deal_id, params.tweet_id, params.tweet_url, params.disclosure_text, params.posted_at)
  },
  getDealDisclosures: {
    all: (dealId) => dbOperations.getDealDisclosures(dealId)
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