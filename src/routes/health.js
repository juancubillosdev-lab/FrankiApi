'use strict';

const { Router } = require('express');

const router = Router();

// GET /health — utilizado por balanceadores de carga
router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
