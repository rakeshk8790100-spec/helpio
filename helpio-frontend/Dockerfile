# Helpio web app: built with Vite, served by nginx, which also forwards /api to the backend.

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_* values are baked into the bundle at build time (all public; never put secrets here)
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_ORG_NAME=default
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_ORG_NAME=$VITE_ORG_NAME
RUN npm run build

# ---- serve ----
FROM nginx:1.27-alpine

# Where /api goes (scheme + host:port) and the port to listen on (Render sets PORT).
# The official image fills these into the template at start-up; NGINX_ENTRYPOINT_LOCAL_RESOLVERS makes it
# fill NGINX_LOCAL_RESOLVERS from the container's DNS servers.
ENV API_SCHEME=http \
    API_HOST=backend:8000 \
    PORT=80 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/healthz" || exit 1
