'use strict';

const logger = require('../logger');

/**
 * Manejador de errores centralizado de Express.
 */

function errorHandler(err, req, res, _next) {
  logger.error({ err, method: req.method, url: req.url }, 'Unhandled error');
  res.status(err.status || 500).json({
    error: err.expose ? err.message : 'Internal server error',
  });
}

module.exports = errorHandler;
