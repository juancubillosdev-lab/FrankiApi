'use strict';

const js = require('@eslint/js');
const pluginN = require('eslint-plugin-n');
const configPrettier = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
  js.configs.recommended,

  // Reglas específicas de Node.js
  {
    plugins: { n: pluginN },
    languageOptions: {
      globals: { ...globals.node },
      ecmaVersion: 2022,
    },
    rules: {
      eqeqeq: ['error', 'always'],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },

  // Archivos de prueba — expone globales de Jest
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: { ...globals.jest },
    },
    rules: {
      'no-console': 'off',
    },
  },

  // Desactiva reglas que entran en conflicto con Prettier
  configPrettier,

  // Siempre ignorar los directorios generados
  { ignores: ['node_modules/', 'coverage/'] },
];
