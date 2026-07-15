Nginx + Certbot (ejemplo) para VPS

Resumen rápido

- El repositorio incluye ejemplos en `deploy/nginx.conf` y `deploy/docker-compose.vps.yml`.
- Flujo recomendado en VPS con Docker Compose:
  1. Asegura que el DNS del dominio apunta al servidor.
  2. Copia `deploy/.env.example` a `deploy/.env` y ajusta variables (no incluir secretos en el repo).
  3. Usa la configuración `docker-compose.vps.yml` que incluye servicio web y proxy (nginx + certbot).

Comandos básicos

```bash
# desde la carpeta del repo
cp deploy/.env.example deploy/.env
# editar deploy/.env y poner valores reales
# crear la red si no existe
docker network create web || true
# lanzar en segundo plano
docker compose --env-file deploy/.env -f deploy/docker-compose.yml -f deploy/docker-compose.vps.yml up -d --build
```

Notas de Certbot

- El ejemplo usa imagen de Certbot para obtener y renovar certificados.
- Asegura puertos 80/443 expuestos y que `server_name` en `deploy/nginx.conf` coincide con tu dominio.
- Para pruebas locales usa `docker-compose.yml` sin certificados o Traefik.

Seguridad y buenas prácticas

- Nunca comites `deploy/.env` con `ADMIN_PASSWORD_HASH` o `ADMIN_DEV_PASSWORD` activos.
- `ADMIN_DEV_PASSWORD` debe permanecer vacío en producción; el servidor ahora falla al arrancar si detecta `ADMIN_DEV_PASSWORD` en `NODE_ENV=production`.
- Use `ADMIN_PASSWORD_HASH` para establecer la contraseña admin en producción (bcrypt hash). Para generar un hash localmente:

```bash
node -e "console.log(require('bcryptjs').hashSync(process.env.PASS||'cambiame', 10))"
```

Verificación

- Después de levantar los contenedores, comprobar logs:

```bash
docker compose logs -f
```

- Accede a `https://TU_DOMINIO/admin` y verifica funcionalidad del panel.

Problemas comunes

- Certbot falla si el puerto 80 no está accesible.
- Si usas un firewall, permite 80/443.

---
Documentaré pasos adicionales (Traefik, backups, CI) si lo deseas.
