#!/bin/sh
set -e

if [ "$REQUIRE_STRONG_JWT" = "true" ]; then
  if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "change_this_jwt_secret_in_production" ]; then
    echo "FATAL: Set a strong JWT_SECRET in .env before running production compose." >&2
    exit 1
  fi
fi

exec "$@"
