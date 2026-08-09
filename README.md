# Portal Turístico de San Roque

Sitio web turístico de la **Municipalidad de San Roque, Corrientes (Argentina)**.
Muestra alojamientos, gastronomía, eventos, galería, clima y un mapa interactivo de la ciudad,
con un asistente (chatbot) para consultas frecuentes.

🌐 **Producción:** https://vivisanroque.munisanroque.ar
🏛️ **Sitio oficial de la muni:** https://munisanroque.ar

> Proyecto desarrollado en el marco de la **pasantía de Desarrollo de Software** de San Roque.

---

## ✨ Funcionalidades

- **Alojamientos**: tarjetas con fotos, datos, mapa y contacto directo por WhatsApp.
- **Mapa interactivo** (Leaflet + OpenStreetMap) con hospedajes, gastronomía y puntos turísticos.
- **Clima en vivo**: widget que consume `/api/weather` (proxy a OpenWeatherMap, key server-side).
- **Chatbot**: respuestas rápidas locales + integración con un bot externo.
- **Eventos**, **galería** con lightbox, **diseño responsive** y accesible.
- **Fichas turísticas editoriales** de alojamientos y gastronomía, con SEO dinámico, contenido relacionado y acciones de contacto sólo cuando existen datos publicados.
- **Panel editorial** con borradores, revisión, publicación, vista previa y recuperación local de cambios sin guardar.
- **Biblioteca multimedia** con carga múltiple, metadatos, orden de galería y variantes automáticas WebP/AVIF para miniatura, tarjeta, ficha, hero y redes.

## 🧱 Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML + CSS + JavaScript (vanilla), Tailwind (CDN), Font Awesome, Google Fonts |
| Mapa | Leaflet 1.9.4 + OpenStreetMap |
| Clima | Microservicio Node (proxy a OpenWeatherMap) — ver `deploy/weather/` |
| Chatbot | API externa (Railway) |
| Infraestructura | Docker + Nginx + Traefik (Let's Encrypt) — ver `deploy/` |
| CI/CD | GitHub Actions (deploy automático al VPS en cada push a `main`) |

## 🖼️ Flujo multimedia del admin

El panel en `/admin` acepta JPG, PNG, WebP y AVIF de hasta 5 MB por archivo. El backend valida el contenido real, corrige orientación y genera variantes optimizadas; los editores de alojamientos y gastronomía permiten asignar portada, imagen social, texto alternativo, epígrafe y orden de galería sin almacenar imágenes en base64.

Los endpoints principales son `GET /admin/api/media`, `POST /admin/api/media/upload`, `PATCH /admin/api/media/:id` y `DELETE /admin/api/media/:id`. La eliminación se bloquea mientras una imagen esté referenciada por contenido publicado o editorial.

## 📁 Estructura

```
.
├── index.html              # Página principal (alojamientos, clima, mapa, chatbot)
├── WEB_MUNI.html           # Portal turístico (versión previa)
├── JSS/js/                 # Lógica JS (mapa, chatbot, main)
│   └── data/lugares.json   # Datos de lugares
├── css/estilos.css         # Estilos
├── img/                    # Imágenes, video y favicon de origen
├── favicon.ico             # Ícono del sitio
└── deploy/                 # Infraestructura de despliegue (Docker/Traefik/CI) — ver deploy/README.md
```

## 🚀 Desarrollo local

Al ser un sitio estático, alcanza con un servidor estático:

```bash
# Opción simple (Python)
python -m http.server 8000
# abrir http://localhost:8000

# Opción con el stack completo (incluye el backend de clima)
cp deploy/.env.example deploy/.env   # completar OWM_API_KEY
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up --build
# abrir http://localhost:8080
```

> El widget de clima necesita `OWM_API_KEY` (OpenWeatherMap). Sin él, el sitio funciona igual
> y el clima degrada de forma silenciosa.

### Estilos

`css/tw-base.css` es **generado**: no se edita a mano. Cuando agregues una clase de Tailwind
en un HTML o en una plantilla de `js/`, regenerá el bundle:

```bash
npm install        # sólo la primera vez
npm run build:css  # o npm run watch:css mientras trabajás
```

Las clases propias del portal (`.atractivo-card`, `.long-read`, `.portal-shortcut`…) viven en
`css/styles.css`, que sí se edita a mano. Los colores y tipografías de marca están en
`tailwind.config.js`.

`npm test` avisa si quedó una clase usada sin compilar.

## ☁️ Despliegue

El despliegue al VPS (`vivisanroque.munisanroque.ar`) está documentado en
**[`deploy/README.md`](deploy/README.md)**: Docker + Traefik, generación automática del `.env`
desde secretos de GitHub, y baja del dominio anterior `devsoftware.munisanroque.ar`.

Cada `git push` a `main` dispara el workflow `.github/workflows/deploy.yml`.

## 🔒 Seguridad

- API key de clima **server-side** (nunca llega al navegador).
- CSP scopeada, cabeceras de seguridad, HSTS, HTTP→HTTPS y rate-limit (Nginx + Traefik).
- Contenedores no-root con límites de recursos.
- Credenciales fuera del repo (`.gitignore` / `.dockerignore`).

## 📝 Licencia

Uso institucional de la Municipalidad de San Roque.
