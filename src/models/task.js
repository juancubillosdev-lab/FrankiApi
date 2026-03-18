'use strict';

/**
 * Crea un objeto Task.
 * @param {string} id   - UUID
 * @param {string} title
 * @param {string} [description]
 * @param {string} [status]
 * @returns {Object}
 */

function createTask(id, title, description = null, status = null) {
  const now = new Date().toISOString();
  return {
    id,
    title,
    description,
    createdAt: now,
    updatedAt: now,
    status,
  };
}

module.exports = { createTask };
