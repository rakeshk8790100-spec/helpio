# Helpio in one container: nginx serves the web app and forwards /api to the API (uvicorn) on 127.0.0.1:8000.
# Used by a single Render web service at the repo root. (docker-compose.yml runs them as two containers instead.)

# ---- web app build ----
FROM node:22-alpine AS web
WORKDIR /web
COPY helpio-frontend/package.json helpio-frontend/package-lock.json ./
RUN npm ci
COPY helpio-frontend/ ./
# VITE_* values are baked into the bundle at build time (public only; Render passes env vars as build args)
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_ORG_NAME=default
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_ORG_NAME=$VITE_ORG_NAME
RUN npm run build

# ---- runtime: API + nginx ----
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    APP_ENV=prod \
    PORT=10000 \
    API_SCHEME=http \
    API_HOST=127.0.0.1:8000

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx gettext-base \
    && rm -rf /var/lib/apt/lists/* /etc/nginx/sites-enabled/default

WORKDIR /app
COPY helpio-backend/requirements.lock .
RUN pip install -r requirements.lock

COPY helpio-backend/app ./app
COPY helpio-backend/main.py ./
COPY helpio-backend/migrations ./migrations
COPY helpio-backend/scripts ./scripts

COPY helpio-frontend/nginx.conf.template /etc/nginx/helpio.conf.template
COPY --from=web /web/dist /usr/share/nginx/html
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ[\"PORT\"]}/api/v1/health', timeout=4)"

CMD ["/start.sh"]
