const express = require('express');
const { statements, db } = require('../utils/database');
const { authenticate } = require('../middleware/auth');
const { validate, questionRules, answerRules, handleParamRules, idParamRules } = require('../middleware/validation');

const router = express.Router();

// Helper function to transform snake_case to camelCase
const transformQuestion = (question) => ({
  id: question.id,
  userId: question.user_id,
  text: question.text,
  ipAddress: question.ip_address,
  createdAt: question.created_at
});

// Ask a question (anonymous)
router.post('/:handle', handleParamRules, questionRules, validate, async (req, res) => {
  try {
    const { handle } = req.params;
    const { text } = req.body;
    
    // Get user by handle
    const user = await statements.getUserByHandle.get(handle);
    if (!user) {
      return res.status(404).json({ message: 'Handle not found' });
    }
    
    // Get IP address for rate limiting
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // Create question
    const result = await statements.createQuestion.run({
      user_id: user.id,
      text: text.trim(),
      ip_address: ipAddress
    });
    
    res.status(201).json({
      message: 'Question sent successfully',
      questionId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Ask question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unanswered questions for a handle (requires auth)
router.get('/:handle/unanswered', authenticate, handleParamRules, validate, async (req, res) => {
  try {
    const { handle } = req.params;
    
    // Verify user owns this handle
    if (req.user.handle !== handle) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Get unanswered questions
    const questions = await statements.getUnansweredQuestions.all(req.user.id);
    
    // Transform to camelCase
    const transformedQuestions = questions.map(transformQuestion);
    
    res.json(transformedQuestions);
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Answer a question (requires auth)
router.post('/:id/answer', authenticate, idParamRules, answerRules, validate, async (req, res) => {
  const transaction = db.transaction(async () => {
    try {
      const questionId = parseInt(req.params.id);
      const { answerText } = req.body;
      
      // Get question
      const question = await statements.getQuestionById.get(questionId);
      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }
      
      // Verify user owns this question
      if (question.user_id !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      // Create answer
      const result = await statements.createAnswer.run({
        question_id: questionId,
        user_id: req.user.id,
        question_text: question.text,
        answer_text: answerText.trim()
      });
      
      // Delete the question (it's been answered)
      await statements.deleteQuestion.run(questionId);
      
      res.status(201).json({
        message: 'Answer posted successfully',
        answerId: result.lastInsertRowid
      });
    } catch (error) {
      console.error('Answer question error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  await transaction();
});

// Delete a question (requires auth)
router.delete('/:id', authenticate, idParamRules, validate, async (req, res) => {
  try {
    const questionId = parseInt(req.params.id);
    
    // Get question
    const question = await statements.getQuestionById.get(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    // Verify user owns this question
    if (question.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Delete question
    await statements.deleteQuestion.run(questionId);
    
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 