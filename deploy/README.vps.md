# Despliegue en VPS (Traefik + Let's Encrypt)

Pasos resumidos para desplegar la aplicación en un VPS con Traefik gestionando TLS (Let's Encrypt).

Requisitos en la VPS:
- Docker Engine y Docker Compose instalados
- DNS A record apuntando el dominio (`DOMAIN` en `deploy/.env`) a la IP del VPS
- Abrir puertos 80 y 443 en el firewall

1) Preparar variables de entorno

Copiar la plantilla y editar valores sensibles:

```bash
cp deploy/.env.example deploy/.env
# editar deploy/.env: setear DOMAIN, OWM_API_KEY, ADMIN_PASSWORD_HASH, ADMIN_SETUP_PASSWORD, SESSION_SECRET
```

Generar hash bcrypt para el admin (opcional):

```bash
# en la máquina local o en el VPS con node instalado
node -e "const b=require('bcryptjs');b.hash('TU_CONTRASEÑA',12).then(h=>console.log(h));"
```

2) Crear la red docker `web` que usa Traefik

```bash
docker network create web
```

3) Desplegar Traefik (ejemplo incluido en `deploy/traefik.yml`)

```bash
cd deploy
# exportar LETSENCRYPT_EMAIL o exportarlo en el entorno
docker compose -f traefik.yml up -d
```

4) Desplegar la aplicación (stack base + overlay VPS)

```bash
# desde la raíz del repo
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.vps.yml --env-file deploy/.env up -d --build
```

Notas importantes:
- El volumen `admin_data` persiste `/data` dentro del contenedor admin: allí se guarda `admin.json`, las sesiones sqlite y la carpeta `uploads`.
- En producción NO uses `ADMIN_DEV_PASSWORD`; genera un `ADMIN_PASSWORD_HASH` y deje `ADMIN_DEV_PASSWORD` vacío.
- Si la VPS tiene SELinux o restricciones, adapta permisos del volumen.
- Comprueba logs con `docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.vps.yml --env-file deploy/.env logs -f`.

Acceso:
- Sitio público: https://<DOMAIN>
- Panel admin (SPA): https://<DOMAIN>/admin

Si prefieres Nginx en vez de Traefik, dime y preparo un `nginx.conf` y un ejemplo de `docker-compose` que use un contenedor nginx proxy con Certbot.

---

Ejemplo Nginx + Certbot

He incluido `deploy/nginx/nginx.conf` y `deploy/nginx/docker-compose.nginx.yml`.

Generar certificados (ejemplo con Certbot):

```bash
docker compose -f deploy/nginx/docker-compose.nginx.yml run --rm certbot certonly --standalone -d your.domain.example --email you@example.com --agree-tos --non-interactive
```

Luego iniciar nginx:

```bash
docker compose -f deploy/nginx/docker-compose.nginx.yml up -d
```

Nota: el ejemplo asume la red docker `web` creada y que los servicios `web` y `admin` están en esa red y accesibles por nombre.
