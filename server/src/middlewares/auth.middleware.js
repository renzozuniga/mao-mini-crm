const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config');

/**
 * Express middleware that validates the Bearer JWT in the Authorization header.
 * Attaches decoded payload to req.user on success.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, jwtConfig.secret);
    if (payload.type !== 'access') {
      return res.status(401).json({ message: 'Invalid token type' });
    }
    req.user = payload; // { sub: userId, type: 'access', iat, exp }
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { authenticate };
