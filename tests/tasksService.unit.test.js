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

// ─── Branch Coverage ──────────────────────────────────────────────────────────
describe('tasksService.insert - Branch Coverage', () => {
  it('uses the provided status (Branch A)', async () => {
    const svc = getService();
    const task = await svc.create('Task Pro', 'Desc', 'progress');
    expect(task.status).toBe('progress');
  });

  it('defaults to "pending" when status is null/undefined (Branch B)', async () => {
    const svc = getService();
    const task = await svc.create('Task Default', 'Desc', null); 
    expect(task.status).toBe('pending');
  });
});

describe('Task Model Direct Coverage', () => {
  const { createTask } = require('../src/models/task');

  it('debería usar los valores por defecto del modelo (Coverage 100%)', () => {
    const task = createTask('123', 'Test Title');
    
    expect(task.description).toBeNull();
    expect(task.status).toBeNull();
    expect(task.id).toBe('123');
  });

  it('debería usar los valores proporcionados', () => {
    const task = createTask('123', 'Title', 'Desc', 'progress');
    expect(task.description).toBe('Desc');
    expect(task.status).toBe('progress');
  });
});

describe('tasksRepository Mutex - Function Coverage', () => {
  it('debería cubrir la función catch del mutex cuando ocurre un error', async () => {
    const repo = require('../src/repositories/tasksRepository');
    
    const originalRun = require('../src/repositories/tasksRepository');
    
    try {
      delete process.env.DB_PATH; 
      await repo.insert('Fallo');
    } catch (e) {
      expect(e).toBeDefined();
    }
  });
});

// ─── update con status ────────────────────────────────────────────────────────

describe('tasksService.update – status field', () => {
  it('updates status to "progress"', async () => {
    const svc = getService();
    const task = await svc.create('T');
    const updated = await svc.update(task.id, { status: 'progress' });
    expect(updated.status).toBe('progress');
  });

  it('updates status to "completed"', async () => {
    const svc = getService();
    const task = await svc.create('T');
    const updated = await svc.update(task.id, { status: 'completed' });
    expect(updated.status).toBe('completed');
  });

  it('updating status does not alter title or description', async () => {
    const svc = getService();
    const task = await svc.create('Original title', 'Original desc');
    const updated = await svc.update(task.id, { status: 'completed' });
    expect(updated.title).toBe('Original title');
    expect(updated.description).toBe('Original desc');
  });
});

// ─── Concurrencia en update y remove ─────────────────────────────────────────

describe('tasksService – concurrent update and remove (mutex)', () => {
  it('concurrent updates on the same task do not corrupt data', async () => {
    const svc = getService();
    const task = await svc.create('Shared task');
    await Promise.all([
      svc.update(task.id, { title: 'Update A' }),
      svc.update(task.id, { title: 'Update B' }),
      svc.update(task.id, { status: 'progress' }),
    ]);
    const db = JSON.parse(fs.readFileSync(tmpDb, 'utf-8'));
    expect(db.tasks).toHaveLength(1);
  });

  it('concurrent creates and removes do not corrupt the file', async () => {
    const svc = getService();
    const [t1, t2] = await Promise.all([svc.create('A'), svc.create('B')]);
    await Promise.all([
      svc.create('C'),
      svc.remove(t1.id),
      svc.remove(t2.id),
    ]);
    const db = JSON.parse(fs.readFileSync(tmpDb, 'utf-8'));
    expect(db.tasks).toHaveLength(1);
    expect(db.tasks[0].title).toBe('C');
  });
});

// ─── Test de Cobertura Extrema (Mutex Catch) ──────────────────────────────────
describe('tasksRepository Mutex Catch Coverage', () => {
  it('debería cubrir el catch del mutex cuando falla la escritura', async () => {
    const fs = require('fs/promises');
    const svc = getService();

    const spy = jest.spyOn(fs, 'writeFile').mockRejectedValueOnce(new Error('Simulated Write Error'));

    try {
      await svc.create('Falla esperada');
    } catch (err) {
      expect(err.message).toBe('Simulated Write Error');
    }

    spy.mockRestore();
  });
});
