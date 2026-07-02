#!/bin/sh
set -e

mkdir -p /app/backend/data
chown -R budgeting:budgeting /app/backend/data

exec su-exec budgeting "$@"

