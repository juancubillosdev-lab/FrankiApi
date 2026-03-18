'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

let tmpDb;

beforeEach(() => {
  tmpDb = path.join(os.tmpdir(), `tasks_unit_${Date.now()}.json`);
  fs.writeFileSync(tmpDb, JSON.stringify({ tasks: [] }), 'utf-8');
  process.env.DB_PATH = tmpDb;
  jest.resetModules();
});

afterEach(() => {
  if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
  delete process.env.DB_PATH;
});

function getService() {
  return require('../src/services/tasksService');
}

// ─── getAll ───────────────────────────────────────────────────────────────────

describe('tasksService.getAll', () => {
  it('returns empty data and correct pagination when no tasks exist', async () => {
    const svc = getService();
    const result = await svc.getAll();
    expect(result.data).toEqual([]);
    expect(result.pagination).toMatchObject({ total: 0, page: 1, pages: 1 });
  });

  it('returns all tasks within the default page window', async () => {
    const svc = getService();
    await svc.create('Task 1');
    await svc.create('Task 2');
    const result = await svc.getAll();
    expect(result.data).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
  });

  it('paginates correctly — page 2 with limit 1', async () => {
    const svc = getService();
    await svc.create('First');
    await svc.create('Second');
    const result = await svc.getAll({ page: 2, limit: 1 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe('Second');
    expect(result.pagination.pages).toBe(2);
  });

  it('returns empty data when page exceeds total pages', async () => {
    const svc = getService();
    await svc.create('Only one');
    const result = await svc.getAll({ page: 99, limit: 20 });
    expect(result.data).toHaveLength(0);
  });
});

// ─── getById ──────────────────────────────────────────────────────────────────

describe('tasksService.getById', () => {
  it('returns null for a non-existent id', async () => {
    const svc = getService();
    expect(await svc.getById('ghost')).toBeNull();
  });

  it('returns the correct task by id', async () => {
    const svc = getService();
    const created = await svc.create('Find me');
    expect(await svc.getById(created.id)).toMatchObject({ id: created.id });
  });
});

// ─── create ───────────────────────────────────────────────────────────────────

describe('tasksService.create', () => {
  it('creates a task with title only', async () => {
    const svc = getService();
    const task = await svc.create('Title only');
    expect(task).toMatchObject({ title: 'Title only', description: null });
    expect(task.id).toBeDefined();
  });

  it('creates a task with title and description', async () => {
    const svc = getService();
    const task = await svc.create('T', 'Some description');
    expect(task.description).toBe('Some description');
  });

  it('persists task to the JSON file', async () => {
    const svc = getService();
    await svc.create('Persisted');
    const db = JSON.parse(fs.readFileSync(tmpDb, 'utf-8'));
    expect(db.tasks).toHaveLength(1);
  });

  it('assigns unique ids to each task', async () => {
    const svc = getService();
    const [t1, t2] = await Promise.all([svc.create('T1'), svc.create('T2')]);
    expect(t1.id).not.toBe(t2.id);
  });

  it('handles concurrent creates without data loss (mutex)', async () => {
    const svc = getService();
    await Promise.all([svc.create('A'), svc.create('B'), svc.create('C')]);
    const db = JSON.parse(fs.readFileSync(tmpDb, 'utf-8'));
    expect(db.tasks).toHaveLength(3);
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe('tasksService.update', () => {
  it('returns null when task does not exist', async () => {
    const svc = getService();
    expect(await svc.update('ghost', { title: 'X' })).toBeNull();
  });

  it('updates title', async () => {
    const svc = getService();
    const task = await svc.create('Old');
    const updated = await svc.update(task.id, { title: 'New' });
    expect(updated.title).toBe('New');
  });

  it('refreshes updatedAt', async () => {
    const svc = getService();
    const task = await svc.create('T');
    const updated = await svc.update(task.id, { title: 'Changed' });
    expect(new Date(updated.updatedAt).toISOString()).toBe(updated.updatedAt);
  });

  it('does not alter unrelated fields', async () => {
    const svc = getService();
    const task = await svc.create('T', 'desc');
    const updated = await svc.update(task.id, { title: 'Changed' });
    expect(updated.description).toBe('desc');
    expect(updated.createdAt).toBe(task.createdAt);
  });
});

// ─── remove ───────────────────────────────────────────────────────────────────

describe('tasksService.remove', () => {
  it('returns false when task does not exist', async () => {
    const svc = getService();
    expect(await svc.remove('ghost')).toBe(false);
  });

  it('returns true and deletes the task', async () => {
    const svc = getService();
    const task = await svc.create('Delete me');
    expect(await svc.remove(task.id)).toBe(true);
    expect(await svc.getById(task.id)).toBeNull();
  });

  it('removes the task from the JSON file', async () => {
    const svc = getService();
    const task = await svc.create('Remove from file');
    await svc.remove(task.id);
    const db = JSON.parse(fs.readFileSync(tmpDb, 'utf-8'));
    expect(db.tasks).toHaveLength(0);
  });
});
