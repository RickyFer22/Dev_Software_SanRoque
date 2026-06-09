FROM nginx:1.25-alpine

# Copiar configuración optimizada de Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copiar archivos estáticos de la aplicación
COPY . /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Health check para verificar el estado de Nginx
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Nginx corre en primer plano por defecto en la imagen base
CMD ["nginx", "-g", "daemon off;"]
