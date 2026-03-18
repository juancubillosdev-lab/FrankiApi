'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const request = require('supertest');

const BASE = '/api/v1/tasks';

let tmpDb;
let app;

beforeEach(() => {
  tmpDb = path.join(os.tmpdir(), `tasks_int_${Date.now()}.json`);
  fs.writeFileSync(tmpDb, JSON.stringify({ tasks: [] }), 'utf-8');
  process.env.DB_PATH = tmpDb;
  jest.resetModules();
  app = require('../src/app');
});

afterEach(() => {
  if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
  delete process.env.DB_PATH;
});

// ─── Verificación de salud ────────────────────────────────────────────────────

describe('GET /health', () => {
  it('200 – returns status ok with uptime and timestamp', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.timestamp).toBeDefined();
  });
});

// ─── Encabezados de seguridad (helmet + CORS) ────────────────────────────────

describe('Security headers', () => {
  it('sets X-Content-Type-Options (helmet)', async () => {
    const res = await request(app).get(BASE);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options (helmet)', async () => {
    const res = await request(app).get(BASE);
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('sets Access-Control-Allow-Origin (cors)', async () => {
    const res = await request(app).get(BASE);
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });
});

// ─── ID de solicitud ──────────────────────────────────────────────────────────

describe('X-Request-Id header', () => {
  it('response includes a generated X-Request-Id', async () => {
    const res = await request(app).get(BASE);
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('honours a client-provided X-Request-Id', async () => {
    const clientId = 'my-trace-id-123';
    const res = await request(app).get(BASE).set('X-Request-Id', clientId);
    expect(res.headers['x-request-id']).toBe(clientId);
  });
});

// ─── Encabezados de límite de velocidad ───────────────────────────────────────

describe('Rate limit headers', () => {
  it('response includes RateLimit-Limit header', async () => {
    const res = await request(app).get(BASE);
    expect(res.headers['ratelimit-limit']).toBeDefined();
  });
});

// ─── GET /api/v1/tasks ────────────────────────────────────────────────────────

describe('GET /api/v1/tasks', () => {
  it('200 – returns empty data with pagination metadata', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination).toMatchObject({ total: 0, page: 1, limit: 20 });
  });

  it('200 – returns all tasks', async () => {
    await request(app).post(BASE).send({ title: 'Task A' });
    await request(app).post(BASE).send({ title: 'Task B' });
    const res = await request(app).get(BASE);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
  });

  it('200 – paginates with page and limit params', async () => {
    for (let i = 1; i <= 3; i++) {
      await request(app).post(BASE).send({ title: `Task ${i}` });
    }
    const res = await request(app).get(`${BASE}?page=2&limit=1`);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Task 2');
    expect(res.body.pagination).toMatchObject({ page: 2, limit: 1, total: 3, pages: 3 });
  });

  it('400 – page=0 is invalid', async () => {
    const res = await request(app).get(`${BASE}?page=0`);
    expect(res.status).toBe(400);
  });

  it('400 – limit > 100 is invalid', async () => {
    const res = await request(app).get(`${BASE}?limit=101`);
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/v1/tasks ───────────────────────────────────────────────────────

describe('POST /api/v1/tasks', () => {
  it('201 – creates with title only', async () => {
    const res = await request(app).post(BASE).send({ title: 'My task' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ title: 'My task', description: null });
    expect(res.body.data.id).toBeDefined();
  });

  it('201 – creates with title and description', async () => {
    const res = await request(app).post(BASE).send({ title: 'T', description: 'Desc' });
    expect(res.body.data.description).toBe('Desc');
  });

  it('201 – trims whitespace from title', async () => {
    const res = await request(app).post(BASE).send({ title: '  Trimmed  ' });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Trimmed');
  });

  it('201 – trims whitespace from description', async () => {
    const res = await request(app).post(BASE).send({ title: 'T', description: '  Desc  ' });
    expect(res.body.data.description).toBe('Desc');
  });

  it('400 – missing title', async () => {
    const res = await request(app).post(BASE).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('400 – title too long (> 100 chars)', async () => {
    const res = await request(app).post(BASE).send({ title: 'a'.repeat(101) });
    expect(res.status).toBe(400);
    expect(res.body.details.some((d) => d.includes('100'))).toBe(true);
  });

  it('400 – empty title after trim', async () => {
    const res = await request(app).post(BASE).send({ title: '   ' });
    expect(res.status).toBe(400);
  });

  it('400 – description too long (> 200 chars)', async () => {
    const res = await request(app).post(BASE).send({ title: 'T', description: 'b'.repeat(201) });
    expect(res.status).toBe(400);
    expect(res.body.details.some((d) => d.includes('200'))).toBe(true);
  });

  it('400 – unknown fields are rejected', async () => {
    const res = await request(app).post(BASE).send({ title: 'OK', extra: 'field' });
    expect(res.status).toBe(400);
  });

  it('413/400 – body exceeding 10 kb is rejected', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ title: 'x'.repeat(11_000) }));
    expect([400, 413]).toContain(res.status);
  });
});

// ─── PUT /api/v1/tasks/:id ────────────────────────────────────────────────────

describe('PUT /api/v1/tasks/:id', () => {
  let taskId;

  beforeEach(async () => {
    const res = await request(app)
      .post(BASE)
      .send({ title: 'Original', description: 'Original desc' });
    taskId = res.body.data.id;
  });

  it('200 – updates title', async () => {
    const res = await request(app).put(`${BASE}/${taskId}`).send({ title: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated');
  });

  it('200 – trims whitespace on update', async () => {
    const res = await request(app).put(`${BASE}/${taskId}`).send({ title: '  Trimmed  ' });
    expect(res.body.data.title).toBe('Trimmed');
  });

  it('200 – updates description', async () => {
    const res = await request(app).put(`${BASE}/${taskId}`).send({ description: 'New' });
    expect(res.body.data.description).toBe('New');
  });

  it('200 – updates both fields', async () => {
    const res = await request(app)
      .put(`${BASE}/${taskId}`)
      .send({ title: 'New title', description: 'New desc' });
    expect(res.body.data.title).toBe('New title');
    expect(res.body.data.description).toBe('New desc');
  });

  it('404 – task not found', async () => {
    const res = await request(app).put(`${BASE}/nope`).send({ title: 'X' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  it('400 – empty body', async () => {
    expect((await request(app).put(`${BASE}/${taskId}`).send({})).status).toBe(400);
  });

  it('400 – title too long', async () => {
    expect(
      (await request(app).put(`${BASE}/${taskId}`).send({ title: 'x'.repeat(101) })).status,
    ).toBe(400);
  });

  it('400 – description too long', async () => {
    expect(
      (await request(app).put(`${BASE}/${taskId}`).send({ description: 'y'.repeat(201) })).status,
    ).toBe(400);
  });

  it('400 – unknown fields are rejected', async () => {
    expect(
      (await request(app).put(`${BASE}/${taskId}`).send({ title: 'OK', ghost: true })).status,
    ).toBe(400);
  });
});

// ─── DELETE /api/v1/tasks/:id ─────────────────────────────────────────────────

describe('DELETE /api/v1/tasks/:id', () => {
  let taskId;

  beforeEach(async () => {
    const res = await request(app).post(BASE).send({ title: 'To delete' });
    taskId = res.body.data.id;
  });

  it('204 – deletes existing task with no body', async () => {
    const res = await request(app).delete(`${BASE}/${taskId}`);
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('task is gone after deletion', async () => {
    await request(app).delete(`${BASE}/${taskId}`);
    const res = await request(app).get(BASE);
    expect(res.body.data.find((t) => t.id === taskId)).toBeUndefined();
  });

  it('404 – task not found', async () => {
    const res = await request(app).delete(`${BASE}/nope`);
    expect(res.status).toBe(404);
  });
});

// ─── Rutas desconocidas ───────────────────────────────────────────────────────

describe('Unknown routes', () => {
  it('404 – returns error message', async () => {
    const res = await request(app).get('/unknown');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Route not found');
  });
});
