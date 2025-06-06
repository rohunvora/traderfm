const express = require('express');
const { statements } = require('../utils/database');
const { authenticate } = require('../middleware/auth');
const { validate, handleParamRules } = require('../middleware/validation');

const router = express.Router();

// Get stats for a handle (requires auth)
router.get('/:handle', authenticate, handleParamRules, validate, async (req, res) => {
  try {
    const { handle } = req.params;
    
    // Verify user owns this handle
    if (req.user.handle !== handle) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Get stats
    const stats = await statements.getUserStats.get(req.user.id, req.user.id);
    
    res.json({
      handle,
      totalQuestions: stats.total_questions,
      totalAnswers: stats.total_answers,
      unansweredQuestions: stats.total_questions - stats.total_answers
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 