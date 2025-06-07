const { body, param, validationResult } = require('express-validator');

// Custom validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errors.array() 
    });
  }
  next();
};

// Handle validation rules
const handleRules = [
  body('handle')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Handle must be between 3 and 20 characters')
    .matches(/^[a-z0-9]+$/)
    .withMessage('Handle can only contain lowercase letters and numbers')
    .custom((value) => {
      if (/^\d+$/.test(value)) {
        throw new Error('Handle cannot be only numbers');
      }
      return true;
    })
    .custom((value) => {
      const reserved = ['api', 'admin', 'inbox', 'login', 'signup', 'about', 'help', 'support'];
      if (reserved.includes(value.toLowerCase())) {
        throw new Error('This handle is reserved');
      }
      return true;
    })
];

// Question validation rules
const questionRules = [
  body('text')
    .trim()
    .isLength({ min: 5, max: 280 })
    .withMessage('Question must be between 5 and 280 characters')
    .custom((value) => {
      // Check if it's just repeated characters
      if (/^(.)\1+$/.test(value)) {
        throw new Error('Please ask a real question');
      }
      return true;
    })
    .custom((value) => {
      // Check if it contains actual text
      if (!/[a-zA-Z0-9]/.test(value)) {
        throw new Error('Question must contain some text');
      }
      return true;
    })
];

// Answer validation rules
const answerRules = [
  body('answerText')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Answer must be between 1 and 1000 characters')
];

// Auth validation rules
const authRules = [
  body('handle')
    .trim()
    .notEmpty()
    .withMessage('Handle is required'),
  body('secretKey')
    .trim()
    .notEmpty()
    .withMessage('Secret key is required')
];

// Parameter validation
const handleParamRules = [
  param('handle')
    .matches(/^[a-z0-9]+$/)
    .withMessage('Invalid handle format')
];

const idParamRules = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid ID')
];

module.exports = {
  validate,
  handleRules,
  questionRules,
  answerRules,
  authRules,
  handleParamRules,
  idParamRules
}; 