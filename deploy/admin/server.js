'use strict';

// Versión mínima y estable del servidor admin para evitar errores de sintaxis.
// NOTA: Esta implementación es temporal. Restaura /admin y endpoints básicos
// para permitir que el proceso Node arranque y que el resto de la app funcione.

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { SYSTEM_PROMPT, answerLocally, publicBotConfig } = require('./bot-service');
const bruteforce = require('./security');

const IS_PROD = process.env.NODE_ENV === 'production';

// Subida de imágenes: lista blanca por firma de contenido (magic bytes).
// WebP es el formato preferido; el resto se acepta pero el frontend convierte a WebP.
const IMAGE_SIGNATURES = [
  { mime: 'image/webp', test: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  { mime: 'image/jpeg', test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', test: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
];
const MAX_UPLOAD_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES || String(5 * 1024 * 1024), 10); // 5 MB

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DATA_FILE = path.join(DATA_DIR, 'admin.json');
const BUNDLED_SEED_FILE = fs.existsSync(path.join(__dirname, 'data', 'admin.seed.json'))
  ? path.join(__dirname, 'data', 'admin.seed.json')
  : path.join(__dirname, 'data', 'admin.json');
const LOCAL_ENV_FILE = path.join(__dirname, '..', '.env');
const BOT_LOG_LIMIT = 500;
const SYSTEM_LOG_LIMIT = 500;

function loadLocalEnv() {
  if (!fs.existsSync(LOCAL_ENV_FILE)) return;
  const content = fs.readFileSync(LOCAL_ENV_FILE, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

loadLocalEnv();

// SECURITY: Fail fast if ADMIN_DEV_PASSWORD is set in production to avoid accidental exposure.
if (process.env.NODE_ENV === 'production' && process.env.ADMIN_DEV_PASSWORD) {
  console.error('[admin] SECURITY ERROR: ADMIN_DEV_PASSWORD is set while NODE_ENV=production. Refusing to start. Remove ADMIN_DEV_PASSWORD from the environment.');
  // Exit with non-zero code so orchestrators/CI detect the misconfiguration
  process.exit(1);
}

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/admin/uploads', express.static(UPLOAD_DIR));

function buildInitialStore() {
  const now = new Date().toISOString();
  return {
    alojamientos: [],
    gastronomia: [],
    eventos: [],
    datos_utiles: [],
    users: [],
    tickets: [],
    reviews: [],
    votes: [],
    analytics: {},
    audit: [],
    bot_logs: [],
    system_logs: [],
    migrations: [],
    createdAt: now,
  };
}

function normalizeStore(store) {
  if (!store || typeof store !== 'object') return buildInitialStore();
  return {
    alojamientos: Array.isArray(store.alojamientos) ? store.alojamientos : [],
    gastronomia: Array.isArray(store.gastronomia) ? store.gastronomia : [],
    eventos: Array.isArray(store.eventos) ? store.eventos : [],
    datos_utiles: Array.isArray(store.datos_utiles) ? store.datos_utiles : [],
    users: Array.isArray(store.users) ? store.users : [],
    tickets: Array.isArray(store.tickets) ? store.tickets : [],
    reviews: Array.isArray(store.reviews) ? store.reviews : [],
    votes: Array.isArray(store.votes) ? store.votes : [],
    analytics: typeof store.analytics === 'object' && store.analytics !== null ? store.analytics : {},
    audit: Array.isArray(store.audit) ? store.audit : [],
    bot_logs: Array.isArray(store.bot_logs) ? store.bot_logs.slice(0, BOT_LOG_LIMIT) : [],
    system_logs: Array.isArray(store.system_logs) ? store.system_logs.slice(0, SYSTEM_LOG_LIMIT) : [],
    migrations: Array.isArray(store.migrations) ? store.migrations : [],
    createdAt: store.createdAt || new Date().toISOString(),
  };
}

function isTourismContentEmpty(store) {
  return !(store.alojamientos && store.alojamientos.length)
    && !(store.gastronomia && store.gastronomia.length)
    && !(store.eventos && store.eventos.length);
}

function loadBundledSeed() {
  try {
    if (!fs.existsSync(BUNDLED_SEED_FILE)) return null;
    return normalizeStore(JSON.parse(fs.readFileSync(BUNDLED_SEED_FILE, 'utf8')));
  } catch (e) {
    console.error('[admin] error loading bundled seed', e);
    return null;
  }
}

function applyBundledSeedIfEmpty(store) {
  if (!isTourismContentEmpty(store)) return store;
  const seed = loadBundledSeed();
  if (!seed) return store;
  const merged = normalizeStore(Object.assign({}, store, {
    alojamientos: seed.alojamientos || [],
    gastronomia: seed.gastronomia || [],
    eventos: seed.eventos || [],
    datos_utiles: (store.datos_utiles && store.datos_utiles.length) ? store.datos_utiles : (seed.datos_utiles || []),
    users: (store.users && store.users.length) ? store.users : (seed.users || []),
  }));
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2)); } catch (e) { console.error('[admin] error saving seeded store', e); }
  console.log('[admin] store seeded from bundled template');
  return merged;
}

function loadStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initial = applyBundledSeedIfEmpty(buildInitialStore());
      if (isTourismContentEmpty(initial)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
      }
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return applyBundledSeedIfEmpty(normalizeStore(JSON.parse(raw || '{}')));
  } catch (e) {
    console.error('[admin] error loading store', e);
    const initial = applyBundledSeedIfEmpty(buildInitialStore());
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2)); } catch (er){}
    return initial;
  }
}

function saveStore(store) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(normalizeStore(store), null, 2)); } catch (e) { console.error('[admin] error saving store', e); }
}

function transformDatosUtilesForPublic(datosUtiles) {
  if (!Array.isArray(datosUtiles)) return {};
  return datosUtiles.reduce((acc, entry) => {
    if (entry && entry.categoria) {
      acc[entry.categoria] = entry;
    }
    return acc;
  }, {});
}

