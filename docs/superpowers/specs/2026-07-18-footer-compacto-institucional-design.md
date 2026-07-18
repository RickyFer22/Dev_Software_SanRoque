# Footer compacto institucional

## Objetivo

Reducir aproximadamente un 50% la altura visual del footer público sin perder el wordmark de San Roque, los accesos a redes sociales, los créditos académicos ni la línea de copyright.

## Alcance

El ajuste se aplicará a todas las páginas públicas que comparten el footer turístico. No modifica el panel administrativo, el contenido principal ni los enlaces de Instagram y Facebook.

## Composición visual

El footer conservará sus tres zonas actuales, con una densidad proporcionalmente mayor:

1. Corona y wordmark: la altura de la corona, el tamaño máximo del wordmark y su desplazamiento vertical se reducirán cerca del 50%.
2. Banda social: se reducirán los espacios verticales, la separación entre elementos y el tamaño de los botones sin comprometer el área táctil mínima.
3. Créditos: el bloque académico tendrá menos separación vertical y una jerarquía tipográfica compacta. Todo su contenido se mostrará en verde oliva institucional `#355E4A`.

La línea de copyright permanecerá como cierre mínimo, separada por un borde sutil. En móvil, el wordmark y los botones sociales seguirán adaptándose al ancho disponible sin provocar desplazamiento horizontal.

## Contenido académico

Se conservará este contenido:

- **Proyecto educativo · tecnología local**
- **Desarrollado por estudiantes de 3.er año de la Tecnicatura Superior en Desarrollo de Software**
- **Instituto Superior de Formación Docente «Juan García de Cossio»**
- **Autores:** Daniel Almirón · Lucas Sánchez · Milca Martínez · Román Rossi · Tomás Rolet
- **Ayudante:** Javier Legal · **Profesora:** Yésica Ponce

Se eliminarán por completo los textos “Política de privacidad” y “Términos y condiciones” de todas las páginas públicas.

## Implementación

- Se reutilizará la estructura existente y se modificarán únicamente los estilos compartidos y el marcado repetido del bloque legal.
- Se añadirán pruebas estáticas que verifiquen la ausencia de los textos eliminados en todas las páginas públicas, el color oliva de los créditos y las dimensiones compactas principales.
- No se introducirán dependencias, scripts ni animaciones nuevas.

## Criterios de aceptación

- La altura visual total del footer se reduce aproximadamente a la mitad en escritorio.
- La reducción también se percibe en móvil sin perjudicar legibilidad o interacción táctil.
- Todo el bloque académico aparece en verde oliva `#355E4A`.
- Los énfasis en negrita indicados se conservan.
- “Política de privacidad” y “Términos y condiciones” no aparecen en ninguna página pública.
- Instagram, Facebook y la línea de copyright continúan disponibles.
- La suite automatizada permanece en verde.
