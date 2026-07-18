# Rediseño integral del portal turístico de San Roque

## Objetivo

Rediseñar la portada y las páginas internas del portal para ofrecer una experiencia turística institucional, moderna y acogedora, con especial protagonismo de la gastronomía regional, la naturaleza y la cultura local. El resultado tomará como referencia los principios editoriales del portal de Turismo de Oberá sin reproducir su composición ni sus recursos gráficos.

## Alcance

El sistema visual se aplicará a `index.html`, `gastronomia.html`, `gastronomia-premium.html`, `agenda.html`, `que-hacer.html`, `guia-practica.html`, `comercio.html` y `evento.html`. Se conservarán las funciones existentes: buscadores, filtros, mapas, horarios, contactos, reservas, redes sociales, valoraciones, datos dinámicos y chatbot.

El rediseño no reemplazará el contenido real ni modificará los contratos de datos o servicios del portal. Los cambios estructurales se limitarán a los necesarios para mejorar jerarquía, navegación, presentación responsive y reutilización visual.

## Dirección de arte

La dirección visual será editorial, orgánica y premium. Las fotografías serán el elemento dominante, con encuadres amplios, luz natural, tonos cálidos, madera, vegetación y escenas de cocina regional auténtica. El diseño usará espacio en blanco generoso y evitará superficies extensas en verde oliva.

La paleta base será:

- Verde institucional: `#355E4A`.
- Verde de interacción: `#2C4F3D`.
- Crema de superficie: `#F6F3EE`.
- Blanco elevado: `#FFFFFF`.
- Texto principal: `#2F2F2F`.
- Dorado de acento: `#D8A441`.

El verde institucional quedará reservado para títulos, navegación, botones, iconos y bandas puntuales. Las superficies predominantes serán crema y blancas. El dorado se utilizará con moderación en indicadores, etiquetas, líneas y estados destacados.

La tipografía principal será Manrope, con títulos Bold, subtítulos Semibold y texto Regular. Se mantendrán tamaños fluidos, anchos de lectura controlados y contraste accesible.

## Sistema de componentes

### Navegación

La cabecera será clara, compacta y persistente cuando el patrón actual lo permita. La marca, las rutas principales y la acción destacada tendrán una jerarquía inmediata. En móvil se conservará una navegación directa con áreas táctiles cómodas.

### Hero

La portada tendrá una imagen panorámica de alto impacto, tratamiento fotográfico cálido, título breve y una acción principal. El buscador se integrará visualmente al hero sin perder legibilidad. Las páginas internas usarán versiones más compactas del mismo patrón.

### Búsqueda y filtros

El buscador tendrá fondo blanco, borde sutil y estado de foco visible. Los filtros por categoría se presentarán como controles redondeados y desplazables en móvil. La selección activa utilizará verde institucional y texto blanco.

### Tarjetas

Restaurantes, alojamientos, eventos y experiencias compartirán tarjetas con radio de 16 px, imagen dominante, sombra suave, contenido ordenado y acciones inequívocas. Las tarjetas gastronómicas expondrán nombre, categoría, horarios, contacto, ubicación, valoración y botones de Google Maps o reserva cuando esos datos existan.

### Galerías y carruseles

Las galerías usarán imágenes amplias y composición editorial. Los carruseles tendrán controles accesibles, desplazamiento táctil y transiciones suaves. No se agregarán movimientos automáticos que dificulten la lectura.

### Llamadas a la acción

Las acciones principales usarán `#355E4A`, texto blanco y hover `#2C4F3D`. Las acciones secundarias serán claras con borde verde. Reservas, Google Maps y contactos conservarán destinos y comportamiento actuales.

### Footer

El footer será mayormente crema o blanco, con navegación turística, contacto, redes y créditos ordenados en columnas responsive. El verde se reducirá a una franja o bloque institucional de cierre, eliminando el gran campo oliva actual.

## Comportamiento responsive

La implementación será Mobile First. En móvil se priorizarán lectura, búsqueda, filtros táctiles, tarjetas de una columna y acciones al alcance. En tablet se habilitarán dos columnas cuando el contenido lo permita. En escritorio se usarán grillas de tres o cuatro columnas y composiciones editoriales asimétricas sin afectar el orden semántico.

## Movimiento

Las interacciones tendrán una duración base de 300 ms. Se aplicarán elevación ligera de tarjetas, cambio de color en botones, fade in y revelado al hacer scroll. Las animaciones respetarán `prefers-reduced-motion` y no ocultarán contenido si JavaScript falla.

## Datos y estados

Los componentes seguirán consumiendo las fuentes actuales. Los estados sin resultados mostrarán un mensaje claro y una forma de limpiar filtros. Las imágenes faltantes usarán los placeholders existentes. Enlaces o datos opcionales no producirán botones vacíos.

## Verificación

La implementación se validará con las pruebas Node existentes, comprobación de sintaxis, revisión responsive de las páginas principales y pruebas de los flujos de búsqueda, filtros, mapas, reservas, redes y chatbot. También se comprobarán contraste, foco visible, reducción de movimiento y ausencia de desbordamiento horizontal.

## Criterios de aceptación

- No quedan grandes superficies verde oliva en la portada ni en páginas internas.
- La paleta acordada se aplica de forma consistente mediante variables reutilizables.
- La fotografía y el espacio en blanco dominan la experiencia.
- Todas las páginas comparten navegación, tarjetas, botones y footer coherentes.
- Las funciones existentes siguen operativas.
- El portal se adapta correctamente desde móvil hasta escritorio.
- La experiencia se percibe institucional, gastronómica, moderna y premium.
