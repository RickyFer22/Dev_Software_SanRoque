# Portal neutro y administración premium

## Objetivo

Reducir al mínimo las grandes superficies verde oliva del portal público y transformar `/admin` en una consola operativa moderna, clara y eficiente. La intervención conservará autenticación, permisos, endpoints, contratos de datos y funciones existentes.

## Portal público

### Cabecera

La navegación principal usará una superficie blanca translúcida con desenfoque, borde inferior suave y sombra corta. La marca y los enlaces se mostrarán en texto oscuro. El verde institucional `#355E4A` quedará reservado para la ruta activa, foco y pequeños indicadores. El widget meteorológico mantendrá su acento terracota.

Sobre heroes fotográficos la cabecera conservará legibilidad mediante una versión transparente inicial que pasará a blanca al desplazarse. En páginas internas podrá iniciar directamente sobre blanco.

### Footer

El footer será predominantemente crema `#F6F3EE` y blanco. El wordmark multicolor seguirá siendo protagonista, pero el paisaje verde se reemplazará por formas crema y una línea dorada. Redes sociales, créditos y enlaces legales se distribuirán en superficies claras. El verde aparecerá únicamente en iconos, enlaces, foco y una franja institucional de cierre de pocos píxeles.

## Consola administrativa

### Dirección visual

El admin usará una estética de consola municipal premium:

- Fondo general gris cálido `#F3F2EE`.
- Superficies blancas.
- Sidebar grafito verdoso `#17211D`.
- Verde institucional `#355E4A` para selección y acciones principales.
- Dorado `#D8A441` para indicadores y énfasis.
- Texto `#2F2F2F` y secundarios neutros.
- Radio de 14 a 16 px, sombras suaves y transiciones de 300 ms.
- Manrope como tipografía principal.

### Shell y navegación

La navegación lateral agrupará contenido, operación y sistema. La opción activa tendrá fondo blanco translúcido, indicador verde claro y contraste alto. La topbar será blanca, mostrará título, contexto, sesión y acciones globales. En móvil, la sidebar será un drawer con backdrop y cierre accesible.

### Dashboard

El resumen incluirá:

- KPIs compactos y navegables.
- Estado de publicación por recurso.
- Cola de elementos para revisar.
- Actividad reciente.
- Estado del servidor y servicios.
- Acciones rápidas de creación.
- Vista previa del portal con alternancia escritorio/móvil.

Los datos seguirán proviniendo de los endpoints actuales. Los estados de carga, vacío y error serán explícitos y no bloquearán el resto del tablero.

### Gestión CRUD

Cada módulo de contenido tendrá una lista principal con búsqueda, filtro de estado, contador y paginación o resumen de resultados. Las acciones de crear y editar se mostrarán en un drawer lateral bajo demanda para mantener el contexto de la lista. Guardar, cancelar y cerrar estarán siempre visibles.

Las acciones frecuentes serán directas. Eliminar y otras acciones destructivas quedarán agrupadas en un menú secundario con confirmación. Los campos de imagen conservarán subida y biblioteca existente, con vista previa clara.

### Módulos técnicos

Bot y APIs, observabilidad, seguridad, backup y analytics usarán navegación secundaria y secciones colapsables. La información esencial aparecerá primero; configuraciones avanzadas y detalles extensos se revelarán bajo demanda.

### Accesibilidad y movimiento

Todos los controles tendrán foco visible, nombre accesible y áreas táctiles suficientes. Los drawers y diálogos gestionarán `aria-expanded`, `aria-controls` y cierre con Escape cuando corresponda. Las transiciones durarán 300 ms y respetarán `prefers-reduced-motion`.

## Responsive

La consola será Mobile First. En móvil, KPIs y listas se apilarán; las tablas densas se presentarán como tarjetas; las acciones principales permanecerán accesibles y no habrá desplazamiento horizontal de página. En tablet y escritorio se recuperarán grillas y paneles laterales.

## Verificación

Se ampliarán las pruebas del portal y del admin para comprobar paleta, cabecera y footer claros, navegación, drawers CRUD, filtros, acciones, accesibilidad y preservación de hooks. La validación incluirá pruebas Node, sintaxis JavaScript, `git diff --check` y revisión visual en 390, 768 y 1440 px.

## Criterios de aceptación

- No quedan grandes bloques verde oliva en la cabecera o footer públicos.
- El admin usa superficies claras y sidebar grafito, no oliva.
- Dashboard y CRUD mejoran jerarquía y velocidad de operación.
- Los editores se abren bajo demanda sin perder el contexto de la lista.
- Permisos, autenticación, APIs y contratos de datos siguen intactos.
- El panel funciona desde móvil hasta escritorio sin overflow horizontal.
- Las pruebas públicas y administrativas del alcance pasan.
