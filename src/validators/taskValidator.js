'use strict';

const Joi = require('joi');

// ─── Campos reutilizables ─────────────────────────────────────────────────────
// .trim() normaliza los espacios en blanco al inicio/final antes de la validación de longitud

const VALID_STATUSES = ['pending', 'progress', 'completed'];

const titleField       = Joi.string().trim().min(1).max(100);
const descriptionField = Joi.string().trim().min(1).max(200).optional().allow(null, '');
const statusField      = Joi.string().valid(...VALID_STATUSES);

// ─── Esquemas ─────────────────────────────────────────────────────────────────

const createTaskSchema = Joi.object({
  title:       titleField.required(),
  description: descriptionField,
  status:      statusField.default('pending'),
}).options({ allowUnknown: false, abortEarly: false });

const updateTaskSchema = Joi.object({
  title:       titleField.optional(),
  description: descriptionField,
  status:      statusField.optional(),
})
  .min(1)
  .options({ allowUnknown: false, abortEarly: false });

const paginationSchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).options({ allowUnknown: false });

// ─── Ayudantes ────────────────────────────────────────────────────────────────

function toMessages(joiError) {
  return joiError.details.map((d) => d.message);
}

function validate(schema, payload) {
  const { error, value } = schema.validate(payload);
  return error ? { error: toMessages(error) } : { value };
}

// ─── Validadores ──────────────────────────────────────────────────────────────

const validateCreate     = (payload) => validate(createTaskSchema, payload);
const validateUpdate     = (payload) => validate(updateTaskSchema, payload);
const validatePagination = (query)   => validate(paginationSchema, query);

module.exports = { validateCreate, validateUpdate, validatePagination };
