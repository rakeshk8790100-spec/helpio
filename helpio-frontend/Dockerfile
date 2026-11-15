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

# Where /api goes; the official image fills ${API_UPSTREAM} into the template at start-up
ENV API_UPSTREAM=http://backend:8000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
