#!/usr/bin/env node

const { init } = require('./database');

console.log('Initializing database...');

init()
  .then(() => {
    console.log('Database initialized successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }); 