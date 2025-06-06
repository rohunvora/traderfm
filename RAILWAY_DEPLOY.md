# Deploy to Railway

## Quick Deploy

1. **Push your code to GitHub**
2. **Go to [railway.app](https://railway.app) and login**
3. **Create new project → Deploy from GitHub**
4. **Select your repository**

## Environment Variables to Set

In Railway dashboard, set these environment variables:

### Required:
- `JWT_SECRET`: A secure random string (generate with `openssl rand -base64 32`)
- `NODE_ENV`: `production`

### Optional:
- `FRONTEND_URL`: Leave blank for same-origin (Railway will handle this)

## What Railway Will Do

1. Detect Node.js project
2. Run `npm run build` (builds frontend and installs backend deps)
3. Run `npm start` (starts the backend server)
4. Serve frontend static files from backend
5. Provide persistent storage for SQLite database

## After Deployment

1. Railway will give you a URL like `https://yourapp.railway.app`
2. Your app will be fully functional with:
   - Frontend at the root URL
   - API at `/api/*` endpoints
   - Persistent SQLite database
   - JWT authentication working

## Common Issues

- **Port Error**: Railway automatically sets PORT, don't override it
- **CORS Error**: Set FRONTEND_URL to your Railway domain if needed
- **Build Error**: Check that all dependencies install correctly

## Database

- SQLite database persists in `/app/backend/data/`
- Data survives deployments
- No additional database setup needed 