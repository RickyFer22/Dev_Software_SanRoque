'use strict';
/**
 * seed.js — Siembra inicial de la base de datos del admin.
 *
 * Ejecutar UNA sola vez (o cuando la DB está vacía):
 *   node seed.js
 *
 * En Docker:
 *   docker exec -it vivisanroque_admin node seed.js
 */

const path     = require('path');
const fs       = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'admin.db'));
db.pragma('journal_mode = WAL');

// ── Seed: Alojamientos ────────────────────────────────────────────────────────
const alojamientos = [
  {
    id: 'ariadna',
    titulo: 'Hotel y Hospedaje Ariadna',
    categoria: 'hotel',
    lat: -28.580930282595837, lon: -58.72157750594606,
    rating: '4.8', reviewsCount: '0 reseñas',
    ubicacion: 'San Roque',
    mainImg: 'img/hero.jpg.jpg',
    galeria: ['img/hero.jpg.jpg'],
    descripcionLarga: 'Hotel y Hospedaje Ariadna ofrece comodidad y tranquilidad para visitantes de San Roque. Cuenta con habitaciones equipadas, atención personalizada y una ubicación conveniente para explorar la ciudad.',
    capacidad: [{ icono: 'hotel', titulo: 'Habitaciones disponibles' }],
    servicios: [{ icono: 'wifi', texto: 'WiFi' }, { icono: 'bed', texto: 'Habitaciones cómodas' }],
    checkin: '14:00', checkout: '10:00', cancelacion: 'Flexible',
    waNumber: '', telefono: '',
  },
  {
    id: 'casablanca',
    titulo: 'Hotel Casa Blanca',
    categoria: 'hotel',
    lat: -28.580770065591047, lon: -58.71758019665767,
    rating: '4.8', reviewsCount: '0 reseñas',
    ubicacion: 'San Roque',
    mainImg: 'img/Hospedaje Casa Blanca.jpeg',
    galeria: ['img/Hospedaje Casa Blanca.jpeg'],
    descripcionLarga: 'Hotel Casa Blanca brinda alojamiento confortable en San Roque. Sus instalaciones modernas y el trato cálido de su personal hacen de este lugar una opción ideal para familias y viajeros.',
    capacidad: [],
    servicios: [],
    checkin: '14:00', checkout: '10:00', cancelacion: 'Flexible',
    waNumber: '', telefono: '',
  },
  {
    id: 'sanmartin',
    titulo: 'Hospedaje San Martín',
    categoria: 'hospedaje',
    lat: -28.572689061181862, lon: -58.70867259115471,
    rating: '4.8', reviewsCount: '14 reseñas',
    ubicacion: 'San Roque',
    mainImg: 'img/hero.jpg.jpg',
    galeria: ['img/hero.jpg.jpg'],
    descripcionLarga: 'Hospedaje San Martín ofrece comodidad para familias y grupos que visitan San Roque. Ubicado estratégicamente, permite acceder fácilmente a todos los puntos de interés de la ciudad. Ambiente tranquilo y familiar.',
    capacidad: [{ icono: 'bed', titulo: 'Habitaciones disponibles' }],
    servicios: [{ icono: 'ac_unit', texto: 'Aire acondicionado' }, { icono: 'family_restroom', texto: 'Apto familias' }],
    checkin: '14:00', checkout: '10:00', cancelacion: 'Flexible',
    waNumber: '', telefono: '',
  },
  {
    id: 'jr',
    titulo: 'Hospedaje JR',
    categoria: 'hospedaje',
    lat: -28.575846639617794, lon: -58.71311808584592,
    rating: '4.6', reviewsCount: '9 reseñas',
    ubicacion: 'San Roque',
    mainImg: 'img/Hospedaje JR.jpeg',
    galeria: ['img/Hospedaje JR.jpeg'],
    descripcionLarga: 'Hospedaje JR ofrece tranquilidad y comodidad en una zona accesible de San Roque. Ideal para estadías cortas o largas, con habitaciones limpias y equipadas.',
    capacidad: [],
    servicios: [],
    checkin: '13:00', checkout: '10:00', cancelacion: 'Flexible',
    waNumber: '', telefono: '',
  },
  {
    id: 'leguiza',
    titulo: 'Leguiza Hotel',
    categoria: 'hotel',
    lat: -28.575303530420296, lon: -58.70919522752146,
    rating: '4.9', reviewsCount: '28 reseñas',
    ubicacion: 'Centro',
    mainImg: 'img/Hotel Leguiza.jpeg',
    galeria: ['img/Hotel Leguiza.jpeg'],
    descripcionLarga: 'Leguiza Hotel es una opción premium ubicada en el corazón de San Roque. Con modernas instalaciones, cochera propia y acceso a internet, ofrece todo lo necesario para una estadía placentera.',
    capacidad: [{ icono: 'hotel', titulo: 'Habitaciones' }],
    servicios: [{ icono: 'wifi', texto: 'Internet' }, { icono: 'directions_car', texto: 'Cochera' }],
    checkin: '12:00', checkout: '11:00', cancelacion: 'Flexible',
    waNumber: '', telefono: '',
  },
  {
    id: 'fortune',
    titulo: 'Fortune Hotel',
    categoria: 'hotel',
    lat: -28.57844744943032, lon: -58.708549644931,
    rating: '4.7', reviewsCount: '19 reseñas',
    ubicacion: 'San Roque',
    mainImg: 'img/hero.jpg.jpg',
    galeria: ['img/hero.jpg.jpg'],
    descripcionLarga: 'Fortune Hotel ofrece departamentos modernos y totalmente equipados, ideales para estadías largas. Cada unidad cuenta con cocina integrada, televisión y desayuno incluido.',
    capacidad: [{ icono: 'apartment', titulo: 'Departamentos' }],
    servicios: [{ icono: 'tv', texto: 'Televisión' }, { icono: 'coffee', texto: 'Desayuno' }],
    checkin: '15:00', checkout: '11:00', cancelacion: 'Moderada',
    waNumber: '', telefono: '',
  },
];

