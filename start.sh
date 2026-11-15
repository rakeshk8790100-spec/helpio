#!/bin/bash
# Start the API and nginx together; if either stops, stop the container so the host restarts it.
set -euo pipefail

# nginx's resolver directive needs a DNS server; use the container's own
NGINX_LOCAL_RESOLVERS="$(awk '/^nameserver/ { print $2; exit }' /etc/resolv.conf)"
export NGINX_LOCAL_RESOLVERS="${NGINX_LOCAL_RESOLVERS:-8.8.8.8}"
envsubst '${PORT} ${API_SCHEME} ${API_HOST} ${NGINX_LOCAL_RESOLVERS}' \
  < /etc/nginx/helpio.conf.template > /etc/nginx/conf.d/helpio.conf

# One worker: the overdue-stage check runs inside the app process
uvicorn app.main:app --host 127.0.0.1 --port 8000 --proxy-headers --forwarded-allow-ips='127.0.0.1' &
nginx -g 'daemon off;' &

wait -n
exit $?