// SESSION_SECRET: en producción debe venir del entorno. Si falta, se genera uno
// aleatorio fuerte al arrancar (evita el default inseguro Y evita un crash-loop en
// el deploy). Con el almacén de sesiones en memoria, las sesiones ya se reinician
// al reiniciar el proceso, así que un secreto efímero es equivalente en la práctica.
// Definí SESSION_SECRET en el entorno para que las sesiones sobrevivan reinicios.
let SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET === 'dev-secret-change-me') {
  if (IS_PROD) {
    SESSION_SECRET = crypto.randomBytes(48).toString('hex');
    console.warn('[admin] AVISO: SESSION_SECRET no definido en producción; se generó uno aleatorio para esta ejecución. Definilo en el entorno para persistir sesiones entre reinicios.');
  } else {
    SESSION_SECRET = 'dev-secret-change-me';
  }
}

// Detrás de Traefik/reverse proxy: confía en el primer proxy para obtener IP y
// marcar la cookie como segura sobre HTTPS.
app.set('trust proxy', 1);

// Cabeceras de seguridad. CSP estricta: el panel admin es autocontenido
// (solo /admin/static/*). Se permite data: e https: para imágenes (logo/uploads).
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'", 'data:'],
      'connect-src': ["'self'"],
      'object-src': ["'none'"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'upgrade-insecure-requests': IS_PROD ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: IS_PROD ? { maxAge: 31536000, includeSubDomains: true, preload: false } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Parser ampliado SOLO en rutas que reciben payloads grandes (imagen base64 /
// backup). El resto de la API queda acotado a 1 MB (defensa contra DoS).
app.use('/admin/api/upload-image', express.json({ limit: '8mb' }));
app.use('/admin/api/restore', express.json({ limit: '20mb' }));
app.use(express.json({ limit: '1mb' }));

// CORS: solo se reflejan orígenes de la allowlist con credenciales. Peticiones
// same-origin (sin cabecera Origin) siguen permitidas. Esto evita que sitios
// de terceros hagan llamadas autenticadas al panel.
const ALLOWED_ORIGINS = String(process.env.ADMIN_ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
function corsOrigin(origin, cb) {
  if (!origin) return cb(null, true); // same-origin / curl / apps nativas
  if (!IS_PROD) return cb(null, true); // desarrollo: permisivo
  if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
  return cb(null, false); // el navegador bloqueará la respuesta credencial
}
app.use(cors({ origin: corsOrigin, credentials: true, exposedHeaders: ['Content-Disposition'] }));
app.options('*', cors({ origin: corsOrigin, credentials: true }));

// Sesión endurecida. En producción la cookie es Secure (requiere HTTPS) y
// SameSite=Lax mitiga CSRF junto con la verificación de Origin de más abajo.
const IDLE_TIMEOUT_MS = parseInt(process.env.SESSION_IDLE_MS || String(60 * 60 * 1000), 10); // 1 h inactividad
const ABSOLUTE_TIMEOUT_MS = parseInt(process.env.SESSION_ABSOLUTE_MS || String(12 * 60 * 60 * 1000), 10); // 12 h máx
app.use(session({
  name: 'vsr_admin_sid',
  secret: SESSION_SECRET,
  resave: false,
  rolling: true, // renueva la expiración por inactividad en cada request
  saveUninitialized: false,
  // Detrás de Traefik la TLS termina en el proxy; con proxy:true express-session
  // confía en X-Forwarded-Proto para emitir la cookie Secure (si no, la descarta
  // por considerar la conexión insegura y el login "no persiste" en producción).
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    maxAge: IDLE_TIMEOUT_MS,
  },
}));

// Defensa CSRF adicional: en métodos que modifican estado, si viene cabecera
// Origin debe pertenecer a la allowlist (o ser same-host). SameSite=Lax ya
// bloquea la mayoría de POST cross-site; esto cubre el resto.
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
app.use((req, res, next) => {
  if (!MUTATING.has(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next(); // sin Origin (same-origin form/curl) => permitido
  try {
    const host = new URL(origin).host;
    if (host === req.get('host')) return next();
    if (!IS_PROD) return next();
    if (ALLOWED_ORIGINS.some((o) => { try { return new URL(o).host === host; } catch { return false; } })) return next();
  } catch (_) { /* origin malformado => rechazar */ }
  return res.status(403).json({ error: 'Origen no permitido.' });
});

// Sesión => req.admin. SIN fallback por cabeceras: el rol jamás proviene del
// cliente. Sin sesión válida el usuario es invitado sin permisos.
app.use((req, res, next) => {
  if (req.session && req.session.admin) {
    const t = Date.now();
    const created = req.session.createdAt || t;
    const last = req.session.lastSeen || t;
    if (t - created > ABSOLUTE_TIMEOUT_MS || t - last > IDLE_TIMEOUT_MS) {
      return req.session.destroy(() => {
        req.admin = { user: 'anonymous', role: 'guest' };
        next();
      });
    }
    req.session.lastSeen = t;
    req.admin = { user: req.session.admin.user, role: req.session.admin.role };
    return next();
  }
  req.admin = { user: 'anonymous', role: 'guest' };
  next();
});

// Helper to return 401 when the request is unauthenticated (no server-side session),
// otherwise return 403 for authenticated users without sufficient permissions.
function sendForbiddenOrUnauthenticated(req, res) {
  if (!req.session || !req.session.admin) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }
  return res.status(403).json({ error: 'Forbidden' });
}
// Servir archivos estáticos de la SPA desde /admin/static
app.use('/admin/static', express.static(path.join(__dirname, 'static')));

app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/admin/api/health', (req, res) => {
  if (!req.session || !req.session.admin) return res.status(401).json({ error: 'Unauthenticated' });
  return res.json({ ok: true });
});

function appendLog(collection, entry, limit) {
  const store = loadStore();
  const current = Array.isArray(store[collection]) ? store[collection] : [];
  store[collection] = [entry, ...current].slice(0, limit);
  saveStore(store);
  return entry;
}

function recordSystemLog(level, event, details = {}, req = null) {
  return appendLog('system_logs', {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    level,
    event,
    requestId: req && req.requestId ? req.requestId : null,
    adminUser: req && req.admin ? req.admin.user : null,
    details,
  }, SYSTEM_LOG_LIMIT);
}

app.use((req, res, next) => {
  req.requestId = String(req.header('x-request-id') || crypto.randomUUID());
  res.setHeader('x-request-id', req.requestId);
  next();
});

// Endpoint público de datos (similar al original)
app.get('/api/data', (req, res) => {
  const store = loadStore();
  res.json({
    alojamientos: store.alojamientos || [],
    gastronomia: store.gastronomia || [],
    eventos: store.eventos || [],
    datosUtiles: transformDatosUtilesForPublic(store.datos_utiles || []),
    ratings: computeRatings(store),
  });
});

app.post('/api/bot/chat', async (req, res) => {
  const startedAt = Date.now();
  const message = sanitizeString(req.body && req.body.message, 1000).trim();
  if (!message) return res.status(400).json({ error: 'El mensaje es obligatorio', requestId: req.requestId });

  const store = loadStore();
  let source = 'local';
  let fallback = false;
  let category = 'general';
  let status = 'ok';
  let reply = '';
  let error = null;

  try {
    const local = answerLocally(message, store);
    if (local) {
      reply = local.reply;
      category = local.category;
    } else if (process.env.BOT_API_URL) {
      source = 'external';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), Number(process.env.BOT_TIMEOUT_MS || 6000));
      try {
        const response = await fetch(process.env.BOT_API_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(process.env.BOT_API_KEY ? { authorization: `Bearer ${process.env.BOT_API_KEY}` } : {}),
          },
          body: JSON.stringify({ message, systemPrompt: SYSTEM_PROMPT }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`upstream_${response.status}`);
        const data = await response.json();
        reply = sanitizeString(data.reply || data.response || data.message, 5000);
        if (!reply) throw new Error('upstream_empty');
      } finally {
        clearTimeout(timeout);
      }
    } else {
      fallback = true;
      source = 'fallback';
      reply = 'Puedo ayudarte con remises, alojamientos, gastronomía, eventos y datos útiles de San Roque. ¿Qué necesitás conocer?';
    }
  } catch (err) {
    fallback = true;
    source = 'fallback';
    status = 'degraded';
    error = sanitizeString(err && err.message, 200);
    reply = 'Ahora mismo respondo con la información local del portal. Consultame por remises, alojamientos, gastronomía, eventos o servicios de San Roque.';
    recordSystemLog('warning', 'bot_upstream_failure', { error }, req);
  }

  const latencyMs = Date.now() - startedAt;
  appendLog('bot_logs', {
    id: req.requestId,
    createdAt: new Date().toISOString(),
    category,
    source,
    status,
    fallback,
    latencyMs,
    inputLength: message.length,
    outputLength: reply.length,
    message: sanitizeString(message, 300),
    reply: sanitizeString(reply, 1000),
    error,
    ip: req.ip || 'unknown',
  }, BOT_LOG_LIMIT);

  res.json({ reply, source, fallback, category, requestId: req.requestId, latencyMs });
});

