/**
 * Fuente de verdad de las utilidades del portal.
 *
 * Antes había dos bundles compilados a mano (css/tw-base.css y
 * css/tw-gastronomia.css) que se fueron separando: gastronomía se quedó sin
 * text-canvas-white ni max-w-xl y con DM Sans en vez de Manrope, así que el
 * hero salía gris e ilegible. Ahora todas las páginas cargan el mismo
 * css/tw-base.css, generado desde este archivo con `npm run build:css`.
 *
 * Los valores replican exactamente los que ya estaban compilados; este paso
 * no cambia el diseño, solo deja de depender de un CSS editado a mano.
 */
module.exports = {
  content: ['./*.html', './js/**/*.js'],
  theme: {
    extend: {
      colors: {
        primary: '#274F10',
        'on-primary': '#FFFFFF',
        secondary: '#D4A83C',
        background: '#F0F4F3',
        'on-background': '#16340A',
        'on-surface-variant': '#404847',
        'outline-variant': '#BFC8C6',
        'surface-container': '#EDEEEF',
        'tertiary-fixed': '#DCEDBF',
        'canvas-white': '#FFFFFF',
        'river-teal': '#336A15',
        'golden-sand': '#D4A83C',
        'sun-haze': '#F5D98A',
        'moss-dark': '#16340A',
      },
      fontFamily: {
        'display-lg': ['Manrope', 'Syne', 'sans-serif'],
        'headline-md': ['Manrope', 'Syne', 'sans-serif'],
        'body-md': ['Manrope', 'DM Sans', 'sans-serif'],
        'body-lg': ['Manrope', 'DM Sans', 'sans-serif'],
        'label-caps': ['JetBrains Mono', 'monospace'],
      },
      // Escala tipográfica y medidas que traía el bundle de gastronomía.
      fontSize: {
        'display-lg': ['57px', { lineHeight: '1.1', fontWeight: '700' }],
        'headline-md': ['32px', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'label-caps': ['12px', { lineHeight: '1', letterSpacing: '.1em', fontWeight: '600' }],
      },
      maxWidth: { 'container-max': '1280px' },
      padding: { gutter: '24px', 'section-padding': '120px' },
    },
  },
  // Clases arbitrarias escritas dentro de plantillas de JS: el escaneo no las
  // extrae porque llevan comas y paréntesis.
  safelist: [
    'ease-[cubic-bezier(0.25,1,0.5,1)]',
    'shadow-[0_-10px_20px_rgba(0,0,0,0.06)]',
  ],
  // Las clases que se arman por concatenación en las plantillas de JS
  // (`cat-${categoria}`, `gastro-estado ${estado}`…) son propias del portal y
  // viven en css/styles.css, así que no dependen de este build.
};
