# Visita virtual del museo

Visor independiente en `visita-museo/` (URL pública: `/visita-museo/`). Sin dependencias ni WebGL: HTML + CSS + JavaScript. `recorrido.html` tiene una portada que lleva al visor (`/visita-museo/` y `/visita-museo/?modo=guiada`).

## Estructura

| Archivo | Para qué sirve |
|---|---|
| `visita-museo/js/escenas.js` | **Todo el contenido**: salas, encuadre, puntos interactivos, fichas, visita guiada, sectores del mapa. |
| `visita-museo/js/imagenes.js` | **Generado** por `build-images.py`: dimensiones reales y vista previa borrosa de cada foto. No editar a mano. |
| `visita-museo/js/visita.js` | Motor (cámara, zoom, transiciones, fichas, mapa, guía). No se toca para agregar salas. |
| `visita-museo/css/visita.css` | Estilos. Todo cuelga de la clase `.vm`. |
| `visita-museo/img/escenas/<id>-<lado>.webp` | Fondo de cada sala en 900 / 1600 / 2400 px (lado mayor). |
| `visita-museo/img/piezas/<id>-<lado>.webp` | Detalle de pieza en 640 / 1200 / 1800 px. |
| `docs/visita-museo/build-images.py` | Convierte los originales a WebP responsive y recorta detalles. |

Todas las fotos se sirven en WebP. Los originales (JPG de 5–15 MB) **no se publican**: quedan como material fuente en `MUSEO/`.

## Imágenes: cómo se eligen los tamaños

El visor calcula cuántos píxeles necesita la sala en la pantalla actual (según su ancho y el DPR) y pide la variante más chica que alcance. Al acercar con el zoom pide la siguiente, solo si hace falta. Nunca se amplía una foto: si el original (o el recorte) es más chico que un tamaño, ese tamaño no se genera, y el zoom máximo lo limita la resolución real. La vista previa borrosa de `imagenes.js` rellena el fondo sin descargar nada extra y reserva el espacio, así no hay pantallas vacías ni saltos de diseño.

Precarga: al entrar a una sala se adelantan, de a una y con una pausa, como máximo 3 salas vecinas (nunca todo el museo). No se precarga con "ahorro de datos" o conexión 2G, ni con la pestaña oculta. La caché del visor retiene 10 imágenes.

## Cómo agregar una sala

1. Agregá la foto en `build-images.py` (diccionario `SCENES`) y ejecutá: `python docs/visita-museo/build-images.py "ruta\a\MUSEO"`.
2. En `escenas.js`, dentro de `escenas`:
   ```js
   'mi-sala': {
     nombre: 'Nombre de la sala', foco: { x: 50, y: 52, z: 1 },
     puntos: [
       { id: 'ms-vitrina', type: 'piece', piece: 'mi-pieza', x: 40, y: 55, label: 'Examinar la vitrina' },
       { id: 'ms-volver',  type: 'go', to: 'sala', back: true, x: 50, y: 84, label: 'Volver a la sala' }
     ]
   }
   ```
3. Agregala a un sector en `sectores` (mapa). **El sector se deriva del mapa**: define el título que se muestra y cuándo aparece la tarjeta de transición (solo al cambiar de sector; dentro del mismo sector la transición es un fundido breve).
4. Sumá un punto `go` que lleve a ella desde otra sala (toda sala necesita al menos una salida).
5. Si tiene piezas, agregalas en `piezas` y su foto en `PIECES` de `build-images.py`.

**Coordenadas `x`/`y`:** porcentaje de la **foto original** (0–100, desde arriba a la izquierda). El motor las recalcula con zoom, desplazamiento, recorte y tamaño de pantalla (verificado: el punto de una pieza mide 50,57 de la foto en 1280×720, 900×700, 812×375 y 375×812).

## Encuadre por escena

- `foco {x, y, z}`: el punto que se prioriza al abrir la sala y a qué zoom.
- `cap` / `capM` (opcional): cuánto puede recortarse la foto en pantallas horizontales / verticales, como múltiplo del encuadre completo. Por defecto: 1,35 en horizontal; en vertical 1,15 para fotos verticales y 2 para fotos horizontales. Con `cap: 1` la foto se muestra completa.
- Al volver a una sala se restaura exactamente el encuadre en que se la dejó.

