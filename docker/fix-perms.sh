#!/bin/bash
set -e

find . -type d -print0 | xargs -0 chmod 755
find . -type f -print0 | xargs -0 chmod 644

chmod +x \
  dev.sh \
  test.sh \
  mobile/gradlew \
  mobile/build.sh \
  docker/back/entry.sh \
  docker/front/entry.sh \
  docker/mobile/entry.sh

echo "Done."
