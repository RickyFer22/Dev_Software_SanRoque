const fs = require('fs');
const path = require('path');
const svc = require('./bot-service');
const envPath = path.join(__dirname, '..', '.env');
const env = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).reduce((acc, line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return acc;
  const idx = trimmed.indexOf('=');
  if (idx <= 0) return acc;
  let key = trimmed.slice(0, idx).trim();
  let value = trimmed.slice(idx + 1).trim();
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  acc[key] = value;
  return acc;
}, {});
console.log('env keys:', Object.keys(env));
console.log('env BOT_API_KEY:', env.BOT_API_KEY ? env.BOT_API_KEY.slice(0, 4) + '...' : 'none');
const settings = svc.defaultBotSettings(env);
console.log('defaultBotSettings apis:', settings.apis.length);
console.log(JSON.stringify(settings.apis, null, 2));
const merged = svc.mergeBotSettingsWithEnv({
  activeApiId: 'openrouter-default',
  apis: [{
    id: 'openrouter-default',
    label: 'OpenRouter (gpt-4o-mini)',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'gpt-4o-mini',
    apiKey: 'xxx',
    authHeader: 'Authorization',
    authScheme: 'Bearer',
    format: 'openrouter',
    enabled: true,
    order: 0,
  }],
}, env);
console.log('merged apis:', JSON.stringify(merged.apis, null, 2));
