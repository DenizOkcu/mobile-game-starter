#!/usr/bin/env bash
# Executed over the verified SSH connection; never source an env file.
set -euo pipefail
cd -- "$1"
umask 077
if [[ -f .env ]]; then
  cp .env .env.previous
  chmod 600 .env.previous
fi
tar -xzf backend.tar.gz
rm backend.tar.gz
rm -f server/modules/main.lua
chmod 600 .env
# The generated server-only env contains validated KEY=value data.
# Clear ambient overrides without interpreting values as shell commands.
while IFS='=' read -r key value; do
  [[ "$key" =~ ^[A-Z][A-Z0-9_]*$ ]] || { echo 'Invalid server env key' >&2; exit 1; }
  unset "$key"
done < .env
docker compose --env-file .env -f compose.yml -f compose.production.yml pull
docker compose --env-file .env -f compose.yml -f compose.production.yml up -d --wait --force-recreate
docker compose --env-file .env -f compose.yml -f compose.production.yml ps