app.get('/admin/api/bot-config', (req, res) => {
  if (!['super-admin', 'editor'].includes(req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  res.json(publicBotConfig(process.env));
});

app.get('/admin/api/observability', (req, res) => {
  if (!['super-admin', 'editor'].includes(req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  const store = loadStore();
  const botLogs = store.bot_logs || [];
  res.json({
    metrics: {
      requests: botLogs.length,
      errors: botLogs.filter((item) => item.status !== 'ok').length,
      fallbacks: botLogs.filter((item) => item.fallback).length,
      averageLatencyMs: botLogs.length ? Math.round(botLogs.reduce((sum, item) => sum + Number(item.latencyMs || 0), 0) / botLogs.length) : 0,
    },
    botLogs,
    systemLogs: store.system_logs || [],
  });
});

// KPIs de seguridad para el superadmin. Cada métrica responde una pregunta operativa.
app.get('/admin/api/security/overview', (req, res) => {
  if (!isSuperAdmin(req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  const store = loadStore();
  const logs = Array.isArray(store.system_logs) ? store.system_logs : [];
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const in24h = (l) => new Date(l.createdAt).getTime() >= since;
  const users = Array.isArray(store.users) ? store.users : [];
  const bf = bruteforce.snapshot();
  res.json({
    generatedAt: new Date().toISOString(),
    kpis: {
      failedLogins24h: logs.filter((l) => l.event === 'admin_login_failed' && in24h(l)).length,
      blockedLogins24h: logs.filter((l) => l.event === 'admin_login_blocked' && in24h(l)).length,
      successfulLogins24h: logs.filter((l) => l.event === 'admin_login_success' && in24h(l)).length,
      lockedAccounts: bf.lockedAccounts,
      lockedIps: bf.lockedIps,
      superAdmins: countSuperAdmins(users),
      totalUsers: users.length,
      usersWithoutMfa: users.length, // MFA aún no implementado (ver roadmap)
    },
    recentSecurityEvents: logs
      .filter((l) => ['admin_login_failed', 'admin_login_blocked', 'admin_login_success', 'admin_login_session_error'].includes(l.event))
      .slice(0, 25),
  });
});

app.get('/admin/api/observability/export', (req, res) => {
  if (!['super-admin', 'editor'].includes(req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  const store = loadStore();
  res.setHeader('Content-Disposition', `attachment; filename="observabilidad-${Date.now()}.json"`);
  res.json({ exportedAt: new Date().toISOString(), botLogs: store.bot_logs || [], systemLogs: store.system_logs || [] });
});

// Public endpoint to create tickets (error reports) from the public site or clients
app.post('/api/tickets', (req, res) => {
  const payload = req.body || {};
  const ticket = {
    title: sanitizeString(payload.title || payload.titulo || 'Reporte'),
    message: sanitizeString(payload.message || payload.mensaje || payload.body || '' , 5000),
    email: sanitizeString(payload.email || '', 200),
    severity: sanitizeString(payload.severity || payload.severidad || 'normal', 30),
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  const item = createResource('tickets', ticket);
  recordAudit('create', 'tickets', item.id, req, item);
  res.status(201).json(item);
});

// Tipos válidos de ítem calificable.
const RATEABLE_TYPES = ['alojamiento', 'gastronomia'];

// Hash de IP para deduplicar votos sin almacenar la IP en claro (privacidad).
function hashIp(ip) {
  const salt = process.env.SESSION_SECRET || 'vsr-vote-salt';
  return crypto.createHash('sha256').update(String(ip || 'unknown') + '|' + salt).digest('hex');
}

// Promedio y cantidad de votos por ítem: { 'alojamiento:jr': { average, count } }.
function computeRatings(store) {
  const votes = Array.isArray(store.votes) ? store.votes : [];
  const acc = {};
  for (const v of votes) {
    const r = Number(v.rating);
    if (!v.itemType || !v.itemId || !(r >= 1 && r <= 5)) continue;
    const key = `${v.itemType}:${v.itemId}`;
    if (!acc[key]) acc[key] = { sum: 0, count: 0 };
    acc[key].sum += r;
    acc[key].count += 1;
  }
  const out = {};
  for (const [key, { sum, count }] of Object.entries(acc)) {
    out[key] = { average: Math.round((sum / count) * 10) / 10, count };
  }
  return out;
}

// Ratings agregados (público).
app.get('/api/ratings', (req, res) => {
  res.json({ ratings: computeRatings(loadStore()) });
});

// Registrar/actualizar voto: 1 por IP por ítem. Devuelve el promedio actualizado.
app.post('/api/vote', (req, res) => {
  const body = req.body || {};
  const itemType = String(body.itemType || '');
  const itemId = sanitizeString(body.itemId || '', 120).trim();
  const rating = Math.round(Number(body.rating));

  if (!RATEABLE_TYPES.includes(itemType) || !itemId) {
    return res.status(400).json({ error: 'Datos de voto inválidos.' });
  }
  if (!(rating >= 1 && rating <= 5)) {
    return res.status(400).json({ error: 'La calificación debe estar entre 1 y 5.' });
  }

  const store = loadStore();
  if (!Array.isArray(store.votes)) store.votes = [];
  const ipHash = hashIp(req.ip);

  // Un voto por IP por ítem: si ya existe, se actualiza (nunca suma un segundo voto).
  const existing = store.votes.find(
    (v) => v.itemType === itemType && String(v.itemId) === itemId && v.ipHash === ipHash
  );
  const nowIso = new Date().toISOString();
  let updated = false;
  if (existing) {
    existing.rating = rating;
    existing.updatedAt = nowIso;
    updated = true;
  } else {
    store.votes.unshift({
      id: makeId('vote'),
      itemType,
      itemId,
      rating,
      ipHash,
      createdAt: nowIso,
    });
  }
  saveStore(store);

  const agg = computeRatings(store)[`${itemType}:${itemId}`] || { average: rating, count: 1 };
  res.json({ ok: true, updated, yourRating: rating, average: agg.average, count: agg.count });
});

app.post('/admin/api/upload-image', (req, res) => {
  if (!['super-admin', 'editor'].includes(req.admin.role)) {
    return sendForbiddenOrUnauthenticated(req, res);
  }
  const { dataUrl } = req.body || {};
  if (!dataUrl || typeof dataUrl !== 'string') {
    return res.status(400).json({ error: 'Falta la imagen.' });
  }

  const matches = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!matches) {
    return res.status(400).json({ error: 'Formato de imagen inválido.' });
  }

  let buffer;
  try {
    buffer = Buffer.from(matches[2], 'base64');
  } catch (_) {
    return res.status(400).json({ error: 'Formato de imagen inválido.' });
  }

  // Límite de tamaño.
  if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
    return res.status(413).json({ error: `La imagen supera el máximo de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.` });
  }

  // Validación REAL por firma de contenido (no confía en la extensión/MIME declarado).
  // Rechaza SVG y cualquier tipo no listado (evita XSS por SVG y ejecutables disfrazados).
  const detected = IMAGE_SIGNATURES.find((sig) => sig.test(buffer));
  if (!detected) {
    return res.status(415).json({ error: 'Solo se permiten imágenes JPG, PNG o WebP. Preferí WebP.' });
  }

  // Nombre aleatorio (anti path-traversal / colisiones); extensión derivada de la firma.
  const ext = detected.mime === 'image/jpeg' ? 'jpg' : detected.mime.split('/')[1];
  const fileName = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  // Defensa en profundidad: el destino debe quedar dentro de UPLOAD_DIR.
  if (path.dirname(path.resolve(filePath)) !== path.resolve(UPLOAD_DIR)) {
    return res.status(400).json({ error: 'Ruta de destino inválida.' });
  }

  try {
    fs.writeFileSync(filePath, buffer);
  } catch (err) {
    console.error('[admin] upload image failed', err);
    return res.status(500).json({ error: 'No se pudo guardar la imagen.' });
  }

  recordAudit('upload', 'uploads', fileName, req, { bytes: buffer.length, mime: detected.mime });
  res.json({ url: `/admin/uploads/${fileName}`, mime: detected.mime, webp: detected.mime === 'image/webp' });
});

// --- Authentication endpoints ---
// Hash señuelo para comparar en tiempo constante cuando el usuario no existe
// (mitiga enumeración por temporización). Se calcula una vez al arrancar.
const DUMMY_HASH = bcrypt.hashSync('user-does-not-exist-constant-time', 10);

function isActiveUser(user) {
  if (!user) return false;
  const st = String(user.status || 'active').toLowerCase();
  return ['active', 'enabled', 'published', ''].includes(st);
}

// Regenera el id de sesión (anti session-fixation) y persiste el estado admin.
function establishSession(req, adminObj) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.admin = adminObj;
      req.session.createdAt = Date.now();
      req.session.lastSeen = Date.now();
      req.session.save((err2) => (err2 ? reject(err2) : resolve()));
    });
  });
}

async function handleAdminLogin(req, res) {
  const body = req.body || {};
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const ip = req.ip || 'unknown';

  // Respuesta de fallo SIEMPRE genérica: no revela usuario, contraseña ni bloqueo.
  const genericFail = (reason, status = 401) => {
    recordSystemLog('warning', 'admin_login_failed', { username: sanitizeString(username, 80), reason }, req);
    return res.status(status).json({ error: bruteforce.GENERIC_LOGIN_ERROR });
  };

  if (!username || !password) {
    return res.status(400).json({ error: bruteforce.GENERIC_LOGIN_ERROR });
  }

  // Anti fuerza bruta: evalúa bloqueo por IP + cuenta antes de tocar credenciales.
  const gate = bruteforce.assess({ ip, username });
  if (gate.blocked) {
    recordSystemLog('warning', 'admin_login_blocked', { username: sanitizeString(username, 80) }, req);
    await bruteforce.delay(300);
    return res.status(401).json({ error: bruteforce.GENERIC_LOGIN_ERROR });
  }
  if (gate.delayMs) await bruteforce.delay(gate.delayMs); // retraso progresivo

  const adminUser = process.env.ADMIN_USER || 'gestion.turistica.sr';
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  const setupPassword = process.env.ADMIN_SETUP_PASSWORD;
  const devPassword = process.env.ADMIN_DEV_PASSWORD;
  const allowSetupFallback = setupPassword && (!adminHash || !IS_PROD);
  const isAdminUser = username === String(adminUser);

  const store = loadStore();
  const users = Array.isArray(store.users) ? store.users : [];
  const user = users.find((u) => String(u.username) === username);

  let authed = null; // { id, username, role }

  // 1) Bootstrap inicial: store sin usuarios y contraseña de setup.
  if (!authed && !user && users.length === 0 && setupPassword && password === setupPassword) {
    const nu = createResource('users', { username, name: username, role: 'super-admin', status: 'active', passwordHash: bcrypt.hashSync(password, 10) });
    authed = { id: nu.id, username: nu.username, role: 'super-admin' };
  }
  // 2) ADMIN_PASSWORD_HASH para el admin configurado.
  if (!authed && !user && isAdminUser && adminHash && await bcrypt.compare(password, adminHash)) {
    const nu = createResource('users', { username: adminUser, name: adminUser, role: 'super-admin', status: 'active', passwordHash: adminHash });
    authed = { id: nu.id, username: nu.username, role: 'super-admin' };
  }
  // 3) Contraseña de desarrollo (jamás en producción).
  if (!authed && !user && isAdminUser && devPassword && !IS_PROD && password === devPassword) {
    const nu = createResource('users', { username: adminUser, name: adminUser, role: 'super-admin', status: 'active', passwordHash: bcrypt.hashSync(devPassword, 10) });
    authed = { id: nu.id, username: nu.username, role: 'super-admin' };
  }
  // 4) Setup password para el admin (dev, o prod sin hash aún configurado).
  if (!authed && isAdminUser && allowSetupFallback && password === setupPassword) {
    const eu = user || createResource('users', { username: adminUser, name: adminUser, role: 'super-admin', status: 'active', passwordHash: bcrypt.hashSync(setupPassword, 10) });
    authed = { id: eu.id, username: eu.username, role: eu.role || 'super-admin' };
  }
  // 5) Usuario normal del store. Compara SIEMPRE (hash real o señuelo) => tiempo constante.
  if (!authed) {
    const hash = (user && user.passwordHash) ? user.passwordHash : DUMMY_HASH;
    const ok = await bcrypt.compare(password, hash);
    if (user && user.passwordHash && ok && isActiveUser(user)) {
      authed = { id: user.id, username: user.username, role: user.role || 'editor' };
    }
  }

  if (!authed) {
    bruteforce.recordFailure({ ip, username });
    return genericFail('invalid_credentials');
  }

  try {
    await establishSession(req, { user: authed.username || authed.id, role: authed.role });
  } catch (e) {
    recordSystemLog('error', 'admin_login_session_error', { username: sanitizeString(username, 80) }, req);
    return res.status(500).json({ error: bruteforce.GENERIC_LOGIN_ERROR });
  }
  bruteforce.recordSuccess({ ip, username });
  recordSystemLog('info', 'admin_login_success', { username: authed.username, role: authed.role }, req);
  return res.json({ ok: true, user: { id: authed.id, username: authed.username, role: authed.role } });
}

app.post('/admin/login', handleAdminLogin);
app.post('/admin/api/login', handleAdminLogin);

app.post('/admin/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(() => {});
  }
  res.json({ ok: true });
});

