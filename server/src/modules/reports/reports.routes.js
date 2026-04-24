const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const svc = require('./reports.service');

const router = Router();

/**
 * GET /api/reports
 * Returns all report datasets in a single request to minimise round-trips.
 * Query params:
 *   days   {number} — lookback window for activities chart (default 30)
 *   months {number} — lookback window for contact growth (default 6)
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const days   = Math.min(parseInt(req.query.days   ?? 30, 10), 90);
    const months = Math.min(parseInt(req.query.months ?? 6,  10), 12);

    // Run sequentially to avoid exhausting Supabase's session-mode connection pool
    const pipeline   = await svc.pipelineRevenue(req.user.id);
    const activities = await svc.activitiesOverTime(req.user.id, days);
    const funnel     = await svc.conversionFunnel(req.user.id);
    const growth     = await svc.contactGrowth(req.user.id, months);
    const kpis       = await svc.summary(req.user.id);

    res.json({ pipeline, activities, funnel, growth, kpis, meta: { days, months } });
  } catch (err) { next(err); }
});

module.exports = router;
