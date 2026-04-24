const { Router } = require('express');
const { z }      = require('zod');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validate }     = require('../../middlewares/validate.middleware');
const { createError }  = require('../../middlewares/error.middleware');
const svc              = require('./activities.service');

const router = Router();

// ── Validation schemas ────────────────────────────────────────────────────────

const TypeEnum = z.enum(['CALL', 'EMAIL', 'MEETING', 'NOTE']);

const CreateSchema = z.object({
  contactId:     z.number().int().positive(),
  opportunityId: z.number().int().positive().optional().nullable(),
  type:          TypeEnum,
  description:   z.string().min(1).max(2000),
  activityDate:  z.string().datetime({ offset: true }).or(z.string().min(1)),
});

const UpdateSchema = CreateSchema.partial();

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET /api/activities */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { type, contactId, opportunityId, page, limit } = req.query;
    const filters = {
      type:          type        || undefined,
      contactId:     contactId   ? parseInt(contactId, 10)     : undefined,
      opportunityId: opportunityId ? parseInt(opportunityId, 10) : undefined,
      page:          page        ? parseInt(page, 10)          : 1,
      limit:         limit       ? parseInt(limit, 10)         : 30,
    };
    const result = await svc.list(req.user.id, filters);
    res.json(result);
  } catch (err) { next(err); }
});

/** GET /api/activities/:id */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const act = await svc.findById(req.user.id, parseInt(req.params.id, 10));
    if (!act) return next(createError(404, 'Activity not found'));
    res.json(act);
  } catch (err) { next(err); }
});

/** POST /api/activities */
router.post('/', authenticate, validate(CreateSchema), async (req, res, next) => {
  try {
    const act = await svc.create(req.user.id, req.body);
    res.status(201).json(act);
  } catch (err) { next(err); }
});

/** PUT /api/activities/:id */
router.put('/:id', authenticate, validate(UpdateSchema), async (req, res, next) => {
  try {
    const act = await svc.update(req.user.id, parseInt(req.params.id, 10), req.body);
    if (!act) return next(createError(404, 'Activity not found'));
    res.json(act);
  } catch (err) { next(err); }
});

/** DELETE /api/activities/:id */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const act = await svc.remove(req.user.id, parseInt(req.params.id, 10));
    if (!act) return next(createError(404, 'Activity not found'));
    res.json({ message: 'Activity deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
