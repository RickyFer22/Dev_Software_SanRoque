'use strict';

// Versión mínima y estable del servidor admin para evitar errores de sintaxis.
// NOTA: Esta implementación es temporal. Restaura /admin y endpoints básicos
// para permitir que el proceso Node arranque y que el resto de la app funcione.

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DATA_FILE = path.join(DATA_DIR, 'admin.json');
const LOCAL_ENV_FILE = path.join(__dirname, '..', '.env');

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
    createdAt: store.createdAt || new Date().toISOString(),
  };
}

function loadStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initial = buildInitialStore();
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return normalizeStore(JSON.parse(raw || '{}'));
  } catch (e) {
    console.error('[admin] error loading store', e);
    const initial = buildInitialStore();
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

app.use(express.json({ limit: '20mb' }));

// Use the official `cors` middleware to handle preflight and allow cross-origin
// requests during development. This permits the public site at different
// origins (e.g. Live Server at :5500) to fetch `/api/*` resources.
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests from any origin during local development. If running in
    // production, consider restricting this to the site origin.
    cb(null, true);
  },
  credentials: true,
  exposedHeaders: ['Content-Disposition'],
}));

// Ensure preflight (OPTIONS) requests are handled and return CORS headers
app.options('*', cors({ origin: true, credentials: true }));

// El store en memoria evita la incompatibilidad del adaptador SQLite de sesiones
// que impedía iniciar el contenedor. Los datos administrados siguen persistiendo
// en DATA_DIR; solo las sesiones se renuevan cuando reinicia el servicio.
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day
}));

