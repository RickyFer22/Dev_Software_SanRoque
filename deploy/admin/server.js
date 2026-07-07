'use strict';

/**
 * Backend del Panel de Administración — Portal Turístico de San Roque
 *
 * Rutas públicas:
 *   GET  /health          — healthcheck
 *   GET  /api/data        — datos públicos (alojamientos, gastronomia, eventos, datosUtiles)
 *
 * Rutas de autenticación:
 *   GET  /admin/login     — formulario de login
 *   POST /admin/login     — procesa credenciales
 *   POST /admin/logout    — cierra sesión
 *
 * Rutas protegidas (requieren sesión):
 *   GET  /admin           — dashboard SPA
 *   CRUD /admin/api/alojamientos
 *   CRUD /admin/api/gastronomia
 *   CRUD /admin/api/eventos
 *   CRUD /admin/api/datos-utiles
 */

const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// ── Config ──────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '4000', 10);
const DATA_DIR = process.env.DATA_DIR || '/data';
const DB_PATH = path.join(DATA_DIR, 'admin.db');
const SESSION_DB = path.join(DATA_DIR, 'sessions.db');
const SESSION_SECRET = process.env.SESSION_SECRET || 'changeme-session-secret-min-32chars!!';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH || '';  // bcrypt hash
// Si no hay hash configurado, usar contraseña de desarrollo temporal
const DEV_PASSWORD = process.env.ADMIN_DEV_PASSWORD || '';

