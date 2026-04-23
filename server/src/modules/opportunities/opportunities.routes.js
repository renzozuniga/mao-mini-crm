const { Router } = require('express');
const { z }      = require('zod');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validate }     = require('../../middlewares/validate.middleware');
const { createError }  = require('../../middlewares/error.middleware');
const svc              = require('./opportunities.service');

const router = Router();

// ── Validation schemas ────────────────────────────────────────────────────────

const StageEnum = z.enum([
  'LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST',
]);

const CreateSchema = z.object({
  contactId:         z.number().int().positive(),
  title:             z.string().min(2).max(200),
  value:             z.number().positive(),
  stage:             StageEnum.default('LEAD'),
  probability:       z.number().int().min(0).max(100).default(10),
  expectedCloseDate: z.string().optional().nullable(),
});

const UpdateSchema = CreateSchema.partial();

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET /api/opportunities */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const opps = await svc.list(req.user.id);
    res.json(opps);
  } catch (err) { next(err); }
});

/** GET /api/opportunities/:id */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const opp = await svc.findById(req.user.id, parseInt(req.params.id, 10));
    if (!opp) return next(createError(404, 'Opportunity not found'));
    res.json(opp);
  } catch (err) { next(err); }
});

/** POST /api/opportunities */
router.post('/', authenticate, validate(CreateSchema), async (req, res, next) => {
  try {
    const opp = await svc.create(req.user.id, req.body);
    res.status(201).json(opp);
  } catch (err) { next(err); }
});

/** PUT /api/opportunities/:id */
router.put('/:id', authenticate, validate(UpdateSchema), async (req, res, next) => {
  try {
    const opp = await svc.update(req.user.id, parseInt(req.params.id, 10), req.body);
    if (!opp) return next(createError(404, 'Opportunity not found'));
    res.json(opp);
  } catch (err) { next(err); }
});

/** DELETE /api/opportunities/:id */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const opp = await svc.remove(req.user.id, parseInt(req.params.id, 10));
    if (!opp) return next(createError(404, 'Opportunity not found'));
    res.json({ message: 'Opportunity deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
