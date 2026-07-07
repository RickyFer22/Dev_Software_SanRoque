// 📍 DATA - Portal Turístico San Roque 📍
//
// Intenta cargar los datos desde /api/data (backend admin).
// Si la API no está disponible, usa los datos hardcodeados como fallback
// para que el portal nunca quede en blanco.

// 🏨 Datos hardcodeados (fallback)
const _fallbackAlojamientos = {
  'ariadna':{
    titulo:'Hotel y Hospedaje Ariadna',
    categoria:'hotel',
    coords:[-28.580930282595837,-58.72157750594606],
    rating:'4.8',
    reviewsCount:'0 reseñas',
    ubicacion:'San Roque',
    mainImg:'fotos/hotelariadna.png',
    galeria:['fotos/hotelariadna.png'],
    descripcionLarga:'Hotel y hospedaje Ariadna ofrece comodidad y tranquilidad para visitantes de San Roque.',
    capacidad:[{icono:'hotel',titulo:'Habitaciones disponibles'}],
    servicios:[{icono:'wifi',texto:'WiFi'},{icono:'bed',texto:'Habitaciones cómodas'}],
    checkin:'14:00', checkout:'10:00', cancelacion:'Flexible',
    waNumber:'', telefono:''
  },

  'casablanca':{
    titulo:'Hotel Casa Blanca',
    categoria:'hotel',
    coords:[-28.580770065591047,-58.71758019665767],
    rating:'4.8',
    reviewsCount:'0 reseñas',
    ubicacion:'San Roque',
    mainImg:'img/Hospedaje Casa Blanca.jpeg',
    galeria:['img/Hospedaje Casa Blanca.jpeg'],
    descripcionLarga:'Hotel Casa Blanca brinda alojamiento confortable en San Roque.',
    capacidad:[], servicios:[],
    checkin:'14:00', checkout:'10:00', cancelacion:'Flexible',
    waNumber:'', telefono:''
  },

  'sanmartin':{
    titulo:'Hospedaje San Martín',
    categoria:'hospedaje',
    coords:[-28.572689061181862,-58.70867259115471],
    rating:'4.8',
    reviewsCount:'14 reseñas',
    ubicacion:'San Roque',
    mainImg:'fotos/hospedajesanmartin.png',
    galeria:['fotos/hospedajesanmartin.png'],
    descripcionLarga:'Hospedaje San Martín ofrece comodidad para familias y grupos.',
    capacidad:[{icono:'bed',titulo:'Habitaciones disponibles'}],
    servicios:[{icono:'ac_unit',texto:'Aire acondicionado'},{icono:'family_restroom',texto:'Apto familias'}],
    checkin:'14:00', checkout:'10:00', cancelacion:'Flexible',
    waNumber:'', telefono:''
  },

  'jr':{
    titulo:'Hospedaje JR',
    categoria:'hospedaje',
    coords:[-28.575846639617794,-58.71311808584592],
    rating:'4.6',
    reviewsCount:'9 reseñas',
    ubicacion:'San Roque',
    mainImg:'img/Hospedaje JR.jpeg',
    galeria:['img/Hospedaje JR.jpeg'],
    descripcionLarga:'Hospedaje JR ofrece tranquilidad y comodidad en una zona accesible.',
    capacidad:[], servicios:[],
    checkin:'13:00', checkout:'10:00', cancelacion:'Flexible',
    waNumber:'', telefono:''
  },

  'leguiza':{
    titulo:'Leguiza Hotel',
    categoria:'hotel',
    coords:[-28.575303530420296,-58.70919522752146],
    rating:'4.9',
    reviewsCount:'28 reseñas',
    ubicacion:'Centro',
    mainImg:'img/Hotel Leguiza.jpeg',
    galeria:['img/Hotel Leguiza.jpeg'],
    descripcionLarga:'Leguiza Hotel es una opción premium ubicada en el centro de San Roque.',
    capacidad:[{icono:'hotel',titulo:'Habitaciones'}],
    servicios:[{icono:'wifi',texto:'Internet'},{icono:'directions_car',texto:'Cochera'}],
    checkin:'12:00', checkout:'11:00', cancelacion:'Flexible',
    waNumber:'', telefono:''
  },

  'fortune':{
    titulo:'Fortune Hotel',
    categoria:'hotel',
    coords:[-28.57844744943032,-58.708549644931],
    rating:'4.7',
    reviewsCount:'19 reseñas',
    ubicacion:'San Roque',
    mainImg:'fotos/fortunehotel.png',
    galeria:['fotos/fortunehotel.png'],
    descripcionLarga:'Departamentos modernos y totalmente equipados.',
    capacidad:[{icono:'apartment',titulo:'Departamentos'}],
    servicios:[{icono:'tv',texto:'Televisión'},{icono:'coffee',texto:'Desayuno'}],
    checkin:'15:00', checkout:'11:00', cancelacion:'Moderada',
    waNumber:'', telefono:''
  },

  'esquivel':{
    titulo:'Hotel Esquivel',
    categoria:'hospedaje',
    coords:[-28.5743,-58.7102],
    rating:'4.5',
    reviewsCount:'0 reseñas',
    ubicacion:'San Roque',
    mainImg:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
    galeria:['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80'],
    descripcionLarga:'Monoambientes con capacidad total para 9 personas distribuidas en 3 habitaciones.',
    capacidad:[{icono:'bed',titulo:'3 habitaciones (9 pax)'}],
    servicios:[{icono:'ac_unit',texto:'Aire acondicionado'},{icono:'wifi',texto:'WiFi'},{icono:'directions_car',texto:'Cochera'},{icono:'bathroom',texto:'Baño privado'}],
    checkin:'14:00', checkout:'10:00', cancelacion:'Flexible',
    waNumber:'5493777534039', telefono:'3777534039',
    mapUrl:'https://maps.app.goo.gl/AF4hg6RbQJHYcEDC6'
  },

  'donpedro':{
    titulo:'Hospedaje Don Pedro',
    categoria:'hospedaje',
    coords:[-28.5743,-58.7102],
    rating:'4.6',
    reviewsCount:'0 reseñas',
    ubicacion:'San Roque',
    mainImg:'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80',
    galeria:['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80'],
    descripcionLarga:'Capacidad para 12 personas en 4 habitaciones (2 para 4 personas y 2 para 2 personas).',
    capacidad:[{icono:'bed',titulo:'4 habitaciones'}],
    servicios:[{icono:'restaurant',texto:'Almuerzo y Desayuno'},{icono:'wifi',texto:'WiFi'},{icono:'ac_unit',texto:'Aire Acond.'},{icono:'local_parking',texto:'Estacionamiento'}],
    checkin:'14:00', checkout:'10:00', cancelacion:'Flexible',
    waNumber:'5493777302498', telefono:'3777302498'
  },

  'paraiso':{
    titulo:'Hotel Paraíso',
    categoria:'hotel',
    coords:[-28.5743,-58.7102],
    rating:'4.7',
    reviewsCount:'0 reseñas',
    ubicacion:'San Roque',
    mainImg:'https://images.unsplash.com/photo-1551882547-ff40c0d13c81?w=600&q=80',
    galeria:['https://images.unsplash.com/photo-1551882547-ff40c0d13c81?w=600&q=80'],
    descripcionLarga:'Cómodo hotel con capacidad total de 3 habitaciones.',
    capacidad:[{icono:'hotel',titulo:'3 habitaciones'}],
    servicios:[{icono:'ac_unit',texto:'Aire Acond.'},{icono:'tv',texto:'TV'},{icono:'coffee',texto:'Desayuno'}],
    checkin:'14:00', checkout:'10:00', cancelacion:'Flexible',
    waNumber:'5493795139474', telefono:'3795139474',
    mapUrl:'https://maps.app.goo.gl/xdS8yyXqYySfMx2d6?g_st=aw'
  },

  // Lugares del mapa
  'plaza_libertad':{ titulo:'Plaza Principal Libertad', categoria:'lugar', coords:[-28.57098181276159,-58.71209180928368], mainImg:'fotos/plazalibertad.png' },
  'museo':{ titulo:'Museo', categoria:'lugar', coords:[-28.57098181276159,-58.71209180928368], mainImg:'fotos/museo.png' },
  'policia':{ titulo:'Policía de San Roque', categoria:'servicio', coords:[-28.570089924920314,-58.712608217644515], mainImg:'fotos/policia.png' },
  'parroquia':{ titulo:'Parroquia San Roque de Montpellier', categoria:'iglesia', coords:[-28.571590353744543,-58.711252302690546], mainImg:'fotos/parroquia.png' },
  'monte_sion':{ titulo:'Iglesia Monte de Sion', categoria:'iglesia', coords:[-28.575815684105844,-58.707426283145196], mainImg:'fotos/montesion.png' },
  'filadelfia':{ titulo:'Templo Filadelfia de San Roque', categoria:'iglesia', coords:[-28.57730954160022,-58.70606541439768], mainImg:'fotos/filadelfia.png' },
  'testigos':{ titulo:'Salón del Reino de los Testigos de Jehová', categoria:'iglesia', coords:[-28.577110361826733,-58.70697266022936], mainImg:'fotos/testigos.png' },
  'asamblea_dios':{ titulo:'Iglesia Evangélica Asamblea de Dios 248', categoria:'iglesia', coords:[-28.580856838882077,-58.718072982275054], mainImg:'fotos/asambleadios.png' },
  'bomberos':{ titulo:'Bomberos de San Roque', categoria:'servicio', coords:[-28.577904318277724,-58.713826053599384], mainImg:'fotos/bomberos.png' },
  'hospital':{ titulo:'Hospital de San Roque', categoria:'salud', coords:[-28.577551339214832,-58.711226434897526], mainImg:'fotos/hospital.png' },
  'farmar':{ titulo:'Farmar IV', categoria:'farmacia', coords:[-28.57564523967805,-28.7115423787572], mainImg:'fotos/farmar.png' },
  'farmacia_itati':{ titulo:'Farmacia Itatí S.C.S', categoria:'farmacia', coords:[-28.57490350407002,-58.70936387230284], mainImg:'fotos/farmaciaitati.png' },
  'tressens':{ titulo:'Farmacia Tressens II S.C.S', categoria:'farmacia', coords:[-28.575223851034433,-58.70882743052239], mainImg:'fotos/tressens.png' },
  'farmacia_san_roque':{ titulo:'Farmacia San Roque', categoria:'farmacia', coords:[-28.57708938162111,-58.711638385451934], mainImg:'fotos/farmaciasanroque.png' },
  'municipalidad':{ titulo:'Municipalidad de San Roque', categoria:'servicio', coords:[-28.57680756168794,-58.708982356874806], mainImg:'fotos/municipalidad.png' },
  'cic':{ titulo:'C.I.C Extensión del Municipio de San Roque', categoria:'servicio', coords:[-28.575522578502625,-58.70431666637905], mainImg:'fotos/cic.png' },
  'registro_civil':{ titulo:'Registro Civil', categoria:'servicio', coords:[-28.576534179577525,-58.70901613864172], mainImg:'fotos/registrocivil.png' }
};

// ── Variable global accesible por app.js ──────────────────────────────────────
let alojamientosData = _fallbackAlojamientos;

// ── Carga desde la API con fallback ──────────────────────────────────────────
(async function loadAppData() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // timeout 5s

    const res = await fetch('/api/data', { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error('API respondió con error ' + res.status);

    const data = await res.json();

    if (data.alojamientos && Object.keys(data.alojamientos).length > 0) {
      const lugaresBase = {};
      for (const [k, v] of Object.entries(_fallbackAlojamientos)) {
        if (['lugar','servicio','iglesia','salud','farmacia'].includes(v.categoria)) {
          lugaresBase[k] = v;
        }
      }
      alojamientosData = { ...lugaresBase, ...data.alojamientos };
    }

    window.appData = data;

  } catch (err) {
    console.info('[data] API no disponible, usando datos locales.', err.message);
    window.appData = {
      alojamientos: _fallbackAlojamientos,
      gastronomia: [],
      eventos: [],
      datosUtiles: null,
    };
  }

  // Notificar a app.js que los datos están listos
  document.dispatchEvent(new CustomEvent('appDataReady', { detail: window.appData }));
})();
