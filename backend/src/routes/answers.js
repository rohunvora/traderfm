const express = require('express');
const { statements } = require('../utils/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validate, handleParamRules, idParamRules } = require('../middleware/validation');

const router = express.Router();

// Helper function to transform snake_case to camelCase
const transformAnswer = (answer) => ({
  id: answer.id,
  questionId: answer.question_id,
  userId: answer.user_id,
  questionText: answer.question_text,
  answerText: answer.answer_text,
  createdAt: answer.created_at,
  updatedAt: answer.updated_at
});

// Get a single answer by ID (public)
router.get('/single/:id', idParamRules, validate, async (req, res) => {
  try {
    const answerId = parseInt(req.params.id);
    
    // Get the answer with user info
    const answer = await statements.getAnswerById.get(answerId);
    
    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }
    
    // Get user info
    const user = await statements.getUserById.get(answer.user_id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Transform and add user info
    const transformedAnswer = transformAnswer(answer);
    transformedAnswer.userHandle = user.handle;
    transformedAnswer.userName = user.twitter_name;
    transformedAnswer.userProfileImage = user.twitter_profile_image;
    transformedAnswer.userAuthType = user.auth_type;
    
    res.json(transformedAnswer);
  } catch (error) {
    console.error('Get single answer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get answers by handle (public)
router.get('/:handle', handleParamRules, validate, async (req, res) => {
  try {
    const { handle } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 per page
    const offset = (page - 1) * limit;
    
    console.log('📖 Getting answers for handle:', handle);
    
    // Get user by handle
    const user = await statements.getUserByHandle.get(handle);
    if (!user) {
      return res.status(404).json({ message: 'Handle not found' });
    }
    
    console.log('👤 Found user:', { id: user.id, handle: user.handle });
    
    // Get answers
    const answers = await statements.getAnswersByUserId.all(user.id, limit, offset);
    const totalCount = await statements.countAnswersByUserId.get(user.id);
    
    console.log('💬 Found answers:', { count: answers.length, total: totalCount.count });
    
    // Transform to camelCase
    const transformedAnswers = answers.map(transformAnswer);
    
    res.json({
      answers: transformedAnswers,
      total: totalCount.count,
      page,
      pages: Math.ceil(totalCount.count / limit)
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
    const result = await statements.deleteAnswer.run(answerId, req.user.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Answer not found or unauthorized' });
    }
    
    res.json({ message: 'Answer deleted successfully' });
  } catch (error) {
    console.error('Delete answer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Edit an answer (requires auth)
router.put('/:id', authenticate, idParamRules, validate, async (req, res) => {
  try {
    const answerId = parseInt(req.params.id);
    const { answerText } = req.body;
    
    // Validate answer text
    if (!answerText || answerText.trim().length === 0) {
      return res.status(400).json({ message: 'Answer text is required' });
    }
    
    if (answerText.length > 1000) {
      return res.status(400).json({ message: 'Answer must be less than 1000 characters' });
    }
    
    // Update answer (only if user owns it)
    const result = await statements.updateAnswer.run(answerText.trim(), answerId, req.user.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Answer not found or unauthorized' });
    }
    
    res.json({ message: 'Answer updated successfully' });
  } catch (error) {
    console.error('Update answer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 