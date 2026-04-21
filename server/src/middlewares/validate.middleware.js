/**
 * Express middleware factory that validates req.body against a Zod schema.
 * Calls next(err) with a ZodError on failure so errorHandler can respond.
 * @param {import('zod').ZodSchema} schema
 */
const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { validate };