// Asegurar que el directorio de datos exista
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Base de datos ────────────────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS alojamientos (
    id          TEXT PRIMARY KEY,
    titulo      TEXT NOT NULL,
    categoria   TEXT NOT NULL DEFAULT 'hospedaje',
    lat         REAL,
    lon         REAL,
    rating      TEXT DEFAULT '4.5',
    reviewsCount TEXT DEFAULT '0 reseñas',
    ubicacion   TEXT DEFAULT 'San Roque',
    mainImg     TEXT DEFAULT '',
    galeria     TEXT DEFAULT '[]',
    descripcionLarga TEXT DEFAULT '',
    capacidad   TEXT DEFAULT '[]',
    servicios   TEXT DEFAULT '[]',
    checkin     TEXT DEFAULT '14:00',
    checkout    TEXT DEFAULT '10:00',
    cancelacion TEXT DEFAULT 'Flexible',
    waNumber    TEXT DEFAULT '',
    telefono    TEXT DEFAULT '',
    activo      INTEGER DEFAULT 1,
    createdAt   TEXT DEFAULT (datetime('now')),
    updatedAt   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS gastronomia (
    id          TEXT PRIMARY KEY,
    nombre      TEXT NOT NULL,
    tipo        TEXT DEFAULT 'restaurante',
    descripcion TEXT DEFAULT '',
    direccion   TEXT DEFAULT '',
    horario     TEXT DEFAULT '',
    telefono    TEXT DEFAULT '',
    whatsapp    TEXT DEFAULT '',
    mapsLink    TEXT DEFAULT '',
    imagen      TEXT DEFAULT '',
    activo      INTEGER DEFAULT 1,
    createdAt   TEXT DEFAULT (datetime('now')),
    updatedAt   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS eventos (
    id          TEXT PRIMARY KEY,
    titulo      TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    fecha       TEXT DEFAULT '',
    hora        TEXT DEFAULT '',
    lugar       TEXT DEFAULT '',
    tipo        TEXT DEFAULT 'cultural',
    imagen      TEXT DEFAULT '',
    activo      INTEGER DEFAULT 1,
    createdAt   TEXT DEFAULT (datetime('now')),
    updatedAt   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS datos_utiles (
    id          TEXT PRIMARY KEY,
    categoria   TEXT NOT NULL,
    titulo      TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    contenido   TEXT DEFAULT '{}',
    activo      INTEGER DEFAULT 1,
    createdAt   TEXT DEFAULT (datetime('now')),
    updatedAt   TEXT DEFAULT (datetime('now'))
  );
`);

// ── Helpers DB ───────────────────────────────────────────────────────────────
function parseJson(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function formatAlojamiento(row) {
  if (!row) return null;
  return {
    ...row,
    coords: row.lat != null ? [row.lat, row.lon] : null,
    galeria: parseJson(row.galeria, []),
    capacidad: parseJson(row.capacidad, []),
    servicios: parseJson(row.servicios, []),
    activo: Boolean(row.activo),
  };
}

function formatGastronomia(row) {
  if (!row) return null;
  return { ...row, activo: Boolean(row.activo) };
}

function formatEvento(row) {
  if (!row) return null;
  return { ...row, activo: Boolean(row.activo) };
}

function formatDatoUtil(row) {
  if (!row) return null;
  return { ...row, contenido: parseJson(row.contenido, {}), activo: Boolean(row.activo) };
}

function slugify(text) {
  return text.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function sendJson(res, status, obj) {
  res.status(status).json(obj);
}

// ── Express app ──────────────────────────────────────────────────────────────
const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'"],
      formAction: ["'self'"],
    }
  },
  crossOriginOpenerPolicy: false,
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Sesiones con almacenamiento SQLite
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: DATA_DIR }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sr_admin_sid',
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 horas
    secure: false,
  },
}));

// Rate limit simple en memoria para login
const loginAttempts = new Map();
function loginRateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress;
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 15 * 60 * 1000; }
  if (entry.count >= 10) {
    const wait = Math.ceil((entry.resetAt - now) / 1000 / 60);
    return res.status(429).send(loginPage(`Demasiados intentos. Esperá ${wait} min.`, true));
  }
  entry.count++;
  loginAttempts.set(ip, entry);
  next();
}

// Middleware de autenticación
function requireAuth(req, res, next) {
  if (req.session && req.session.adminUser) return next();
  if (req.path.startsWith('/admin/api')) return sendJson(res, 401, { error: 'No autenticado' });
  return res.redirect('/admin/login');
}

// ── Verificación de credenciales ─────────────────────────────────────────────
async function checkCredentials(user, password) {
  if (user !== ADMIN_USER) return false;
  if (ADMIN_HASH) return bcrypt.compare(password, ADMIN_HASH);
  if (DEV_PASSWORD) return password === DEV_PASSWORD;
  return false;
}

// ── RUTAS PÚBLICAS ────────────────────────────────────────────────────────────

// Healthcheck
app.get('/health', (req, res) => sendJson(res, 200, { status: 'ok' }));
app.get('/healthz', (req, res) => sendJson(res, 200, { status: 'ok' }));

// API pública de datos del portal
app.get('/api/data', (req, res) => {
  try {
    const alojamientos = db.prepare('SELECT * FROM alojamientos WHERE activo=1 ORDER BY titulo').all().map(formatAlojamiento);
    const gastronomia = db.prepare('SELECT * FROM gastronomia WHERE activo=1 ORDER BY nombre').all().map(formatGastronomia);
    const eventos = db.prepare('SELECT * FROM eventos WHERE activo=1 ORDER BY fecha').all().map(formatEvento);
    const datosRaw = db.prepare('SELECT * FROM datos_utiles WHERE activo=1 ORDER BY categoria').all().map(formatDatoUtil);

    // Convertir array de datos_utiles a objeto por categoría (compatible con datosUtilesInfo)
    const datosUtiles = {};
    for (const item of datosRaw) {
      datosUtiles[item.categoria] = {
        titulo: item.titulo,
        descripcion: item.descripcion,
        ...item.contenido,
      };
    }

    // Convertir alojamientos a objeto por ID (compatible con alojamientosData)
    const alojamientosObj = {};
    for (const a of alojamientos) {
      alojamientosObj[a.id] = a;
    }

    res.set('Cache-Control', 'public, max-age=30');
    sendJson(res, 200, { alojamientos: alojamientosObj, gastronomia, eventos, datosUtiles });
  } catch (err) {
    console.error('[admin] Error en /api/data:', err);
    sendJson(res, 500, { error: 'Error interno' });
  }
});

// ── RUTAS DE AUTENTICACIÓN ────────────────────────────────────────────────────

function loginPage(error = '', isBlocked = false) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Admin · San Roque</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#003633 0%,#0A2E2B 50%,#134E4A 100%);font-family:'DM Sans',sans-serif;}
.card{background:rgba(255,255,255,0.05);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:48px 40px;width:100%;max-width:400px;box-shadow:0 32px 80px rgba(0,0,0,0.4);}
.logo{text-align:center;margin-bottom:32px;}
.logo h1{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:#F5D98A;letter-spacing:-0.5px;}
.logo p{color:rgba(255,255,255,0.5);font-size:13px;margin-top:4px;}
.field{margin-bottom:16px;}
.field label{display:block;color:rgba(255,255,255,0.7);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;}
.field input{width:100%;padding:14px 16px;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.15);border-radius:12px;color:#fff;font-size:15px;font-family:inherit;outline:none;transition:border-color .2s;}
.field input:focus{border-color:#D4A83C;}
.field input::placeholder{color:rgba(255,255,255,0.3);}
.btn{width:100%;padding:15px;background:#D4A83C;color:#003633;border:none;border-radius:12px;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;transition:background .2s,transform .1s;margin-top:8px;}
.btn:hover{background:#F5D98A;}
.btn:active{transform:scale(.98);}
.btn:disabled{opacity:.5;cursor:not-allowed;}
.error{background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);color:#fca5a5;border-radius:10px;padding:12px 14px;font-size:13px;margin-bottom:16px;text-align:center;}
</style>
</head>
<body>
<div class="card">
  <div class="logo">
    <h1>San Roque</h1>
    <p>Panel de Administración</p>
  </div>
  ${error ? `<div class="error">${error}</div>` : ''}
  <form method="POST" action="/admin/login">
    <div class="field">
      <label>Usuario</label>
      <input type="text" name="username" placeholder="usuario" autocomplete="username" required ${isBlocked ? 'disabled' : ''}/>
    </div>
    <div class="field">
      <label>Contraseña</label>
      <input type="password" name="password" placeholder="••••••••" autocomplete="current-password" required ${isBlocked ? 'disabled' : ''}/>
    </div>
    <button class="btn" type="submit" ${isBlocked ? 'disabled' : ''}>Ingresar</button>
  </form>
</div>
</body>
</html>`;
}

app.get('/admin/login', (req, res) => {
  if (req.session && req.session.adminUser) return res.redirect('/admin');
  res.send(loginPage());
});

app.post('/admin/login', loginRateLimit, async (req, res) => {
  const { username, password } = req.body;
  const ok = await checkCredentials(username, password);
  if (!ok) return res.status(401).send(loginPage('Usuario o contraseña incorrectos.'));
  req.session.regenerate((err) => {
    if (err) return res.status(500).send(loginPage('Error de sesión.'));
    req.session.adminUser = username;
    res.redirect('/admin');
  });
});

app.post('/admin/logout', requireAuth, (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ── PANEL ADMIN — SPA HTML ────────────────────────────────────────────────────

app.get('/admin', requireAuth, (req, res) => {
  res.send(adminDashboardHtml());
});

// Cualquier subruta de /admin (excepto /admin/api y /admin/login/logout) sirve el mismo SPA
app.get('/admin/*', requireAuth, (req, res) => {
  if (req.path.startsWith('/admin/api')) return res.status(404).json({ error: 'not found' });
  res.send(adminDashboardHtml());
});

// ── API PROTEGIDA — ALOJAMIENTOS ─────────────────────────────────────────────

app.get('/admin/api/alojamientos', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM alojamientos ORDER BY titulo').all().map(formatAlojamiento);
  sendJson(res, 200, rows);
});

app.get('/admin/api/alojamientos/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM alojamientos WHERE id=?').get(req.params.id);
  if (!row) return sendJson(res, 404, { error: 'No encontrado' });
  sendJson(res, 200, formatAlojamiento(row));
});

app.post('/admin/api/alojamientos', requireAuth, (req, res) => {
  const d = req.body;
  const id = d.id || slugify(d.titulo || genId('aloj'));
  try {
    db.prepare(`INSERT INTO alojamientos
      (id,titulo,categoria,lat,lon,rating,reviewsCount,ubicacion,mainImg,galeria,descripcionLarga,capacidad,servicios,checkin,checkout,cancelacion,waNumber,telefono)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id, d.titulo, d.categoria || 'hospedaje',
      d.lat ?? (Array.isArray(d.coords) ? d.coords[0] : null),
      d.lon ?? (Array.isArray(d.coords) ? d.coords[1] : null),
      d.rating || '4.5', d.reviewsCount || '0 reseñas', d.ubicacion || 'San Roque',
      d.mainImg || '', JSON.stringify(d.galeria || []),
      d.descripcionLarga || '', JSON.stringify(d.capacidad || []),
      JSON.stringify(d.servicios || []),
      d.checkin || '14:00', d.checkout || '10:00', d.cancelacion || 'Flexible',
      d.waNumber || '', d.telefono || ''
    );
    sendJson(res, 201, { id, ok: true });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') return sendJson(res, 409, { error: 'ID duplicado' });
    console.error(err);
    sendJson(res, 500, { error: 'Error al crear' });
  }
});

app.put('/admin/api/alojamientos/:id', requireAuth, (req, res) => {
  const d = req.body;
  const result = db.prepare(`UPDATE alojamientos SET
    titulo=?,categoria=?,lat=?,lon=?,rating=?,reviewsCount=?,ubicacion=?,
    mainImg=?,galeria=?,descripcionLarga=?,capacidad=?,servicios=?,
    checkin=?,checkout=?,cancelacion=?,waNumber=?,telefono=?,activo=?,
    updatedAt=datetime('now')
    WHERE id=?
  `).run(
    d.titulo, d.categoria || 'hospedaje',
    d.lat ?? (Array.isArray(d.coords) ? d.coords[0] : null),
    d.lon ?? (Array.isArray(d.coords) ? d.coords[1] : null),
    d.rating || '4.5', d.reviewsCount || '0 reseñas', d.ubicacion || 'San Roque',
    d.mainImg || '', JSON.stringify(d.galeria || []),
    d.descripcionLarga || '', JSON.stringify(d.capacidad || []),
    JSON.stringify(d.servicios || []),
    d.checkin || '14:00', d.checkout || '10:00', d.cancelacion || 'Flexible',
    d.waNumber || '', d.telefono || '', d.activo != null ? (d.activo ? 1 : 0) : 1,
    req.params.id
  );
  if (result.changes === 0) return sendJson(res, 404, { error: 'No encontrado' });
  sendJson(res, 200, { ok: true });
});

app.delete('/admin/api/alojamientos/:id', requireAuth, (req, res) => {
  const result = db.prepare('UPDATE alojamientos SET activo=0, updatedAt=datetime(\'now\') WHERE id=?').run(req.params.id);
  if (result.changes === 0) return sendJson(res, 404, { error: 'No encontrado' });
  sendJson(res, 200, { ok: true });
});

// ── API PROTEGIDA — GASTRONOMÍA ───────────────────────────────────────────────

app.get('/admin/api/gastronomia', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM gastronomia ORDER BY nombre').all().map(formatGastronomia);
  sendJson(res, 200, rows);
});

app.post('/admin/api/gastronomia', requireAuth, (req, res) => {
  const d = req.body;
  const id = d.id || slugify(d.nombre || genId('gast'));
  try {
    db.prepare(`INSERT INTO gastronomia (id,nombre,tipo,descripcion,direccion,horario,telefono,whatsapp,mapsLink,imagen)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      id, d.nombre, d.tipo || 'restaurante', d.descripcion || '',
      d.direccion || '', d.horario || '', d.telefono || '',
      d.whatsapp || '', d.mapsLink || '', d.imagen || ''
    );
    sendJson(res, 201, { id, ok: true });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') return sendJson(res, 409, { error: 'ID duplicado' });
    sendJson(res, 500, { error: 'Error al crear' });
  }
});

app.put('/admin/api/gastronomia/:id', requireAuth, (req, res) => {
  const d = req.body;
  const result = db.prepare(`UPDATE gastronomia SET
    nombre=?,tipo=?,descripcion=?,direccion=?,horario=?,telefono=?,whatsapp=?,mapsLink=?,imagen=?,activo=?,updatedAt=datetime('now')
    WHERE id=?`).run(
    d.nombre, d.tipo || 'restaurante', d.descripcion || '', d.direccion || '',
    d.horario || '', d.telefono || '', d.whatsapp || '', d.mapsLink || '', d.imagen || '',
    d.activo != null ? (d.activo ? 1 : 0) : 1, req.params.id
  );
  if (result.changes === 0) return sendJson(res, 404, { error: 'No encontrado' });
  sendJson(res, 200, { ok: true });
});

app.delete('/admin/api/gastronomia/:id', requireAuth, (req, res) => {
  const result = db.prepare('UPDATE gastronomia SET activo=0, updatedAt=datetime(\'now\') WHERE id=?').run(req.params.id);
  if (result.changes === 0) return sendJson(res, 404, { error: 'No encontrado' });
  sendJson(res, 200, { ok: true });
});

// ── API PROTEGIDA — EVENTOS ───────────────────────────────────────────────────

app.get('/admin/api/eventos', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM eventos ORDER BY fecha DESC').all().map(formatEvento);
  sendJson(res, 200, rows);
});

