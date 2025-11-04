#!/bin/sh
set -e

OUTPUT_DIR='/output'
KEYSTORE_DIR='/keystore'
KEYSTORE_FILE="$KEYSTORE_DIR/area.jks"
SIGNED_APK="$OUTPUT_DIR/client.apk"
HASH_FILE="$OUTPUT_DIR/.build_hash"

BUILD_TOOLS_VERSION='34.0.0'
BUILD_TOOLS_PATH="$ANDROID_HOME/build-tools/$BUILD_TOOLS_VERSION"
UNSIGNED_APK='app/build/outputs/apk/release/app-release-unsigned.apk'
ALIGNED_APK='app/build/outputs/apk/release/app-release-aligned.apk'

SOURCE_PATHS='./app/src ./app/build.gradle.kts ./build.gradle.kts ./settings.gradle.kts ./gradle.properties ./gradle/libs.versions.toml ./app/src/main/AndroidManifest.xml ./app/proguard-rules.pro'

echo '-> Calculating source code hash...'
CURRENT_HASH=$(find $SOURCE_PATHS -type f -print0 | sort -z | xargs -0 md5sum | md5sum | cut -d ' ' -f 1)

if [ -f "$SIGNED_APK" ] && [ -f "$HASH_FILE" ]; then
  PREVIOUS_HASH=$(cat "$HASH_FILE")
  if [ "$CURRENT_HASH" = "$PREVIOUS_HASH" ]; then
    echo '-> No source file changes detected. Skipping build.'
    exit 0
  else
    echo '-> Source code changed. Rebuilding APK.'
  fi
else
  echo '-> APK or build hash not found. Building APK.'
fi

if [ ! -f "$KEYSTORE_FILE" ]; then
  echo '-> Keystore not found. Generating...'
  mkdir -p "$KEYSTORE_DIR"
  keytool -genkey -v \
    -keystore "$KEYSTORE_FILE" \
    -alias "$ANDROID_KEY_ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$ANDROID_KEY_PASS" \
    -keypass "$ANDROID_KEY_PASS" \
    -dname 'CN=Area, OU=Dev, O=AREA, L=Paris, S=IDF, C=FR'
else
  echo '-> Keystore found.'
fi

echo '-> Building unsigned APK...'
./gradlew ':app:assembleRelease'

echo '-> Aligning APK...'
mkdir -p "$(dirname "$ALIGNED_APK")"
"$BUILD_TOOLS_PATH/zipalign" -f -v 4 "$UNSIGNED_APK" "$ALIGNED_APK"

echo '-> Signing APK...'
mkdir -p "$OUTPUT_DIR"
"$BUILD_TOOLS_PATH/apksigner" sign \
  --ks "$KEYSTORE_FILE" \
  --ks-key-alias "$ANDROID_KEY_ALIAS" \
  --ks-pass "pass:$ANDROID_KEY_PASS" \
  --out "$SIGNED_APK" \
  "$ALIGNED_APK"

rm -f "$OUTPUT_DIR/client.apk.idsig"

echo "$CURRENT_HASH" > "$HASH_FILE"
echo '-> APK signed. Build hash updated.'
