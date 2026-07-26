const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, '..');
const envPath = path.join(base, 'deploy', '.env');
const envText = fs.readFileSync(envPath, 'utf8');
const env = {};
envText.split(/\r?\n/).forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const idx = trimmed.indexOf('=');
  if (idx < 0) return;
  let key = trimmed.slice(0, idx).trim();
  let value = trimmed.slice(idx + 1).trim();
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  env[key] = value;
});
console.log('BOT_API_URL =', env.BOT_API_URL);
console.log('BOT_PROVIDER =', env.BOT_PROVIDER);
console.log('BOT_API_KEY length =', env.BOT_API_KEY ? env.BOT_API_KEY.length : 0);
if (!env.BOT_API_URL || !env.BOT_API_KEY) {
  console.error('Missing BOT_API_URL or BOT_API_KEY');
  process.exit(1);
}
const url = env.BOT_API_URL;
const body = JSON.stringify({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'Test de conexión' },
    { role: 'user', content: 'hola' }
  ],
  temperature: 0.3,
});
const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.BOT_API_KEY}`,
  },
  body,
};

(async () => {
  try {
    const fetch = globalThis.fetch || (await import('node-fetch')).default;
    const resp = await fetch(url, options);
    const text = await resp.text();
    console.log('status=', resp.status);
    console.log('body=', text.slice(0, 1200));
  } catch (err) {
    console.error('error=', err);
    process.exit(1);
  }
})();
