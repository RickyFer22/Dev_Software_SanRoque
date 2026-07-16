# Endurecimiento de seguridad · Panel Admin Vivi San Roque

> Alcance: `deploy/admin/` (Express + sesión de servidor + bcrypt + store JSON).
> Fecha: 16/07/2026. Todo lo listado está **implementado y probado** salvo la
> sección §Roadmap. Stack conservado (no se reescribió lo que funciona).

## 0. Resumen

Se corrigió una **vulnerabilidad crítica de bypass de autenticación** y se
añadieron controles por capas de auth, anti fuerza bruta, RBAC, sesiones,
endurecimiento de API, subida de archivos, auditoría y un panel de seguridad
para el super-admin. `18/18` pruebas de seguridad en verde y `0` regresiones en
la suite existente del portal.

## 1. Vulnerabilidad crítica corregida (P0)

**Bypass de autenticación por cabecera HTTP.** El middleware asignaba el rol
desde `x-admin-user` / `x-admin-role` cuando no había sesión, y las rutas sólo
comprobaban `canWrite(rol)`. Un anónimo con `x-admin-role: super-admin` obtenía
**control total** (crear/editar/eliminar cualquier recurso, gestionar usuarios).

Fix: el rol proviene **exclusivamente** de la sesión de servidor; se eliminó
todo fallback por cabeceras. Sin sesión ⇒ invitado sin permisos.
Prueba: `bypass por cabecera x-admin-role => NO otorga acceso`.

## 2. Controles implementados

