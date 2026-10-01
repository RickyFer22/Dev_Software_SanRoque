/* CONTENIDO de la visita virtual. El motor (visita.js) no se toca para agregar salas.
 *
 * Coordenadas: x e y en % de la FOTO ORIGINAL (0-100), no de la pantalla. El motor las
 * recalcula con el zoom, el desplazamiento y el recorte de cada dispositivo.
 *
 * Tipos de punto (hotspot):
 *   go     -> ir a otra sala:        { to:'id-sala' }              (back:true = flecha "volver")
 *   zoom   -> acercarse a un sector: { z:2.2 }  y otros puntos con showAfter:'id-del-zoom'
 *   piece  -> examinar una pieza:    { piece:'id-pieza' }
 *   story  -> leer una historia:     { piece:'id-pieza' }  (misma ficha, con foto/texto)
 *   audio  -> escuchar:              { piece:'id-pieza' }  y en la pieza  audio:'audio/archivo.mp3'
 *
 * Encuadre por escena: foco {x,y,z} = punto que se prioriza al abrir; cap / capM (opcional) = cuánto puede
 *   recortarse la foto en pantallas horizontales / verticales (1 = foto completa).
 * Fichas: vermas ['id-pieza', ...] = piezas que se sugieren al terminar de mirar ésta (solo vínculos comprobables).
 *
 * Datos de fichas: época, procedencia y autor van en null mientras no existan datos
 * confirmados por el museo; en ese caso la ficha no los muestra. NO inventar textos.
 * "pendiente:true" marca los textos descriptivos que el museo debe validar.
 */
