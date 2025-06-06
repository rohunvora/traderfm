const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Migration functions
const migrations = [
  {
    version: 1,
    description: 'Add Twitter OAuth columns to users table',
    up: async (db) => {
      console.log('🔄 Running migration 1: Add Twitter OAuth columns...');
      
      // Check if users table exists
      const tableExists = await new Promise((resolve, reject) => {
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        });
      });
      
      if (!tableExists) {
        console.log('✓ Users table does not exist yet, skipping migration');
        return;
      }
      
      // Check if columns already exist
      const tableInfo = await new Promise((resolve, reject) => {
        db.all("PRAGMA table_info(users)", (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      const columnNames = tableInfo.map(col => col.name);
      
      // If twitter_id already exists, assume this is a fresh database with new schema
      if (columnNames.includes('twitter_id')) {
        console.log('✓ Twitter columns already exist, skipping migration');
        return;
      }
      
      // This is an old database that needs updating
      console.log('📝 Updating existing database with Twitter OAuth columns...');
      
      const columnsToAdd = [
        { name: 'twitter_id', sql: 'ALTER TABLE users ADD COLUMN twitter_id TEXT UNIQUE' },
        { name: 'twitter_username', sql: 'ALTER TABLE users ADD COLUMN twitter_username TEXT UNIQUE' },
        { name: 'twitter_name', sql: 'ALTER TABLE users ADD COLUMN twitter_name TEXT' },
        { name: 'twitter_profile_image', sql: 'ALTER TABLE users ADD COLUMN twitter_profile_image TEXT' },
        { name: 'auth_type', sql: "ALTER TABLE users ADD COLUMN auth_type TEXT DEFAULT 'secret_key'" }
      ];
      
      for (const column of columnsToAdd) {
        if (!columnNames.includes(column.name)) {
          await new Promise((resolve, reject) => {
            db.run(column.sql, (err) => {
              if (err) {
                console.error(`❌ Failed to add column ${column.name}:`, err);
                reject(err);
              } else {
                console.log(`✅ Added column: ${column.name}`);
                resolve();
              }
            });
          });
        }
      }
      
      // Update existing users to have auth_type = 'secret_key' if they have a secret_key
      await new Promise((resolve, reject) => {
        db.run("UPDATE users SET auth_type = 'secret_key' WHERE secret_key IS NOT NULL AND auth_type IS NULL", (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      console.log('✅ Migration 1 completed');
    }
  }
];

// Run migrations
async function runMigrations(db) {
  console.log('🔧 Checking for database migrations...');
  
  // Create migrations table if it doesn't exist
  await new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        description TEXT,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  
  // Get applied migrations
  const appliedMigrations = await new Promise((resolve, reject) => {
    db.all('SELECT version FROM migrations', (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.version));
    });
  });
  
  // Run pending migrations
  for (const migration of migrations) {
    if (!appliedMigrations.includes(migration.version)) {
      console.log(`📝 Running migration ${migration.version}: ${migration.description}`);
      
      try {
        await migration.up(db);
        
        // Record migration
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO migrations (version, description) VALUES (?, ?)',
            [migration.version, migration.description],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        
        console.log(`✅ Migration ${migration.version} applied successfully`);
      } catch (error) {
        console.error(`❌ Migration ${migration.version} failed:`, error);
        throw error;
      }
    }
  }
  
  console.log('✅ All migrations completed');
}

module.exports = { runMigrations }; 