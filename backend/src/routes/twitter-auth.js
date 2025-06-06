const express = require('express');
const passport = require('passport');
const TwitterStrategy = require('passport-twitter').Strategy;
const { statements } = require('../utils/database');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// Configure Twitter OAuth strategy (OAuth 1.0a)
passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_API_KEY,
  consumerSecret: process.env.TWITTER_API_SECRET,
  callbackURL: process.env.TWITTER_CALLBACK_URL || `${process.env.BASE_URL}/api/auth/twitter/callback`
}, async (token, tokenSecret, profile, done) => {
  try {
    global.logger?.log('🐦 Twitter OAuth callback received');
    global.logger?.log(`👤 Twitter profile: ${JSON.stringify(profile, null, 2)}`);
    
    const twitterId = profile.id;
    const twitterUsername = profile.username;
    const twitterName = profile.displayName;
    const profileImage = profile.photos?.[0]?.value || null;
    
    // Check if user already exists with this Twitter ID
    let user;
    try {
      user = await statements.getUserByTwitterId.get(twitterId);
    } catch (error) {
      global.logger?.error('❌ Error checking for existing Twitter user:', error);
      // If the error is about missing column, the migration hasn't run yet
      if (error.message?.includes('no such column')) {
        return done(new Error('Database migration required. Please restart the application.'), null);
      }
      throw error;
    }
    
    if (user) {
      global.logger?.log(`✅ Existing Twitter user found: ${user.handle}`);
      return done(null, user);
    }
    
    // Check if handle (same as Twitter username) already exists
    const existingUser = await statements.getUserByHandle.get(twitterUsername);
    let finalHandle = twitterUsername;
    
    if (existingUser) {
      // Generate a unique handle by appending timestamp
      finalHandle = `${twitterUsername}_${Date.now()}`;
      global.logger?.log(`📝 Handle collision, using: ${finalHandle}`);
    }
    
    // Create new user
    const result = await statements.createTwitterUser.run({
      handle: finalHandle,
      twitter_id: twitterId,
      twitter_username: twitterUsername,
      twitter_name: twitterName,
      twitter_profile_image: profileImage
    });
    
    user = {
      id: result.lastInsertRowid,
      handle: finalHandle,
      twitter_id: twitterId,
      twitter_username: twitterUsername,
      twitter_name: twitterName,
      twitter_profile_image: profileImage,
      auth_type: 'twitter'
    };
    
    global.logger?.log(`🎉 New Twitter user created: ${finalHandle}`);
    return done(null, user);
    
  } catch (error) {
    global.logger?.error('❌ Twitter OAuth error:', error);
    return done(error, null);
  }
}));

// Session serialization for Twitter OAuth 1.0a
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await statements.getUserById.get(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Start Twitter OAuth flow
router.get('/twitter', passport.authenticate('twitter'));

// Twitter OAuth callback
router.get('/twitter/callback', passport.authenticate('twitter', {
  failureRedirect: process.env.NODE_ENV === 'production' 
    ? '/?error=twitter_auth_failed'
    : `${process.env.FRONTEND_URL || 'http://localhost:3000'}?error=twitter_auth_failed`
}), (req, res) => {
  try {
    // Generate JWT token
    const token = generateToken(req.user.id, req.user.handle);
    
    // Redirect to frontend with token
    // In production on Railway, the frontend and backend are on the same domain
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? '' // Use relative URL in production
      : (process.env.FRONTEND_URL || 'http://localhost:3000');
    
    const redirectUrl = new URL(baseUrl || `${req.protocol}://${req.get('host')}`);
    redirectUrl.searchParams.set('token', token);
    redirectUrl.searchParams.set('handle', req.user.handle);
    redirectUrl.searchParams.set('auth_type', 'twitter');
    
    global.logger?.log(`🔄 Redirecting to: ${redirectUrl.toString()}`);
    
    // Clear session after successful authentication (we only need it for OAuth flow)
    req.logout((err) => {
      if (err) {
        global.logger?.error('❌ Session logout error:', err);
      }
      res.redirect(redirectUrl.toString());
    });
  } catch (error) {
    global.logger?.error('❌ Twitter callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?error=token_generation_failed`);
  }
});

module.exports = router; 