app.post('/admin/api/eventos', requireAuth, (req, res) => {
  const d = req.body;
  const id = d.id || genId('evento');
  try {
    db.prepare(`INSERT INTO eventos (id,titulo,descripcion,fecha,hora,lugar,tipo,imagen)
      VALUES (?,?,?,?,?,?,?,?)`).run(
      id, d.titulo, d.descripcion || '', d.fecha || '', d.hora || '',
      d.lugar || '', d.tipo || 'cultural', d.imagen || ''
    );
    sendJson(res, 201, { id, ok: true });
  } catch (err) {
    sendJson(res, 500, { error: 'Error al crear' });
  }
});

app.put('/admin/api/eventos/:id', requireAuth, (req, res) => {
  const d = req.body;
  const result = db.prepare(`UPDATE eventos SET
    titulo=?,descripcion=?,fecha=?,hora=?,lugar=?,tipo=?,imagen=?,activo=?,updatedAt=datetime('now')
    WHERE id=?`).run(
    d.titulo, d.descripcion || '', d.fecha || '', d.hora || '',
    d.lugar || '', d.tipo || 'cultural', d.imagen || '',
    d.activo != null ? (d.activo ? 1 : 0) : 1, req.params.id
  );
  if (result.changes === 0) return sendJson(res, 404, { error: 'No encontrado' });
  sendJson(res, 200, { ok: true });
});

app.delete('/admin/api/eventos/:id', requireAuth, (req, res) => {
  const result = db.prepare('UPDATE eventos SET activo=0, updatedAt=datetime(\'now\') WHERE id=?').run(req.params.id);
  if (result.changes === 0) return sendJson(res, 404, { error: 'No encontrado' });
  sendJson(res, 200, { ok: true });
});

// ── API PROTEGIDA — DATOS ÚTILES ──────────────────────────────────────────────

app.get('/admin/api/datos-utiles', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM datos_utiles ORDER BY categoria').all().map(formatDatoUtil);
  sendJson(res, 200, rows);
});

app.put('/admin/api/datos-utiles/:categoria', requireAuth, (req, res) => {
  const d = req.body;
  const cat = req.params.categoria;
  const existing = db.prepare('SELECT id FROM datos_utiles WHERE categoria=?').get(cat);
  if (existing) {
    db.prepare(`UPDATE datos_utiles SET titulo=?,descripcion=?,contenido=?,activo=?,updatedAt=datetime('now') WHERE categoria=?`).run(
      d.titulo || cat, d.descripcion || '', JSON.stringify(d.contenido || {}),
      d.activo != null ? (d.activo ? 1 : 0) : 1, cat
    );
  } else {
    db.prepare(`INSERT INTO datos_utiles (id,categoria,titulo,descripcion,contenido) VALUES (?,?,?,?,?)`).run(
      genId('du'), cat, d.titulo || cat, d.descripcion || '', JSON.stringify(d.contenido || {})
    );
  }
  sendJson(res, 200, { ok: true });
});

// ── SPA DASHBOARD HTML ────────────────────────────────────────────────────────

function adminDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Panel Admin · San Roque</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@400,0..1" rel="stylesheet"/>
<style>
/* ─── Reset & Base ─────────────────────────────────────────────────────── */
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --primary:#003633;--primary-light:#134E4A;--gold:#D4A83C;--gold-light:#F5D98A;
  --bg:#f0f4f3;--surface:#fff;--border:#e2e8f0;--text:#1a2e2b;--muted:#64748b;
  --danger:#ef4444;--success:#22c55e;--sidebar-w:260px;
}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);display:flex;min-height:100vh;overflow-x:hidden;}

