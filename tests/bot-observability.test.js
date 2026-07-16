const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const { answerLocally, publicBotConfig } = require('../deploy/admin/bot-service');

const remises = [
  ['Remis choro', '3777721215'],
  ['Romero ale', '3777476810'],
  ['BALDOVINO', '3777-711144'],
  ['PAULO', '1130251880'],
  ['TELLO REMIS', '3777446545'],
  ['TU REMIS', '3777697065'],
  ['FONTANA', '37775202117'],
  ['REMIS', '37778207866'],
];

test('all supplied remises are present in the managed seed without placeholders', () => {
  const sources = [read('deploy/admin/seed.js'), read('js/app.js'), read('gastronomia.html')].join('\n');
  for (const [name, phone] of remises) {
    assert.match(sources, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    assert.match(sources, new RegExp(phone.replace(/-/g, '[- ]?')));
  }
  assert.doesNotMatch(sources, /549X{5,}|Remis Centro|Remis Norte/);
});

test('same-origin bot, immutable prompt and bounded observability are declared', () => {
  const server = read('deploy/admin/server.js');
  const publicSources = [read('index.html'), read('gastronomia.html'), read('js/app.js')].join('\n');

  assert.match(server, /app\.post\('\/api\/bot\/chat'/);
  assert.match(server, /app\.get\('\/admin\/api\/bot-config'/);
  assert.match(server, /app\.get\('\/admin\/api\/observability'/);
  assert.match(server, /SYSTEM_PROMPT/);
  assert.match(server, /BOT_LOG_LIMIT\s*=\s*500/);
  assert.match(server, /SYSTEM_LOG_LIMIT\s*=\s*500/);
  assert.doesNotMatch(publicSources, /muni-bot-production\.up\.railway\.app/);
  assert.match(publicSources, /\/api\/bot\/chat/);
});

test('admin exposes editable bot configuration and observable logs', () => {
  const html = read('deploy/admin/static/index.html');
  const app = read('deploy/admin/static/app.js');

  assert.match(html, /data-section="bot-config"/);
  assert.match(html, /data-section="observability"/);
  assert.match(html, /id="bot-system-prompt"/);
  assert.match(html, /id="bot-save-config"/);
  assert.match(html, /class="bot-api-keystate small"/);
  assert.match(html, /id="weather-key-mask"/);
  assert.match(html, /id="bot-logs"/);
  assert.match(html, /id="system-logs"/);
  assert.match(app, /\/admin\/api\/bot-config/);
  assert.match(app, /\/admin\/api\/observability/);
  assert.match(app, /export-observability/);
  assert.match(app, /if \(\['bot-config', 'observability'\]\.includes\(name\)\) return \['super-admin', 'editor'\]\.includes\(role\);/);
});

test('production migration replaces the generic editor and upserts remises', () => {
  const migration = read('deploy/admin/scripts/migrate-bot-data.js');
  const server = read('deploy/admin/server.js');

  assert.match(migration, /gestion\.turistica\.sr/);
  assert.match(migration, /EDITOR_PASSWORD/);
  assert.match(migration, /categoria:\s*'remises'/);
  assert.match(server, /process\.env\.ADMIN_USER\s*\|\|\s*'gestion\.turistica\.sr'/);
});

test('bot service answers managed remises and never exposes complete secrets', () => {
  const store = {
    datos_utiles: [{ categoria: 'remises', contenido: { contactos: remises.map(([nombre, tel]) => ({ nombre, tel })) } }],
  };
  const answer = answerLocally('Necesito un remis', store);
  const config = publicBotConfig(null, {
    BOT_API_URL: 'https://bot.example.test/chat',
    BOT_API_KEY: 'secret-value-123456',
    OWM_API_KEY: 'weather-value-7890',
  });

  assert.equal(answer.category, 'remises');
  assert.match(answer.reply, /Remis choro: 3777721215/);
  assert.match(answer.reply, /BALDOVINO: 3777-711144/);
  assert.doesNotMatch(config.apis[0].keyMask, /secret-value-123456/);
  assert.doesNotMatch(config.weatherKeyMask, /weather-value-7890/);
  assert.equal(config.promptEditable, true);
});

test('bot service strips managed markup before returning local answers', () => {
  const store = { datos_utiles: [{ categoria: 'remises', contenido: { contactos: [{ nombre: '<img src=x onerror=alert(1)>Remis', tel: '<b>3777</b>' }] } }] };
  const answer = answerLocally('remis', store);
  assert.doesNotMatch(answer.reply, /<|>|onerror|alert\(/i);
  assert.match(answer.reply, /Remis: 3777/);
});

test('production migration is idempotent and preserves a super-admin named admin', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sanroque-migration-'));
  const dataFile = path.join(tempDir, 'admin.json');
  fs.writeFileSync(dataFile, JSON.stringify({
    users: [
      { id: 'root', username: 'admin', role: 'super-admin', passwordHash: 'root-hash' },
      { id: 'editor', username: 'admin', role: 'editor', passwordHash: 'editor-hash' },
    ],
    datos_utiles: [],
  }));
  try {
    for (let run = 0; run < 2; run += 1) {
      const result = spawnSync(process.execPath, [path.join(root, 'deploy/admin/scripts/migrate-bot-data.js')], {
        env: { ...process.env, DATA_DIR: tempDir },
        encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stderr);
    }
    const migrated = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    assert.ok(migrated.users.some((user) => user.username === 'admin' && user.role === 'super-admin'));
    assert.ok(migrated.users.some((user) => user.username === 'gestion.turistica.sr' && user.role === 'editor'));
    assert.equal(migrated.datos_utiles.find((item) => item.categoria === 'remises').contenido.contactos.length, 8);
    assert.equal(migrated.migrations.filter((id) => id === '2026-07-bot-remises-editor').length, 1);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