// ── Seed: Gastronomía ─────────────────────────────────────────────────────────
const gastronomia = [
  {
    id: 'comedor-ariana',
    nombre: 'Comedor Ariana',
    tipo: 'comedor',
    descripcion: 'Comida casera y abundante en el corazón de San Roque. Menús del día y platos a la carta.',
    direccion: 'San Roque, Corrientes',
    horario: 'Lun-Sáb 11:30–14:30 / 20:00–23:00',
    telefono: '',
    whatsapp: '',
    mapsLink: '',
    imagen: 'img/Comedor Ariana.jpeg',
    galeria: ['img/Comedor Ariana.jpeg'],
    servicios: ['wifi', 'aire_acondicionado'],
  },
  {
    id: 'comidas-estela',
    nombre: 'Comidas Estela',
    tipo: 'comedor',
    descripcion: 'Especialidades caseras con sazón correntina. Ideal para el mediodía.',
    direccion: 'San Roque, Corrientes',
    horario: 'Lun-Sáb 11:00–15:00',
    telefono: '',
    whatsapp: '',
    mapsLink: '',
    imagen: 'img/Comidas Estela.jpeg',
    galeria: ['img/Comidas Estela.jpeg'],
    servicios: [],
  },
  {
    id: 'cafeteria-plaza',
    nombre: 'Cafetería de la Plaza',
    tipo: 'cafeteria',
    descripcion: 'Café, facturas y sándwiches frente a la plaza principal. El punto de encuentro de la ciudad.',
    direccion: 'Plaza San Roque, Corrientes',
    horario: 'Todos los días 07:00–22:00',
    telefono: '',
    whatsapp: '',
    mapsLink: '',
    imagen: '',
    galeria: [],
    servicios: ['wifi'],
  },
];

// ── Seed: Eventos ─────────────────────────────────────────────────────────────
const eventos = [
  {
    id: 'fiesta-patronal-2026',
    titulo: 'Fiesta Patronal de San Roque',
    descripcion: 'Celebración en honor al patrono de la ciudad. Misa solemne, procesión y actividades culturales.',
    fecha: '2026-08-16',
    hora: '18:00',
    lugar: 'Parroquia San Roque de Montpellier',
    tipo: 'religioso',
    imagen: 'img/PLAZA E HIGLESIA.jpeg',
  },
  {
    id: 'noche-chamame-2026',
    titulo: 'Noche de Chamamé',
    descripcion: 'Festival de música folklórica correntina con artistas locales y regionales.',
    fecha: '2026-07-04',
    hora: '21:30',
    lugar: 'Plaza San Roque',
    tipo: 'cultural',
    imagen: '',
  },
];