// attach admin info to req: prefer session, fallback to headers
app.use((req, res, next) => {
  if (req.session && req.session.admin) {
    req.admin = { user: req.session.admin.user, role: req.session.admin.role };
    return next();
  }
  req.admin = {
    user: String(req.header('x-admin-user') || 'anonymous'),
    role: String(req.header('x-admin-role') || 'guest').toLowerCase(),
  };
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

// Endpoint público de datos (similar al original)
app.get('/api/data', (req, res) => {
  const store = loadStore();
  res.json({
    alojamientos: store.alojamientos || [],
    gastronomia: store.gastronomia || [],
    eventos: store.eventos || [],
    datosUtiles: transformDatosUtilesForPublic(store.datos_utiles || []),
  });
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

app.post('/api/vote', (req, res) => {
  const { itemType, itemId, rating } = req.body || {};
  if (!itemType || !itemId || !rating) {
    return res.status(400).json({ error: 'itemType, itemId and rating are required' });
  }

  const store = loadStore();
  const vote = {
    id: makeId('vote'),
    itemType,
    itemId,
    rating: Number(rating),
    ip: req.ip || 'unknown',
    createdAt: new Date().toISOString(),
  };
  store.votes.unshift(vote);
  saveStore(store);
  res.json({ ok: true, vote });
});

app.post('/admin/api/upload-image', (req, res) => {
  if (!['super-admin', 'editor'].includes(req.admin.role)) {
    return sendForbiddenOrUnauthenticated(req, res);
  }
  const { filename, dataUrl } = req.body || {};
  if (!dataUrl) {
    return res.status(400).json({ error: 'dataUrl is required' });
  }

  const matches = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!matches) {
    return res.status(400).json({ error: 'Invalid image data URL' });
  }

  const mimeType = matches[1];
  const base64 = matches[2];
  const ext = mimeType.split('/')[1].replace('+', '');
  const safeName = String(filename || `upload-${Date.now()}`).replace(/[^a-zA-Z0-9-_\.]/g, '_');
  const fileName = `${Date.now()}-${safeName}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  try {
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  } catch (err) {
    console.error('[admin] upload image failed', err);
    return res.status(500).json({ error: 'Failed to save image' });
  }

  res.json({ url: `/admin/uploads/${fileName}` });
});

// --- Authentication endpoints ---
async function handleAdminLogin(req, res) {
  const { username, password } = req.body || {};
  console.log(`[admin] login request path=${req.path} username=${String(username)}`);
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  const setupPassword = process.env.ADMIN_SETUP_PASSWORD;
  const devPassword = process.env.ADMIN_DEV_PASSWORD;
  const allowSetupFallback = setupPassword && (!adminHash || process.env.NODE_ENV !== 'production');
  const isAdminUser = String(username) === String(adminUser);

  const store = loadStore();
  const users = Array.isArray(store.users) ? store.users : [];
  const user = users.find((u) => String(u.username) === String(username));

  // First-time bootstrap with ADMIN_SETUP_PASSWORD when the DB is empty.
  if (!user && users.length === 0 && setupPassword) {
    if (password === setupPassword) {
      const pwdHash = bcrypt.hashSync(password, 10);
      const newUser = createResource('users', {
        username,
        name: username,
        role: 'super-admin',
        status: 'active',
        passwordHash: pwdHash,
      });
      req.session.admin = { user: newUser.username || newUser.id, role: newUser.role || 'super-admin' };
      return res.json({ ok: true, user: { id: newUser.id, username: newUser.username, role: newUser.role } });
    }
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Allow login via ADMIN_PASSWORD_HASH for the configured admin user.
  if (!user && isAdminUser && adminHash) {
    const ok = await bcrypt.compare(password, adminHash);
    if (ok) {
      const newUser = createResource('users', {
        username: adminUser,
        name: adminUser,
        role: 'super-admin',
        status: 'active',
        passwordHash: adminHash,
      });
      req.session.admin = { user: newUser.username || newUser.id, role: newUser.role || 'super-admin' };
      return res.json({ ok: true, user: { id: newUser.id, username: newUser.username, role: newUser.role } });
    }
  }

  // Dev lower-security fallback for local testing only.
  if (!user && isAdminUser && devPassword && process.env.NODE_ENV !== 'production') {
    if (password === devPassword) {
      const pwdHash = bcrypt.hashSync(devPassword, 10);
      const newUser = createResource('users', {
        username: adminUser,
        name: adminUser,
        role: 'super-admin',
        status: 'active',
        passwordHash: pwdHash,
      });
      req.session.admin = { user: newUser.username || newUser.id, role: newUser.role || 'super-admin' };
      return res.json({ ok: true, user: { id: newUser.id, username: newUser.username, role: newUser.role } });
    }
  }

  // Local development fallback: allow ADMIN_SETUP_PASSWORD for the default admin account even if it already exists.
  if (isAdminUser && allowSetupFallback) {
    if (password === setupPassword) {
      const existingUser = user || createResource('users', {
        username: adminUser,
        name: adminUser,
        role: 'super-admin',
        status: 'active',
        passwordHash: bcrypt.hashSync(setupPassword, 10),
      });
      req.session.admin = { user: existingUser.username || existingUser.id, role: existingUser.role || 'super-admin' };
      return res.json({ ok: true, user: { id: existingUser.id, username: existingUser.username, role: existingUser.role || 'super-admin' } });
    }
  }

  if (!user || !user.passwordHash) return res.status(403).json({ error: 'Forbidden' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(403).json({ error: 'Forbidden' });

  req.session.admin = { user: user.username || user.id, role: user.role || 'editor' };
  return res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
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
  return res.json({ admin: { user: req.admin.user, role: req.admin.role } });
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
      const item = createResource(name, payload);
      recordAudit('create', name, item.id, req, item);
      return res.status(201).json(item);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
  });
  app.put(`${basePath}/:id`, (req, res) => {
    if (!canWrite(name, req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
    try {
      const payload = validateAndSanitize(name, req.body || {});
      const result = updateResource(name, req.params.id, payload);
      if (!result) return sendNotFound(res);
      recordAudit('update', name, req.params.id, req, payload);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid payload' });
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
  const body = req.body || {};
  if (body.password) {
    body.passwordHash = bcrypt.hashSync(String(body.password), 10);
    delete body.password;
  }
  const item = createResource('users', body);
  recordAudit('create', 'users', item.id, req, item);
  const safe = Object.assign({}, item);
  if (safe.passwordHash) delete safe.passwordHash;
  res.status(201).json(safe);
});
app.put('/admin/api/users/:id', (req, res) => {
  if (!canWrite('users', req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  const body = req.body || {};
  if (body.password) {
    body.passwordHash = bcrypt.hashSync(String(body.password), 10);
    delete body.password;
  }
  const result = updateResource('users', req.params.id, body);
  if (!result) return sendNotFound(res);
  recordAudit('update', 'users', req.params.id, req, req.body || {});
  const safe = Object.assign({}, result);
  if (safe.passwordHash) delete safe.passwordHash;
  res.json(safe);
});
app.delete('/admin/api/users/:id', (req, res) => {
  if (!canDelete('users', req.admin.role)) return sendForbiddenOrUnauthenticated(req, res);
  if (!deleteResource('users', req.params.id)) return sendNotFound(res);
  recordAudit('delete', 'users', req.params.id, req, {});
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

// Servir la página SPA estática en /admin y rutas hijas
app.get('/admin', (req, res) => {
  const indexPath = path.join(__dirname, 'static', 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  return res.send('<!doctype html><html><body><p>Panel temporal. Static index no encontrado.</p></body></html>');
});
app.get('/admin/*', (req, res) => {
  const indexPath = path.join(__dirname, 'static', 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  return res.status(404).send('Index not found');
});

// Fallback 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => {
  console.log(`[admin] versión mínima escuchando en :${PORT}`);
});
