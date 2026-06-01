#!/usr/bin/env sh
set -eu

mkdir -p backups
docker compose -f infrastructure/docker-compose.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "backups/lumavpn-$(date +%Y%m%d-%H%M%S).sql"
