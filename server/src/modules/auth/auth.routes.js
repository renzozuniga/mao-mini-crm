const { Router } = require('express');
const { z } = require('zod');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const ctrl = require('./auth.controller');

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  email:    z.string().email().optional(),
}).refine(d => d.fullName || d.email, { message: 'Provide at least one field to update' });

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8, 'New password must be at least 8 characters'),
});

router.post('/register', validate(registerSchema),       ctrl.register);
router.post('/login',    validate(loginSchema),          ctrl.login);
router.post('/refresh',  validate(refreshSchema),        ctrl.refresh);
router.get('/me',        authenticate,                   ctrl.me);
router.patch('/profile', authenticate, validate(updateProfileSchema),  ctrl.updateProfile);
router.patch('/password',authenticate, validate(changePasswordSchema), ctrl.changePassword);

module.exports = router;
