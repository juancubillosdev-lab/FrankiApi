'use strict';

const path = require('path');
const fs = require('fs');

const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, '../database.json');

const PORT = Number(process.env.PORT) || 3000;

const LOG_LEVEL =
  process.env.NODE_ENV === 'test'
    ? 'silent'
    : process.env.LOG_LEVEL || 'info';

/**
 * Se llama una vez al iniciar el servidor (no durante las pruebas) para garantizar
 * que el archivo de base de datos existe y contiene JSON válido.
 * Termina el proceso con un mensaje claro si no puede inicializarse.
 */
function initDB() {
  const empty = JSON.stringify({ tasks: [] }, null, 2);

  // Intenta crear el archivo solo si no existe (flag 'wx' es atómico — falla si ya existe)
  try {
    fs.writeFileSync(DB_PATH, empty, { encoding: 'utf-8', flag: 'wx' });
    return; // archivo recién creado — el JSON es válido por construcción
  } catch (err) {
    if (err.code !== 'EEXIST') {
      process.stderr.write(`[startup] No se puede crear la base de datos en "${DB_PATH}": ${err.message}\n`);
      process.exit(1);
    }
  }

  // El archivo ya existe — verificar que contiene JSON válido
  try {
    JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch (err) {
    process.stderr.write(`[startup] database.json no contiene JSON válido: ${err.message}\n`);
    process.exit(1);
  }
}

module.exports = { DB_PATH, PORT, LOG_LEVEL, initDB };
