const express = require('express');
const { statements } = require('../utils/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validate, handleParamRules, idParamRules } = require('../middleware/validation');

const router = express.Router();

// Get answers by handle (public)
router.get('/:handle', handleParamRules, validate, async (req, res) => {
  try {
    const { handle } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 per page
    const offset = (page - 1) * limit;
    
    // Get user by handle
    const user = statements.getUserByHandle.get(handle);
    if (!user) {
      return res.status(404).json({ message: 'Handle not found' });
    }
    
    // Get answers
    const answers = statements.getAnswersByUserId.all(user.id, limit, offset);
    const totalCount = statements.countAnswersByUserId.get(user.id).count;
    
    res.json({
      answers,
      total: totalCount,
      page,
      pages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('Get answers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an answer (requires auth)
router.delete('/:id', authenticate, idParamRules, validate, async (req, res) => {
  try {
    const answerId = parseInt(req.params.id);
    
    // Delete answer (only if user owns it)
    const result = statements.deleteAnswer.run(answerId, req.user.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Answer not found or unauthorized' });
    }
    
    res.json({ message: 'Answer deleted successfully' });
  } catch (error) {
    console.error('Delete answer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 