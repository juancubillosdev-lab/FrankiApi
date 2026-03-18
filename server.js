'use strict';

// Cargar las variables .env antes de que cualquier otro módulo lea process.env
require('dotenv').config();

const { PORT, initDB } = require('./src/config');
const logger = require('./src/logger');
const app = require('./src/app');

// Valida e inicializa el archivo de base de datos antes de aceptar tráfico
initDB();

const server = app.listen(PORT, () => {
  logger.info(`Task Management API  →  http://localhost:${PORT}`);
  logger.info(`Health check         →  http://localhost:${PORT}/health`);
  logger.info(`Tasks API            →  http://localhost:${PORT}/api/v1/tasks`);
});

// ─── Apagado elegante ─────────────────────────────────────────────────────────

function shutdown(signal) {
  logger.info({ signal }, 'Shutting down...');
  server.close(() => {
    logger.info('HTTP server closed. Exiting.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced exit after timeout.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});
