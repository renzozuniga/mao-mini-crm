const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { getSummary }   = require('./dashboard.service');

const router = Router();

/**
 * GET /api/dashboard/summary
 * Returns KPIs, pipeline breakdown and recent activities for the logged-in user.
 */
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const data = await getSummary(req.user.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