// ── Seed: Datos Útiles ────────────────────────────────────────────────────────
const datosUtiles = [
  {
    id: 'du_remises', categoria: 'remises',
    titulo: '🚖 Remises',
    descripcion: 'Servicio de remises disponibles en toda la ciudad. Te buscan donde estés.',
    contenido: {
      contactos: [
        { nombre: 'Remis choro', tel: '3777721215' },
        { nombre: 'Romero ale', tel: '3777476810' },
        { nombre: 'BALDOVINO', tel: '3777-711144' },
        { nombre: 'PAULO', tel: '1130251880' },
        { nombre: 'TELLO REMIS', tel: '3777446545' },
        { nombre: 'TU REMIS', tel: '3777697065' },
        { nombre: 'FONTANA', tel: '37775202117' },
        { nombre: 'REMIS', tel: '37778207866' },
      ]
    }
  },
  {
    id: 'du_terminal', categoria: 'terminal',
    titulo: '🚌 Terminal de Ómnibus',
    descripcion: 'Terminal de colectivos de San Roque. Conexiones a Corrientes Capital, Resistencia y otras ciudades.',
    contenido: {
      ubicacion: 'https://www.google.com/maps/search/?api=1&query=-28.5767789,-58.7135694',
      horarios: 'Consultar en boletería',
      empresas: ['placeholder — completar con empresas reales'],
    }
  },
  {
    id: 'du_municipio', categoria: 'municipio',
    titulo: '🏛️ Municipalidad',
    descripcion: 'Atención al ciudadano y trámites municipales.',
    contenido: {
      ubicacion: 'https://www.google.com/maps/search/?api=1&query=-28.57680756168794,-58.708982356874806'
    }
  },
  {
    id: 'du_iglesias', categoria: 'iglesias',
    titulo: '⛪ Iglesias',
    descripcion: 'Templos religiosos de San Roque.',
    contenido: {
      lugares: [
        { nombre: 'Parroquia San Roque de Montpellier', link: 'https://www.google.com/maps/search/?api=1&query=-28.571590353744543,-58.711252302690546' },
        { nombre: 'Iglesia Monte de Sion', link: 'https://www.google.com/maps/search/?api=1&query=-28.575815684105844,-58.707426283145196' },
        { nombre: 'Templo Filadelfia de San Roque', link: 'https://www.google.com/maps/search/?api=1&query=-28.57730954160022,-58.70606541439768' },
        { nombre: 'Salón del Reino de los Testigos de Jehová', link: 'https://www.google.com/maps/search/?api=1&query=-28.577110361826733,-58.70697266022936' },
        { nombre: 'Iglesia Evangélica Asamblea de Dios', link: 'https://www.google.com/maps/search/?api=1&query=-28.580856838882077,-58.718072982275054' },
      ]
    }
  },
  {
    id: 'du_emergencias', categoria: 'emergencias',
    titulo: '🚨 Emergencias',
    descripcion: 'Servicios de urgencia disponibles en San Roque.',
    contenido: {
      lugares: [
        { nombre: 'Policía de San Roque', link: 'https://www.google.com/maps/search/?api=1&query=-28.570089924920314,-58.712608217644515' },
        { nombre: 'Hospital de San Roque', link: 'https://www.google.com/maps/search/?api=1&query=-28.577551339214832,-58.711226434897526' },
        { nombre: 'Bomberos San Roque', link: 'https://www.google.com/maps/search/?api=1&query=-28.577904318277724,-58.713826053599384' },
      ]
    }
  },
  {
    id: 'du_salud', categoria: 'salud',
    titulo: '🏥 Salud',
    descripcion: 'Farmacias y atención médica.',
    contenido: {
      lugares: [
        { nombre: 'Farmar IV', link: 'https://www.google.com/maps/search/?api=1&query=-28.57564523967805,-58.7115423787572' },
        { nombre: 'Farmacia Itatí S.C.S', link: 'https://www.google.com/maps/search/?api=1&query=-28.57490350407002,-58.70936387230284' },
        { nombre: 'Farmacia Tressens II', link: 'https://www.google.com/maps/search/?api=1&query=-28.575223851034433,-58.70882743052239' },
        { nombre: 'Farmacia San Roque', link: 'https://www.google.com/maps/search/?api=1&query=-28.57708938162111,-58.711638385451934' },
      ]
    }
  },
  {
    id: 'du_servicios', categoria: 'servicios',
    titulo: '🏧 Servicios rápidos',
    descripcion: 'Servicios útiles para visitantes.',
    contenido: {
      lugares: [
        { nombre: 'Municipalidad de San Roque', link: 'https://www.google.com/maps/search/?api=1&query=-28.57680756168794,-58.708982356874806' },
        { nombre: 'C.I.C extensión del municipio', link: 'https://www.google.com/maps/search/?api=1&query=-28.575522578502625,-58.70431666637905' },
        { nombre: 'Registro Civil', link: 'https://www.google.com/maps/search/?api=1&query=-28.576534179577525,-58.70901613864172' },
      ]
    }
  },
  {
    id: 'du_turismo', categoria: 'turismo',
    titulo: '📍 Lugares turísticos',
    descripcion: 'Puntos importantes de San Roque.',
    contenido: {
      lugares: [
        { nombre: 'Plaza Principal Libertad', link: 'https://www.google.com/maps/search/?api=1&query=-28.57098181276159,-58.71209180928368' },
        { nombre: 'Museo de San Roque', link: 'https://www.google.com/maps/search/?api=1&query=-28.57098181276159,-58.71209180928368' },
      ]
    }
  },
];

