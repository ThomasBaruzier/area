#!/bin/bash
set -e

mkdir -p ./front/public ./back/node_modules ./front/dist ./front/node_modules ./back/coverage ./front/coverage ./front/cypress/screenshots ./front/cypress/videos ./mobile/keystore ./mobile/build

export HOST_UID=$(id -u)
export HOST_GID=$(id -g)

check_deps() {
  for cmd in "$@"; do
    if ! command -v "$cmd" &> /dev/null; then
      echo "ERROR: Command not found: '$cmd'." >&2
      exit 1
    fi
  done
}
check_deps docker

gen_frpc_config() {
  cat > docker/frpc.toml << EOF
serverAddr = "${FRP_SERVER_ADDR}"
serverPort = ${FRP_SERVER_PORT}
auth.token = "${FRP_AUTH_TOKEN}"

[[proxies]]
name = "area-tunnel-${FRP_SUBDOMAIN}"
type = 'http'
localIP = 'web'
localPort = 5173
subdomain = "${FRP_SUBDOMAIN}"
EOF
}

prepare() {
  if [ ! -f .env ]; then
    echo '→ .env file not found. Creating from .env.example.'
    cp .env.example .env
  fi

  source .env
  : "${TUNNEL:=false}"

  > docker/.env.run

  grep -v -E '_LOCAL=|_TUNNEL=' .env >> docker/.env.run

  if [ "$TUNNEL" = 'true' ]; then
    echo '→ Generating .env.run (tunnel mode).'
    grep '_TUNNEL=' .env | sed -E 's/^([A-Z0-9_]+)_TUNNEL=/\1=/' >> docker/.env.run
  else
    echo '→ Generating .env.run (local mode).'
    grep '_LOCAL=' .env | sed -E 's/^([A-Z0-9_]+)_LOCAL=/\1=/' >> docker/.env.run
  fi

  source docker/.env.run
  echo "VITE_FRONTEND_URL=${FRONTEND_URL}" >> docker/.env.run
  echo "VITE_BACKEND_URL=${BACKEND_URL}" >> docker/.env.run

  if [ "$TUNNEL" = 'true' ]; then
    if [ -z "$FRP_SUBDOMAIN" ] || [ "$FRP_SUBDOMAIN" = 'changeme' ]; then
      echo 'ERROR: invalid FRP_SUBDOMAIN in .env'
      exit 1
    fi
    if [ -z "$FRP_AUTH_TOKEN" ] || [ -z "$FRP_SERVER_ADDR" ] || [ -z "$FRP_SERVER_PORT" ]; then
      echo 'ERROR: FRP_AUTH_TOKEN, FRP_SERVER_ADDR, and FRP_SERVER_PORT must be set when TUNNEL=true'
      exit 1
    fi
    echo "→ Public URL: $BACKEND_URL"
    gen_frpc_config
  else
    echo "→ Backend URL: $BACKEND_URL"
  fi
}

up() {
  echo '→ Starting development environment.'
  docker compose down --remove-orphans
  if [ "$TUNNEL" = 'true' ]; then
    docker compose up --build -d --remove-orphans db server client_web prisma tunnel
  else
    docker compose up --build -d --remove-orphans db server client_web prisma
  fi
  echo '→ Services started. Tailing logs.'
  docker compose logs -f
}

down() {
  echo '→ Stopping services.'
  docker compose down --remove-orphans
}

build() {
  down
  docker volume rm -f area_back_deps area_front_deps area_back_dist || true
  echo '→ Forcing image rebuild.'
  docker compose build "$@"
}

mobile() {
  echo '→ Building APK.'
  docker compose run --build --no-deps --rm -e TASK=build client_mobile
  echo '→ APK build complete.'
}

clean() {
  down
  echo '→ Cleaning up project.'
  docker volume rm -f area_database area_back_deps area_front_deps area_back_dist area_mobile_build area_mobile_gradle area_mobile_keystore || true
  rm -rf ./back/dist ./front/dist ./back/node_modules ./front/node_modules ./mobile/.gradle ./mobile/app/build ./docker/frpc.toml ./docker/.env.run ./back/coverage ./front/coverage ./front/cypress/videos ./front/cypress/screenshots ./front/public/client.apk ./front/public/.build_hash
  echo '→ Cleanup complete.'
}

main() {
  case "$1" in
    'up'|'start')
      prepare
      up
      ;;
    'down'|'stop'|'kill')
      down
      ;;
    'build'|'setup')
      build "${@:2}"
      ;;
    'mobile'|'apk')
      prepare
      mobile
      ;;
    'clean'|'reset'|'hard')
      clean
      ;;
    'logs')
      prepare
      docker compose logs -f "${@:2}"
      ;;
    'ps')
      docker compose ps
      ;;
    *)
      echo 'Usage: ./dev.sh [up|down|build|mobile|clean|logs|ps]'
      exit 1
      ;;
  esac
}

main "$@"