/* ─── Sidebar ──────────────────────────────────────────────────────────── */
#sidebar{
  width:var(--sidebar-w);flex-shrink:0;
  background:linear-gradient(170deg,var(--primary) 0%,#0A2E2B 100%);
  display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:100;
  box-shadow:4px 0 24px rgba(0,0,0,.25);transition:transform .3s ease;
}
.sb-brand{padding:28px 24px 20px;border-bottom:1px solid rgba(255,255,255,.08);}
.sb-brand h1{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--gold-light);letter-spacing:-.3px;}
.sb-brand p{color:rgba(255,255,255,.4);font-size:11px;margin-top:2px;text-transform:uppercase;letter-spacing:.1em;}
nav{flex:1;padding:16px 12px;overflow-y:auto;}
.nav-section{color:rgba(255,255,255,.3);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;padding:12px 12px 6px;}
.nav-item{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:12px;cursor:pointer;transition:all .18s;color:rgba(255,255,255,.65);font-size:14px;font-weight:500;border:none;background:none;width:100%;text-align:left;}
.nav-item:hover{background:rgba(255,255,255,.08);color:#fff;}
.nav-item.active{background:rgba(212,168,60,.18);color:var(--gold-light);}
.nav-item .material-symbols-outlined{font-size:20px;font-variation-settings:'FILL' 0;}
.nav-item.active .material-symbols-outlined{font-variation-settings:'FILL' 1;}
.sb-footer{padding:16px 20px;border-top:1px solid rgba(255,255,255,.08);}
.sb-footer a{display:flex;align-items:center;gap:8px;color:rgba(255,255,255,.4);font-size:13px;text-decoration:none;transition:color .18s;}
.sb-footer a:hover{color:rgba(255,255,255,.8);}

/* ─── Main ─────────────────────────────────────────────────────────────── */
#main{margin-left:var(--sidebar-w);flex:1;display:flex;flex-direction:column;min-height:100vh;}
.topbar{
  background:var(--surface);border-bottom:1px solid var(--border);
  padding:0 32px;height:64px;display:flex;align-items:center;justify-content:space-between;
  position:sticky;top:0;z-index:50;
}
.topbar h2{font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--primary);}
.topbar-actions{display:flex;align-items:center;gap:12px;}
.badge-user{background:var(--gold-light);color:var(--primary);font-size:12px;font-weight:700;padding:4px 12px;border-radius:99px;}
.btn-logout{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:13px;font-weight:600;background:none;border:1.5px solid var(--border);border-radius:8px;padding:6px 12px;cursor:pointer;transition:all .18s;}
.btn-logout:hover{border-color:var(--danger);color:var(--danger);}

/* ─── Content ──────────────────────────────────────────────────────────── */
#content{flex:1;padding:32px;}