const actividades = [
  {
    id: 'capilla-historica',
    titulo: 'Capilla Histórica (Templo Viejo)',
    descripcion: 'Monumento Histórico Nacional construido en 1783. Alberga el Museo de Arte Sacro con piezas de la época fundacional y testimonios históricos de la Guerra de la Triple Alianza.',
    imagen: 'img/san-roque-turismo-1.jpg'
  },
  {
    id: 'balneario-municipal',
    titulo: 'Balneario Municipal y Costanera',
    descripcion: 'Disfrutá del sol, las playas de arena limpia sobre el río Santa Lucía y unos atardeceres mágicos. Cuenta con parador, áreas de camping y servicios completos en temporada.',
    imagen: 'img/costanera 2.jpeg'
  },
  {
    id: 'puente-carretero',
    titulo: 'Puente Carretero Histórico',
    descripcion: 'Icónico puente de hierro construido entre 1915 y 1917. Un símbolo sanroqueño ideal para paseos, fotografía y contemplación de la naturaleza fluvial.',
    imagen: 'img/PUENTE HISTORICO 1.jpeg'
  },
  {
    id: 'plaza-libertad',
    titulo: 'Plaza Principal Libertad',
    descripcion: 'Punto de encuentro central rodeado de frondosa arboleda y monumentos. Un espacio para relajarse, caminar y disfrutar de la tranquilidad local.',
    imagen: 'img/Plaza San Roque.jpeg'
  },
  {
    id: 'peatonal-colores',
    titulo: 'Peatonal San Roque',
    descripcion: 'Paseo urbano peatonal decorado con sombrillas de colores, luces cálidas y bancos. Ideal para caminar al atardecer y recorrer los comercios locales.',
    imagen: 'img/PEATONALL.jpeg'
  }
];

