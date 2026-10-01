# Guía del administrador · Fichas históricas del museo

En el panel (`/admin`) hay una sección nueva: **Museo**. Desde ahí el equipo registra la historia de cada objeto, la amplía con el tiempo y la publica en la visita virtual, **sin tocar código**.

## 1. Cómo funciona (en 30 segundos)

- Cada objeto tiene **una ficha**. Todos los campos son opcionales salvo el nombre: se puede empezar con una descripción de una línea e ir completando.
- Lo que se escribe queda en un **borrador**. Los visitantes **solo ven la versión publicada**: editar un borrador nunca cambia lo que ya está publicado hasta que se aprieta **Publicar**.
- Una misma ficha puede mostrarse desde **varios puntos** de la visita sin duplicarse.
- Todo cambio queda en un **historial** con usuario y fecha, y se puede recuperar una versión anterior.

## 2. Catálogo

`Museo → Catálogo de objetos` lista todas las fichas. Se puede buscar por **nombre o código de inventario** y filtrar por **sala, categoría y estado**.

Las **señales** ayudan a organizar la investigación (no impiden publicar una ficha breve):

| Señal | Significa |
|---|---|
| Sin historia | Todavía no tiene relato ni cronología |
| Necesitan fuentes | Tiene historia pero ninguna fuente registrada |
| Pendientes de revisión | Alguien la marcó como “pendiente de revisión” |
| Con cambios sin publicar | El borrador es distinto de lo publicado |

Estados: **Borrador** (nunca publicada) · **Publicado** · **Cambios sin publicar** · **Retirado**.

## 3. Crear y completar una ficha

1. `+ Nuevo objeto` → escribí solo el nombre. Se crea el borrador.
2. Completá lo que sepas, en las pestañas:
   - **Información general:** categoría, sala, descripción breve, época, autor/origen, procedencia, materiales, técnica, ingreso al museo, personas o acontecimientos relacionados y fichas relacionadas (“Seguí con…”).
   - **Historia:** el relato principal (“Su historia”), “Para qué se utilizaba”, “Qué observar” y curiosidades. Admite negrita, cursiva, listas, citas y enlaces (botones sobre el cuadro de texto, con vista previa).
   - **Cronología:** acontecimientos (fabricación, uso, traslado, donación, restauración, exposición…).
   - **Imágenes:** una principal y fotos de detalle, inscripciones, marcas y contexto.
   - **Fuentes:** respaldo histórico.
   - **En la visita:** en qué puntos aparece.
3. **Guardar borrador** (el indicador muestra “Cambios sin guardar” / “Todo guardado”).
4. **Vista previa:** abre la ficha real dentro de la visita virtual, con el borrador guardado, en escritorio o celular.
5. **Publicar.** Para sacarla de la visita: **Retirar de publicación** (se conserva todo).

Si intentás salir con cambios sin guardar, el panel te avisa.

## 4. Datos inciertos (sin inventar)

- **Fechas:** elegí el tipo de dato —fecha exacta, un año, “hacia un año”, entre dos años, un siglo o **fecha desconocida**— o dejalo vacío. El **texto que verá el visitante** es aparte y se puede escribir libremente (“fines del siglo XIX”). Si lo dejás vacío se arma solo desde el dato estructurado.
- **Grado de certeza** (época, autor, procedencia, fecha de ingreso y cada acontecimiento): *Documentado*, *Aproximado*, *Atribución* o *Testimonio oral*. Se muestra junto al dato en la ficha pública.
- **Pendiente de investigación:** campo interno para anotar lo que falta averiguar. Registrar lo desconocido es parte del trabajo; el sistema no completa nada por su cuenta.
- Los acontecimientos **sin fecha estructurada** se muestran aparte (“Sin fecha conocida”), sin asignarles una posición histórica.

## 5. Fuentes

