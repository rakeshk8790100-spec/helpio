# Helpio API (FastAPI + uvicorn).
# Settings come from environment variables (docker compose `env_file`, or the host's secrets);
# no .env file is baked into the image.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    APP_ENV=prod \
    PORT=8000

WORKDIR /app

# Dependencies first, so code changes don't reinstall them
COPY requirements.lock .
RUN pip install -r requirements.lock

COPY app ./app
COPY main.py ./
COPY migrations ./migrations
COPY scripts ./scripts

RUN useradd --create-home --uid 10001 helpio && chown -R helpio /app
USER helpio

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\", \"8000\")}/api/v1/health', timeout=4)"

# One worker: the overdue-stage check runs inside the app process, so more workers would repeat it.
# --proxy-headers: trust X-Forwarded-* from the reverse proxy in front (nginx / the host's load balancer).
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
