#!/bin/bash
set -eo pipefail

mkdir -p ./front/public ./back/dist ./front/dist ./back/node_modules ./front/node_modules ./back/coverage ./front/coverage ./front/cypress/screenshots ./front/cypress/videos

export COMPOSE_INTERACTIVE_NO_CLI=1
export HOST_UID=$(id -u)
export HOST_GID=$(id -g)

readonly COMPOSE_TEST_BASE=(env HOST_UID="$HOST_UID" HOST_GID="$HOST_GID" docker compose -f docker/docker-compose.test.yml)
readonly TMP_DBS_FILE=$(mktemp)
COV=false PARALLEL=false DRY_RUN=false

log() { echo -e "\033[44;30m→ $*\033[0m"; }
ok() { echo -e "\033[42;30m SUCCESS \033[0m $*"; }
err() { echo -e "\033[41;30m FAILURE \033[0m $*"; }

check_deps() {
  for cmd in "$@"; do
    if ! command -v "$cmd" &> /dev/null; then
      err "Command not found: '$cmd'."
      exit 1
    fi
  done
}
check_deps docker openssl flock

cleanup() {
  [[ "$DRY_RUN" == true ]] && return 0
  log 'Cleaning up.'
  if [ -f "$TMP_DBS_FILE" ]; then
    while read -r db_name; do
      log "Dropping temporary db: $db_name"
      "${COMPOSE_TEST_BASE[@]}" exec -T db-test dropdb --if-exists -U area_user "$db_name" </dev/null >/dev/null 2>&1 || true
    done < "$TMP_DBS_FILE"
    rm -f "$TMP_DBS_FILE"
  fi
  "${COMPOSE_TEST_BASE[@]}" down --remove-orphans --volumes --timeout 1 2>/dev/null || true
}

get_task_cmd() {
  local task_name="$2"
  if [[ "$COV" == true && "$task_name" == 'unit' ]]; then
    task_name='coverage'
  fi
  echo "$task_name"
}

get_build_deps() {
  local task="$1"
  case "$task" in
    back:*)     echo 'back' ;;
    front:e2e)  echo 'front back cypress' ;;
    front:*)    echo 'front' ;;
    mobile:*)   echo 'mobile' ;;
  esac
}

expand_target() {
  local target="$1" component action
  if [[ "$target" == *':'* ]]; then
    component="${target%%:*}"
    action="${target#*:}"
  else
    component="$target"
    action=''
  fi

  if [[ -z "$action" ]]; then
    case "$component" in
      'all')    echo 'back:build back:lint back:unit back:e2e front:build front:lint front:unit front:e2e mobile:build mobile:lint mobile:unit' ;;
      'back')   echo 'back:build back:lint back:unit' ;;
      'front')  echo 'front:build front:lint front:unit' ;;
      'mobile') echo 'mobile:build mobile:lint mobile:unit' ;;
      *)        echo "$target" ;;
    esac
  else
    case "${component}:${action}" in
      'all:build')  echo 'back:build front:build mobile:build' ;;
      'all:lint')   echo 'back:lint front:lint mobile:lint' ;;
      'all:unit')   echo 'back:unit front:unit mobile:unit' ;;
      'all:e2e')    echo 'back:e2e front:e2e' ;;
      'back:all')   echo 'back:build back:lint back:unit back:e2e' ;;
      'front:all')  echo 'front:build front:lint front:unit front:e2e' ;;
      'mobile:all') echo 'mobile:build mobile:lint mobile:unit' ;;
      *)            echo "$target" ;;
    esac
  fi
}

