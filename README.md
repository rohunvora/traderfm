# TraderFM → OpenAdvisor (Pivot in Progress)

> ⚠️ **IMPORTANT:** This repository is being pivoted from TraderFM to OpenAdvisor. See [OPENADVISOR_PIVOT.md](./OPENADVISOR_PIVOT.md) for details about the new direction and current status.

---

# TraderFM (Original Documentation)

TraderFM is a modern anonymous Q&A platform designed specifically for traders. Users can create handles, receive anonymous questions about trading, markets, and investment strategies, and share their insights publicly.

## Features

- 🎭 **100% Anonymous Questions** - No signup required to ask questions
- 🔐 **Secure Handle System** - Create a handle with a secret key for authentication
- 💬 **Real-time Updates** - Questions and answers update automatically
- 🛡️ **Profanity Filter** - Built-in content moderation
- ⚡ **Rate Limiting** - Prevents spam and abuse
- 📱 **Responsive Design** - Works great on mobile and desktop
- 🚀 **Fast & Lightweight** - Built with React and SQLite

## Tech Stack

**Frontend:**
- React 18 with Vite
- React Router for navigation
- TanStack Query for data fetching
- Tailwind CSS for styling
- Axios for API calls

**Backend:**
- Node.js with Express
- SQLite database with better-sqlite3
- JWT authentication
- Express Rate Limit
- Helmet for security

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- Git

### Local Development

1. **Clone the repository:**
```bash
git clone https://github.com/rohunvora/traderfm.git
cd traderfm
```

2. **Install dependencies:**
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. **Set up environment variables:**
```bash
# In the backend directory
cp env.example .env
# Edit .env with your settings
```

4. **Start the development servers:**

In separate terminals:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

5. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Docker Development

For a containerized development environment:

```bash
# Start all services
docker-compose --profile dev up

# Or just the production build
docker-compose up
```

## Production Deployment

### Using Docker

1. **Build and run with Docker Compose:**
```bash
docker-compose up -d
```

2. **Or build the Docker image manually:**
```bash
docker build -t traderfm .
docker run -p 5000:5000 -v $(pwd)/data:/app/backend/data traderfm
```

### Manual Deployment

1. **Build the frontend:**
```bash
cd frontend
npm run build
```

2. **Set up production environment:**
```bash
cd backend
npm install --production
export NODE_ENV=production
export JWT_SECRET=your-secret-key-here
```

3. **Start the server:**
```bash
node src/index.js
```

### Deploy to Cloud Platforms

**Heroku:**
```bash
heroku create your-app-name
heroku config:set JWT_SECRET=your-secret-key
git push heroku main
```

**Railway:**
1. Connect your GitHub repo to Railway
2. Set environment variables in Railway dashboard
3. Deploy!

**DigitalOcean App Platform:**
1. Create a new app from GitHub
2. Configure environment variables
3. Set build command: `cd frontend && npm install && npm run build`
4. Set run command: `cd backend && npm install && node src/index.js`

## API Documentation

### Public Endpoints

**Check if handle exists:**
```
GET /api/users/check/:handle
```

**Create new handle:**
```
POST /api/users/create
Body: { "handle": "yourhandle" }
```

**Ask a question:**
```
POST /api/questions/:handle
Body: { "text": "Your question here" }
```

**Get answers:**
```
GET /api/answers/:handle?page=1&limit=20
```

### Authenticated Endpoints

**Login:**
```
POST /api/users/auth
Body: { "handle": "yourhandle", "secretKey": "your-secret" }
```

**Get unanswered questions:**
```