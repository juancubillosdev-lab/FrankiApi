'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');

const logger = require('./logger');
const requestId = require('./middleware/requestId');
const notFoundHandler = require('./middleware/notFoundHandler');
const errorHandler = require('./middleware/errorHandler');
const tasksRouter = require('./routes/tasks');
const healthRouter = require('./routes/health');

const app = express();

// ─── Seguridad ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-Request-Id'],
  }),
);

// ─── Limitación de velocidad ──────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  limit: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: 'draft-6', // Encabezados RateLimit-* (estándar RFC)
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ─── Correlación de solicitudes ───────────────────────────────────────────────
app.use(requestId);

// ─── Registro de solicitudes ──────────────────────────────────────────────────
app.use(pinoHttp({ logger, genReqId: (req) => req.id }));

// ─── Análisis del cuerpo (límite de 10 kb para prevenir DoS basado en payload) ─
app.use(express.json({ limit: '10kb' }));

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/health', healthRouter);      // infraestructura — sin versionar
app.use('/api/v1/tasks', tasksRouter); // API v1

// ─── Manejo de errores (debe ir al final) ─────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
