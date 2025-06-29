const express = require('express');
const { statements } = require('../utils/database');
const { authenticate } = require('../middleware/auth');
const { body, validationResult, param } = require('express-validator');

const router = express.Router();

// Create a new deal/offer
router.post('/', 
  authenticate,
  [
    body('project_id').isInt().withMessage('Valid project ID is required'),
    body('kol_handle').optional().trim(),
    body('token_amount').notEmpty().trim().withMessage('Token amount is required'),
    body('vesting_schedule').notEmpty().trim().withMessage('Vesting schedule is required'),
    body('cliff_days').isInt({ min: 0 }).withMessage('Cliff days must be a non-negative integer'),
    body('total_vesting_days').isInt({ min: 1 }).withMessage('Total vesting days must be at least 1'),
    body('deliverables').optional().trim(),
    body('offer_expires_days').optional().isInt({ min: 1 }).withMessage('Offer expiry must be at least 1 day')
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

      const { 
        project_id, 
        kol_handle, 
        token_amount, 
        vesting_schedule, 
        cliff_days, 
        total_vesting_days, 
        deliverables,
        offer_expires_days = 30 
      } = req.body;

      // Verify the project exists and belongs to the user
      const project = await statements.getProjectById.get(project_id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      if (project.created_by !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // If KOL handle is provided, find the KOL user
      let kolUserId = null;
      if (kol_handle) {
        const kolUser = await statements.getUserByHandle.get(kol_handle);
        if (!kolUser) {
          return res.status(404).json({ message: 'KOL not found' });
        }
        kolUserId = kolUser.id;
      }

      // Calculate offer expiry date
      const offerExpiresAt = new Date();
      offerExpiresAt.setDate(offerExpiresAt.getDate() + offer_expires_days);

      const result = await statements.createDeal.run({
        project_id,
        kol_user_id: kolUserId,
        token_amount,
        vesting_schedule,
        cliff_days,
        total_vesting_days,
        deliverables,
        offer_expires_at: offerExpiresAt.toISOString()
      });

      const deal = await statements.getDealById.get(result.lastInsertRowid);

      global.logger?.log(`💰 Deal created: ${project.name} - ${token_amount} tokens`);

      res.status(201).json({ 
        message: 'Deal created successfully',
        deal 
      });
    } catch (error) {
      global.logger?.error('❌ Error creating deal:', error);
      res.status(500).json({ 
        message: 'Failed to create deal',
        error: error.message 
      });
    }
  }
);

// Get deals for the authenticated KOL
router.get('/my-deals', authenticate, async (req, res) => {
  try {
    const status = req.query.status || null;
    const deals = await statements.getDealsByKOL.all(req.user.id, status);

    res.json({ 
      deals,
      count: deals.length,
      is_kol: req.user.is_kol === 1
    });
  } catch (error) {
    global.logger?.error('❌ Error fetching KOL deals:', error);
    res.status(500).json({ 
      message: 'Failed to fetch deals',
      error: error.message 
    });
  }
});

// Accept a deal
router.post('/:id/accept', 
  authenticate,
  param('id').isInt().withMessage('Invalid deal ID'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: errors.array() 
        });
      }

      const deal = await statements.getDealById.get(req.params.id);

      if (!deal) {
        return res.status(404).json({ message: 'Deal not found' });
      }

      // Verify the deal is for the authenticated user
      if (deal.kol_user_id !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Check if deal is still pending
      if (deal.status !== 'pending') {
        return res.status(400).json({ 
          message: `Deal is already ${deal.status}` 
        });
      }

      // Check if offer has expired
      if (deal.offer_expires_at && new Date(deal.offer_expires_at) < new Date()) {
        return res.status(400).json({ 
          message: 'Offer has expired' 
        });
      }

      // Update deal status to accepted
      await statements.updateDealStatus.run({
        deal_id: req.params.id,
        status: 'accepted'
      });

      const updatedDeal = await statements.getDealById.get(req.params.id);

      global.logger?.log(`✅ Deal accepted: ${req.user.handle} - ${deal.project_name}`);

      res.json({ 
        message: 'Deal accepted successfully',
        deal: updatedDeal 
      });
    } catch (error) {
      global.logger?.error('❌ Error accepting deal:', error);
      res.status(500).json({ 
        message: 'Failed to accept deal',
        error: error.message 
      });
    }
  }
);

// Reject a deal
router.post('/:id/reject', 
  authenticate,
  param('id').isInt().withMessage('Invalid deal ID'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: errors.array() 
        });
      }

      const deal = await statements.getDealById.get(req.params.id);

      if (!deal) {
        return res.status(404).json({ message: 'Deal not found' });
      }

      // Verify the deal is for the authenticated user
      if (deal.kol_user_id !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Check if deal is still pending
      if (deal.status !== 'pending') {
        return res.status(400).json({ 
          message: `Deal is already ${deal.status}` 
        });
      }

      // Update deal status to rejected
      await statements.updateDealStatus.run({
        deal_id: req.params.id,
        status: 'rejected'
      });

      global.logger?.log(`❌ Deal rejected: ${req.user.handle} - ${deal.project_name}`);

      res.json({ 
        message: 'Deal rejected successfully' 
      });
    } catch (error) {
      global.logger?.error('❌ Error rejecting deal:', error);
      res.status(500).json({ 
        message: 'Failed to reject deal',
        error: error.message 
      });
    }
  }
);

// Get a specific deal by ID
router.get('/:id', 
  param('id').isInt().withMessage('Invalid deal ID'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: errors.array() 
        });
      }

      const deal = await statements.getDealById.get(req.params.id);

      if (!deal) {
        return res.status(404).json({ 
          message: 'Deal not found' 
        });
      }

      res.json({ deal });
    } catch (error) {
      global.logger?.error('❌ Error fetching deal:', error);
      res.status(500).json({ 
        message: 'Failed to fetch deal',
        error: error.message 
      });
    }
  }
);

// Get live deals feed (accepted deals)
router.get('/feed/live', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const deals = await statements.getLiveDeals.all(Math.min(limit, 50));

    res.json({ 
      deals,
      count: deals.length 
    });
  } catch (error) {
    global.logger?.error('❌ Error fetching live deals:', error);
    res.status(500).json({ 
      message: 'Failed to fetch live deals',
      error: error.message 
      });
  }
});

module.exports = router; 