## Tipos de punto

| `type` | Aspecto | Qué hace |
|---|---|---|
| `go` | disco claro con flecha | Ir a otra sala (`to`). Con `back: true`: flecha punteada de retorno, sin zoom. |
| `zoom` | aro punteado con lupa | Acercar la cámara a un sector (`z`). Los puntos con `showAfter:'id'` aparecen recién entonces; "Volver a la vista general" restaura el encuadre. |
| `piece` | aro de latón con ojo | Abre la ficha de una pieza (`piece`). |
| `story` | cuadrado de latón con libro | Ficha de lectura (misma estructura). |
| `audio` | como `piece` | Ficha con reproductor si la pieza tiene `audio:'audio/x.mp3'` (nunca suena solo). |

Estados: reposo (sin animación), foco/hover (agranda y muestra el nombre), activo (ficha abierta) y visto (punto de latón). El aro que "llama" aparece solo al entrar a la sala y en la visita guiada. En pantallas táctiles los nombres se muestran sin hover; el botón "Nombres" los alterna.

## Fichas

`epoca`, `procedencia` y `autor` en `null` = pendiente: la ficha **no los muestra**. Las descripciones se limitan a lo que se ve en la foto y llevan `pendiente: true` para que el museo las valide. El único texto histórico es el del panel «Acta de Fundación de San Roque» (11 de octubre de 1773), tomado del propio panel. `detalle` ("Mirá este detalle") se despliega a pedido. `vermas: ['id', …]` sugiere "Seguí con…" otras piezas (solo vínculos comprobables en las fotos: misma vitrina o misma imagen).

## Sonido ambiente

Desactivado por defecto: `ambient: 'audio/ambiente.mp3'` en `escenas.js` habilita el control; sin archivo, el botón no aparece. Nunca se reproduce solo.

## Integración con iframe

```html
<div style="aspect-ratio:16/10;min-height:440px">
  <iframe src="/visita-museo/?embed=1" title="Visita virtual por el Museo de San Roque"
          loading="lazy" allow="fullscreen" allowfullscreen style="width:100%;height:100%;border:0"></iframe>
</div>
```

En modo `?embed=1`: la rueda sigue desplazando la página (Ctrl/⌘ + rueda acerca); en táctil el primer toque activa la exploración y «Seguir con la página» la suelta; si el navegador no permite pantalla completa dentro del iframe, el botón «Abrir» muestra la visita en una pestaña. Enlace directo a una sala: `/visita-museo/?escena=sala`.

**Otro dominio:** `deploy/nginx.conf` envía `X-Frame-Options: SAMEORIGIN` y `frame-ancestors 'self'`; para permitir otro sitio hay que agregar un `location /visita-museo/` con `frame-ancestors https://sitio-contenedor`.

`?movimiento=0` fuerza el modo de movimiento reducido (también se respeta `prefers-reduced-motion`).

## Qué tomas faltan para completar el recorrido

- **Sala de exposición:** una toma amplia desde cada extremo para unir sectores con continuidad espacial real (hoy las salas se conectan con un fundido, sin simular un desplazamiento físico).
- **Pasos entre sectores:** una foto de cada puerta entre auditorio, sala de arte, galería y sala de exposición.
- **Museo de Arte Sacro:** una sola toma interior; faltan vitrinas, retablo y laterales con detalle de piezas.
- **Piezas sin foto propia:** estandarte, celosía de madera y paneles informativos.
- **Fotos horizontales de salas verticales:** las verticales en pantallas apaisadas dejan franjas laterales; tomas horizontales de los mismos sectores las llenarían.
- **Audio:** narraciones de 20–40 s por pieza, si el museo las quiere.

## Accesibilidad

Tab recorre los puntos y luego los controles; flechas desplazan; `+`/`-` acercan; `0` reencuadra; Esc cierra ampliación → ficha → mapa. Al cerrar una ficha o la ampliación, el foco vuelve al control de origen. La interfaz que se retira al observar reaparece con cualquier movimiento, y nunca se oculta si algo tiene el foco del teclado.
