const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('public data loader exposes refreshAppData and updates appData from backend', async () => {
  const scriptPath = path.join(__dirname, '..', 'js', 'data.js');
  const source = fs.readFileSync(scriptPath, 'utf8');

  const events = [];
  const fakeDocument = {
    addEventListener() {},
    dispatchEvent(event) {
      events.push(event.type || 'event');
    },
  };

  const fakeWindow = {
    location: { hostname: 'localhost', port: '4000' },
    addEventListener() {},
    dispatchEvent() {},
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
  };

  const context = vm.createContext({
    window: fakeWindow,
    document: fakeDocument,
    console,
    fetch: async () => ({
      ok: true,
      json: async () => ({
        alojamientos: [{ id: 'nuevo', titulo: 'Nuevo alojamiento', categoria: 'hotel', coords: [-1, -2] }],
        gastronomia: [],
        eventos: [],
        datosUtiles: {}
      })
    }),
    setTimeout,
    clearTimeout,
    Date,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
  });

  vm.runInContext(source, context, { filename: scriptPath });

  assert.equal(typeof fakeWindow.refreshAppData, 'function');
  await fakeWindow.refreshAppData();
  assert.equal(fakeWindow.appData.alojamientos.nuevo.titulo, 'Nuevo alojamiento');
});
