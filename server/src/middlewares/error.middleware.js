/**
 * Centralized error handler — must be registered LAST in Express.
 * Handles Zod validation errors and generic HTTP errors.
 */
const errorHandler = (err, req, res, next) => {
  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(422).json({
      message: 'Validation error',
      errors: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  const status = err.status || 500;
  if (status === 500) console.error('[ERROR]', err);

  res.status(status).json({ message: err.message || 'Internal server error' });
};

/**
 * Factory for creating HTTP errors with a status code.
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 */
const createError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

module.exports = { errorHandler, createError };
