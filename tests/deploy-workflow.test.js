const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('deploy workflow injects bot environment variables into deploy/.env', () => {
  const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'deploy.yml');
  const workflow = fs.readFileSync(workflowPath, 'utf8');

  assert.match(workflow, /BOT_API_URL/);
  assert.match(workflow, /BOT_API_KEY/);
  assert.match(workflow, /BOT_PROVIDER/);
  assert.match(workflow, /BOT_TIMEOUT_MS/);
});
