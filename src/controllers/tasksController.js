'use strict';

const tasksService = require('../services/tasksService');
const { validateCreate, validateUpdate, validatePagination } = require('../validators/taskValidator');

// GET /tasks?page=1&limit=20
async function getAll(req, res, next) {
  const { error, value } = validatePagination(req.query);
  if (error) {
    return res.status(400).json({ error: 'Invalid query params', details: error });
  }
  try {
    const result = await tasksService.getAll(value);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

// POST /tasks
async function create(req, res, next) {
  const { error, value } = validateCreate(req.body);
  if (error) {
    return res.status(400).json({ error: 'Validation failed', details: error });
  }
  try {
    const task = await tasksService.create(value.title, value.description, value.status);
    return res.status(201).json({ data: task });
  } catch (err) {
    next(err);
  }
}

// PUT /tasks/:id
async function update(req, res, next) {
  const { id } = req.params;
  const { error, value } = validateUpdate(req.body);
  if (error) {
    return res.status(400).json({ error: 'Validation failed', details: error });
  }
  try {
    const task = await tasksService.update(id, value);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    return res.status(200).json({ data: task });
  } catch (err) {
    next(err);
  }
}

// DELETE /tasks/:id — 204 
async function remove(req, res, next) {
  const { id } = req.params;
  try {
    const deleted = await tasksService.remove(id);
    if (!deleted) return res.status(404).json({ error: 'Task not found' });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, create, update, remove };
