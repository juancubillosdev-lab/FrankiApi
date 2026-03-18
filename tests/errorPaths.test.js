'use strict';

const express = require('express');
const request = require('supertest');

const BASE = '/api/v1/tasks';

jest.mock('../src/services/tasksService', () => ({
  getAll: jest.fn().mockRejectedValue(new Error('DB exploded')),
  create: jest.fn().mockRejectedValue(new Error('DB exploded')),
  update: jest.fn().mockRejectedValue(new Error('DB exploded')),
  remove: jest.fn().mockRejectedValue(new Error('DB exploded')),
}));

const app = require('../src/app');

// ─── Bloques catch del controlador ────────────────────────────────────────────

describe('Controller error paths — service throws unexpectedly', () => {
  it('GET returns 500', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });

  it('POST returns 500', async () => {
    const res = await request(app).post(BASE).send({ title: 'T' });
    expect(res.status).toBe(500);
  });

  it('PUT returns 500', async () => {
    const res = await request(app).put(`${BASE}/some-id`).send({ title: 'T' });
    expect(res.status).toBe(500);
  });

  it('DELETE returns 500', async () => {
    const res = await request(app).delete(`${BASE}/some-id`);
    expect(res.status).toBe(500);
  });
});

// ─── Bandera expose del errorHandler ─────────────────────────────────────────

describe('errorHandler middleware', () => {
  const errorHandler = require('../src/middleware/errorHandler');

  it('exposes the message when err.expose = true', async () => {
    const mini = express();
    mini.get('/test', (_req, _res, next) => {
      next(Object.assign(new Error('Forbidden'), { status: 403, expose: true }));
    });
    mini.use(errorHandler);

    const res = await request(mini).get('/test');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('hides internal details when expose is falsy', async () => {
    const mini = express();
    mini.get('/test', (_req, _res, next) => next(new Error('secret')));
    mini.use(errorHandler);

    const res = await request(mini).get('/test');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});