app.get('/admin/api/session', (req, res) => {
  if (req.session && req.session.admin) return res.json({ admin: req.session.admin });
  // Sin sesión de servidor => 401 para que el SPA redirija al login único (/admin/login).
  return res.status(401).json({ error: 'Unauthenticated' });
});

function makeId(prefix = 'item') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// Basic sanitization/validation helpers (no external deps)
function sanitizeString(v, maxLen = 2000) {
  if (v === undefined || v === null) return '';
  let s = String(v);
  // strip tags
  s = s.replace(/<[^>]*>/g, '');
  // collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

function toNumber(v, fallback = undefined) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeActiveValue(value) {
  if (typeof value === 'number') {
    return value === 1 ? 1 : 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'si', 'yes', 'on', 'activo', 'visible', 'show', 'published'].includes(normalized)) return 1;
    if (['0', 'false', 'no', 'off', 'inactivo', 'oculto', 'hidden', 'draft', 'inactive'].includes(normalized)) return 0;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value ? 1 : 0;
}

function validateAndSanitize(collection, data) {
  if (!data || typeof data !== 'object') return {};
  const out = {};
  switch (collection) {
    case 'users':
      out.username = sanitizeString(data.username || data.user || data.id || '', 80);
      out.name = sanitizeString(data.name || '', 120);
      out.role = (sanitizeString(data.role || 'guest', 30)).toLowerCase();
      if (!['super-admin', 'editor', 'viewer', 'guest'].includes(out.role)) out.role = 'guest';
      out.status = (sanitizeString(data.status || 'active', 30)).toLowerCase();
      if (!['active', 'inactive', 'pending', 'banned'].includes(out.status)) out.status = 'active';
      // other fields preserved but sanitized
      break;
    case 'alojamientos':
      out.titulo = sanitizeString(data.titulo || data.title || '', 200);
      out.categoria = sanitizeString(data.categoria || '', 80);
      out.lat = toNumber(data.lat, undefined);
      out.lon = toNumber(data.lon, undefined);
      out.rating = sanitizeString(data.rating || '', 10);
      out.ubicacion = sanitizeString(data.ubicacion || '', 120);
      out.mainImg = sanitizeString(data.mainImg || data.imagen || '', 300);
      out.descripcionLarga = sanitizeString(data.descripcionLarga || data.descripcion || '', 4000);
      out.activo = normalizeActiveValue(data.activo);
      out.status = (sanitizeString(data.status || 'published', 30)).toLowerCase();
      break;
    case 'gastronomia':
      out.nombre = sanitizeString(data.nombre || '', 200);
      out.tipo = sanitizeString(data.tipo || '', 60);
      out.direccion = sanitizeString(data.direccion || '', 200);
      out.horario = sanitizeString(data.horario || '', 120);
      out.imagen = sanitizeString(data.imagen || '', 300);
      out.activo = normalizeActiveValue(data.activo);
      out.status = (sanitizeString(data.status || 'published', 30)).toLowerCase();
      break;
    case 'eventos':
      out.titulo = sanitizeString(data.titulo || '', 200);
      out.descripcion = sanitizeString(data.descripcion || '', 2000);
      out.fecha = sanitizeString(data.fecha || '', 40);
      out.hora = sanitizeString(data.hora || '', 40);
      out.lugar = sanitizeString(data.lugar || '', 200);
      out.tipo = sanitizeString(data.tipo || '', 60);
      out.imagen = sanitizeString(data.imagen || '', 300);
      out.status = (sanitizeString(data.status || 'published', 30)).toLowerCase();
      break;
    case 'datos_utiles':
    case 'datos-utiles':
      out.categoria = sanitizeString(data.categoria || '', 120);
      out.titulo = sanitizeString(data.titulo || '', 200);
      out.descripcion = sanitizeString(data.descripcion || '', 2000);
      out.activo = normalizeActiveValue(data.activo);
      // contenido should be an object — try to parse if string
      if (typeof data.contenido === 'string') {
        try { out.contenido = JSON.parse(data.contenido); } catch (e) { out.contenido = {}; }
      } else if (typeof data.contenido === 'object' && data.contenido !== null) {
        out.contenido = data.contenido;
      } else out.contenido = {};
      break;
    default:
      // Generic: copy keys but sanitize strings and numbers
      for (const k of Object.keys(data)) {
        const v = data[k];
        if (typeof v === 'string') out[k] = sanitizeString(v);
        else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
        else if (typeof v === 'object') out[k] = v;
      }
  }
  return out;
}

