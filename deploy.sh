#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
SERVICE_NAME="${SERVICE_NAME:-backend}"

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "Docker Compose is not available. Install the Docker compose plugin or docker-compose." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  cp .env.production.example "$ENV_FILE"
  echo "Created $ENV_FILE from .env.production.example. Edit it before production use if needed."
fi

while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" == \#* ]] && continue
  key="$(echo "$key" | xargs)"
  value="$(echo "$value" | sed 's/[[:space:]]*#.*$//' | xargs)"

  if [[ -z "${!key+x}" ]]; then
    export "$key=$value"
  fi
done < "$ENV_FILE"

if [[ "${SKIP_PULL:-0}" != "1" ]] && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    echo "Pulling latest code..."
    git pull --ff-only
  else
    echo "No upstream branch configured; skipping git pull."
  fi
fi

echo "Building Docker image..."
"${COMPOSE[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build "$SERVICE_NAME"

echo "Starting $SERVICE_NAME..."
"${COMPOSE[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d "$SERVICE_NAME"

if [[ "${SEED_ON_DEPLOY:-0}" == "1" ]]; then
  echo "Seeding backend data. This overwrites existing transactions and budgets."
  "${COMPOSE[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T "$SERVICE_NAME" node dist/seed.js
fi

HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${HOST_PORT:-4000}/health}"

if command -v curl >/dev/null 2>&1; then
  echo "Checking health at $HEALTH_URL..."
  for attempt in {1..30}; do
    if curl -fsS "$HEALTH_URL" >/dev/null; then
      echo "Deployment complete. Backend is healthy at $HEALTH_URL"
      exit 0
    fi

    sleep 2
  done

  echo "Backend did not pass health check. Recent logs:" >&2
  "${COMPOSE[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=80 "$SERVICE_NAME" >&2
  exit 1
fi

echo "Deployment complete. curl is not installed, so host health check was skipped."
