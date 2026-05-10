#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

bash scripts/node22.sh node_modules/vite/bin/vite.js build
bash scripts/node22.sh node_modules/@capacitor/cli/bin/capacitor sync android

if [ -z "${JAVA_HOME:-}" ]; then
  for candidate in \
    "$HOME/.local/share/jdks/jdk-21.0.11+10" \
    "$HOME/.local/share/jdks"/jdk-21* \
    /usr/lib/jvm/java-21-openjdk-amd64 \
    /usr/lib/jvm/java-17-openjdk-amd64; do
    if [ -x "$candidate/bin/java" ]; then
      export JAVA_HOME="$candidate"
      break
    fi
  done
fi

if [ -z "${JAVA_HOME:-}" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
  echo "Java 17+ is required to build the Android APK. Set JAVA_HOME to a JDK 17+ install." >&2
  exit 1
fi

JAVA_MAJOR="$("$JAVA_HOME/bin/java" -XshowSettings:properties -version 2>&1 | sed -n 's/.*java.specification.version = //p' | head -n 1)"
case "$JAVA_MAJOR" in
  1.*) JAVA_MAJOR="${JAVA_MAJOR#1.}" ;;
esac

if [ "${JAVA_MAJOR%%.*}" -lt 17 ]; then
  echo "Java 17+ is required to build the Android APK. Current JAVA_HOME is $JAVA_HOME." >&2
  exit 1
fi

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-/tmp/fitquest-gradle}"

./android/gradlew -p android assembleDebug

echo "APK generated: $ROOT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
