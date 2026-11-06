// bcrypt en hilos de trabajo. bcryptjs es JavaScript puro: en el hilo principal, 40 inicios de sesión simultáneos
// dejaban sin respuesta al resto de la API durante segundos. Aquí el cálculo va a un pequeño grupo de workers y el
// event loop sigue libre. Sigue siendo bcryptjs (sin dependencias nativas), así que los hashes existentes valen.
const { Worker } = require('worker_threads');
const os = require('os');
const path = require('path');

const TAMANO = Math.max(1, Math.min(2, os.cpus().length - 1));
const workers = [];
const pendientes = new Map();
let siguiente = 0;
let contador = 0;

function crearWorker(i) {
  const w = new Worker(path.join(__dirname, 'passwordWorker.js'));
  w.unref(); // no impide que el proceso termine (p. ej. scripts)
  w.on('message', ({ id, result, error }) => {
    const p = pendientes.get(id);
    if (!p) return;
    pendientes.delete(id);
    if (error) p.reject(new Error(error));
    else p.resolve(result);
  });
  w.on('error', (err) => {
    for (const [id, p] of pendientes) if (p.worker === i) { pendientes.delete(id); p.reject(err); }
    workers[i] = null; // se vuelve a crear en el siguiente uso
  });
  return w;
}

function ejecutar(op, a, b) {
  const i = siguiente++ % TAMANO;
  if (!workers[i]) workers[i] = crearWorker(i);
  const id = ++contador;
  return new Promise((resolve, reject) => {
    pendientes.set(id, { resolve, reject, worker: i });
    workers[i].postMessage({ id, op, a, b });
  });
}

const hash = (password, rondas = 10) => ejecutar('hash', password, rondas);
const compare = (password, hashGuardado) => ejecutar('compare', password, hashGuardado);

module.exports = { hash, compare };
