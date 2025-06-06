const jwt = require('jsonwebtoken');
const { statements } = require('../utils/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

// Generate JWT token
const generateToken = (userId, handle) => {
  return jwt.sign(
    { userId, handle },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Verify JWT token middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get user from database
      const user = await statements.getUserById.get(decoded.userId);
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Attach user to request
      req.user = {
        id: user.id,
        handle: user.handle
      };
      
      next();
    } catch (jwtError) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await statements.getUserById.get(decoded.userId);
        
        if (user) {
          req.user = {
            id: user.id,
            handle: user.handle
          };
        }
      } catch (jwtError) {
        // Ignore invalid tokens for optional auth
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next();
  }
};

module.exports = {
  generateToken,
  authenticate,
  optionalAuth
}; 