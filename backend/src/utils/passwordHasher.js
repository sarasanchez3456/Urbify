// bcrypt en hilos de trabajo. bcryptjs es JavaScript puro: en el hilo principal, 40 inicios de sesión simultáneos
// dejaban sin respuesta al resto de la API durante segundos. Aquí el cálculo va a un pequeño grupo de workers y el
// event loop sigue libre. Sigue siendo bcryptjs (sin dependencias nativas), así que los hashes existentes valen.
//
// Respaldo: si los workers no pueden arrancar (entorno sin worker_threads, imagen que no encuentra el archivo,
// límites de recursos...) o se caen varias veces seguidas, se pasa a bcryptjs en el hilo principal y se registra
// en el log UNA vez. El login sigue funcionando, solo pierde el aislamiento del event loop.
const { Worker } = require('worker_threads');
const os = require('os');
const path = require('path');
const bcrypt = require('bcryptjs');

const TAMANO = Math.max(1, Math.min(2, os.cpus().length - 1));
const MAX_FALLOS = 3; // caídas de workers antes de abandonarlos
const workers = [];
const pendientes = new Map();
let siguiente = 0;
let contador = 0;
let fallos = 0;
let modoDirecto = false;

function activarModoDirecto(motivo) {
  if (modoDirecto) return;
  modoDirecto = true;
  console.warn(`[passwordHasher] Los workers de bcrypt no están disponibles (${motivo}). ` +
    'Se usa bcrypt en el hilo principal: el login funciona, pero los hashes simultáneos pueden bloquear la API.');
}

function enHiloPrincipal(op, a, b) {
  // setImmediate cede el turno al event loop entre una operación y otra
  return new Promise((resolve, reject) => {
    setImmediate(() => {
      try { resolve(op === 'hash' ? bcrypt.hashSync(a, b) : bcrypt.compareSync(a, b)); } catch (err) { reject(err); }
    });
  });
}

function reintentarPendientes(i) {
  for (const [id, p] of pendientes) {
    if (p.worker !== i) continue;
    pendientes.delete(id);
    // la operación no se pierde: se repite en el hilo principal
    enHiloPrincipal(p.op, p.a, p.b).then(p.resolve, p.reject);
  }
}

function caerWorker(i, motivo) {
  workers[i] = null;
  fallos += 1;
  if (fallos >= MAX_FALLOS) activarModoDirecto(motivo);
  reintentarPendientes(i);
}

function crearWorker(i) {
  const w = new Worker(path.join(__dirname, 'passwordWorker.js'));
  w.unref(); // no impide que el proceso termine (p. ej. scripts)
  w.on('message', ({ id, result, error }) => {
    const p = pendientes.get(id);
    if (!p) return;
    pendientes.delete(id);
    fallos = 0; // un worker que responde está sano
    if (error) p.reject(new Error(error));
    else p.resolve(result);
  });
  w.on('error', (err) => {
    if (workers[i] === w) caerWorker(i, err.message);
  });
  w.on('exit', (code) => {
    if (workers[i] === w) caerWorker(i, `el worker terminó con código ${code}`);
  });
  return w;
}

function ejecutar(op, a, b) {
  if (modoDirecto) return enHiloPrincipal(op, a, b);
  const i = siguiente++ % TAMANO;
  if (!workers[i]) {
    try {
      workers[i] = crearWorker(i);
    } catch (err) {
      // Worker() puede lanzar de forma síncrona (p. ej. worker_threads no disponible)
      workers[i] = null;
      activarModoDirecto(err.message);
      return enHiloPrincipal(op, a, b);
    }
  }
  const id = ++contador;
  return new Promise((resolve, reject) => {
    pendientes.set(id, { resolve, reject, worker: i, op, a, b });
    workers[i].postMessage({ id, op, a, b });
  });
}

const hash = (password, rondas = 10) => ejecutar('hash', password, rondas);
const compare = (password, hashGuardado) => ejecutar('compare', password, hashGuardado);

module.exports = { hash, compare };