function isInvalidPublishedImage(value) {
  const img = sanitizeString(value || '', 300).trim();
  return !img || img === 'x' || img.includes('logo-muni');
}

function assertPublishedImage(collection, payload) {
  if (!payload || payload.status !== 'published') return;
  if (!['alojamientos', 'gastronomia', 'eventos'].includes(collection)) return;
  const field = collection === 'alojamientos' ? 'mainImg' : 'imagen';
  if (isInvalidPublishedImage(payload[field])) {
    throw new Error('Imagen obligatoria para contenido publicado (use una foto del local, no el logo municipal).');
  }
}

function getCollection(name) {
  const store = loadStore();
  return store[name] || [];
}

function setCollection(name, items) {
  const store = loadStore();
  store[name] = items;
  saveStore(store);
  return store;
}

function createResource(name, data) {
  const item = Object.assign({ id: makeId(name), createdAt: new Date().toISOString() }, data);
  const items = getCollection(name);
  items.unshift(item);
  setCollection(name, items);
  return item;
}

function updateResource(name, id, data) {
  const items = getCollection(name);
  const index = items.findIndex((item) => String(item.id) === String(id));
  if (index < 0) return null;
  items[index] = Object.assign({}, items[index], data, { updatedAt: new Date().toISOString() });
  setCollection(name, items);
  return items[index];
}

