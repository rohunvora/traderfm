# Deploy to Railway

## Quick Deploy

1. **Push your code to GitHub**
2. **Go to [railway.app](https://railway.app) and login**
3. **Create new project → Deploy from GitHub**
4. **Select your repository**

Railway will automatically use the `Dockerfile.railway` for deployment.

## Environment Variables to Set

In Railway dashboard, set these environment variables:

### Required:
- `JWT_SECRET`: A secure random string (generate with `openssl rand -base64 32`)
- `NODE_ENV`: `production`

### For Twitter OAuth (Optional but Recommended):
- `TWITTER_API_KEY`: Your Twitter API key (Consumer Key) from developer.twitter.com
- `TWITTER_API_SECRET`: Your Twitter API secret (Consumer Secret) from developer.twitter.com
- `BASE_URL`: Your Railway backend URL (e.g., https://your-app.up.railway.app)
- `TWITTER_CALLBACK_URL`: Your Twitter callback URL (e.g., https://your-app.up.railway.app/api/auth/twitter/callback)

### Optional:
- `PORT`: Railway sets this automatically, but you can override if needed

## Alternative Deployment Methods

### Method 1: Dockerfile (Recommended - Currently Active)
Uses `Dockerfile.railway` and `railway.json` with Dockerfile builder.

### Method 2: Nixpacks
If you prefer Nixpacks, update `railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS"
  }
}
```
This will use the `nixpacks.toml` configuration.

## What Railway Will Do

1. Build using Docker (or Nixpacks)
2. Install frontend and backend dependencies
3. Build frontend static files
4. Start backend server (which serves both API and frontend)
5. Provide persistent storage for SQLite database

## After Deployment

1. Railway will give you a URL like `https://yourapp.railway.app`
2. Your app will be fully functional with:
   - Frontend at the root URL
   - API at `/api/*` endpoints
   - Persistent SQLite database
   - JWT authentication working

## Common Issues

- **Port Error**: Railway automatically sets PORT environment variable
- **Build Error**: Check deployment logs for specific npm/build errors
- **Database Path**: SQLite file is stored in `/app/backend/data/`

## Database

- SQLite database persists in `/app/backend/data/`
- Data survives deployments and restarts
- No additional database setup needed

## Troubleshooting

If deployment fails:
1. Check Railway logs for specific errors
2. Try switching between Dockerfile and Nixpacks methods
3. Ensure all package.json files are committed
4. Verify environment variables are set correctly 