// ── Insertar datos ────────────────────────────────────────────────────────────
function run() {
  const insertAloj = db.prepare(`
    INSERT OR IGNORE INTO alojamientos
    (id,titulo,categoria,lat,lon,rating,reviewsCount,ubicacion,mainImg,galeria,descripcionLarga,capacidad,servicios,checkin,checkout,cancelacion,waNumber,telefono)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  const insertGast = db.prepare(`
    INSERT OR IGNORE INTO gastronomia (id,nombre,tipo,descripcion,direccion,horario,telefono,whatsapp,mapsLink,imagen,galeria,servicios)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  const insertEv = db.prepare(`
    INSERT OR IGNORE INTO eventos (id,titulo,descripcion,fecha,hora,lugar,tipo,imagen)
    VALUES (?,?,?,?,?,?,?,?)
  `);

  const insertDU = db.prepare(`
    INSERT OR IGNORE INTO datos_utiles (id,categoria,titulo,descripcion,contenido)
    VALUES (?,?,?,?,?)
  `);

  const insertAct = db.prepare(`
    INSERT OR IGNORE INTO actividades (id,titulo,descripcion,imagen)
    VALUES (?,?,?,?)
  `);

  const txAloj = db.transaction(() => {
    for (const a of alojamientos) {
      insertAloj.run(
        a.id, a.titulo, a.categoria, a.lat, a.lon,
        a.rating, a.reviewsCount, a.ubicacion, a.mainImg,
        JSON.stringify(a.galeria), a.descripcionLarga,
        JSON.stringify(a.capacidad), JSON.stringify(a.servicios),
        a.checkin, a.checkout, a.cancelacion, a.waNumber, a.telefono
      );
    }
  });

  const txGast = db.transaction(() => {
    for (const g of gastronomia) {
      insertGast.run(
        g.id, g.nombre, g.tipo, g.descripcion, g.direccion, g.horario,
        g.telefono, g.whatsapp, g.mapsLink, g.imagen,
        JSON.stringify(g.galeria || []), JSON.stringify(g.servicios || [])
      );
    }
  });

  const txEv = db.transaction(() => {
    for (const e of eventos) {
      insertEv.run(e.id, e.titulo, e.descripcion, e.fecha, e.hora, e.lugar, e.tipo, e.imagen);
    }
  });

  const txDU = db.transaction(() => {
    for (const d of datosUtiles) {
      insertDU.run(d.id, d.categoria, d.titulo, d.descripcion, JSON.stringify(d.contenido));
    }
  });

  const txAct = db.transaction(() => {
    for (const a of actividades) {
      insertAct.run(a.id, a.titulo, a.descripcion, a.imagen);
    }
  });

  txAloj();
  txGast();
  txEv();
  txDU();
  txAct();

  console.log(`✅ Seed completado:`);
  console.log(`   - ${alojamientos.length} alojamientos`);
  console.log(`   - ${gastronomia.length} locales gastronómicos`);
  console.log(`   - ${eventos.length} eventos`);
  console.log(`   - ${datosUtiles.length} datos útiles`);
  console.log(`   - ${actividades.length} actividades`);
}

// Las tablas deben existir antes de correr el seed
db.exec(`
  CREATE TABLE IF NOT EXISTS alojamientos (
    id TEXT PRIMARY KEY, titulo TEXT NOT NULL, categoria TEXT NOT NULL DEFAULT 'hospedaje',
    lat REAL, lon REAL, rating TEXT DEFAULT '4.5', reviewsCount TEXT DEFAULT '0 reseñas',
    ubicacion TEXT DEFAULT 'San Roque', mainImg TEXT DEFAULT '', galeria TEXT DEFAULT '[]',
    descripcionLarga TEXT DEFAULT '', capacidad TEXT DEFAULT '[]', servicios TEXT DEFAULT '[]',
    checkin TEXT DEFAULT '14:00', checkout TEXT DEFAULT '10:00', cancelacion TEXT DEFAULT 'Flexible',
    waNumber TEXT DEFAULT '', telefono TEXT DEFAULT '', activo INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS gastronomia (
    id TEXT PRIMARY KEY, nombre TEXT NOT NULL, tipo TEXT DEFAULT 'restaurante',
    descripcion TEXT DEFAULT '', direccion TEXT DEFAULT '', horario TEXT DEFAULT '',
    telefono TEXT DEFAULT '', whatsapp TEXT DEFAULT '', mapsLink TEXT DEFAULT '',
    imagen TEXT DEFAULT '', galeria TEXT DEFAULT '[]', servicios TEXT DEFAULT '[]', activo INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS eventos (
    id TEXT PRIMARY KEY, titulo TEXT NOT NULL, descripcion TEXT DEFAULT '',
    fecha TEXT DEFAULT '', hora TEXT DEFAULT '', lugar TEXT DEFAULT '', tipo TEXT DEFAULT 'cultural',
    imagen TEXT DEFAULT '', activo INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS datos_utiles (
    id TEXT PRIMARY KEY, categoria TEXT NOT NULL, titulo TEXT NOT NULL,
    descripcion TEXT DEFAULT '', contenido TEXT DEFAULT '{}', activo INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS actividades (
    id TEXT PRIMARY KEY, titulo TEXT NOT NULL, descripcion TEXT DEFAULT '',
    imagen TEXT DEFAULT '', activo INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now'))
  );
`);

run();
db.close();
