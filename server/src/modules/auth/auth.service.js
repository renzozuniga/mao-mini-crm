const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { jwt: jwtConfig } = require('../../config');
const { createError } = require('../../middlewares/error.middleware');

const prisma = new PrismaClient();

/** Selected fields returned in every user response (never expose passwordHash). */
const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  createdAt: true,
};

/**
 * Create a pair of signed JWT tokens for a given userId.
 * @param {number} userId
 * @returns {{ access: string, refresh: string }}
 */
const createTokens = (userId) => ({
  access: jwt.sign(
    { sub: userId, type: 'access' },
    jwtConfig.secret,
    { expiresIn: jwtConfig.accessExpiry }
  ),
  refresh: jwt.sign(
    { sub: userId, type: 'refresh' },
    jwtConfig.secret,
    { expiresIn: jwtConfig.refreshExpiry }
  ),
});

/**
 * Register a new user.
 * @param {{ email: string, password: string, fullName: string }} data
 */
const register = async ({ email, password, fullName }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw createError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, fullName },
    select: USER_SELECT,
  });

  return { user, ...createTokens(user.id) };
};

/**
 * Authenticate a user with email + password.
 * @param {{ email: string, password: string }} data
 */
const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw createError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw createError(401, 'Invalid credentials');

  const { passwordHash, ...safeUser } = user;
  return { user: safeUser, ...createTokens(user.id) };
};

/**
 * Exchange a valid refresh token for a new access token.
 * @param {string} refreshToken
 * @returns {{ access: string }}
 */
const refresh = async (refreshToken) => {
  try {
    const payload = jwt.verify(refreshToken, jwtConfig.secret);
    if (payload.type !== 'refresh') throw new Error();

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new Error();

    const access = jwt.sign(
      { sub: user.id, type: 'access' },
      jwtConfig.secret,
      { expiresIn: jwtConfig.accessExpiry }
    );
    return { access };
  } catch {
    throw createError(401, 'Invalid or expired refresh token');
  }
};

/**
 * Return the authenticated user's profile.
 * @param {number} userId
 */
const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SELECT,
  });
  if (!user) throw createError(404, 'User not found');
  return user;
};

module.exports = { register, login, refresh, getProfile };
