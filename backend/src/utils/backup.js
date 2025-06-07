const fs = require('fs');
const path = require('path');

// Backup the SQLite database
function backupDatabase() {
  try {
    const dataDir = path.join(__dirname, '../../data');
    const dbPath = path.join(dataDir, 'traderfm.db');
    
    // Check if database exists
    if (!fs.existsSync(dbPath)) {
      console.error('❌ Database file not found:', dbPath);
      return false;
    }
    
    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFilename = `traderfm-backup-${timestamp}.db`;
    const backupPath = path.join(dataDir, backupFilename);
    
    // Create backup
    console.log('📦 Creating backup...');
    fs.copyFileSync(dbPath, backupPath);
    
    // Get file sizes
    const originalSize = fs.statSync(dbPath).size;
    const backupSize = fs.statSync(backupPath).size;
    
    console.log('✅ Backup created successfully!');
    console.log(`📄 Backup file: ${backupFilename}`);
    console.log(`📊 Size: ${(backupSize / (1024 * 1024)).toFixed(2)} MB`);
    
    // Clean up old backups (keep only last 5)
    cleanupOldBackups(dataDir);
    
    return {
      success: true,
      filename: backupFilename,
      path: backupPath,
      size: backupSize
    };
  } catch (error) {
    console.error('❌ Backup failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Clean up old backups, keeping only the most recent ones
function cleanupOldBackups(dataDir, keepCount = 5) {
  try {
    // Find all backup files
    const files = fs.readdirSync(dataDir);
    const backupFiles = files
      .filter(f => f.startsWith('traderfm-backup-') && f.endsWith('.db'))
      .map(f => ({
        name: f,
        path: path.join(dataDir, f),
        time: fs.statSync(path.join(dataDir, f)).mtime
      }))
      .sort((a, b) => b.time - a.time); // Sort by modified time, newest first
    
    // Delete old backups
    if (backupFiles.length > keepCount) {
      const filesToDelete = backupFiles.slice(keepCount);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️  Deleted old backup: ${file.name}`);
      });
    }
  } catch (error) {
    console.error('❌ Error cleaning up old backups:', error);
  }
}

// Restore from a backup
function restoreDatabase(backupFilename) {
  try {
    const dataDir = path.join(__dirname, '../../data');
    const dbPath = path.join(dataDir, 'traderfm.db');
    const backupPath = path.join(dataDir, backupFilename);
    
    // Check if backup exists
    if (!fs.existsSync(backupPath)) {
      console.error('❌ Backup file not found:', backupPath);
      return false;
    }
    
    // Create a backup of current database before restoring
    const currentBackup = `traderfm-before-restore-${Date.now()}.db`;
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, path.join(dataDir, currentBackup));
      console.log(`📸 Created safety backup: ${currentBackup}`);
    }
    
    // Restore the backup
    console.log('♻️  Restoring database...');
    fs.copyFileSync(backupPath, dbPath);
    
    console.log('✅ Database restored successfully!');
    return true;
  } catch (error) {
    console.error('❌ Restore failed:', error);
    return false;
  }
}

// List available backups
function listBackups() {
  try {
    const dataDir = path.join(__dirname, '../../data');
    const files = fs.readdirSync(dataDir);
    
    const backups = files
      .filter(f => f.startsWith('traderfm-backup-') && f.endsWith('.db'))
      .map(f => {
        const stats = fs.statSync(path.join(dataDir, f));
        return {
          filename: f,
          size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          created: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    return backups;
  } catch (error) {
    console.error('❌ Error listing backups:', error);
    return [];
  }
}

// Export functions
module.exports = {
  backupDatabase,
  restoreDatabase,
  listBackups,
  cleanupOldBackups
};

// Run backup if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'backup':
      backupDatabase();
      break;
    case 'restore':
      if (args[1]) {
        restoreDatabase(args[1]);
      } else {
        console.error('❌ Please specify backup filename to restore');
        console.log('Usage: node backup.js restore <filename>');
      }
      break;
    case 'list':
      const backups = listBackups();
      if (backups.length === 0) {
        console.log('No backups found');
      } else {
        console.log('\n📦 Available backups:');
        backups.forEach(b => {
          console.log(`  - ${b.filename} (${b.size}) - ${b.created}`);
        });
      }
      break;
    default:
      console.log(`
TraderFM Database Backup Utility

Usage:
  node backup.js backup              Create a new backup
  node backup.js restore <filename>  Restore from a backup
  node backup.js list                List available backups
      `);
  }
} 