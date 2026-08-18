const { validationResult } = require('express-validator');
const { failed } = require('../utils/response');

/**
 * Runs an array of express-validator chains, then short-circuits with a
 * FAILED response (400) if any of them failed. Put this after the chains
 * in the route definition: router.post('/x', [chain1, chain2], validate, handler)
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((e) => e.msg)
      .join(', ');
    return failed(res, message, 400);
  }
  next();
}

module.exports = validate;