function deleteResource(name, id) {
  const items = getCollection(name);
  const index = items.findIndex((item) => String(item.id) === String(id));
  if (index < 0) return false;
  items.splice(index, 1);
  setCollection(name, items);
  return true;
}

function getResource(name, id) {
  return getCollection(name).find((item) => String(item.id) === String(id));
}

function sendNotFound(res) {
  return res.status(404).json({ error: 'Not found' });
}

function canRead(name, role) {
  if (name === 'users') return ['super-admin'].includes(role);
  if (name === 'reviews') return ['super-admin', 'editor', 'viewer'].includes(role);
  if (name === 'tickets') return ['super-admin', 'editor'].includes(role);
  if (name === 'audit') return ['super-admin', 'editor'].includes(role);
  return ['super-admin', 'editor', 'viewer', 'guest'].includes(role);
}

function canWrite(name, role) {
  if (name === 'users') return role === 'super-admin';
  if (name === 'reviews') return ['super-admin', 'editor'].includes(role);
  if (name === 'tickets') return ['super-admin', 'editor'].includes(role);
  return ['super-admin', 'editor'].includes(role);
}

function canDelete(name, role) {
  if (name === 'users') return role === 'super-admin';
  if (name === 'reviews') return role === 'super-admin';
  if (name === 'uploads') return role === 'super-admin';
  return ['super-admin', 'editor'].includes(role);
}

function isSuperAdmin(role) {
  return String(role).toLowerCase() === 'super-admin';
}

function canManageUploads(role) {
  return ['super-admin', 'editor'].includes(String(role).toLowerCase());
}

function canBackupRestore(role) {
  return isSuperAdmin(role);
}

// Jerarquía de roles (mayor número = más privilegio). Base para impedir escalada.
const ROLE_RANK = {
  guest: 0,
  viewer: 1,
  auditor: 2,
  soporte: 2,
  operador: 3,
  editor: 4,
  admin: 8,
  'super-admin': 10,
};
function roleRank(role) {
  return ROLE_RANK[String(role || 'guest').toLowerCase()] ?? 0;
}
function isKnownRole(role) {
  return Object.prototype.hasOwnProperty.call(ROLE_RANK, String(role || '').toLowerCase());
}
function countSuperAdmins(users) {
  return (users || []).filter((u) => isSuperAdmin(u.role) && isActiveUser(u)).length;
}

function recordAudit(action, resource, resourceId, req, changes = {}) {
  const store = loadStore();
  const entry = {
    id: makeId('audit'),
    action,
    resource,
    resourceId,
    adminUser: req.admin.user,
    adminRole: req.admin.role,
    changes,
    ip: req.ip || 'unknown',
    createdAt: new Date().toISOString(),
  };
  store.audit.unshift(entry);
  saveStore(store);
  return entry;
}

