'use strict';

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'admin.json');
const EDITOR_USERNAME = 'gestion.turistica.sr';
const EDITOR_PASSWORD = process.env.EDITOR_PASSWORD;
const MIGRATION_ID = '2026-07-bot-remises-editor';

if (EDITOR_PASSWORD && EDITOR_PASSWORD.length < 16) {
  throw new Error('EDITOR_PASSWORD debe tener al menos 16 caracteres.');
}

const contacts = [
  { nombre: 'Remis choro', tel: '3777721215' },
  { nombre: 'Romero ale', tel: '3777476810' },
  { nombre: 'BALDOVINO', tel: '3777-711144' },
  { nombre: 'PAULO', tel: '1130251880' },
  { nombre: 'TELLO REMIS', tel: '3777446545' },
  { nombre: 'TU REMIS', tel: '3777697065' },
  { nombre: 'FONTANA', tel: '37775202117' },
  { nombre: 'REMIS', tel: '37778207866' },
];

fs.mkdirSync(DATA_DIR, { recursive: true });
const store = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : {};
store.datos_utiles = Array.isArray(store.datos_utiles) ? store.datos_utiles : [];
store.users = Array.isArray(store.users) ? store.users : [];
store.migrations = Array.isArray(store.migrations) ? store.migrations : [];

const usefulData = {
  id: 'du_remises',
  categoria: 'remises',
  titulo: '🚖 Remises',
  descripcion: 'Servicios de remises disponibles en San Roque.',
  contenido: { contactos: contacts },
  status: 'published',
  updatedAt: new Date().toISOString(),
};
let editor = store.users.find((user) => user.username === EDITOR_USERNAME);
if (!store.migrations.includes(MIGRATION_ID)) {
  const usefulIndex = store.datos_utiles.findIndex((item) => item.categoria === 'remises');
  if (usefulIndex >= 0) store.datos_utiles[usefulIndex] = { ...store.datos_utiles[usefulIndex], ...usefulData };
  else store.datos_utiles.unshift({ ...usefulData, createdAt: new Date().toISOString() });

  const genericEditor = store.users.find((user) => user.username === 'admin' && user.role !== 'super-admin');
  if (!editor && genericEditor) {
    genericEditor.username = EDITOR_USERNAME;
    genericEditor.name = 'Gestión turística San Roque';
    editor = genericEditor;
  }
  store.users = store.users.filter((user) => !(user.username === 'admin' && user.role !== 'super-admin'));
  store.migrations.push(MIGRATION_ID);
}

if (!editor && EDITOR_PASSWORD) {
  editor = {
    id: `user_${Date.now().toString(36)}`,
    username: EDITOR_USERNAME,
    name: 'Gestión turística San Roque',
    role: 'editor',
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  store.users.push(editor);
}
if (editor) {
  editor.role = 'editor';
  editor.status = 'active';
  if (EDITOR_PASSWORD) editor.passwordHash = bcrypt.hashSync(EDITOR_PASSWORD, 12);
  editor.updatedAt = new Date().toISOString();
}

fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
console.log(JSON.stringify({ ok: true, remises: contacts.length, editor: editor ? EDITOR_USERNAME : null, passwordUpdated: Boolean(EDITOR_PASSWORD) }));