/* ─── Cards de stats ───────────────────────────────────────────────────── */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:32px;}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px 24px;display:flex;align-items:center;gap:16px;}
.stat-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;}
.stat-icon.teal{background:#e0f2f1;color:var(--primary);}
.stat-icon.gold{background:#fef9c3;color:#92400e;}
.stat-icon.purple{background:#ede9fe;color:#6d28d9;}
.stat-icon.green{background:#dcfce7;color:#166534;}
.stat-val{font-family:'Syne',sans-serif;font-size:26px;font-weight:700;color:var(--primary);line-height:1;}
.stat-lbl{font-size:12px;color:var(--muted);margin-top:2px;}

/* ─── Sección ──────────────────────────────────────────────────────────── */
.section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
.section-title{font-family:'Syne',sans-serif;font-size:17px;font-weight:700;color:var(--primary);}

/* ─── Tabla ────────────────────────────────────────────────────────────── */
.table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;}
table{width:100%;border-collapse:collapse;}
thead{background:#f8fafc;}
thead th{padding:12px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);border-bottom:1px solid var(--border);}
tbody td{padding:13px 16px;font-size:13.5px;border-bottom:1px solid #f1f5f9;vertical-align:middle;}
tbody tr:last-child td{border-bottom:none;}
tbody tr:hover td{background:#f8fafc;}
.badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;}
.badge-hotel{background:#dbeafe;color:#1d4ed8;}
.badge-hospedaje{background:#dcfce7;color:#166534;}
.badge-dep{background:#ede9fe;color:#6d28d9;}
.badge-active{background:#dcfce7;color:#166534;}
.badge-inactive{background:#fee2e2;color:#991b1b;}
.td-actions{display:flex;gap:6px;}
.btn-icon{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:none;cursor:pointer;transition:all .15s;font-size:16px;}
.btn-edit{background:#f0fdf4;color:#166534;}
.btn-edit:hover{background:#22c55e;color:#fff;}
.btn-del{background:#fff1f2;color:#be123c;}
.btn-del:hover{background:#ef4444;color:#fff;}

/* ─── Botón primario ───────────────────────────────────────────────────── */
.btn-primary{display:inline-flex;align-items:center;gap:6px;background:var(--primary);color:#fff;border:none;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .18s;}
.btn-primary:hover{background:var(--primary-light);}
.btn-primary .material-symbols-outlined{font-size:18px;}
.btn-secondary{display:inline-flex;align-items:center;gap:6px;background:var(--surface);color:var(--text);border:1.5px solid var(--border);padding:10px 18px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .18s;}
.btn-secondary:hover{border-color:var(--primary);color:var(--primary);}

/* ─── Modal ────────────────────────────────────────────────────────────── */
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);z-index:200;display:none;align-items:center;justify-content:center;padding:20px;}
.modal-backdrop.open{display:flex;}
.modal{background:var(--surface);border-radius:20px;padding:32px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,.25);animation:modalIn .25s ease;}
@keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(16px);}to{opacity:1;transform:scale(1) translateY(0);}}
.modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;}
.modal-title{font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--primary);}
.modal-close{width:32px;height:32px;border-radius:8px;border:none;background:#f1f5f9;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:18px;transition:all .15s;}
.modal-close:hover{background:#e2e8f0;color:var(--text);}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.form-grid.full{grid-template-columns:1fr;}
.field-group{display:flex;flex-direction:column;gap:5px;}
.field-group.span2{grid-column:span 2;}
.field-group label{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;}
.field-group input,.field-group select,.field-group textarea{
  padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;
  font-family:inherit;color:var(--text);background:var(--surface);outline:none;transition:border-color .18s;
}
.field-group input:focus,.field-group select:focus,.field-group textarea:focus{border-color:var(--primary);}
.field-group textarea{resize:vertical;min-height:80px;}
.modal-footer{display:flex;gap:10px;justify-content:flex-end;margin-top:24px;padding-top:20px;border-top:1px solid var(--border);}

/* ─── Toast ────────────────────────────────────────────────────────────── */
#toast{
  position:fixed;bottom:24px;right:24px;z-index:300;
  background:#1a2e2b;color:#fff;padding:14px 20px;border-radius:12px;
  font-size:14px;font-weight:600;box-shadow:0 8px 30px rgba(0,0,0,.25);
  transform:translateY(80px);opacity:0;transition:all .3s ease;pointer-events:none;
}
#toast.show{transform:translateY(0);opacity:1;}
#toast.success{border-left:4px solid var(--success);}
#toast.error{border-left:4px solid var(--danger);}

/* ─── Empty state ──────────────────────────────────────────────────────── */
.empty-state{text-align:center;padding:60px 20px;color:var(--muted);}
.empty-state .material-symbols-outlined{font-size:48px;opacity:.3;display:block;margin-bottom:12px;}
.empty-state p{font-size:14px;}

/* ─── Responsive ───────────────────────────────────────────────────────── */
@media(max-width:768px){
  #sidebar{transform:translateX(-100%);}
  #sidebar.open{transform:translateX(0);}
  #main{margin-left:0;}
  .form-grid{grid-template-columns:1fr;}
  .field-group.span2{grid-column:span 1;}
  #content{padding:20px;}
}
.menu-btn{display:none;background:none;border:none;cursor:pointer;padding:8px;color:var(--primary);}
@media(max-width:768px){.menu-btn{display:flex;align-items:center;}}
</style>
</head>
<body>

<!-- Sidebar -->
<aside id="sidebar">
  <div class="sb-brand">
    <h1>San Roque</h1>
    <p>Panel de Administración</p>
  </div>
  <nav>
    <div class="nav-section">Principal</div>
    <button class="nav-item active" data-section="dashboard" onclick="showSection('dashboard')">
      <span class="material-symbols-outlined">dashboard</span> Dashboard
    </button>
    <div class="nav-section">Contenido</div>
    <button class="nav-item" data-section="alojamientos" onclick="showSection('alojamientos')">
      <span class="material-symbols-outlined">hotel</span> Alojamientos
    </button>
    <button class="nav-item" data-section="gastronomia" onclick="showSection('gastronomia')">
      <span class="material-symbols-outlined">restaurant</span> Gastronomía
    </button>
    <button class="nav-item" data-section="eventos" onclick="showSection('eventos')">
      <span class="material-symbols-outlined">event</span> Eventos
    </button>
    <button class="nav-item" data-section="datosutiles" onclick="showSection('datosutiles')">
      <span class="material-symbols-outlined">info</span> Datos Útiles
    </button>
  </nav>
  <div class="sb-footer">
    <a href="/" target="_blank">
      <span class="material-symbols-outlined" style="font-size:16px">open_in_new</span>
      Ver sitio público
    </a>
  </div>
</aside>

<!-- Main -->
<div id="main">
  <header class="topbar">
    <div style="display:flex;align-items:center;gap:12px;">
      <button class="menu-btn" onclick="document.getElementById('sidebar').classList.toggle('open')">
        <span class="material-symbols-outlined">menu</span>
      </button>
      <h2 id="topbar-title">Dashboard</h2>
    </div>
    <div class="topbar-actions">
      <span class="badge-user" id="badge-user">admin</span>
      <form method="POST" action="/admin/logout" style="display:inline;">
        <button class="btn-logout" type="submit">
          <span class="material-symbols-outlined" style="font-size:16px;">logout</span> Salir
        </button>
      </form>
    </div>
  </header>

  <div id="content">

    <!-- DASHBOARD -->
    <section id="sec-dashboard">
      <div class="stats-grid" id="stats-grid">
        <div class="stat-card">
          <div class="stat-icon teal"><span class="material-symbols-outlined">hotel</span></div>
          <div><div class="stat-val" id="stat-aloj">–</div><div class="stat-lbl">Alojamientos</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon gold"><span class="material-symbols-outlined">restaurant</span></div>
          <div><div class="stat-val" id="stat-gast">–</div><div class="stat-lbl">Gastronomía</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple"><span class="material-symbols-outlined">event</span></div>
          <div><div class="stat-val" id="stat-ev">–</div><div class="stat-lbl">Eventos</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><span class="material-symbols-outlined">info</span></div>
          <div><div class="stat-val" id="stat-du">–</div><div class="stat-lbl">Datos Útiles</div></div>
        </div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px;text-align:center;color:var(--muted);">
        <span class="material-symbols-outlined" style="font-size:40px;opacity:.4;display:block;margin-bottom:8px;">waving_hand</span>
        <p style="font-size:15px;font-weight:600;color:var(--primary);">¡Bienvenido al Panel de Administración!</p>
        <p style="font-size:13px;margin-top:4px;">Usá el menú lateral para gestionar el contenido del portal turístico.</p>
      </div>
    </section>

    <!-- ALOJAMIENTOS -->
    <section id="sec-alojamientos" style="display:none;">
      <div class="section-header">
        <span class="section-title">Alojamientos</span>
        <button class="btn-primary" onclick="openModal('aloj')">
          <span class="material-symbols-outlined">add</span> Nuevo
        </button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th><th>Categoría</th><th>Ubicación</th><th>Rating</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tb-aloj"><tr><td colspan="6" style="text-align:center;padding:30px;color:var(--muted);">Cargando…</td></tr></tbody>
        </table>
      </div>
    </section>

    <!-- GASTRONOMÍA -->
    <section id="sec-gastronomia" style="display:none;">
      <div class="section-header">
        <span class="section-title">Gastronomía</span>
        <button class="btn-primary" onclick="openModal('gast')">
          <span class="material-symbols-outlined">add</span> Nuevo
        </button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Tipo</th><th>Dirección</th><th>Teléfono</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody id="tb-gast"><tr><td colspan="6" style="text-align:center;padding:30px;color:var(--muted);">Cargando…</td></tr></tbody>
        </table>
      </div>
    </section>

    <!-- EVENTOS -->
    <section id="sec-eventos" style="display:none;">
      <div class="section-header">
        <span class="section-title">Eventos</span>
        <button class="btn-primary" onclick="openModal('ev')">
          <span class="material-symbols-outlined">add</span> Nuevo
        </button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Título</th><th>Fecha</th><th>Hora</th><th>Lugar</th><th>Tipo</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody id="tb-ev"><tr><td colspan="7" style="text-align:center;padding:30px;color:var(--muted);">Cargando…</td></tr></tbody>
        </table>
      </div>
    </section>

    <!-- DATOS ÚTILES -->
    <section id="sec-datosutiles" style="display:none;">
      <div class="section-header">
        <span class="section-title">Datos Útiles del Chatbot</span>
      </div>
      <div id="du-list" style="display:grid;gap:14px;"></div>
    </section>

  </div>
</div>

<!-- MODAL Alojamiento -->
<div class="modal-backdrop" id="modal-aloj">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title" id="modal-aloj-title">Nuevo Alojamiento</span>
      <button class="modal-close" onclick="closeModal('aloj')">✕</button>
    </div>
    <form id="form-aloj" onsubmit="submitAloj(event)">
      <input type="hidden" id="aloj-id"/>
      <div class="form-grid">
        <div class="field-group span2"><label>Nombre</label><input id="aloj-titulo" type="text" required placeholder="Hotel / Hospedaje ..."/></div>
        <div class="field-group"><label>Categoría</label>
          <select id="aloj-cat"><option value="hotel">Hotel</option><option value="hospedaje">Hospedaje</option><option value="departamento">Departamento</option></select>
        </div>
        <div class="field-group"><label>Rating (ej: 4.5)</label><input id="aloj-rating" type="text" placeholder="4.5"/></div>
        <div class="field-group"><label>Ubicación</label><input id="aloj-ubicacion" type="text" placeholder="San Roque"/></div>
        <div class="field-group"><label>Latitud</label><input id="aloj-lat" type="text" placeholder="-28.575"/></div>
        <div class="field-group"><label>Longitud</label><input id="aloj-lon" type="text" placeholder="-58.709"/></div>
        <div class="field-group span2"><label>Imagen principal (ruta, ej: fotos/hotel.png)</label><input id="aloj-img" type="text" placeholder="fotos/hotel.png"/></div>
        <div class="field-group span2"><label>Descripción larga</label><textarea id="aloj-desc" rows="3"></textarea></div>
        <div class="field-group"><label>Check-in</label><input id="aloj-checkin" type="text" placeholder="14:00"/></div>
        <div class="field-group"><label>Check-out</label><input id="aloj-checkout" type="text" placeholder="10:00"/></div>
        <div class="field-group span2"><label>Cancelación</label><input id="aloj-cancel" type="text" placeholder="Flexible"/></div>
        <div class="field-group"><label>WhatsApp (solo números)</label><input id="aloj-wa" type="text" placeholder="5493777123456"/></div>
        <div class="field-group"><label>Teléfono</label><input id="aloj-tel" type="text" placeholder="+54 3777 123456"/></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" onclick="closeModal('aloj')">Cancelar</button>
        <button type="submit" class="btn-primary">Guardar</button>
      </div>
    </form>
  </div>
</div>

<!-- MODAL Gastronomía -->
<div class="modal-backdrop" id="modal-gast">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title" id="modal-gast-title">Nuevo Local</span>
      <button class="modal-close" onclick="closeModal('gast')">✕</button>
    </div>
    <form id="form-gast" onsubmit="submitGast(event)">
      <input type="hidden" id="gast-id"/>
      <div class="form-grid">
        <div class="field-group span2"><label>Nombre</label><input id="gast-nombre" type="text" required/></div>
        <div class="field-group"><label>Tipo</label>
          <select id="gast-tipo"><option value="restaurante">Restaurante</option><option value="comedor">Comedor</option><option value="cafeteria">Cafetería</option><option value="parrilla">Parrilla</option><option value="otro">Otro</option></select>
        </div>
        <div class="field-group"><label>Teléfono</label><input id="gast-tel" type="text"/></div>
        <div class="field-group span2"><label>Dirección</label><input id="gast-dir" type="text"/></div>
        <div class="field-group span2"><label>Horario</label><input id="gast-horario" type="text" placeholder="Lun-Sáb 11:00–14:00 / 20:00–23:00"/></div>
        <div class="field-group"><label>WhatsApp (solo números)</label><input id="gast-wa" type="text"/></div>
        <div class="field-group"><label>Link a mapa (Google Maps)</label><input id="gast-maps" type="text"/></div>
        <div class="field-group span2"><label>Imagen (ruta, ej: img/Comedor Ariana.jpeg)</label><input id="gast-img" type="text"/></div>
        <div class="field-group span2"><label>Descripción</label><textarea id="gast-desc" rows="2"></textarea></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" onclick="closeModal('gast')">Cancelar</button>
        <button type="submit" class="btn-primary">Guardar</button>
      </div>
    </form>
  </div>
</div>

<!-- MODAL Evento -->
<div class="modal-backdrop" id="modal-ev">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title" id="modal-ev-title">Nuevo Evento</span>
      <button class="modal-close" onclick="closeModal('ev')">✕</button>
    </div>
    <form id="form-ev" onsubmit="submitEv(event)">
      <input type="hidden" id="ev-id"/>
      <div class="form-grid">
        <div class="field-group span2"><label>Título</label><input id="ev-titulo" type="text" required/></div>
        <div class="field-group"><label>Fecha (YYYY-MM-DD)</label><input id="ev-fecha" type="date"/></div>
        <div class="field-group"><label>Hora</label><input id="ev-hora" type="time"/></div>
        <div class="field-group span2"><label>Lugar</label><input id="ev-lugar" type="text"/></div>
        <div class="field-group"><label>Tipo</label>
          <select id="ev-tipo"><option value="cultural">Cultural</option><option value="religioso">Religioso</option><option value="deportivo">Deportivo</option><option value="municipal">Municipal</option><option value="otro">Otro</option></select>
        </div>
        <div class="field-group"><label>Imagen URL</label><input id="ev-img" type="text"/></div>
        <div class="field-group span2"><label>Descripción</label><textarea id="ev-desc" rows="2"></textarea></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" onclick="closeModal('ev')">Cancelar</button>
        <button type="submit" class="btn-primary">Guardar</button>
      </div>
    </form>
  </div>
</div>

<!-- Toast -->
<div id="toast"></div>

<script>
// ── Estado ──────────────────────────────────────────────────────────────────
const state = { aloj: [], gast: [], ev: [], du: [] };
let editingId = null;

// ── Toast ────────────────────────────────────────────────────────────────────
function toast(msg, type='success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show ' + type;
  setTimeout(() => el.className = '', 3000);
}

// ── Secciones ────────────────────────────────────────────────────────────────
function showSection(name) {
  const titles = { dashboard:'Dashboard', alojamientos:'Alojamientos', gastronomia:'Gastronomía', eventos:'Eventos', datosutiles:'Datos Útiles' };
  document.querySelectorAll('[id^="sec-"]').forEach(s => s.style.display='none');
  document.getElementById('sec-'+name).style.display = '';
  document.getElementById('topbar-title').textContent = titles[name]||name;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.section===name));
  document.getElementById('sidebar').classList.remove('open');
  if(name === 'alojamientos') loadAloj();
  if(name === 'gastronomia') loadGast();
  if(name === 'eventos') loadEv();
  if(name === 'datosutiles') loadDU();
  if(name === 'dashboard') loadStats();
}

// ── API helpers ──────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type':'application/json' } };
  if(body) opts.body = JSON.stringify(body);
  const r = await fetch('/admin/api' + path, opts);
  if(!r.ok) throw new Error((await r.json().catch(()=>({error:'Error'}))).error || 'Error');
  return r.json();
}

// ── Stats ────────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const d = await fetch('/api/data').then(r=>r.json());
    document.getElementById('stat-aloj').textContent = Object.keys(d.alojamientos||{}).length;
    document.getElementById('stat-gast').textContent = (d.gastronomia||[]).length;
    document.getElementById('stat-ev').textContent = (d.eventos||[]).length;
    document.getElementById('stat-du').textContent = Object.keys(d.datosUtiles||{}).length;
  } catch(e) {}
}

// ── Modal helpers ────────────────────────────────────────────────────────────
function openModal(name, data=null) {
  editingId = data ? data.id : null;
  if(name === 'aloj') {
    document.getElementById('modal-aloj-title').textContent = data ? 'Editar Alojamiento' : 'Nuevo Alojamiento';
    document.getElementById('aloj-id').value        = data?.id || '';
    document.getElementById('aloj-titulo').value    = data?.titulo || '';
    document.getElementById('aloj-cat').value       = data?.categoria || 'hospedaje';
    document.getElementById('aloj-rating').value    = data?.rating || '4.5';
    document.getElementById('aloj-ubicacion').value = data?.ubicacion || 'San Roque';
    document.getElementById('aloj-lat').value       = data?.coords?.[0] ?? data?.lat ?? '';
    document.getElementById('aloj-lon').value       = data?.coords?.[1] ?? data?.lon ?? '';
    document.getElementById('aloj-img').value       = data?.mainImg || '';
    document.getElementById('aloj-desc').value      = data?.descripcionLarga || '';
    document.getElementById('aloj-checkin').value   = data?.checkin || '14:00';
    document.getElementById('aloj-checkout').value  = data?.checkout || '10:00';
    document.getElementById('aloj-cancel').value    = data?.cancelacion || 'Flexible';
    document.getElementById('aloj-wa').value        = data?.waNumber || '';
    document.getElementById('aloj-tel').value       = data?.telefono || '';
  } else if(name === 'gast') {
    document.getElementById('modal-gast-title').textContent = data ? 'Editar Local' : 'Nuevo Local';
    document.getElementById('gast-id').value      = data?.id || '';
    document.getElementById('gast-nombre').value  = data?.nombre || '';
    document.getElementById('gast-tipo').value    = data?.tipo || 'restaurante';
    document.getElementById('gast-tel').value     = data?.telefono || '';
    document.getElementById('gast-dir').value     = data?.direccion || '';
    document.getElementById('gast-horario').value = data?.horario || '';
    document.getElementById('gast-wa').value      = data?.whatsapp || '';
    document.getElementById('gast-maps').value    = data?.mapsLink || '';
    document.getElementById('gast-img').value     = data?.imagen || '';
    document.getElementById('gast-desc').value    = data?.descripcion || '';
  } else if(name === 'ev') {
    document.getElementById('modal-ev-title').textContent = data ? 'Editar Evento' : 'Nuevo Evento';
    document.getElementById('ev-id').value       = data?.id || '';
    document.getElementById('ev-titulo').value   = data?.titulo || '';
    document.getElementById('ev-fecha').value    = data?.fecha || '';
    document.getElementById('ev-hora').value     = data?.hora || '';
    document.getElementById('ev-lugar').value    = data?.lugar || '';
    document.getElementById('ev-tipo').value     = data?.tipo || 'cultural';
    document.getElementById('ev-img').value      = data?.imagen || '';
    document.getElementById('ev-desc').value     = data?.descripcion || '';
  }
  document.getElementById('modal-'+name).classList.add('open');
}
function closeModal(name) {
  document.getElementById('modal-'+name).classList.remove('open');
  editingId = null;
}
// Cerrar modal al click fuera
document.querySelectorAll('.modal-backdrop').forEach(b => b.addEventListener('click', e => { if(e.target===b) b.classList.remove('open'); }));

// ── ALOJAMIENTOS ─────────────────────────────────────────────────────────────
async function loadAloj() {
  const tb = document.getElementById('tb-aloj');
  tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--muted);">Cargando…</td></tr>';
  try {
    state.aloj = await api('GET','/alojamientos');
    if(!state.aloj.length){ tb.innerHTML='<tr><td colspan="6"><div class="empty-state"><span class="material-symbols-outlined">hotel_class</span><p>Sin alojamientos cargados</p></div></td></tr>'; return; }
    tb.innerHTML = state.aloj.map(a => \`<tr>
      <td><b>\${a.titulo}</b></td>
      <td><span class="badge badge-\${a.categoria}">\${a.categoria}</span></td>
      <td>\${a.ubicacion||'–'}</td>
      <td>⭐ \${a.rating}</td>
      <td><span class="badge \${a.activo?'badge-active':'badge-inactive'}">\${a.activo?'Activo':'Oculto'}</span></td>
      <td class="td-actions">
        <button class="btn-icon btn-edit" onclick='openModal("aloj",\${JSON.stringify(a)})' title="Editar"><span class="material-symbols-outlined" style="font-size:17px">edit</span></button>
        <button class="btn-icon btn-del" onclick="deleteAloj('\${a.id}')" title="Ocultar"><span class="material-symbols-outlined" style="font-size:17px">visibility_off</span></button>
      </td>
    </tr>\`).join('');
  } catch(e) { tb.innerHTML='<tr><td colspan="6" style="text-align:center;color:red;padding:20px;">Error al cargar</td></tr>'; }
}

async function submitAloj(e) {
  e.preventDefault();
  const body = {
    titulo: document.getElementById('aloj-titulo').value,
    categoria: document.getElementById('aloj-cat').value,
    rating: document.getElementById('aloj-rating').value,
    ubicacion: document.getElementById('aloj-ubicacion').value,
    lat: parseFloat(document.getElementById('aloj-lat').value)||null,
    lon: parseFloat(document.getElementById('aloj-lon').value)||null,
    mainImg: document.getElementById('aloj-img').value,
    descripcionLarga: document.getElementById('aloj-desc').value,
    checkin: document.getElementById('aloj-checkin').value,
    checkout: document.getElementById('aloj-checkout').value,
    cancelacion: document.getElementById('aloj-cancel').value,
    waNumber: document.getElementById('aloj-wa').value,
    telefono: document.getElementById('aloj-tel').value,
    galeria: [document.getElementById('aloj-img').value].filter(Boolean),
  };
  const id = document.getElementById('aloj-id').value;
  try {
    if(id) { await api('PUT', '/alojamientos/'+id, body); toast('Alojamiento actualizado ✓'); }
    else    { await api('POST','/alojamientos', body); toast('Alojamiento creado ✓'); }
    closeModal('aloj'); loadAloj(); loadStats();
  } catch(err) { toast(err.message,'error'); }
}

async function deleteAloj(id) {
  if(!confirm('¿Ocultar este alojamiento del sitio?')) return;
  try { await api('DELETE','/alojamientos/'+id); toast('Alojamiento ocultado'); loadAloj(); loadStats(); }
  catch(err) { toast(err.message,'error'); }
}

// ── GASTRONOMÍA ───────────────────────────────────────────────────────────────
async function loadGast() {
  const tb = document.getElementById('tb-gast');
  tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--muted);">Cargando…</td></tr>';
  try {
    state.gast = await api('GET','/gastronomia');
    if(!state.gast.length){ tb.innerHTML='<tr><td colspan="6"><div class="empty-state"><span class="material-symbols-outlined">restaurant</span><p>Sin locales cargados</p></div></td></tr>'; return; }
    tb.innerHTML = state.gast.map(g => \`<tr>
      <td><b>\${g.nombre}</b></td>
      <td>\${g.tipo||'–'}</td>
      <td>\${g.direccion||'–'}</td>
      <td>\${g.telefono||'–'}</td>
      <td><span class="badge \${g.activo?'badge-active':'badge-inactive'}">\${g.activo?'Activo':'Oculto'}</span></td>
      <td class="td-actions">
        <button class="btn-icon btn-edit" onclick='openModal("gast",\${JSON.stringify(g)})' title="Editar"><span class="material-symbols-outlined" style="font-size:17px">edit</span></button>
        <button class="btn-icon btn-del" onclick="deleteGast('\${g.id}')" title="Ocultar"><span class="material-symbols-outlined" style="font-size:17px">visibility_off</span></button>
      </td>
    </tr>\`).join('');
  } catch(e) { tb.innerHTML='<tr><td colspan="6" style="text-align:center;color:red;padding:20px;">Error al cargar</td></tr>'; }
}

async function submitGast(e) {
  e.preventDefault();
  const body = {
    nombre: document.getElementById('gast-nombre').value,
    tipo: document.getElementById('gast-tipo').value,
    descripcion: document.getElementById('gast-desc').value,
    direccion: document.getElementById('gast-dir').value,
    horario: document.getElementById('gast-horario').value,
    telefono: document.getElementById('gast-tel').value,
    whatsapp: document.getElementById('gast-wa').value,
    mapsLink: document.getElementById('gast-maps').value,
    imagen: document.getElementById('gast-img').value,
  };
  const id = document.getElementById('gast-id').value;
  try {
    if(id) { await api('PUT','/gastronomia/'+id, body); toast('Local actualizado ✓'); }
    else    { await api('POST','/gastronomia', body); toast('Local creado ✓'); }
    closeModal('gast'); loadGast(); loadStats();
  } catch(err) { toast(err.message,'error'); }
}

async function deleteGast(id) {
  if(!confirm('¿Ocultar este local?')) return;
  try { await api('DELETE','/gastronomia/'+id); toast('Local ocultado'); loadGast(); loadStats(); }
  catch(err) { toast(err.message,'error'); }
}

// ── EVENTOS ───────────────────────────────────────────────────────────────────
async function loadEv() {
  const tb = document.getElementById('tb-ev');
  tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--muted);">Cargando…</td></tr>';
  try {
    state.ev = await api('GET','/eventos');
    if(!state.ev.length){ tb.innerHTML='<tr><td colspan="7"><div class="empty-state"><span class="material-symbols-outlined">event</span><p>Sin eventos cargados</p></div></td></tr>'; return; }
    tb.innerHTML = state.ev.map(ev => \`<tr>
      <td><b>\${ev.titulo}</b></td>
      <td>\${ev.fecha||'–'}</td>
      <td>\${ev.hora||'–'}</td>
      <td>\${ev.lugar||'–'}</td>
      <td>\${ev.tipo||'–'}</td>
      <td><span class="badge \${ev.activo?'badge-active':'badge-inactive'}">\${ev.activo?'Activo':'Oculto'}</span></td>
      <td class="td-actions">
        <button class="btn-icon btn-edit" onclick='openModal("ev",\${JSON.stringify(ev)})' title="Editar"><span class="material-symbols-outlined" style="font-size:17px">edit</span></button>
        <button class="btn-icon btn-del" onclick="deleteEv('\${ev.id}')" title="Ocultar"><span class="material-symbols-outlined" style="font-size:17px">visibility_off</span></button>
      </td>
    </tr>\`).join('');
  } catch(e) { tb.innerHTML='<tr><td colspan="7" style="text-align:center;color:red;padding:20px;">Error al cargar</td></tr>'; }
}

async function submitEv(e) {
  e.preventDefault();
  const body = {
    titulo: document.getElementById('ev-titulo').value,
    descripcion: document.getElementById('ev-desc').value,
    fecha: document.getElementById('ev-fecha').value,
    hora: document.getElementById('ev-hora').value,
    lugar: document.getElementById('ev-lugar').value,
    tipo: document.getElementById('ev-tipo').value,
    imagen: document.getElementById('ev-img').value,
  };
  const id = document.getElementById('ev-id').value;
  try {
    if(id) { await api('PUT','/eventos/'+id, body); toast('Evento actualizado ✓'); }
    else    { await api('POST','/eventos', body); toast('Evento creado ✓'); }
    closeModal('ev'); loadEv(); loadStats();
  } catch(err) { toast(err.message,'error'); }
}

async function deleteEv(id) {
  if(!confirm('¿Ocultar este evento?')) return;
  try { await api('DELETE','/eventos/'+id); toast('Evento ocultado'); loadEv(); loadStats(); }
  catch(err) { toast(err.message,'error'); }
}

// ── DATOS ÚTILES ──────────────────────────────────────────────────────────────
async function loadDU() {
  const list = document.getElementById('du-list');
  list.innerHTML = '<p style="color:var(--muted);padding:20px;">Cargando…</p>';
  try {
    state.du = await api('GET','/datos-utiles');
    if(!state.du.length){ list.innerHTML='<div class="empty-state"><span class="material-symbols-outlined">info</span><p>Sin datos útiles. Ejecutá el seed para poblar.</p></div>'; return; }
    list.innerHTML = state.du.map(du => \`
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div>
            <span style="font-weight:700;color:var(--primary);">\${du.titulo}</span>
            <span style="font-size:11px;color:var(--muted);margin-left:10px;background:#f1f5f9;padding:2px 8px;border-radius:99px;">\${du.categoria}</span>
          </div>
          <button class="btn-primary" style="padding:7px 14px;font-size:12px;" onclick='openDuEditor(\${JSON.stringify(du)})'>
            <span class="material-symbols-outlined" style="font-size:15px;">edit</span> Editar
          </button>
        </div>
        <p style="font-size:13px;color:var(--muted);">\${du.descripcion||'Sin descripción'}</p>
      </div>
    \`).join('');
  } catch(e) { list.innerHTML='<p style="color:red;padding:20px;">Error al cargar</p>'; }
}

function openDuEditor(du) {
  const contenidoStr = JSON.stringify(du.contenido || {}, null, 2);
  const div = document.createElement('div');
  div.className = 'modal-backdrop open';
  div.innerHTML = \`
    <div class="modal" style="max-width:640px;">
      <div class="modal-header">
        <span class="modal-title">Editar: \${du.titulo}</span>
        <button class="modal-close" onclick="this.closest('.modal-backdrop').remove()">✕</button>
      </div>
      <div class="form-grid full">
        <div class="field-group"><label>Título</label><input id="du-titulo" type="text" value="\${du.titulo||''}"/></div>
        <div class="field-group"><label>Descripción breve</label><input id="du-desc" type="text" value="\${du.descripcion||''}"/></div>
        <div class="field-group">
          <label>Contenido extra (JSON — contactos, lugares, ubicacion)</label>
          <textarea id="du-contenido" rows="8" style="font-family:monospace;font-size:12px;">\${contenidoStr}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="this.closest('.modal-backdrop').remove()">Cancelar</button>
        <button class="btn-primary" onclick="saveDu('\${du.categoria}',this.closest('.modal-backdrop'))">Guardar</button>
      </div>
    </div>
  \`;
  document.body.appendChild(div);
  div.addEventListener('click', e => { if(e.target===div) div.remove(); });
}

async function saveDu(categoria, modal) {
  let contenido;
  try { contenido = JSON.parse(document.getElementById('du-contenido').value); }
  catch(e) { toast('JSON inválido en Contenido','error'); return; }
  const body = {
    titulo: document.getElementById('du-titulo').value,
    descripcion: document.getElementById('du-desc').value,
    contenido,
  };
  try {
    await api('PUT','/datos-utiles/'+categoria, body);
    toast('Dato útil actualizado ✓');
    modal.remove();
    loadDU();
  } catch(err) { toast(err.message,'error'); }
}

// ── Init ─────────────────────────────────────────────────────────────────────
loadStats();
</script>
</body>
</html>`;
}

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => sendJson(res, 404, { error: 'Not found' }));

// ── Arrancar ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[admin] escuchando en :${PORT}`);
  if (!ADMIN_HASH && !DEV_PASSWORD) {
    console.warn('[admin] ADVERTENCIA: No hay credenciales configuradas. Configurar ADMIN_PASSWORD_HASH o ADMIN_DEV_PASSWORD en .env');
  }
});
