# Panel de administración del Portal Turístico de San Roque
# Usa better-sqlite3 → requiere compilación con node-gyp (el stage builder lo resuelve)
FROM node:20-alpine AS builder

WORKDIR /app

# Dependencias del sistema para compilar better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install --omit=dev

# ──────────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Solo copiamos node_modules ya construidos y el código fuente
COPY --from=builder /app/node_modules ./node_modules
COPY package.json package-lock.json server.js seed.js ./
COPY static ./static

ENV NODE_ENV=production \
    PORT=4000 \
    DATA_DIR=/data

# Volumen para la base de datos SQLite persistente
VOLUME ["/data"]

# Permitir que SQLite escriba en el volumen
RUN mkdir -p /data && chown -R node:node /data

# Ejecutar como usuario no-root
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "server.js"]