function resourceRoutes(basePath, name) {
  app.get(basePath, (req, res) => {
    if (!canRead(name, req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
    res.json(getCollection(name));
  });
  app.get(`${basePath}/:id`, (req, res) => {
    if (!canRead(name, req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
    const item = getResource(name, req.params.id);
    if (!item) return sendNotFound(res);
    res.json(item);
  });
  app.post(basePath, (req, res) => {
    if (!canWrite(name, req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
    try {
      const payload = validateAndSanitize(name, req.body || {});
      assertPublishedImage(name, payload);
      const item = createResource(name, payload);
      recordAudit('create', name, item.id, req, item);
      return res.status(201).json(item);
    } catch (e) {
      const message = e && e.message ? e.message : 'Invalid payload';
      return res.status(400).json({ error: message });
    }
  });
  app.put(`${basePath}/:id`, (req, res) => {
    if (!canWrite(name, req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
    try {
      const payload = validateAndSanitize(name, req.body || {});
      assertPublishedImage(name, payload);
      const result = updateResource(name, req.params.id, payload);
      if (!result) return sendNotFound(res);
      recordAudit('update', name, req.params.id, req, payload);
      return res.json(result);
    } catch (e) {
      const message = e && e.message ? e.message : 'Invalid payload';
      return res.status(400).json({ error: message });
    }
  });
  app.delete(`${basePath}/:id`, (req, res) => {
    if (!canDelete(name, req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
    if (!deleteResource(name, req.params.id)) return sendNotFound(res);
    recordAudit('delete', name, req.params.id, req, {});
    res.json({ success: true });
  });
}

resourceRoutes('/admin/api/alojamientos', 'alojamientos');
resourceRoutes('/admin/api/gastronomia', 'gastronomia');
resourceRoutes('/admin/api/eventos', 'eventos');
resourceRoutes('/admin/api/tickets', 'tickets');

app.get('/admin/api/datos-utiles', (req, res) => {
  if (!canRead('datos_utiles', req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  res.json(getCollection('datos_utiles'));
});
app.get('/admin/api/datos-utiles/:categoria', (req, res) => {
  if (!canRead('datos_utiles', req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  const item = getCollection('datos_utiles').find((entry) => String(entry.categoria) === String(req.params.categoria));
  if (!item) return sendNotFound(res);
  res.json(item);
});
app.put('/admin/api/datos-utiles/:categoria', (req, res) => {
  if (!canWrite('datos_utiles', req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  try {
    const items = getCollection('datos_utiles');
    const idx = items.findIndex((item) => String(item.categoria) === String(req.params.categoria));
    const sanitized = validateAndSanitize('datos_utiles', Object.assign({ categoria: req.params.categoria }, req.body || {}));
    const payload = Object.assign({}, sanitized, { updatedAt: new Date().toISOString() });
    if (idx >= 0) {
      items[idx] = Object.assign({}, items[idx], payload);
    } else {
      payload.id = makeId('datos');
      payload.createdAt = new Date().toISOString();
      items.unshift(payload);
    }
    setCollection('datos_utiles', items);
    recordAudit('upsert', 'datos_utiles', payload.id || req.params.categoria, req, payload);
    return res.json(payload);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
});
app.delete('/admin/api/datos-utiles/:categoria', (req, res) => {
  if (!canDelete('datos_utiles', req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  const items = getCollection('datos_utiles');
  const idx = items.findIndex((item) => String(item.categoria) === String(req.params.categoria));
  if (idx < 0) return sendNotFound(res);
  items.splice(idx, 1);
  setCollection('datos_utiles', items);
  res.json({ success: true });
});

app.get('/admin/api/users', (req, res) => {
  if (!canRead('users', req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  const s = loadStore();
  const safeUsers = (s.users || []).map((u) => {
    const copy = Object.assign({}, u);
    if (copy.passwordHash) delete copy.passwordHash;
    return copy;
  });
  res.json({ users: safeUsers });
});
app.get('/admin/api/users/:id', (req, res) => {
  if (!canRead('users', req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  const user = getResource('users', req.params.id);
  if (!user) return sendNotFound(res);
  const copy = Object.assign({}, user);
  if (copy.passwordHash) delete copy.passwordHash;
  res.json(copy);
});
app.post('/admin/api/users', (req, res) => {
  if (!canWrite('users', req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  const body = Object.assign({}, req.body || {});
  const actorRank = roleRank(req.admin.role);
  // No se puede crear un rol desconocido ni superior al del actor.
  if (body.role !== undefined) {
    if (!isKnownRole(body.role)) return res.status(400).json({ error: 'Rol inválido.' });
    if (roleRank(body.role) > actorRank) return res.status(403).json({ error: 'No podés asignar un rol superior al tuyo.' });
  }
  // Mass-assignment: nunca se aceptan estos campos desde el cliente.
  delete body.id; delete body.createdAt; delete body.passwordHash;
  if (body.password) {
    body.passwordHash = bcrypt.hashSync(String(body.password), 10);
    delete body.password;
  }
  const item = createResource('users', body);
  const safe = Object.assign({}, item);
  delete safe.passwordHash;
  recordAudit('create', 'users', item.id, req, safe); // audita sin secretos
  res.status(201).json(safe);
});
app.put('/admin/api/users/:id', (req, res) => {
  if (!canWrite('users', req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  const body = Object.assign({}, req.body || {});
  const actorRank = roleRank(req.admin.role);
  const store = loadStore();
  const target = (store.users || []).find((u) => String(u.id) === String(req.params.id));
  if (!target) return sendNotFound(res);
  const isSelf = String(target.username) === String(req.admin.user) || String(target.id) === String(req.admin.user);

  // No se puede modificar a alguien de rango mayor al propio.
  if (roleRank(target.role) > actorRank) {
    return res.status(403).json({ error: 'No podés modificar a un usuario de rol superior.' });
  }
  // Cambio de rol: debe ser conocido y no superior al del actor.
  if (body.role !== undefined) {
    if (!isKnownRole(body.role)) return res.status(400).json({ error: 'Rol inválido.' });
    if (roleRank(body.role) > actorRank) return res.status(403).json({ error: 'No podés asignar un rol superior al tuyo.' });
    // Un actor no puede auto-elevarse ni bajar al único super-admin restante.
    if (isSelf && roleRank(body.role) > roleRank(target.role)) return res.status(403).json({ error: 'No podés cambiar tu propio rol.' });
    if (isSuperAdmin(target.role) && !isSuperAdmin(body.role) && countSuperAdmins(store.users) <= 1) {
      return res.status(409).json({ error: 'Debe existir al menos un super-administrador activo.' });
    }
  }
  // Impide que un actor se desactive a sí mismo dejando el sistema sin super-admin.
  if (isSelf && body.status !== undefined && !isActiveUser({ status: body.status }) && isSuperAdmin(target.role) && countSuperAdmins(store.users) <= 1) {
    return res.status(409).json({ error: 'Debe existir al menos un super-administrador activo.' });
  }
  delete body.id; delete body.createdAt; delete body.passwordHash;
  if (body.password) {
    body.passwordHash = bcrypt.hashSync(String(body.password), 10);
    delete body.password;
  }
  const result = updateResource('users', req.params.id, body);
  if (!result) return sendNotFound(res);
  const safe = Object.assign({}, result);
  const auditChanges = Object.assign({}, body); delete auditChanges.passwordHash;
  delete safe.passwordHash;
  recordAudit('update', 'users', req.params.id, req, auditChanges);
  res.json(safe);
});
app.delete('/admin/api/users/:id', (req, res) => {
  if (!canDelete('users', req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  const store = loadStore();
  const target = (store.users || []).find((u) => String(u.id) === String(req.params.id));
  if (!target) return sendNotFound(res);
  const isSelf = String(target.username) === String(req.admin.user) || String(target.id) === String(req.admin.user);
  if (isSelf) return res.status(409).json({ error: 'No podés eliminar tu propia cuenta.' });
  if (roleRank(target.role) > roleRank(req.admin.role)) {
    return res.status(403).json({ error: 'No podés eliminar a un usuario de rol superior.' });
  }
  if (isSuperAdmin(target.role) && countSuperAdmins(store.users) <= 1) {
    return res.status(409).json({ error: 'Debe existir al menos un super-administrador activo.' });
  }
  if (!deleteResource('users', req.params.id)) return sendNotFound(res);
  recordAudit('delete', 'users', req.params.id, req, { username: target.username, role: target.role });
  res.json({ success: true });
});

app.get('/admin/api/reviews', (req, res) => {
  if (!canRead('reviews', req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  const s = loadStore();
  res.json({ reviews: s.reviews || [] });
});
app.get('/admin/api/reviews/:id', (req, res) => {
  if (!canRead('reviews', req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  const review = getResource('reviews', req.params.id);
  if (!review) return sendNotFound(res);
  res.json(review);
});
app.patch('/admin/api/reviews/:id', (req, res) => {
  if (!canWrite('reviews', req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  const result = updateResource('reviews', req.params.id, req.body || {});
  if (!result) return sendNotFound(res);
  recordAudit('update', 'reviews', req.params.id, req, req.body || {});
  res.json(result);
});
app.delete('/admin/api/reviews/:id', (req, res) => {
  if (!canDelete('reviews', req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  if (!deleteResource('reviews', req.params.id)) return sendNotFound(res);
  recordAudit('delete', 'reviews', req.params.id, req, {});
  res.json({ success: true });
});
app.get('/admin/api/audit', (req, res) => {
  if (!canRead('audit', req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  const store = loadStore();
  res.json({ audit: store.audit || [] });
});

// Exponer parte del store para herramientas internas (analytics). Restringido a roles con lectura amplia.
app.get('/admin/api/store', (req, res) => {
  if (!canRead('audit', req.admin.role) && !['super-admin','editor'].includes(req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  const store = loadStore();
  // enviar solo analytics y metadatos mínimos
  return res.json({ store: { analytics: store.analytics || {}, createdAt: store.createdAt } });
});

app.get('/admin/api/uploads', (req, res) => {
  if (!canManageUploads(req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  try {
    const files = fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR) : [];
    const uploads = files
      .filter((file) => typeof file === 'string')
      .map((file) => ({
        name: file,
        url: `/admin/uploads/${encodeURIComponent(file)}`,
      }));
    return res.json({ uploads });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to read uploads' });
  }
});

app.delete('/admin/api/uploads/:name', (req, res) => {
  if (!canDelete('uploads', req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  const filename = path.basename(req.params.name || '');
  if (!filename) return sendNotFound(res);
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) return sendNotFound(res);
  try {
    fs.unlinkSync(filePath);
    recordAudit('delete', 'uploads', filename, req, {});
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to delete upload' });
  }
});

app.get('/admin/api/backup', (req, res) => {
  if (!canBackupRestore(req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  const store = loadStore();
  res.setHeader('Content-Disposition', `attachment; filename="admin-backup-${Date.now()}.json"`);
  res.json(store);
});

app.post('/admin/api/restore', (req, res) => {
  if (!canBackupRestore(req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Invalid backup payload' });
  try {
    const restored = normalizeStore(req.body);
    saveStore(restored);
    recordAudit('restore', 'backup', 'admin', req, { restoredAt: new Date().toISOString() });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ error: 'Invalid backup payload' });
  }
});

// Servir la página de login dedicada en /admin/login
app.get('/admin/login', (req, res) => {
  const loginPath = path.join(__dirname, 'static', 'login.html');
  if (fs.existsSync(loginPath)) return res.sendFile(loginPath);
  return res.status(404).send('Login page not found');
});

// Gate del SPA: sin sesión válida NO se sirve el HTML del panel; se redirige al
// login único. Evita exponer estructura/markup del admin a anónimos.
function serveAdminSpa(req, res) {
  if (!req.session || !req.session.admin) {
    const next = encodeURIComponent(req.originalUrl || '/admin');
    return res.redirect(302, `/admin/login?next=${next}`);
  }
  const indexPath = path.join(__dirname, 'static', 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  return res.status(404).send('Index not found');
}
app.get('/admin', serveAdminSpa);
app.get('/admin/*', serveAdminSpa);

// Fallback 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => {
  console.log(`[admin] versión mínima escuchando en :${PORT}`);
  recordSystemLog('info', 'system_started', { port: PORT, nodeEnv: process.env.NODE_ENV || 'development' });
});