Cada fuente admite tipo (libro, documento, enlace, fotografía histórica, entrevista, registro del museo), título, autor o informante, fecha, referencia, páginas, enlace, archivo adjunto, observaciones y el dato o acontecimiento que respalda. Cada acontecimiento de la cronología puede citar varias fuentes.
Cada fuente se puede marcar como **pública** o **interna**, y el archivo adjunto tiene su propio permiso: **un documento privado nunca se publica** salvo que marques “Permitir descargar el archivo adjunto”.

## 6. Fotografías y documentos

- Formatos: **JPG, PNG, WebP o AVIF** (hasta 20 MB) y **PDF** (hasta 10 MB). El servidor verifica la firma real del archivo.
- Las imágenes se convierten **automáticamente a WebP** en varios tamaños (sin ampliar nunca) y el **original se conserva** como material fuente (botón *Original*, solo para el equipo).
- Podés ordenar la galería, agregar epígrafe, texto alternativo (accesibilidad), autoría y derechos de uso, y marcar cada foto como **pública** o **interna**.
- Un archivo en uso no se puede eliminar.

## 7. Lo público y lo interno

**Nunca se publica:** código de inventario, estado de conservación, notas internas, pendientes de investigación, marca de revisión, datos y notas del donante, imágenes y fuentes marcadas como internas, acontecimientos internos, originales y borradores. Esa separación la hace el servidor: no depende de lo que muestre la pantalla.
Se publica lo que está en **Información general** (menos lo interno), **Historia**, la cronología pública, la galería pública y las fuentes públicas.

## 8. Conflictos entre dos personas

Si otra persona guarda la ficha mientras la editás, al guardar aparece un aviso con los campos distintos. Para cada uno elegís **mantener lo tuyo** o **usar lo de la otra persona**; lo que solo cambió una de las partes se resuelve solo. También podés descartar lo tuyo. Nada se pisa en silencio.

## 9. Historial

`Historial` lista cada guardado, publicación, retiro y restauración con usuario y fecha. **Ver cambios** compara una revisión con el borrador actual. **Restaurar** crea un borrador nuevo con esa versión (no toca lo publicado).

## 10. En la visita

En **En la visita** (dentro de la ficha) y en **Museo → Salas y puntos de la visita**:
- Elegí una sala y **vinculá** la ficha a un punto existente (la ficha se comparte, no se duplica) o **hacé clic en la foto** para crear un punto nuevo. *Restablecer* devuelve el punto a su objeto original.
- Un punto aparece en la visita cuando su ficha está publicada.

## 11. Permisos

| Rol | Puede |
|---|---|
| Solo lectura (viewer) | Ver el catálogo, las fichas (incluido lo interno) y la vista previa |
| Editor | Crear, editar, subir archivos, vincular puntos, publicar, retirar y restaurar |
| Super admin | Todo lo anterior y **eliminar** fichas |

## 12. Para el equipo técnico

- Datos: `DATA_DIR/museo.json` (fichas, revisiones, vínculos) y `DATA_DIR/museo-archivos/` (WebP y originales; **no** es una carpeta pública). Hacer copia de seguridad de ambos.
- Migración: al iniciar, las 21 piezas actuales de la visita se crean como fichas **ya publicadas** con el mismo contenido que hoy se ve (id `2026-10-01-semilla-piezas-visita`); no se duplican al reiniciar.
- Si se agregan salas o piezas en `visita-museo/js/escenas.js`, regenerar el catálogo: `node docs/visita-museo/export-seed.js`.
- API pública (solo lectura, sin sesión): `GET /api/museo/visita`, `/api/museo/img/<id>/<tamaño>.webp`, `/api/museo/doc/<id>`. nginx ya las enruta (`location ^~ /api/museo/`).
- Pruebas: `node deploy/admin/tests/museo.test.js` (flujo completo, permisos, conflictos, archivos y fuga de datos internos) y `node deploy/admin/tests/security.test.js`.
- Si la API no responde, la visita sigue funcionando con el contenido de `escenas.js`.
