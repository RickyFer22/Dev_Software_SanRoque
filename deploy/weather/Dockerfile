# Microservicio de clima (proxy a OpenWeatherMap), sin dependencias externas
FROM node:20-alpine

WORKDIR /app

# Solo el código del servicio (no hay dependencias que instalar)
COPY package.json ./
COPY server.js ./

ENV NODE_ENV=production \
    PORT=3000

# Ejecutar como usuario no-root (el usuario 'node' viene en la imagen oficial)
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