window.VISITA_MUSEO = {
  titulo: 'Museo de San Roque',
  subtitulo: 'Visita virtual',
  intro: 'Recorré el museo sala por sala: acercate a las vitrinas, mirá cada pieza de cerca y descubrí su historia.',
  ambient: null, // ej. 'audio/ambiente.mp3'. Si es null no se muestra el control de sonido.
  inicio: 'parque',
  accesos: ['parque', 'antiguo-fachada'], // puerta de entrada de cada museo: el mapa siempre permite ir a ellas
  portada: 'virgen', // id de la escena usada como imagen de bienvenida

  // Sectores del mapa orientativo (no representan la planta real).
  sectores: [
    { id: 'aer', museo: 'Museo nuevo', nombre: 'Vista aérea', escenas: ['aerea', 'aerea-patio', 'aerea-frente', 'aerea-camino', 'aerea-jardin', 'aerea-galeria', 'aerea-esquina'] },
    { id: 'ext', museo: 'Museo nuevo', nombre: 'Exterior', escenas: ['parque', 'entrada', 'galeria'] },
    { id: 'sala', museo: 'Museo nuevo', nombre: 'Sala de exposición', escenas: ['sala', 'virgen', 'altar', 'caldero', 'sables', 'santos', 'nicho', 'pila'] },
    { id: 'aud', museo: 'Museo nuevo', nombre: 'Auditorio y sala de arte', escenas: ['auditorio', 'arte'] },
    { id: 'ant', museo: 'Museo de Arte Sacro', nombre: 'Iglesia y exterior', escenas: ['antiguo-fachada', 'sacro-frente', 'sacro-portico', 'sacro-galeria', 'sacro-galeria2'] },
    { id: 'sac', museo: 'Museo de Arte Sacro', nombre: 'Salas del museo', escenas: ['sacro-puerta', 'antiguo-sala', 'sacro-retablos', 'sacro-nave', 'sacro-campana', 'sacro-confesionario'] }
  ],

  escenas: {
    aerea: {
      nombre: 'Vista aérea', foco: { x: 55, y: 55, z: 1 },
      puntos: [
        { id: 'a-museo', type: 'go', to: 'parque', x: 47, y: 38, label: 'Bajar al museo' },
        { id: 'a-patio', type: 'go', to: 'aerea-patio', x: 66, y: 74, label: 'Seguir el sendero de entrada' },
        { id: 'a-galeria', type: 'go', to: 'aerea-galeria', x: 14, y: 38, label: 'Ver la galería y la palmera' }
      ]
    },
    'aerea-patio': {
      nombre: 'El patio y sus senderos', foco: { x: 45, y: 55, z: 1 },
      puntos: [
        { id: 'ap-frente', type: 'go', to: 'aerea-frente', x: 34, y: 42, label: 'Ver la entrada de frente' },
        { id: 'ap-esquina', type: 'go', to: 'aerea-esquina', x: 52, y: 33, label: 'Acercarse a la esquina' },
        { id: 'ap-volver', type: 'go', to: 'aerea', back: true, x: 22, y: 86, label: 'Volver a la vista general' }
      ]
    },
    'aerea-frente': {
      nombre: 'La entrada vista desde arriba', foco: { x: 52, y: 52, z: 1 },
      puntos: [
        { id: 'af2-entrada', type: 'go', to: 'entrada', x: 50, y: 40, label: 'Ir a la entrada del museo' },
        { id: 'af2-logo', type: 'piece', piece: 'logo-fachada', x: 64, y: 13, label: 'Mirar el logo' },
        { id: 'af2-camino', type: 'go', to: 'aerea-camino', x: 50, y: 74, label: 'Avanzar por el sendero' },
        { id: 'af2-volver', type: 'go', to: 'aerea-patio', back: true, x: 20, y: 86, label: 'Volver al patio' }
      ]
    },
    'aerea-camino': {
      nombre: 'El sendero hacia la puerta', foco: { x: 50, y: 52, z: 1 },
      puntos: [
        { id: 'ac-entrada', type: 'go', to: 'entrada', x: 50, y: 27, label: 'Entrar al museo' },
        { id: 'ac-jardin', type: 'go', to: 'aerea-jardin', x: 24, y: 58, label: 'Pasar al jardín' },
        { id: 'ac-volver', type: 'go', to: 'aerea-frente', back: true, x: 50, y: 72, label: 'Volver a la vista frontal' }
      ]
    },
    'aerea-jardin': {
      nombre: 'El jardín de la galería', foco: { x: 50, y: 50, z: 1 },
      puntos: [
        { id: 'aj-galeria', type: 'go', to: 'aerea-galeria', x: 42, y: 24, label: 'Seguir por la galería' },
        { id: 'aj-volver', type: 'go', to: 'aerea-camino', back: true, x: 50, y: 72, label: 'Volver al sendero' }
      ]
    },
    'aerea-galeria': {
      nombre: 'La galería y la palmera', foco: { x: 45, y: 50, z: 1 },
      puntos: [
        { id: 'ag-galeria', type: 'go', to: 'galeria', x: 28, y: 38, label: 'Entrar a la galería' },
        { id: 'ag-esquina', type: 'go', to: 'aerea-esquina', x: 62, y: 22, label: 'Seguir por el costado' },
        { id: 'ag-volver', type: 'go', to: 'aerea-jardin', back: true, x: 50, y: 90, label: 'Volver al jardín' }
      ]
    },
    'aerea-esquina': {
      nombre: 'La esquina del edificio', foco: { x: 50, y: 52, z: 1 },
      puntos: [
        { id: 'ae-galeria', type: 'go', to: 'galeria', x: 42, y: 62, label: 'Recorrer la galería' },
        { id: 'ae-logo', type: 'piece', piece: 'logo-fachada', x: 72, y: 19, label: 'Mirar el logo' },
        { id: 'ae-volver', type: 'go', to: 'aerea', back: true, x: 50, y: 90, label: 'Volver a la vista general' }
      ]
    },
    parque: {
      nombre: 'El museo desde el parque', foco: { x: 52, y: 55, z: 1 },
      puntos: [
        { id: 'p-entrada', type: 'go', to: 'entrada', x: 49, y: 51, label: 'Ir a la entrada' },
        { id: 'p-busto', type: 'piece', piece: 'busto', x: 93, y: 56, label: 'Examinar la escultura' },
        { id: 'p-aire', type: 'go', to: 'aerea', x: 62, y: 14, label: 'Ver el museo desde el aire' }
      ]
    },
    entrada: {
      nombre: 'Entrada del museo', foco: { x: 55, y: 48, z: 1 },
      puntos: [
        { id: 'e-sala', type: 'go', to: 'sala', x: 68, y: 58, label: 'Entrar a la sala de exposición' },
        { id: 'e-logo', type: 'piece', piece: 'logo-fachada', x: 61, y: 21, label: 'Mirar el logo' },
        { id: 'e-galeria', type: 'go', to: 'galeria', x: 86, y: 58, label: 'Recorrer la galería' },
        { id: 'e-aud', type: 'go', to: 'auditorio', x: 27, y: 57, label: 'Ir al auditorio' },
        { id: 'e-aire', type: 'go', to: 'aerea-frente', x: 62, y: 12, label: 'Ver la entrada desde el aire' },
        { id: 'e-volver', type: 'go', to: 'parque', back: true, x: 50, y: 84, label: 'Volver al parque' }
      ]
    },
    galeria: {
      nombre: 'Galería', foco: { x: 55, y: 52, z: 1 },
      puntos: [
        { id: 'g-morteros', type: 'piece', piece: 'morteros', x: 62, y: 62, label: 'Examinar los morteros' },
        { id: 'g-sala', type: 'go', to: 'sala', x: 62, y: 22, label: 'Entrar a la sala de exposición' },
        { id: 'g-volver', type: 'go', to: 'entrada', back: true, x: 30, y: 84, label: 'Volver a la entrada' }
      ]
    },
    sala: {
      nombre: 'Sala de exposición', foco: { x: 45, y: 52, z: 1 },
      puntos: [
        { id: 's-altar', type: 'go', to: 'altar', x: 34, y: 36, label: 'Acercarse al crucifijo' },
        { id: 's-virgen', type: 'go', to: 'virgen', x: 64, y: 50, label: 'Acercarse a la imagen' },
        { id: 's-pila', type: 'go', to: 'pila', x: 27, y: 72, label: 'Ir a la pila de piedra' },
        { id: 's-caldero', type: 'go', to: 'caldero', x: 50, y: 82, label: 'Seguir por la sala' },
        { id: 's-salir', type: 'go', to: 'entrada', back: true, x: 13, y: 47, label: 'Salir al acceso' }
      ]
    },
    virgen: {
      nombre: 'Imagen sobre peana', foco: { x: 50, y: 50, z: 1 },
      puntos: [
        { id: 'v-virgen', type: 'piece', piece: 'virgen', x: 50, y: 46, label: 'Examinar la imagen' },
        { id: 'v-volver', type: 'go', to: 'sala', back: true, x: 50, y: 84, label: 'Volver a la vista general' }
      ]
    },
    altar: {
      nombre: 'Crucifijo y altar', foco: { x: 45, y: 56, z: 1 },
      puntos: [
        { id: 'al-cruz', type: 'piece', piece: 'crucifijo', x: 43, y: 38, label: 'Examinar el crucifijo' },
        { id: 'al-volver', type: 'go', to: 'sala', back: true, x: 50, y: 84, label: 'Volver a la vista general' }
      ]
    },
    caldero: {
      nombre: 'Caldero y vitrinas', foco: { x: 50, y: 52, z: 1 },
      puntos: [
        { id: 'c-caldero', type: 'piece', piece: 'caldero', x: 50, y: 57, label: 'Examinar el caldero' },
        { id: 'c-vitrinas', type: 'go', to: 'sables', x: 48, y: 45, label: 'Acercarse a las vitrinas' },
        { id: 'c-santos', type: 'go', to: 'santos', x: 92, y: 40, label: 'Ir a las imágenes' },
        { id: 'c-volver', type: 'go', to: 'sala', back: true, x: 50, y: 84, label: 'Volver a la vista general' }
      ]
    },
    sables: {
      nombre: 'Vitrina de sables', foco: { x: 50, y: 60, z: 1 },
      puntos: [
        { id: 'sb-vitrina', type: 'zoom', x: 45, y: 70, z: 2.4, label: 'Acercarse a la vitrina' },
        { id: 'sb-sables', type: 'piece', piece: 'sables', x: 45, y: 72, showAfter: 'sb-vitrina', label: 'Examinar los sables' },
        { id: 'sb-volver', type: 'go', to: 'caldero', back: true, x: 78, y: 84, label: 'Volver al caldero' }
      ]
    },
    santos: {
      nombre: 'Imágenes en vitrina', foco: { x: 50, y: 48, z: 1 },
      puntos: [
        { id: 'st-roque', type: 'piece', piece: 'san-roque-peana', x: 50, y: 33, label: 'Examinar la imagen de San Roque' },
        { id: 'st-vitrina', type: 'zoom', x: 20, y: 36, z: 2.4, label: 'Explorar la vitrina' },
        { id: 'st-dolorosa', type: 'piece', piece: 'dolorosa', x: 20, y: 36, showAfter: 'st-vitrina', label: 'Examinar la imagen' },
        { id: 'st-cristo', type: 'piece', piece: 'cristo-cruz', x: 87, y: 40, label: 'Examinar la imagen' },
        { id: 'st-nicho', type: 'go', to: 'nicho', x: 82, y: 12, label: 'Ver el nicho de San Roque' },
        { id: 'st-volver', type: 'go', to: 'caldero', back: true, x: 22, y: 84, label: 'Volver al caldero' }
      ]
    },
    nicho: {
      nombre: 'Nicho de San Roque', foco: { x: 60, y: 55, z: 1 },
      puntos: [
        { id: 'n-roque', type: 'piece', piece: 'san-roque-nicho', x: 50, y: 62, label: 'Examinar la imagen' },
        { id: 'n-acta', type: 'story', piece: 'acta', x: 86, y: 55, label: 'Leer el Acta de Fundación' },
        { id: 'n-volver', type: 'go', to: 'santos', back: true, x: 50, y: 84, label: 'Volver a las imágenes' }
      ]
    },
    pila: {
      nombre: 'Pila de piedra', foco: { x: 50, y: 52, z: 1 },
      puntos: [
        { id: 'pi-pila', type: 'piece', piece: 'pila', x: 49, y: 58, label: 'Examinar la pila' },
        { id: 'pi-volver', type: 'go', to: 'sala', back: true, x: 62, y: 84, label: 'Volver a la vista general' }
      ]
    },
    auditorio: {
      nombre: 'Auditorio', foco: { x: 50, y: 50, z: 1 },
      puntos: [
        { id: 'au-logo', type: 'piece', piece: 'logo', x: 50, y: 40, label: 'Mirar el logo del museo' },
        { id: 'au-arte', type: 'go', to: 'arte', x: 90, y: 70, label: 'Pasar a la sala de arte' },
        { id: 'au-volver', type: 'go', to: 'entrada', back: true, x: 50, y: 84, label: 'Volver a la entrada' }
      ]
    },
    arte: {
      nombre: 'Sala de arte', foco: { x: 45, y: 52, z: 1 },
      puntos: [
        { id: 'ar-cuadro', type: 'piece', piece: 'cuadro-paisaje', x: 30, y: 64, label: 'Examinar el cuadro' },
        { id: 'ar-pinturas', type: 'piece', piece: 'pinturas', x: 36, y: 44, label: 'Ver las pinturas del fondo' },
        { id: 'ar-salir', type: 'go', to: 'entrada', x: 9, y: 36, label: 'Salir a la entrada' },
        { id: 'ar-volver', type: 'go', to: 'auditorio', back: true, x: 60, y: 84, label: 'Volver al auditorio' }
      ]
    },
    'antiguo-fachada': {
      nombre: 'La iglesia nueva', foco: { x: 50, y: 50, z: 1 },
      puntos: [
        { id: 'af-entrar', type: 'go', to: 'sacro-frente', x: 50, y: 76, label: 'Ir al Museo de Arte Sacro' },
        { id: 'af-campana', type: 'piece', piece: 'campana-torre', x: 53, y: 36, label: 'Examinar la campana' },
        { id: 'af-nuevo', type: 'go', to: 'parque', back: true, x: 88, y: 84, label: 'Visitar el museo nuevo' }
      ]
    },
    'sacro-frente': {
      nombre: 'Frente del Museo de Arte Sacro', foco: { x: 48, y: 50, z: 1 },
      puntos: [
        { id: 'sf-entrar', type: 'go', to: 'antiguo-sala', x: 46, y: 66, label: 'Entrar al museo' },
        { id: 'sf-portico', type: 'go', to: 'sacro-portico', x: 19, y: 62, label: 'Pasar al pórtico' },
        { id: 'sf-galeria', type: 'go', to: 'sacro-galeria', x: 80, y: 77, label: 'Recorrer la galería' },
        { id: 'sf-cruz', type: 'piece', piece: 'sacro-cruz', x: 88, y: 46, label: 'Mirar la cruz' },
        { id: 'sf-volver', type: 'go', to: 'antiguo-fachada', back: true, x: 56, y: 90, label: 'Volver a la iglesia nueva' }
      ]
    },
    'sacro-portico': {
      nombre: 'Pórtico de columnas', foco: { x: 50, y: 52, z: 1 },
      puntos: [
        { id: 'sp-galeria', type: 'go', to: 'sacro-galeria', x: 90, y: 50, label: 'Seguir por la galería' },
        { id: 'sp-volver', type: 'go', to: 'sacro-frente', back: true, x: 50, y: 72, label: 'Volver al frente del museo' }
      ]
    },
    'sacro-galeria': {
      nombre: 'Galería de madera', foco: { x: 40, y: 50, z: 1 },
      puntos: [
        { id: 'sg-seguir', type: 'go', to: 'sacro-galeria2', x: 30, y: 57, label: 'Seguir por la galería' },
        { id: 'sg-volver', type: 'go', to: 'sacro-frente', back: true, x: 50, y: 72, label: 'Volver al frente del museo' }
      ]
    },
    'sacro-galeria2': {
      nombre: 'Galería y plaza', foco: { x: 40, y: 50, z: 1 },
      puntos: [
        { id: 'sg2-frente', type: 'go', to: 'sacro-frente', x: 24, y: 58, label: 'Salir al frente del museo' },
        { id: 'sg2-volver', type: 'go', to: 'sacro-galeria', back: true, x: 50, y: 72, label: 'Volver atrás' }
      ]
    },
    'sacro-puerta': {
      nombre: 'La puerta principal', foco: { x: 50, y: 52, z: 1 },
      puntos: [
        { id: 'spu-salir', type: 'go', to: 'sacro-portico', x: 50, y: 58, label: 'Salir al pórtico' },
        { id: 'spu-volver', type: 'go', to: 'sacro-nave', back: true, x: 50, y: 72, label: 'Volver a la sala' }
      ]
    },
    'antiguo-sala': {
      nombre: 'Museo de Arte Sacro', foco: { x: 50, y: 55, z: 1 },
      puntos: [
        { id: 'as-campana', type: 'piece', piece: 'antiguo-campana', x: 55, y: 77, label: 'Examinar la campana' },
        { id: 'as-imagen', type: 'piece', piece: 'antiguo-imagen', x: 58, y: 42, label: 'Examinar la imagen del altar' },
        { id: 'as-manto', type: 'piece', piece: 'antiguo-manto', x: 19, y: 47, label: 'Examinar la imagen con manto' },
        { id: 'as-farol', type: 'piece', piece: 'antiguo-farol', x: 8, y: 60, label: 'Examinar la vitrina' },
        { id: 'as-retablo', type: 'go', to: 'sacro-retablos', x: 50, y: 27, label: 'Acercarse al retablo' },
        { id: 'as-nave', type: 'go', to: 'sacro-nave', x: 92, y: 52, label: 'Recorrer la sala' },
        { id: 'as-volver', type: 'go', to: 'sacro-frente', back: true, x: 50, y: 88, label: 'Salir al frente del museo' }
      ]
    },
    'sacro-retablos': {
      nombre: 'Retablos dorados', foco: { x: 50, y: 52, z: 1 },
      puntos: [
        { id: 'sr-roque', type: 'piece', piece: 'sacro-san-roque', x: 38, y: 58, label: 'Examinar la imagen de San Roque' },
        { id: 'sr-asuncion', type: 'piece', piece: 'sacro-asuncion', x: 57, y: 52, label: 'Examinar la Asunción de la Virgen' },
        { id: 'sr-volver', type: 'go', to: 'antiguo-sala', back: true, x: 18, y: 86, label: 'Volver a la sala' }
      ]
    },
    'sacro-nave': {
      nombre: 'La sala bajo las vigas', foco: { x: 52, y: 52, z: 1 },
      puntos: [
        { id: 'sn-campana', type: 'go', to: 'sacro-campana', x: 80, y: 66, label: 'Acercarse a las campanas' },
        { id: 'sn-confe', type: 'go', to: 'sacro-confesionario', x: 12, y: 62, label: 'Ver el confesionario y el piano' },
        { id: 'sn-retablo', type: 'go', to: 'sacro-retablos', x: 55, y: 50, label: 'Ir al retablo' },
        { id: 'sn-sala', type: 'go', to: 'antiguo-sala', back: true, x: 30, y: 78, label: 'Volver a la sala' },
        { id: 'sn-puerta', type: 'go', to: 'sacro-puerta', back: true, x: 70, y: 78, label: 'Mirar hacia la puerta' }
      ]
    },
    'sacro-campana': {
      nombre: 'Campanas en el piso de la sala', foco: { x: 55, y: 60, z: 1 },
      puntos: [
        { id: 'sc-campanas', type: 'piece', piece: 'sacro-campanas', x: 55, y: 70, label: 'Examinar las campanas' },
        { id: 'sc-volver', type: 'go', to: 'sacro-nave', back: true, x: 50, y: 72, label: 'Volver a la sala' }
      ]
    },
    'sacro-confesionario': {
      nombre: 'Confesionario y piano', foco: { x: 40, y: 52, z: 1 },
      puntos: [
        { id: 'scf-confe', type: 'piece', piece: 'sacro-confesionario', x: 34, y: 50, label: 'Examinar el confesionario' },
        { id: 'scf-teclado', type: 'piece', piece: 'sacro-teclado', x: 62, y: 62, label: 'Examinar el instrumento de teclado' },
        { id: 'scf-volver', type: 'go', to: 'sacro-nave', back: true, x: 78, y: 72, label: 'Volver a la sala' }
      ]
    }
  },

  // Fichas. titulo + descripcion salen de lo que muestra la fotografía.
  // epoca / procedencia / autor: null = pendiente (no se muestran).
  piezas: {
    busto: { titulo: 'Escultura en metal', foto: 'busto', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Busto con sombrero armado con piezas de metal, ubicado en el parque frente al museo.',
      detalle: 'El sombrero y el rostro están formados por placas metálicas superpuestas.' },
    'logo-fachada': { titulo: 'Logo del museo', vermas: ['san-roque-nicho'], foto: 'logo', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'San Roque con su perro frente a un sol, rodeado por el texto «Museo de San Roque». Se repite en la fachada, el auditorio y la sala.' },
    morteros: { titulo: 'Morteros de madera', foto: 'morteros', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Dos recipientes de madera apoyados junto a una puerta de la galería. El más claro tiene un diseño grabado.',
      detalle: 'En la parte baja del recipiente claro se lee grabado el año 1915.' },
    crucifijo: { titulo: 'Crucifijo y altar', vermas: ['virgen'], foto: 'crucifijo', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Cristo en la cruz sobre un altar con candeleros y un libro abierto.',
      detalle: 'Sobre la cruz, el cartel con las letras INRI.' },
    virgen: { titulo: 'Imagen policromada sobre peana', vermas: ['crucifijo', 'caldero'], foto: 'virgen', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Talla policromada de una figura femenina con vestiduras doradas y rojas, exhibida sobre nubes y cabezas de ángeles.',
      detalle: 'En la base, los rostros de los ángeles entre las nubes.' },
    caldero: { titulo: 'Caldero de hierro', vermas: ['sables', 'virgen'], foto: 'caldero', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Caldero de gran tamaño con dos asas, exhibido sobre una base blanca en medio de la sala.',
      detalle: 'Las dos asas laterales y la superficie oscura del hierro.' },
    sables: { titulo: 'Sables y espadas', vermas: ['caldero'], foto: 'sables', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Sables y espadas con vainas y empuñaduras, dispuestos sobre un fondo negro dentro de una vitrina.',
      detalle: 'La empuñadura con guarda calada, a la derecha de la vitrina.' },
    'san-roque-peana': { titulo: 'San Roque sobre peana decorada', vermas: ['san-roque-nicho', 'dolorosa', 'cristo-cruz'], foto: 'san-roque-peana', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Imagen de San Roque con su perro, protegida por una urna de vidrio, sobre una peana pintada con flores y volutas.',
      detalle: 'El perro a sus pies y la decoración vegetal de la base.' },
    dolorosa: { titulo: 'Imagen con manto y encaje', vermas: ['san-roque-peana', 'cristo-cruz'], foto: 'dolorosa', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Imagen vestida con un manto oscuro bordeado de encaje, dentro de una vitrina.' },
    'cristo-cruz': { titulo: 'Jesús con la cruz a cuestas', vermas: ['san-roque-peana', 'dolorosa'], foto: 'cristo-cruz', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Imagen de Jesús cargando la cruz, dentro de una urna de vidrio.' },
    'san-roque-nicho': { titulo: 'San Roque', vermas: ['acta', 'san-roque-peana'], foto: 'san-roque-nicho', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Imagen de San Roque con su perro, colocada en un nicho de la sala.',
      detalle: 'El perro a sus pies, mirando hacia el santo.' },
    acta: { titulo: 'Acta de Fundación de San Roque', vermas: ['san-roque-nicho'], foto: 'acta', epoca: '11 de octubre de 1773', procedencia: 'Paraje Paso de Blas, río Santa Lucía', autor: null,
      descripcion: 'El panel de la sala reproduce el acta con la que se resolvió construir la capilla en el paraje Paso de Blas del río Santa Lucía. Tocá la imagen para ampliarla y leer el texto completo.' },
    pila: { titulo: 'Pila de piedra', foto: 'pila', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Pila de pie con taza de piedra veteada en tonos rojizos, junto a un muro de la sala.',
      detalle: 'Las vetas rojizas que recorren todo el pie y la taza.' },
    logo: { titulo: 'Logo del museo', vermas: ['san-roque-nicho'], foto: 'logo', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'San Roque con su perro frente a un sol, rodeado por el texto «Museo de San Roque».' },
    'cuadro-paisaje': { titulo: 'Paisaje enmarcado', vermas: ['pinturas'], foto: 'cuadro-paisaje', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Cuadro con un paisaje de campo y una casa, con marco de madera, sobre un pedestal blanco.' },
    pinturas: { titulo: 'Pinturas y escultura', vermas: ['cuadro-paisaje'], foto: 'pinturas', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Pinturas de colores intensos y una escultura de metal, expuestas sobre un mueble de madera clara.' },
    'campana-torre': { titulo: 'Campana del campanario', foto: 'campana-torre', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'La campana en la torre de la iglesia nueva, iluminada de noche.' },
    'antiguo-campana': { titulo: 'Campana en la sala', vermas: ['antiguo-imagen', 'antiguo-manto'], foto: 'antiguo-campana', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Gran campana apoyada sobre una base de madera en el piso de la sala.' },
    'antiguo-imagen': { titulo: 'Imagen frente al retablo', vermas: ['antiguo-campana', 'antiguo-manto'], foto: 'antiguo-imagen', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Imagen religiosa frente al retablo dorado que preside la sala.' },
    'antiguo-manto': { titulo: 'Imagen con manto negro', vermas: ['antiguo-imagen', 'antiguo-campana'], foto: 'antiguo-manto', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Imagen vestida con un largo manto negro, junto a la columna del retablo lateral.' },
    'antiguo-farol': { titulo: 'Vitrina con forma de farol', foto: 'antiguo-farol', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Pequeña vitrina de vidrio con techo a dos aguas y una cruz en lo alto, sobre un pedestal.' },
    'sacro-asuncion': { titulo: 'Asunción de la Virgen', vermas: ['sacro-san-roque', 'antiguo-imagen'], foto: 'sacro-asuncion', epoca: 'Siglo XVIII (según el cartel del museo)', procedencia: 'Misiones Jesuíticas (según el cartel del museo)', autor: null,
      descripcion: 'Talla policromada de la Virgen con vestiduras doradas y un manto rojo, que se eleva sobre nubes y cabezas de ángeles. Está flanqueada por dos candeleros de madera oscura.',
      detalle: 'Los rostros de los ángeles entre las nubes, en la base de la imagen.' },
    'sacro-san-roque': { titulo: 'San Roque sobre peana verde', vermas: ['sacro-asuncion', 'san-roque-peana'], foto: 'sacro-san-roque', epoca: 'Siglo XVIII (según el cartel del museo)', procedencia: null, autor: null,
      descripcion: 'San Roque con su perro sobre una peana pintada de verde con motivos dorados en forma de estrella. El cartel del museo lo ubica en el siglo XVIII.',
      detalle: 'El perro a sus pies y las estrellas doradas que decoran la peana.' },
    'sacro-campanas': { titulo: 'Campanas en el piso de la sala', vermas: ['antiguo-campana'], foto: 'sacro-campanas', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Dos campanas apoyadas sobre bases de madera en el piso de ladrillo, con cordones que delimitan el paso. Una tiene un cartel explicativo.',
      detalle: 'Las asas en forma de volutas, en la parte superior de la campana mayor.' },
    'sacro-confesionario': { titulo: 'Confesionario de madera', vermas: ['sacro-teclado'], foto: 'sacro-confesionario', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Confesionario de madera pintado en gris, con puerta central y una rejilla calada.' },
    'sacro-teclado': { titulo: 'Instrumento de teclado', vermas: ['sacro-confesionario'], foto: 'sacro-teclado', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Instrumento de teclado de madera oscura apoyado contra la pared, junto al confesionario.' },
    'sacro-cruz': { titulo: 'Cruz de madera', foto: 'sacro-cruz', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Cruz de madera sobre una base escalonada blanca, junto a la galería del museo.' }
  },

  // Visita guiada: una parada por escena. foco = {x, y, z} de la cámara; punto = hotspot a resaltar.
  guiada: [
    { escena: 'aerea', foco: { x: 55, y: 55, z: 1 }, punto: 'a-patio', texto: 'Empezamos desde el aire: el museo nuevo rodeado de jardines, con su galería de techo rojo y sus senderos.' },
    { escena: 'aerea-patio', foco: { x: 45, y: 55, z: 1 }, punto: 'ap-frente', texto: 'Desde otro ángulo se ve cómo los senderos cruzan el patio hasta la entrada.' },
    { escena: 'aerea-frente', foco: { x: 52, y: 50, z: 1 }, punto: 'af2-entrada', texto: 'Vista de frente: el logo del museo sobre la entrada, con el sendero que llega hasta la puerta.' },
    { escena: 'aerea-galeria', foco: { x: 40, y: 45, z: 1 }, punto: 'ag-galeria', texto: 'El otro extremo del edificio: la galería de techo rojo y una palmera junto al jardín.' },
    { escena: 'parque', foco: { x: 55, y: 55, z: 1.4 }, punto: 'p-busto', texto: 'Llegamos por el parque. Al costado del edificio nos recibe una escultura de metal.' },
    { escena: 'entrada', foco: { x: 55, y: 45, z: 1 }, punto: 'e-sala', texto: 'El logo del museo marca el ingreso. Entremos a la sala de exposición.' },
    { escena: 'galeria', foco: { x: 55, y: 60, z: 1.3 }, punto: 'g-morteros', texto: 'La galería también exhibe piezas. Fijate en los morteros de madera: uno tiene grabado el año 1915.' },
    { escena: 'sala', foco: { x: 50, y: 50, z: 1 }, punto: 's-virgen', texto: 'La sala de exposición reúne imágenes religiosas, vitrinas y paneles bajo una luz pareja.' },
    { escena: 'virgen', foco: { x: 50, y: 45, z: 1.2 }, punto: 'v-virgen', texto: 'Una talla policromada sobre nubes y ángeles. Acercate para ver los detalles.' },
    { escena: 'altar', foco: { x: 45, y: 45, z: 1.2 }, punto: 'al-cruz', texto: 'El crucifijo y el altar, con candeleros y un libro abierto.' },
    { escena: 'caldero', foco: { x: 50, y: 55, z: 1 }, punto: 'c-caldero', texto: 'Un caldero de hierro de gran tamaño ocupa el centro de esta zona de la sala.' },
    { escena: 'sables', foco: { x: 45, y: 65, z: 1.8 }, punto: 'sb-vitrina', texto: 'En esta vitrina se exhiben sables y espadas. Tocá «Acercarse a la vitrina».' },
    { escena: 'santos', foco: { x: 50, y: 40, z: 1.2 }, punto: 'st-roque', texto: 'San Roque con su perro sobre una peana pintada, junto a otras imágenes en vitrinas.' },
    { escena: 'nicho', foco: { x: 70, y: 55, z: 1.3 }, punto: 'n-acta', texto: 'En el panel de la derecha se reproduce el Acta de Fundación de San Roque, de 1773.' },
    { escena: 'pila', foco: { x: 50, y: 55, z: 1.2 }, punto: 'pi-pila', texto: 'Una pila de piedra veteada, junto al muro de la sala.' },
    { escena: 'arte', foco: { x: 40, y: 55, z: 1.1 }, punto: 'ar-cuadro', texto: 'La sala de arte: pinturas y esculturas sobre pedestales y muebles.' },
    { escena: 'antiguo-fachada', foco: { x: 50, y: 55, z: 1 }, punto: 'af-entrar', texto: 'Terminamos en la iglesia nueva. Entremos al Museo de Arte Sacro por la puerta principal.' },
    { escena: 'sacro-frente', foco: { x: 48, y: 50, z: 1 }, punto: 'sf-entrar', texto: 'Este es el frente del Museo de Arte Sacro: una capilla blanca con pórtico de columnas y una galería de madera.' },
    { escena: 'sacro-galeria', foco: { x: 40, y: 55, z: 1 }, punto: 'sg-seguir', texto: 'La galería de pilares de madera rodea el edificio y da a la plaza.' },
    { escena: 'sacro-portico', foco: { x: 50, y: 52, z: 1 }, punto: 'sp-galeria', texto: 'Dos columnas enmarcan la plaza desde el pórtico, antes de cruzar la puerta.' },
    { escena: 'antiguo-sala', foco: { x: 55, y: 60, z: 1 }, punto: 'as-campana', texto: 'Adentro, imágenes, vitrinas y una gran campana bajo el techo de vigas de madera.' },
    { escena: 'sacro-retablos', foco: { x: 50, y: 52, z: 1.1 }, punto: 'sr-asuncion', texto: 'Entre los retablos dorados están San Roque y la Asunción de la Virgen. Los carteles del museo los ubican en el siglo XVIII.' },
    { escena: 'sacro-nave', foco: { x: 52, y: 52, z: 1 }, punto: 'sn-campana', texto: 'La sala vista desde un costado: campanas en el piso de ladrillo, vitrinas y el retablo al fondo.' },
    { escena: 'sacro-campana', foco: { x: 55, y: 62, z: 1.1 }, punto: 'sc-campanas', texto: 'Dos campanas apoyadas sobre bases de madera. Fin de la visita guiada.' }
  ]
};
