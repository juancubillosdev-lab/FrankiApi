'use strict';

const fs = require('fs/promises');
const { randomUUID } = require('crypto');
const { DB_PATH } = require('../config');
const { createTask } = require('../models/task');

// ─── Mutex de escritura ───────────────────────────────────────────────────────
// Serializa las escrituras concurrentes para que ninguna solicitud sobreescriba los datos de otra.
const writeMutex = {
  _queue: Promise.resolve(),
  run(fn) {
    const result = this._queue.then(fn);
    this._queue = result.catch(() => {});
    return result;
  },
};

// ─── E/S de archivos ──────────────────────────────────────────────────────────

async function readDB() {
  const raw = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

async function writeDB(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Métodos del repositorio ──────────────────────────────────────────────────

async function findAll() {
  const db = await readDB();
  return db.tasks;
}

async function findById(id) {
  const db = await readDB();
  return db.tasks.find((t) => t.id === id) || null;
}

async function insert(title, description, status) {
  return writeMutex.run(async () => {
    const db = await readDB();
    const task = createTask(randomUUID(), title, description ?? null, status ?? 'pending');
    db.tasks.push(task);
    await writeDB(db);
    return task;
  });
}

async function updateById(id, fields) {
  return writeMutex.run(async () => {
    const db = await readDB();
    const index = db.tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const updated = {
      ...db.tasks[index],
      ...fields,
      updatedAt: new Date().toISOString(),
    };
    db.tasks[index] = updated;
    await writeDB(db);
    return updated;
  });
}

async function deleteById(id) {
  return writeMutex.run(async () => {
    const db = await readDB();
    const index = db.tasks.findIndex((t) => t.id === id);
    if (index === -1) return false;
    db.tasks.splice(index, 1);
    await writeDB(db);
    return true;
  });
}

module.exports = { findAll, findById, insert, updateById, deleteById };
