'use strict';

// Protección anti fuerza bruta por capas (IP + cuenta), en memoria.
// No sustituye a un WAF/CDN, pero mitiga ataques básicos sin dependencias
// externas ni almacén distribuido. Todos los umbrales son configurables por env.
//
// Estrategia:
//  - Ventana deslizante de intentos fallidos por IP y por usuario.
//  - Al superar el umbral se aplica un bloqueo temporal con backoff exponencial
//    (capado) que se libera solo al vencer (nunca bloqueo permanente => evita DoS).
//  - Retraso progresivo antes de responder tras varios fallos (rate-limit suave).
//  - Mensajes/estados genéricos: el llamador nunca revela cuál capa disparó.

const WINDOW_MS = intEnv('LOGIN_WINDOW_MS', 15 * 60 * 1000); // 15 min
const MAX_FAILURES = intEnv('LOGIN_MAX_FAILURES', 5); // fallos antes de bloquear
const LOCK_BASE_MS = intEnv('LOGIN_LOCK_BASE_MS', 60 * 1000); // 1 min base
const LOCK_MAX_MS = intEnv('LOGIN_LOCK_MAX_MS', 30 * 60 * 1000); // 30 min tope
const DELAY_STEP_MS = intEnv('LOGIN_DELAY_STEP_MS', 400); // retraso progresivo por fallo
const DELAY_MAX_MS = intEnv('LOGIN_DELAY_MAX_MS', 4000);

const GENERIC_LOGIN_ERROR =
  'Las credenciales ingresadas no son válidas o el acceso se encuentra temporalmente limitado.';

function intEnv(name, fallback) {
  const v = parseInt(process.env[name] || '', 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

// key -> { fails, first, lockUntil, lockCount }
const ipState = new Map();
const acctState = new Map();

function now() {
  return Date.now();
}

function normalizeKey(v) {
  return String(v || 'unknown').trim().toLowerCase().slice(0, 200);
}

function getState(map, key) {
  let s = map.get(key);
  const t = now();
  if (!s) {
    s = { fails: 0, first: t, lockUntil: 0, lockCount: 0 };
    map.set(key, s);
    return s;
  }
  // Reinicia la ventana si expiró y no hay bloqueo vigente.
  if (t - s.first > WINDOW_MS && t > s.lockUntil) {
    s.fails = 0;
    s.first = t;
    s.lockUntil = 0;
    s.lockCount = 0;
  }
  return s;
}

function lockRemaining(s) {
  const t = now();
  return s.lockUntil > t ? s.lockUntil - t : 0;
}

// ¿Está bloqueado el par (ip, cuenta) ahora mismo?
function assess({ ip, username }) {
  const ipS = getState(ipState, normalizeKey(ip));
  const acctS = getState(acctState, normalizeKey(username));
  const remaining = Math.max(lockRemaining(ipS), lockRemaining(acctS));
  return {
    blocked: remaining > 0,
    retryAfterMs: remaining,
    // Retraso suave proporcional a los fallos acumulados (aún sin bloqueo).
    delayMs: Math.min(
      DELAY_MAX_MS,
      Math.max(ipS.fails, acctS.fails) * DELAY_STEP_MS
    ),
  };
}

function applyFailure(s) {
  s.fails += 1;
  if (s.fails >= MAX_FAILURES) {
    s.lockCount += 1;
    const backoff = LOCK_BASE_MS * Math.pow(2, s.lockCount - 1);
    s.lockUntil = now() + Math.min(LOCK_MAX_MS, backoff);
    s.fails = 0; // reinicia el contador de la sub-ventana; el bloqueo ya rige
    s.first = now();
  }
}

// Registra un fallo de login para ambas capas. Devuelve el motivo si quedó bloqueado.
function recordFailure({ ip, username }) {
  const ipKey = normalizeKey(ip);
  const acctKey = normalizeKey(username);
  const ipS = getState(ipState, ipKey);
  const acctS = getState(acctState, acctKey);
  applyFailure(ipS);
  applyFailure(acctS);
  const ipLock = lockRemaining(ipS);
  const acctLock = lockRemaining(acctS);
  return {
    lockedIp: ipLock > 0,
    lockedAccount: acctLock > 0,
    retryAfterMs: Math.max(ipLock, acctLock),
  };
}

// Éxito: limpia el estado de la cuenta y de la IP.
function recordSuccess({ ip, username }) {
  ipState.delete(normalizeKey(ip));
  acctState.delete(normalizeKey(username));
}

// Limpieza oportunista de entradas viejas para no crecer sin límite.
function prune() {
  const t = now();
  for (const map of [ipState, acctState]) {
    for (const [k, s] of map) {
      if (t - s.first > WINDOW_MS && t > s.lockUntil) map.delete(k);
    }
  }
}

function snapshot() {
  prune();
  const t = now();
  let lockedAccounts = 0;
  let lockedIps = 0;
  for (const s of acctState.values()) if (s.lockUntil > t) lockedAccounts += 1;
  for (const s of ipState.values()) if (s.lockUntil > t) lockedIps += 1;
  return { lockedAccounts, lockedIps, trackedAccounts: acctState.size, trackedIps: ipState.size };
}

function delay(ms) {
  if (!ms || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  GENERIC_LOGIN_ERROR,
  assess,
  recordFailure,
  recordSuccess,
  snapshot,
  prune,
  delay,
  _config: { WINDOW_MS, MAX_FAILURES, LOCK_BASE_MS, LOCK_MAX_MS },
};
