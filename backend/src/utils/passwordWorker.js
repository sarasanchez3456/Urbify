// Hilo de trabajo para bcrypt. Ejecuta el cálculo (CPU intensivo) fuera del hilo principal. Ver passwordHasher.js.
const { parentPort } = require('worker_threads');
const bcrypt = require('bcryptjs');

parentPort.on('message', ({ id, op, a, b }) => {
  try {
    const result = op === 'hash' ? bcrypt.hashSync(a, b) : bcrypt.compareSync(a, b);
    parentPort.postMessage({ id, result });
  } catch (err) {
    parentPort.postMessage({ id, error: err.message });
  }
});
