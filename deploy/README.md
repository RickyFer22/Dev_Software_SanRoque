# Deploy — Portal Turístico de San Roque

Infraestructura de despliegue del sitio en el VPS, **aislada del código del sitio**.
El sitio estático (raíz del repo: `index.html`, `JSS/`, `css/`, `img/`) no se toca.

- **Dominio destino:** `https://vivisanroque.munisanroque.ar`
- **VPS:** `69.6.243.65` (SSH puerto `22022`, usuario `root`) · Docker + Traefik (red externa `web`)
- **Dominio dado de baja:** `https://devsoftware.munisanroque.ar` (ver §4)

> ⚠️ **Credenciales:** `deploy/.env` está en `.gitignore` y **no se sube**. Se crea a mano en el VPS a partir de `deploy/.env.example`.

---

## 1. Arquitectura

```
Internet ──HTTPS──▶ Traefik (red 'web', Let's Encrypt)
                        │
                        ▼
                   contenedor 'web' (Nginx, sirve el sitio estático)
                        │  /api/weather  (proxy interno)
                        ▼
                   contenedor 'weather' (Node, proxy a OpenWeatherMap)
                        └─ usa OWM_API_KEY desde deploy/.env  (jamás llega al navegador)
```

- El **chatbot** usa `https://muni-bot-production.up.railway.app` (externo, ya operativo; no se despliega aquí).
- El **clima** lo resuelve el contenedor `weather`: mantiene la API key server-side. Si se cae, el widget degrada solo (el front tiene `try/catch`).

## 2. Archivos

| Archivo | Rol |
|---|---|
| `Dockerfile.web` | Imagen Nginx con el sitio estático (build context = raíz del repo). |
| `nginx.conf` | Nginx endurecido: headers de seguridad, CSP scopeada, proxy `/api/weather`, rate-limit. |
| `weather/` | Microservicio Node (sin dependencias) que proxea a OpenWeatherMap. |
| `docker-compose.yml` | Stack base (`web` + `weather`). Sirve para probar local. |
| `docker-compose.vps.yml` | Overlay con Traefik + dominio + HSTS + redirección HTTP→HTTPS. |
| `.env.example` | Plantilla de variables. Copiar a `.env`. |
| `scripts/deploy.sh` | Despliegue idempotente en el VPS. |
| `scripts/teardown-devsoftware.sh` | Baja del despliegue viejo de `devsoftware`. |

## 3. Despliegue en el VPS

### 3.1 Primera vez

```bash
ssh -p 22022 root@69.6.243.65

# Clonar
mkdir -p /opt/projects/vivisanroque
git clone git@github.com:RickyFer22/Dev_Software_SanRoque.git /opt/projects/vivisanroque
cd /opt/projects/vivisanroque

# Configurar credenciales (NO se versiona)
cp deploy/.env.example deploy/.env
nano deploy/.env          # completar OWM_API_KEY con tu clave real

# Red de Traefik (si no existe) y primer despliegue
docker network inspect web >/dev/null 2>&1 || docker network create web
bash deploy/scripts/deploy.sh
```

Verificá: `https://vivisanroque.munisanroque.ar` (la DNS de ese subdominio debe apuntar a `69.6.243.65`).

### 3.2 Despliegues siguientes

- **Automático:** cada `git push` a `main` dispara `.github/workflows/deploy.yml` (requiere los secretos del repo, ver §5).
- **Manual:** `cd /opt/projects/vivisanroque && bash deploy/scripts/deploy.sh`

### 3.3 Prueba local (opcional)

```bash
cp deploy/.env.example deploy/.env   # completar OWM_API_KEY
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up --build
# http://localhost:8080
```

## 4. Baja de `devsoftware.munisanroque.ar`

En el VPS:

```bash
cd /opt/projects/vivisanroque
bash deploy/scripts/teardown-devsoftware.sh
```

Luego, manualmente:
- Eliminar el registro **DNS** de `devsoftware.munisanroque.ar`.
- (Opcional) `sudo rm -rf /opt/projects/dev-software-sanroque`.

## 5. Secretos de GitHub Actions (CI/CD)

En **Settings → Secrets and variables → Actions** del repo:

| Secreto | Valor |
|---|---|
| `VPS_HOST` | `69.6.243.65` |
| `VPS_USER` | `root` |
| `VPS_PORT` | `22022` |
| `VPS_SSH_KEY` | Llave SSH **privada** con acceso al VPS (deploy key) |

> La API key de OpenWeatherMap **no** va en GitHub: vive solo en `deploy/.env` del VPS.

## 6. Endurecimiento de seguridad aplicado

- **API key server-side**: la clave de clima nunca llega al navegador (la usa el contenedor `weather`).
- **CSP scopeada** a los hosts realmente usados (Tailwind/unpkg/cdnjs/Google Fonts/OSM/Railway). Mejora la CSP previa que permitía cualquier `http:`/`https:`.
- **Headers**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`; **HSTS** en Traefik.
- **Redirección forzada HTTP→HTTPS** y TLS por Let's Encrypt.
- **Rate limiting** en `/api/weather` (anti-abuso).
- **Contenedores**: `no-new-privileges`, `weather` como usuario no-root, `read_only`, `cap_drop: ALL`, límites de CPU/memoria.
- **`.dockerignore`/`.gitignore`**: evitan filtrar `.git`, `.env` y credenciales a la imagen o al repo.

### Recomendaciones pendientes (requieren tocar el HTML generado, no incluidas aquí)
- Reemplazar el CDN de **Tailwind Play** (`cdn.tailwindcss.com`, no recomendado para producción y obliga a `'unsafe-eval'`) por Tailwind compilado a CSS. Permitiría una CSP sin `unsafe-eval`.
- Agregar **SRI** (`integrity` + `crossorigin`) a Leaflet y Font Awesome (versiones fijas).
- Evaluar autohospedar las fuentes para eliminar dependencia de Google Fonts.
