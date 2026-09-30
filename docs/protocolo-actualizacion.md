# Protocolo de actualización del portal

## Quién y cuándo
| Tarea | Responsable | Frecuencia |
|---|---|---|
| Cargar y publicar eventos (panel `/admin`) | Área de Turismo / Cultura | Al confirmarse cada evento; revisión semanal |
| Verificar teléfonos, direcciones y horarios de alojamientos y comedores | Área de Turismo | Mensual (comparar con el folleto vigente) |
| Revisar agenda anual (`js/agenda-anual.js`) y folleto PDF | Turismo + equipo técnico | Una vez al año (octubre) |
| Revisar informe Lighthouse (Actions → Lighthouse) | Equipo técnico | Semanal (se genera solo los lunes) |
| Revisar métricas del panel (folleto, WhatsApp, teléfono, chatbot, fichas) | Turismo | Mensual |

## Checklist antes de publicar cambios
1. `npm test` en verde (incluye enlaces rotos, peso de imágenes y PWA).
2. Imágenes nuevas: WebP o JPEG de hasta 300 KB y ~1600 px de ancho.
3. Si se cambia CSS/JS que el service worker cachea, subir `VERSION` en `sw.js`.
4. Si cambia el folleto: reemplazar `img/folleto/*.pdf` (máx. 3 MB) y `img/folleto/portada.jpg`.

## Métricas que se siguen (panel de administración → Analítica)
Clics al folleto (PDF), WhatsApp de alojamientos/gastronomía, teléfono, aperturas del chatbot y vistas de ficha.
