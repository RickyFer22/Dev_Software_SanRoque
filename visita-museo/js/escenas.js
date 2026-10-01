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
    { id: 'ext', museo: 'Museo nuevo', nombre: 'Exterior', escenas: ['aerea', 'parque', 'entrada', 'galeria'] },
    { id: 'sala', museo: 'Museo nuevo', nombre: 'Sala de exposición', escenas: ['sala', 'virgen', 'altar', 'caldero', 'sables', 'santos', 'nicho', 'pila'] },
    { id: 'aud', museo: 'Museo nuevo', nombre: 'Auditorio y sala de arte', escenas: ['auditorio', 'arte'] },
    { id: 'ant', museo: 'Museo antiguo', nombre: 'Interior y fachada', escenas: ['antiguo-fachada', 'antiguo-sala'] }
  ],

  escenas: {
    aerea: {
      nombre: 'Vista aérea', foco: { x: 55, y: 55, z: 1 },
      puntos: [
        { id: 'a-museo', type: 'go', to: 'parque', x: 47, y: 66, label: 'Acercarse al museo' }
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
      nombre: 'Fachada del museo antiguo', foco: { x: 50, y: 50, z: 1 },
      puntos: [
        { id: 'af-entrar', type: 'go', to: 'antiguo-sala', x: 50, y: 76, label: 'Entrar al museo antiguo' },
        { id: 'af-campana', type: 'piece', piece: 'campana-torre', x: 53, y: 36, label: 'Examinar la campana' },
        { id: 'af-nuevo', type: 'go', to: 'parque', back: true, x: 88, y: 84, label: 'Visitar el museo nuevo' }
      ]
    },
    'antiguo-sala': {
      nombre: 'Sala del museo antiguo', foco: { x: 50, y: 55, z: 1 },
      puntos: [
        { id: 'as-campana', type: 'piece', piece: 'antiguo-campana', x: 55, y: 77, label: 'Examinar la campana' },
        { id: 'as-imagen', type: 'piece', piece: 'antiguo-imagen', x: 58, y: 42, label: 'Examinar la imagen del altar' },
        { id: 'as-manto', type: 'piece', piece: 'antiguo-manto', x: 19, y: 47, label: 'Examinar la imagen con manto' },
        { id: 'as-farol', type: 'piece', piece: 'antiguo-farol', x: 8, y: 60, label: 'Examinar la vitrina' },
        { id: 'as-volver', type: 'go', to: 'antiguo-fachada', back: true, x: 50, y: 84, label: 'Salir a la fachada' }
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
      descripcion: 'La campana en la torre del antiguo edificio, iluminada de noche.' },
    'antiguo-campana': { titulo: 'Campana en la sala', vermas: ['antiguo-imagen', 'antiguo-manto'], foto: 'antiguo-campana', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Gran campana apoyada sobre una base de madera en el piso de la sala.' },
    'antiguo-imagen': { titulo: 'Imagen frente al retablo', vermas: ['antiguo-campana', 'antiguo-manto'], foto: 'antiguo-imagen', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Imagen religiosa frente al retablo dorado que preside la sala.' },
    'antiguo-manto': { titulo: 'Imagen con manto negro', vermas: ['antiguo-imagen', 'antiguo-campana'], foto: 'antiguo-manto', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Imagen vestida con un largo manto negro, junto a la columna del retablo lateral.' },
    'antiguo-farol': { titulo: 'Vitrina con forma de farol', foto: 'antiguo-farol', epoca: null, procedencia: null, autor: null, pendiente: true,
      descripcion: 'Pequeña vitrina de vidrio con techo a dos aguas y una cruz en lo alto, sobre un pedestal.' }
  },

  // Visita guiada: una parada por escena. foco = {x, y, z} de la cámara; punto = hotspot a resaltar.
  guiada: [
    { escena: 'aerea', foco: { x: 55, y: 55, z: 1 }, texto: 'Empezamos desde el aire: el museo nuevo rodeado de jardines, con su galería de techo rojo.' },
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
    { escena: 'antiguo-fachada', foco: { x: 50, y: 55, z: 1 }, punto: 'af-entrar', texto: 'Terminamos en el museo antiguo. Entremos por la puerta principal.' },
    { escena: 'antiguo-sala', foco: { x: 55, y: 60, z: 1 }, punto: 'as-campana', texto: 'Imágenes, vitrinas y una gran campana bajo el techo de vigas de madera. Fin de la visita guiada.' }
  ]
};