| # | Área | Implementado |
|---|------|--------------|
| Auth | Contraseñas | bcrypt (factor 10); nunca en texto plano/logs/API; `passwordHash` se elimina de toda respuesta |
| Auth | Anti-enumeración | Mensaje y estado **genéricos** en todo fallo; comparación bcrypt de tiempo constante con hash señuelo para usuarios inexistentes |
| Fuerza bruta | Rate limiting | Por **IP + por cuenta**, ventana deslizante, backoff exponencial capado, bloqueo temporal con auto-desbloqueo (sin bloqueo permanente ⇒ no DoS), retraso progresivo (`security.js`) |
| RBAC | Deny-by-default | Toda ruta admin exige sesión; rol validado **en backend**; jerarquía de roles (`ROLE_RANK`) |
| RBAC | Anti-escalada | No asignar rol superior al propio; no auto-elevarse; no modificar/eliminar a rol superior; no auto-eliminarse; siempre ≥1 super-admin activo |
| Sesiones | Cookie | `HttpOnly` + `Secure` (prod) + `SameSite=Lax`; nombre propio `vsr_admin_sid` |
| Sesiones | Ciclo de vida | Regeneración de id en login (anti-fijación); expiración por inactividad (1 h) y absoluta (12 h); `trust proxy` para Traefik |
| API | Hardening | `express.json` global a 1 MB (parsers ampliados sólo en upload/restore); anti mass-assignment en usuarios; errores uniformes sin stack traces |
| API | CORS | Sólo orígenes de allowlist con credenciales en producción |
| Frontend | Cabeceras | `helmet` con CSP estricta (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`), HSTS (prod), Referrer-Policy |
| Frontend | CSRF | `SameSite=Lax` + verificación de `Origin` en métodos mutantes |
| Archivos | Upload | Validación por **firma real** (magic bytes) JPG/PNG/WebP; **SVG rechazado** (anti-XSS); límite 5 MB; **nombre aleatorio** (anti path-traversal); conversión a **WebP en cliente** antes de subir |
| Auditoría | Trazabilidad | Login ok/fallido/bloqueado, uploads, cambios de usuarios/roles; sin secretos; IP + actor + recurso + timestamp |
| Super-admin | Dashboard | Sección **Seguridad** (solo super-admin): logins fallidos/bloqueados 24 h, cuentas/IPs bloqueadas, super-admins, usuarios sin MFA, eventos recientes |
| Login único | UX | `/admin` sin sesión **redirige** a `/admin/login` (no expone el SPA); `/admin/api/session` responde 401 sin sesión |
| Datos | Seed | Se eliminó del seed las **cuentas de prueba con rol super-admin**; el admin real se crea en el primer arranque con `ADMIN_SETUP_PASSWORD`/`ADMIN_PASSWORD_HASH` |

## 3. Archivos modificados / creados

- `deploy/admin/server.js` — auth middleware, helmet/CSP, CORS, sesión endurecida, verificación de Origin, login reescrito con anti fuerza bruta, upload endurecido, guardas RBAC de usuarios, endpoint `/admin/api/security/overview`, gate del SPA.
- `deploy/admin/security.js` *(nuevo)* — limitador anti fuerza bruta por capas.
- `deploy/admin/data/admin.seed.json` *(nuevo)* — plantilla de datos **sin** cuentas por defecto.
- `deploy/admin/Dockerfile` — hornea `admin.seed.json` limpio como plantilla.
- `deploy/admin/static/app.js` — conversión a WebP en el cliente, sección Seguridad.
- `deploy/admin/static/index.html` — nav + sección Seguridad.
- `deploy/admin/static/admin.css` — estilo `.data-table`.
- `deploy/admin/tests/security.test.js` *(nuevo)* — 18 pruebas de seguridad.

## 4. Pruebas ejecutadas

`node deploy/admin/tests/security.test.js` → **18/18 OK**. Cubre: login ok/fallido,
anti-enumeración, bypass por cabecera, deny-by-default, redirección a login único,
cookie HttpOnly/SameSite, anti-fijación, CSP/anti-clickjacking, SVG rechazado,
upload válido con nombre aleatorio, validación de imagen publicada, escalada de
rol, auto-eliminación, último super-admin, CSRF por Origin, fuerza bruta, no
exposición de `passwordHash`, KPIs de seguridad.
Suite existente del portal (`tests/`, `test/`) → sin regresiones.

## 5. Variables de entorno (sin secretos)

| Variable | Uso |
|----------|-----|
| `SESSION_SECRET` | **Obligatoria en prod** (aborta si falta o es la default) |
| `ADMIN_USER` | Usuario admin (def. `gestion.turistica.sr`) |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt del admin (preferido en prod) |
| `ADMIN_SETUP_PASSWORD` | Bootstrap del primer admin |
| `ADMIN_ALLOWED_ORIGINS` | Orígenes CORS/CSRF permitidos (coma) |
| `LOGIN_MAX_FAILURES` / `LOGIN_LOCK_BASE_MS` / `LOGIN_LOCK_MAX_MS` / `LOGIN_WINDOW_MS` | Ajuste anti fuerza bruta |
| `SESSION_IDLE_MS` / `SESSION_ABSOLUTE_MS` | Timeouts de sesión |
| `MAX_UPLOAD_BYTES` | Tamaño máx. de imagen |

`ADMIN_DEV_PASSWORD` **prohibida en prod** (el server aborta si está presente).

## 6. Migración

1. Definir `SESSION_SECRET` fuerte y `ADMIN_ALLOWED_ORIGINS=https://vivisanroque.munisanroque.ar` en el `.env` del VPS.
2. Definir `ADMIN_PASSWORD_HASH` (bcrypt) o `ADMIN_SETUP_PASSWORD` para el primer login.
3. Si el volumen `/data` ya tiene cuentas de prueba super-admin, eliminarlas desde el panel (Usuarios) tras crear el admin real.

## 7. Despliegue y rollback

- **Deploy:** rama de trabajo → merge a `main` → CI/CD (`.github/workflows/deploy.yml`) por SSH, o `deploy.sh` en el VPS. Imagen Docker no-root, healthcheck sin datos sensibles.
- **Rollback:** `git revert` del merge + redeploy, o re-tag de la imagen previa. El volumen `/data` persiste; el seed limpio sólo aplica si el store está vacío.

## 8. Roadmap (no implementado — requiere dependencias/infra nuevas)

Priorizado. No incluido en esta pasada por necesitar libs, esquema o infra:

1. **MFA/TOTP obligatorio para super-admin** + códigos de recuperación (hash). *(alta prioridad)*
2. **Panel de sesiones activas** con revocación individual (requiere store de sesiones persistente, p. ej. Redis/SQLite en vez de MemoryStore).
3. **WebAuthn/passkeys** y **reautenticación** ante acciones críticas.
4. **Flujo "olvidé mi contraseña"** con token aleatorio de un solo uso y vencimiento corto.
5. **Verificación contra contraseñas comprometidas** (HIBP k-anonymity, sin almacenar la contraseña).
6. **Rate limiting distribuido** + integración WAF/CDN (bloqueo por ASN/país).
7. **DevSecOps:** escaneo de dependencias y secretos + SAST en CI; rotación de credenciales; backups cifrados con prueba de restauración.
8. **Persistencia de sesión** (hoy MemoryStore: las sesiones se pierden al reiniciar y no escalan a múltiples procesos).

## 9. Checklist de producción

- [ ] `SESSION_SECRET` fuerte y único en el VPS.
- [ ] `ADMIN_ALLOWED_ORIGINS` con el dominio real.
- [ ] `ADMIN_PASSWORD_HASH` configurado; `ADMIN_SETUP_PASSWORD`/`ADMIN_DEV_PASSWORD` retiradas tras el bootstrap.
- [ ] HTTPS forzado en Traefik (HSTS ya activo en prod vía helmet).
- [ ] Volumen `/data` sin cuentas de prueba.
- [ ] Store de sesiones persistente antes de habilitar múltiples réplicas.
