'use strict';

/**
 * Capa de lógica de negocio — no sabe nada sobre E/S de archivos.
 * Toda la persistencia se delega al repositorio.
 * Esta separación significa que la fuente de datos (archivo JSON)
 * puede cambiarse sin tocar ninguna lógica de negocio.
 */

const repo = require('../repositories/tasksRepository');

async function getAll({ page = 1, limit = 20 } = {}) {
  const all = await repo.findAll();
  const total = all.length;
  const start = (page - 1) * limit;
  return {
    data: all.slice(start, start + limit),
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

async function getById(id) {
  return repo.findById(id);
}

async function create(title, description, status) {
  return repo.insert(title, description, status);
}

async function update(id, fields) {
  return repo.updateById(id, fields);
}

async function remove(id) {
  return repo.deleteById(id);
}

module.exports = { getAll, getById, create, update, remove };
