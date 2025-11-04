#!/bin/sh
set -e

if [ -z "$TASK" ]; then
  echo 'TASK not set, starting dev server for E2E...'
  exec npm run dev
else
  case "$TASK" in
    'lint')
      npm run lint
      ;;
    'build')
      npm run build
      ;;
    'unit')
      npm run test
      ;;
    'coverage')
      npm run test:cov
      ;;
    *)
      echo "Error: Unknown task '$TASK'" >&2
      exit 1
      ;;
  esac
fi
