const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('the site declares the official San Roque favicon assets', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  assert.match(html, /rel="icon"[^>]+href="favicon\.ico"/);
  assert.match(html, /rel="apple-touch-icon"[^>]+href="apple-touch-icon\.png"/);
  assert.ok(fs.existsSync(path.join(root, 'apple-touch-icon.png')));
});

test('favicon.ico contains the common browser icon sizes', () => {
  const icon = fs.readFileSync(path.join(root, 'favicon.ico'));
  assert.equal(icon.readUInt16LE(0), 0, 'ICO reserved field');
  assert.equal(icon.readUInt16LE(2), 1, 'ICO image type');

  const count = icon.readUInt16LE(4);
  const sizes = [];
  for (let i = 0; i < count; i += 1) {
    const offset = 6 + (i * 16);
    const width = icon[offset] || 256;
    const height = icon[offset + 1] || 256;
    if (width === height) sizes.push(width);
  }

  assert.deepEqual(sizes, [16, 32, 48, 64]);
});
