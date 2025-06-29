# OpenAdvisor Pivot Documentation

## 🎯 Overview

This repository has been pivoted from **TraderFM** (a Q&A platform for traders) to **OpenAdvisor** (a transparency-first platform for crypto KOL token grants on Solana).

**Date of Pivot:** December 2024  
**Status:** 🚧 In Development - Testing Phase

## 📋 What is OpenAdvisor?

OpenAdvisor is a platform that enables:
- **Crypto Influencers (KOLs)** to accept token grants on Solana with full regulatory compliance
- **Projects** to issue token grants in a standardized, auditable way
- **Full transparency** with all deals visible on-chain

### Key Features (Planned)
1. Twitter authentication for KOLs
2. Solana wallet integration
3. On-chain vesting contracts
4. Automated compliance disclosures
5. Public deal explorer

## 🔄 Current Implementation Status

### ✅ What's Working

1. **Frontend (Port 5173)**
   - Landing page with OpenAdvisor branding
   - KOL Dashboard UI
   - Project Dashboard UI
   - Live deals feed (UI ready, needs data)
   - Twitter authentication flow (needs API keys)

2. **Backend Structure (Port 5001)**
   - API routes for projects, deals, and users
   - Database schema for OpenAdvisor entities
   - Authentication middleware
   - Twitter OAuth integration (ready but needs credentials)

### ⚠️ Known Issues

1. **Database Migration Error**
   ```
   Error: SQLITE_ERROR: near "EXISTS": syntax error
   ```
   - SQLite doesn't support `IF NOT EXISTS` in `ALTER TABLE` statements
   - Need to update migration strategy in `database.js`

2. **Missing Implementations**
   - Solana wallet integration not yet implemented
   - Smart contracts not created
   - IPFS integration pending
   - Twitter disclosure bot not built
   - Stats calculations not connected

### 🛠️ Technical Changes Made

1. **Database Schema Extended**
   - Added `projects` table
   - Added `deals` table  
   - Added `deal_disclosures` table
   - Extended `users` table with wallet and KOL fields

2. **New API Endpoints**
   - `/api/projects` - Project management
   - `/api/deals` - Deal/offer management
   - `/api/users/connect-wallet` - Wallet connection
   - `/api/users/kol-status` - KOL status management

3. **Frontend Routes**
   - `/` - OpenAdvisor landing page
   - `/kol-dashboard` - KOL management interface
   - `/project-dashboard` - Project management interface

## 🚀 Running the Application

### Prerequisites
- Node.js 18+
- npm or yarn

### Quick Start

1. **Using the startup script:**
   ```bash
   ./start-dev.sh
   ```

2. **Or manually:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5001

### Environment Setup

The backend requires a `.env` file. Copy from example:
```bash
cd backend
cp env.example .env
```

**Required for Twitter login:**
- `TWITTER_API_KEY` - Get from https://developer.twitter.com
- `TWITTER_API_SECRET` - Get from https://developer.twitter.com

## 📁 Project Structure

```
traderfm/ (OpenAdvisor)
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── projects.js    # NEW: Project management
│   │   │   ├── deals.js       # NEW: Deal management
│   │   │   └── users.js       # UPDATED: Wallet & KOL features
│   │   └── utils/
│   │       └── database.js    # UPDATED: OpenAdvisor schema
│   └── .env                   # Environment variables
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.jsx        # REPLACED: OpenAdvisor landing
│   │   │   ├── KOLDashboard.jsx    # NEW: KOL interface
│   │   │   └── ProjectDashboard.jsx # NEW: Project interface
│   │   └── services/
│   │       └── api.js         # UPDATED: New API methods
│   └── vite.config.js         # UPDATED: Port 5173
└── start-dev.sh               # NEW: Startup script
```

## 🔧 Next Steps to Complete MVP

### High Priority
1. **Fix Database Migration**
   - Update `database.js` to handle SQLite limitations
   - Use proper migration strategy for existing columns

2. **Implement Wallet Connection**
   - Add Solana wallet adapter
   - Implement wallet signature verification

3. **Create Demo Data**
   - Add seed script for projects and deals
   - Create example KOLs for testing

### Medium Priority
1. **Smart Contract Integration**
   - Create vesting contract on Solana
   - Implement deal acceptance flow

2. **Twitter API Setup**
   - Document Twitter app creation process
   - Implement proper error handling

3. **Stats Implementation**
   - Calculate platform statistics
   - Connect to frontend displays

### Future Features
1. IPFS integration for SAATP documents
2. Automated Twitter disclosure bot
3. Email notifications
4. Analytics dashboard

## 🐛 Troubleshooting

### Backend won't start
- Check `.env` file exists with `JWT_SECRET`
- Verify port 5001 is available
- Check SQLite database permissions

### Frontend port conflicts
- Frontend runs on port 5173 by default
- Can be changed in `vite.config.js`

### Database errors
- Current issue with ALTER TABLE migrations
- Temporary fix: Delete `backend/data/traderfm.db` to recreate

## 📝 Original TraderFM Features

The following TraderFM features are still present but hidden:
- Q&A functionality (`/inbox/:handle`, `/u/:handle`)
- Anonymous question submission
- User profiles with secret key auth

These can be removed once OpenAdvisor is fully operational.

## 🤝 Contributing

This is a pivot in progress. Key areas needing work:
1. Database migration fixes
2. Solana integration
3. UI/UX improvements
4. Testing and documentation

## 📞 Support

For questions about this pivot:
- Check this documentation first
- Review the code comments
- Original TraderFM functionality is preserved but deprecated

---

**Last Updated:** December 2024  
**Status:** Testing pivot from TraderFM to OpenAdvisor  
**Note:** This is experimental - not ready for production use 