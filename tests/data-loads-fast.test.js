const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.resolve(__dirname, '../js/data.js'), 'utf8');

function loadDataScript() {
  let readyCount = 0;
  const sandbox = {
    window: {
      location: { hostname: 'localhost', port: '4000' },
      appData: undefined,
      alojamientosData: undefined,
    },
    document: {
      addEventListener() {},
      dispatchEvent(event) {
        if (event.type === 'appDataReady') {
          readyCount += 1;
        }
      },
    },
    console,
    fetch: async () => new Promise((resolve) => {
      setTimeout(() => resolve({
        ok: true,
        json: async () => ({
          alojamientos: [],
          gastronomia: [],
          eventos: [],
          datosUtiles: null,
        }),
      }), 3000);
    }),
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
    AbortController: class { abort() {} },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
  };

  sandbox.window.document = sandbox.document;
  sandbox.window.console = sandbox.console;
  sandbox.window.fetch = sandbox.fetch;
  sandbox.window.setTimeout = sandbox.setTimeout;
  sandbox.window.clearTimeout = sandbox.clearTimeout;

  const start = Date.now();
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'data.js' });
  const elapsed = Date.now() - start;

  return { sandbox, readyCount, elapsed };
}

const { sandbox, readyCount, elapsed } = loadDataScript();
assert.ok(readyCount >= 1, 'Expected appDataReady to be dispatched');
assert.ok(elapsed < 1200, 'Expected fallback data to render without waiting for a slow backend');
assert.ok(sandbox.window.appData && sandbox.window.appData.alojamientos, 'Expected fallback accommodations to be available immediately');
console.log('data load regression test passed');
