const { Router } = require('express');
const { z }      = require('zod');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validate }     = require('../../middlewares/validate.middleware');
const { createError }  = require('../../middlewares/error.middleware');
const svc              = require('./contacts.service');

const router = Router();

// ── Validation schemas ────────────────────────────────────────────────────────

const StatusEnum = z.enum(['LEAD', 'ACTIVE', 'INACTIVE']);

const CreateSchema = z.object({
  name:    z.string().min(2).max(100),
  email:   z.string().email().optional().or(z.literal('')),
  phone:   z.string().max(30).optional().or(z.literal('')),
  company: z.string().max(100).optional().or(z.literal('')),
  status:  StatusEnum.default('LEAD'),
  notes:   z.string().max(1000).optional().or(z.literal('')),
});

const UpdateSchema = CreateSchema.partial();

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET /api/contacts?page=1&limit=12&search=&status= */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, limit, search, status } = req.query;
    const result = await svc.list(req.user.id, {
      page:   page   ? parseInt(page,   10) : 1,
      limit:  limit  ? parseInt(limit,  10) : 12,
      search: search  ? String(search)  : '',
      status: status  ? String(status)  : '',
    });
    res.json(result);
  } catch (err) { next(err); }
});

/** GET /api/contacts/:id */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const contact = await svc.findById(req.user.id, parseInt(req.params.id, 10));
    if (!contact) return next(createError(404, 'Contact not found'));
    res.json(contact);
  } catch (err) { next(err); }
});

/** POST /api/contacts */
router.post('/', authenticate, validate(CreateSchema), async (req, res, next) => {
  try {
    // Normalise empty strings to null for optional fields
    const clean = Object.fromEntries(
      Object.entries(req.body).map(([k, v]) => [k, v === '' ? null : v])
    );
    const contact = await svc.create(req.user.id, clean);
    res.status(201).json(contact);
  } catch (err) { next(err); }
});

/** PUT /api/contacts/:id */
router.put('/:id', authenticate, validate(UpdateSchema), async (req, res, next) => {
  try {
    const clean = Object.fromEntries(
      Object.entries(req.body).map(([k, v]) => [k, v === '' ? null : v])
    );
    const contact = await svc.update(req.user.id, parseInt(req.params.id, 10), clean);
    if (!contact) return next(createError(404, 'Contact not found'));
    res.json(contact);
  } catch (err) { next(err); }
});

/** DELETE /api/contacts/:id */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const contact = await svc.remove(req.user.id, parseInt(req.params.id, 10));
    if (!contact) return next(createError(404, 'Contact not found'));
    res.json({ message: 'Contact deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
