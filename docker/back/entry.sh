#!/bin/sh
set -e

if [ -z "$TASK" ]; then
  echo 'TASK not set, starting server for development...'
  npx prisma generate
  npx prisma migrate deploy
  npm run db:seed
  exec npm run start:dev
else
  case "$TASK" in
    lint)
      npm run lint
      ;;
    build)
      npm run build
      ;;
    unit)
      npm run test
      ;;
    coverage)
      npm run test:cov
      ;;
    e2e)
      npx prisma generate
      npx prisma migrate deploy >/dev/null
      npm run db:seed
      npm run test:e2e
      ;;
    *)
      echo "Error: Unknown task '$TASK'" >&2
      exit 1
      ;;
  esac
fi
