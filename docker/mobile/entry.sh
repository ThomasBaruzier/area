#!/bin/sh
set -e

for task in $TASK; do
  echo "Executing mobile task: $task"
  case "$task" in
    'build')
      ./build.sh
      ;;
    'lint')
      ./gradlew lintDebug
      ;;
    'unit')
      ./gradlew testDebugUnitTest
      ;;
    'all')
      ./build.sh && ./gradlew lintDebug && ./gradlew testDebugUnitTest
      ;;
    *)
      echo "Error: Unknown mobile task '$task'" >&2
      exit 1
      ;;
  esac
done
