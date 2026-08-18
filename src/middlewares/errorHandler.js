const logger = require('../utils/logger');
const { failed } = require('../utils/response');

/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  logger.error(err.message, { stack: err.stack, path: req.path });

  if (err.name === 'SequelizeUniqueConstraintError') {
    return failed(res, 'Phone Number already registered', 400);
  }

  if (err.name === 'SequelizeValidationError') {
    return failed(res, err.errors.map((e) => e.message).join(', '), 400);
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  return failed(res, message, statusCode);
}

function notFoundHandler(req, res) {
  return failed(res, 'Route not found', 404);
}

module.exports = { errorHandler, notFoundHandler };
