const express = require('express');
const { statements } = require('../utils/database');
const { authenticate } = require('../middleware/auth');
const { body, validationResult, param } = require('express-validator');

const router = express.Router();

// Create a new project
router.post('/', 
  authenticate,
  [
    body('name').notEmpty().trim().withMessage('Project name is required'),
    body('token_symbol').notEmpty().trim().withMessage('Token symbol is required'),
    body('token_address').optional().trim().matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/).withMessage('Invalid Solana address'),
    body('description').optional().trim(),
    body('website').optional().trim().isURL().withMessage('Invalid website URL'),
    body('twitter_handle').optional().trim(),
    body('logo_url').optional().trim().isURL().withMessage('Invalid logo URL')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: errors.array() 
        });
      }

      const { name, token_symbol, token_address, description, website, twitter_handle, logo_url } = req.body;

      const result = await statements.createProject.run({
        name,
        token_symbol,
        token_address,
        description,
        website,
        twitter_handle,
        logo_url,
        created_by: req.user.id
      });

      const project = await statements.getProjectById.get(result.lastInsertRowid);

      global.logger?.log(`📈 Project created: ${name} by user ${req.user.handle}`);

      res.status(201).json({ 
        message: 'Project created successfully',
        project 
      });
    } catch (error) {
      global.logger?.error('❌ Error creating project:', error);
      res.status(500).json({ 
        message: 'Failed to create project',
        error: error.message 
      });
    }
  }
);

// Get projects created by the authenticated user
router.get('/my-projects', authenticate, async (req, res) => {
  try {
    const projects = await statements.getProjectsByUser.all(req.user.id);

    res.json({ 
      projects,
      count: projects.length 
    });
  } catch (error) {
    global.logger?.error('❌ Error fetching user projects:', error);
    res.status(500).json({ 
      message: 'Failed to fetch projects',
      error: error.message 
    });
  }
});

// Get a specific project by ID
router.get('/:id', 
  param('id').isInt().withMessage('Invalid project ID'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: errors.array() 
        });
      }

      const project = await statements.getProjectById.get(req.params.id);

      if (!project) {
        return res.status(404).json({ 
          message: 'Project not found' 
        });
      }

      res.json({ project });
    } catch (error) {
      global.logger?.error('❌ Error fetching project:', error);
      res.status(500).json({ 
        message: 'Failed to fetch project',
        error: error.message 
      });
    }
  }
);

// Get deals for a specific project
router.get('/:id/deals', 
  authenticate,
  param('id').isInt().withMessage('Invalid project ID'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: errors.array() 
        });
      }

      const project = await statements.getProjectById.get(req.params.id);

      if (!project) {
        return res.status(404).json({ 
          message: 'Project not found' 
        });
      }

      // Verify the user owns the project
      if (project.created_by !== req.user.id) {
        return res.status(403).json({ 
          message: 'Access denied' 
        });
      }

      const status = req.query.status || null;
      const deals = await statements.getDealsByProject.all(req.params.id, status);

      res.json({ 
        deals,
        count: deals.length 
      });
    } catch (error) {
      global.logger?.error('❌ Error fetching project deals:', error);
      res.status(500).json({ 
        message: 'Failed to fetch deals',
        error: error.message 
      });
    }
  }
);

module.exports = router; 