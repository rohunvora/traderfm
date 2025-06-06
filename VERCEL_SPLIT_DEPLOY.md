# Split Deployment: Vercel + Railway

Since you've already deployed to Vercel, here's how to make it work with a split frontend/backend deployment.

## Step 1: Deploy Backend to Railway

1. **Go to [railway.app](https://railway.app)**
2. **Create new project → Deploy from GitHub**
3. **Select your repository**
4. **Set environment variables:**
   ```
   JWT_SECRET=your-secure-random-string
   NODE_ENV=production
   ```
5. **Note the Railway URL** (e.g., `https://yourapp.railway.app`)

## Step 2: Configure Vercel Frontend

1. **In your Vercel dashboard, go to your project settings**
2. **Add environment variable:**
   ```
   VITE_API_URL = https://your-railway-app.railway.app/api
   ```
   *(Replace with your actual Railway URL)*

3. **Redeploy your Vercel frontend**

## Step 3: Update CORS on Backend

The backend needs to allow requests from your Vercel domain.

Update your environment variable on Railway:
```
FRONTEND_URL=https://your-vercel-app.vercel.app
```

## Alternative: Use Railway for Everything (Simpler)

Instead of split deployment, you can use Railway for both frontend and backend:

1. **Delete the Vercel deployment**
2. **Deploy everything to Railway** (it's already configured)
3. **Set environment variables on Railway:**
   ```
   JWT_SECRET=your-secure-random-string
   NODE_ENV=production
   ```

This is simpler because:
- ✅ One deployment to manage
- ✅ No CORS issues
- ✅ Built-in database persistence
- ✅ Automatic HTTPS

## Current Issue

Your Vercel deployment is trying to call `/api/users/create` but Vercel can't handle the Express backend routes. You need either:

1. **Backend deployed separately** (Railway/Render/Heroku)
2. **Full-stack deployment** (Railway with both frontend and backend)

Choose the approach that works best for you! 