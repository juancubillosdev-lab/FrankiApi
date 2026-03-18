// Asegura que las pruebas se ejecuten en modo de prueba (registros silenciosos, etc.)
process.env.NODE_ENV = 'test';

// Cada archivo de prueba vuelve a requerir módulos; permite suficientes listeners para esa rotación
process.setMaxListeners(50);
