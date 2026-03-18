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

// ─── Validadores directos ─────────────────────────────────────────────────────

describe('taskValidator – validateCreate', () => {
  const { validateCreate, validateUpdate, validatePagination } = require('../src/validators/taskValidator');

  it('returns error when title is missing', () => {
    const { error } = validateCreate({});
    expect(error).toBeDefined();
    expect(error.some((m) => m.includes('title') || m.includes('required'))).toBe(true);
  });

  it('returns value when payload is valid', () => {
    const { value } = validateCreate({ title: 'Valid' });
    expect(value.title).toBe('Valid');
    expect(value.status).toBe('pending');
  });

  it('trims title before returning value', () => {
    const { value } = validateCreate({ title: '  Spaces  ' });
    expect(value.title).toBe('Spaces');
  });

  it('returns error for unknown fields', () => {
    const { error } = validateCreate({ title: 'T', ghost: true });
    expect(error).toBeDefined();
  });

  it('returns all errors at once (abortEarly: false)', () => {
    const { error } = validateCreate({ title: '', extra: true });
    expect(error.length).toBeGreaterThan(1);
  });
});

describe('taskValidator – validateUpdate', () => {
  const { validateUpdate } = require('../src/validators/taskValidator');

  it('returns error when body is empty', () => {
    const { error } = validateUpdate({});
    expect(error).toBeDefined();
  });

  it('accepts partial update with only status', () => {
    const { value } = validateUpdate({ status: 'progress' });
    expect(value.status).toBe('progress');
  });

  it('returns error for invalid status value', () => {
    const { error } = validateUpdate({ status: 'flying' });
    expect(error).toBeDefined();
  });
});

describe('taskValidator – validatePagination', () => {
  const { validatePagination } = require('../src/validators/taskValidator');

  it('defaults page to 1 and limit to 20', () => {
    const { value } = validatePagination({});
    expect(value.page).toBe(1);
    expect(value.limit).toBe(20);
  });

  it('returns error for page = 0', () => {
    const { error } = validatePagination({ page: 0 });
    expect(error).toBeDefined();
  });

  it('returns error for limit > 100', () => {
    const { error } = validatePagination({ limit: 101 });
    expect(error).toBeDefined();
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