resolve_tasks() {
  local args=("$@")
  local tasks_to_process=("${args[@]}")
  local final_tasks=()
  local seen_tasks=()

  [[ ${#args[@]} -eq 0 ]] && tasks_to_process=('back' 'front')

  while [[ ${#tasks_to_process[@]} -gt 0 ]]; do
    local current_target="${tasks_to_process[0]}"
    tasks_to_process=("${tasks_to_process[@]:1}")
    read -ra expanded <<< "$(expand_target "$current_target")"

    if [[ ${#expanded[@]} -gt 1 || "${expanded[0]}" != "$current_target" ]]; then
      tasks_to_process=("${expanded[@]}" "${tasks_to_process[@]}")
    else
      local found=false
      for task in "${seen_tasks[@]}"; do
        if [[ "$task" == "$current_target" ]]; then
          found=true
          break
        fi
      done
      if [[ "$found" == false ]]; then
        seen_tasks+=("$current_target")
        final_tasks+=("$current_target")
      fi
    fi
  done
  echo "${final_tasks[@]}"
}

run_task() {
  local task="$1"
  local logfile="/tmp/test-${task//:/-}-$(date +%s%N).log"
  log "Starting task: $task"

  local component="${task%%:*}"
  local action
  if [[ "$task" == 'mobile:consolidated' ]]; then
    action="$mobile_actions"
  else
    action=$(get_task_cmd "$component" "${task#*:}")
  fi
  local is_e2e=false
  [[ "$task" == 'back:e2e' || "$task" == 'front:e2e' ]] && is_e2e=true

  if [[ "$DRY_RUN" == true ]]; then
    log "DRY-RUN: Starting task: '$task' with action '$action'"
    [[ "$is_e2e" == true ]] && log "DRY-RUN: Provisioning db"
    return 0
  fi

  if [[ "$is_e2e" == true ]]; then
    local db_name="test_$(openssl rand -hex 6)"
    local db_url="postgresql://area_user:changeme@db-test:5432/$db_name"

    touch "$TMP_DBS_FILE"
    flock "$TMP_DBS_FILE" -c "echo '$db_name' >> '$TMP_DBS_FILE'"
    log "Provisioning db '$db_name' for '$task'"
    if ! "${COMPOSE_TEST_BASE[@]}" exec -T db-test createdb -U area_user "$db_name" &>"$logfile"; then
      cat "$logfile"; err "Failed to create db for $task"; return 1
    fi

    if [[ "$task" == 'back:e2e' ]]; then
      if ! "${COMPOSE_TEST_BASE[@]}" run --rm --no-deps -e TASK=e2e -e "DATABASE_URL=$db_url" back &>"$logfile"; then
        cat "$logfile"; err "$task"; return 1
      fi
    elif [[ "$task" == 'front:e2e' ]]; then
      local exit_code=0
      export DATABASE_URL="$db_url"

      "${COMPOSE_TEST_BASE[@]}" up -d --wait back front &>>"$logfile" || exit_code=$?

      if [[ $exit_code -eq 0 ]]; then
        "${COMPOSE_TEST_BASE[@]}" --profile e2e run --rm cypress &>>"$logfile" || exit_code=$?
      fi

      "${COMPOSE_TEST_BASE[@]}" stop back front &>>"$logfile" || true

      if [[ $exit_code -ne 0 ]]; then
        cat "$logfile"; err "$task"; return 1
      fi
    fi
  else
    if ! "${COMPOSE_TEST_BASE[@]}" run --rm --no-deps -e "TASK=${action}" "${component}" &>"$logfile"; then
      cat "$logfile"; err "$task"; return 1
    fi
  fi
  cat "$logfile"; ok "Task: $task"
}

show_help() {
  cat << 'EOF'
AREA Test Suite

Usage:
    ./test.sh [OPTIONS] [TARGETS...]

Components: back, front, mobile, all
Tasks:      build, lint, unit, e2e, all

Options:
    --cov       Enable coverage tests
    --parallel  Run tasks in parallel
    --dry-run   Preview commands
    --help      Show this help

Examples:
    ./test.sh
    ./test.sh back:unit front:lint
    ./test.sh --parallel all
    ./test.sh --cov back:unit
EOF
}

main() {
  local args=()
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help) show_help; exit 0 ;;
      --cov) COV=true ;;
      --parallel) PARALLEL=true ;;
      --dry-run) DRY_RUN=true ;;
      *) args+=("$1") ;;
    esac
    shift
  done

  trap cleanup EXIT INT TERM

  local resolved_tasks
  read -ra resolved_tasks <<< "$(resolve_tasks "${args[@]}")"
  if [[ ${#resolved_tasks[@]} -eq 0 ]]; then
    err "No valid tasks resolved. Use --help to see available targets."
    exit 1
  fi

  local non_mobile_tasks=()
  mobile_actions=''
  for task in "${resolved_tasks[@]}"; do
    if [[ "$task" == mobile:* ]]; then
      mobile_actions="$mobile_actions ${task#mobile:}"
    else
      non_mobile_tasks+=("$task")
    fi
  done

  mobile_actions=$(echo "$mobile_actions" | xargs)

  local final_tasks=("${non_mobile_tasks[@]}")
  if [[ -n "$mobile_actions" ]]; then
    final_tasks+=('mobile:consolidated')
  fi

  local build_deps
  build_deps=$(
    for task in "${final_tasks[@]}"; do
      get_build_deps "$task"
    done | tr ' ' '\n' | sort -u | tr '\n' ' '
  )

  if [[ -n "${build_deps// }" ]]; then
    if [[ "$DRY_RUN" == true ]]; then
      log "DRY-RUN: Build: $build_deps"
    else
      log "Building: $build_deps"
      "${COMPOSE_TEST_BASE[@]}" build $build_deps
    fi
  fi

  log "Tasklist: ${final_tasks[*]}"

  local needs_db=false
  for task in "${final_tasks[@]}"; do
    if [[ "$task" == *':e2e' ]]; then
      needs_db=true
      break
    fi
  done

  if [[ "$needs_db" == true ]]; then
    log "Starting centralized db..."
    [[ "$DRY_RUN" != true ]] && "${COMPOSE_TEST_BASE[@]}" up -d --wait db-test
  fi

  if [[ "$PARALLEL" == true ]]; then
    local pids=()
    for task in "${final_tasks[@]}"; do
      run_task "$task" &
      pids+=("$!")
    done
    local status=0
    for pid in "${pids[@]}"; do
      wait "$pid" || status=1
    done
    if [[ "$status" -ne 0 ]]; then
      err "Parallel run failed."; exit 1
    fi
  else
    for task in "${final_tasks[@]}"; do
      if ! run_task "$task"; then
        err "Sequential run failed at task: $task"; exit 1
      fi
    done
  fi

  local mode_flags=''
  [[ "$COV" == true ]] && mode_flags="$mode_flags --cov"
  [[ "$PARALLEL" == true ]] && mode_flags="$mode_flags --parallel"
  [[ "$DRY_RUN" == true ]] && mode_flags="$mode_flags --dry-run"
  ok "Done: ${args[*]:-default}$mode_flags"
}

main "$@"
