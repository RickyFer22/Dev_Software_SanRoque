const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dataPath = path.resolve(__dirname, '../js/data.js');
const source = fs.readFileSync(dataPath, 'utf8');

function loadDataScript() {
  const sandbox = {
    window: {
      location: { hostname: 'localhost', port: '4000' },
      appData: undefined,
      alojamientosData: undefined,
    },
    document: {
      addEventListener() {},
      dispatchEvent() {},
    },
    console,
    fetch: async () => ({
      ok: true,
      json: async () => ({
        alojamientos: [{
          id: 'ariadna',
          titulo: 'Hotel Ariadna',
          categoria: 'hotel',
          lat: -28.58,
          lon: -58.72,
          rating: '4.8',
          reviewsCount: '0 reseñas',
          ubicacion: 'San Roque',
          mainImg: 'img/ariadna.jpg',
          galeria: '["img/ariadna.jpg"]',
          descripcionLarga: 'Desc',
          capacidad: '[{"icono":"hotel","titulo":"Habitaciones"}]',
          servicios: '[{"icono":"wifi","texto":"WiFi"}]',
          checkin: '14:00',
          checkout: '10:00',
          cancelacion: 'Flexible',
          waNumber: '',
          telefono: ''
        }],
        gastronomia: [],
        eventos: [],
        datosUtiles: {}
      })
    }),
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
    AbortController: class { abort() {} },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
  };

  sandbox.window.document = sandbox.document;
  sandbox.window.console = sandbox.console;
  sandbox.window.fetch = sandbox.fetch;
  sandbox.window.setTimeout = sandbox.setTimeout;
  sandbox.window.clearTimeout = sandbox.clearTimeout;
  sandbox.window.location = sandbox.window.location;

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'data.js' });

  return sandbox;
}

const sandbox = loadDataScript();
assert.ok(sandbox.window.alojamientosData, 'Expected normalized accommodation data to be available');
assert.ok(sandbox.window.alojamientosData.ariadna, 'Expected accommodation entry to be keyed by id');
assert.deepStrictEqual(sandbox.window.alojamientosData.ariadna.coords, [-28.58, -58.72]);
assert.deepStrictEqual(sandbox.window.alojamientosData.ariadna.capacidad, [{ icono: 'hotel', titulo: 'Habitaciones' }]);
assert.deepStrictEqual(sandbox.window.alojamientosData.ariadna.servicios, [{ icono: 'wifi', texto: 'WiFi' }]);
console.log('data normalization regression test passed');
