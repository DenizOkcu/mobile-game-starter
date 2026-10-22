#!/bin/sh
set -eu
DB="nakama:${POSTGRES_PASSWORD}@postgres:5432/nakama"
/nakama/nakama migrate up --database.address "$DB"
exec /nakama/nakama --name starter --database.address "$DB" \
  --logger.level "$LOG_LEVEL" \
  --socket.server_key "$NAKAMA_SERVER_KEY" \
  --session.encryption_key "$NAKAMA_SESSION_KEY" \
  --session.refresh_encryption_key "$NAKAMA_REFRESH_KEY" \
  --session.token_expiry_sec 3600 --session.refresh_token_expiry_sec 2592000 \
  --runtime.js_entrypoint main.js \
  --runtime.http_key "$NAKAMA_RUNTIME_KEY" \
  --console.password "$NAKAMA_CONSOLE_PASSWORD" \
  --console.signing_key "$NAKAMA_CONSOLE_SIGNING_KEY"
