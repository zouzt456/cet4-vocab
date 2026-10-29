#!/usr/bin/env bash
# 打包安卓 APK：把 dist/index.html 塞进 WebView 壳（aapt2 + javac + d8 + apksigner）
# 环境变量：
#   ANDROID_HOME       SDK 根目录（必填，或用 --sdk）
#   ANDROID_KEYSTORE   签名用 keystore（默认 .build/android/debug.keystore 或 debug.keystore）
#   KS_PASS/KEY_PASS   口令（默认 android）
#   JAVA_HOME          JDK（默认沿用系统 java）
#   VERSION_CODE       覆盖 versionCode（默认由 package.json 版本换算：2.0.0 → 20000）
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)

PKG_VERSION=$(node -e "console.log(require('./package.json').version)")
IFS=. read -r MA MI PA <<< "$PKG_VERSION"
VERSION_CODE=${VERSION_CODE:-$((10#$MA * 10000 + 10#$MI * 100 + 10#$PA))}
VERSION_NAME=${VERSION_NAME:-$PKG_VERSION}

SDK="${ANDROID_HOME:-}"
if [ -z "$SDK" ] || [ ! -d "$SDK" ]; then
  echo "!!! 找不到 Android SDK：请设置 ANDROID_HOME" >&2
  exit 1
fi

# build-tools：优先 BUILD_TOOLS 指定，否则取 SDK 里最大的
if [ -n "${BUILD_TOOLS:-}" ]; then BT="$SDK/build-tools/$BUILD_TOOLS"; else BT=$(ls -d "$SDK"/build-tools/* 2>/dev/null | sort -V | tail -1); fi
PLATFORM="${ANDROID_PLATFORM:-android-33}"
PLAT="$SDK/platforms/$PLATFORM/android.jar"
[ -d "$BT" ] || { echo "!!! 没找到 build-tools：$BT" >&2; exit 1; }
[ -f "$PLAT" ] || { echo "!!! 没找到 platform：$PLAT" >&2; exit 1; }

EXE=""
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) EXE=".exe" ;;
esac

JAVA="${JAVA_HOME:-}"
if [ -n "$JAVA" ] && [ -x "$JAVA/bin/javac$EXE" ]; then JAVAC="$JAVA/bin/javac$EXE"; JAR="$JAVA/bin/jar$EXE"; JAVA_BIN="$JAVA/bin/java$EXE";
else JAVAC="javac"; JAR="jar"; JAVA_BIN="java"; fi

# apksigner 在 Windows 上是 .bat，不一定是 .exe
SIGNER=""
for cand in "$SIGNER" "$BT/apksigner.bat" "$BT/apksigner"; do [ -f "$cand" ] && SIGNER="$cand" && break; done
[ -n "$SIGNER" ] || { echo "!!! 没找到 apksigner" >&2; exit 1; }

KS="${ANDROID_KEYSTORE:-}"
if [ -z "$KS" ]; then
  for c in ".build/android/debug.keystore" "android/debug.keystore"; do [ -f "$c" ] && KS="$c" && break; done
fi
[ -n "$KS" ] && [ -f "$KS" ] || { echo "!!! 找不到签名 keystore：请设置 ANDROID_KEYSTORE" >&2; exit 1; }
KS_PASS="${KS_PASS:-android}"
KEY_PASS="${KEY_PASS:-android}"

OUT="$ROOT/build/android"
ASSETS="$ROOT/android/app/src/main/assets"
mkdir -p "$ASSETS" "$OUT/classes"
[ -f "$ROOT/dist/index.html" ] || { echo "!!! 先跑 pnpm build 生成 dist/index.html" >&2; exit 1; }
cp "$ROOT/dist/index.html" "$ASSETS/index.html"

echo "building versionCode=$VERSION_CODE versionName=$VERSION_NAME"
rm -rf "$OUT"; mkdir -p "$OUT/classes"

"$BT/aapt2$EXE" compile --dir "$ROOT/android/app/src/main/res" -o "$OUT/res.zip"
echo "aapt2 compile ok"

"$BT/aapt2$EXE" link -o "$OUT/base.apk" -I "$PLAT" \
  --manifest "$ROOT/android/app/src/main/AndroidManifest.xml" \
  -A "$ASSETS" \
  --min-sdk-version 23 --target-sdk-version 33 \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  "$OUT/res.zip" --auto-add-overlay
echo "aapt2 link ok"

"$JAVAC" -encoding UTF-8 -nowarn --release 11 -cp "$PLAT" -d "$OUT/classes" \
  "$ROOT/android/app/src/main/java/com/zou/cet4vocab/MainActivity.java"
echo "javac ok"

"$JAVA_BIN" -cp "$BT/lib/d8.jar" com.android.tools.r8.D8 --lib "$PLAT" --min-api 23 --output "$OUT" \
  $(find "$OUT/classes" -name "*.class")
echo "d8 ok"

cd "$OUT"
cp base.apk unsigned.apk
"$JAR" uf unsigned.apk -C "$OUT" classes.dex
echo "dex added"

"$BT/zipalign$EXE" -f 4 unsigned.apk aligned.apk
rm -f signed.apk
"$SIGNER" sign --ks "$KS" --ks-pass "pass:$KS_PASS" --key-pass "pass:$KEY_PASS" \
  --ks-key-alias androiddebugkey --out signed.apk aligned.apk

CERT=$("$SIGNER" verify --print-certs signed.apk 2>/dev/null | grep -m1 "certificate SHA-256 digest" | awk '{print $NF}')
[ -n "$CERT" ] || { echo "!!! 读不到签名指纹，停止出包" >&2; exit 1; }
EXP="$ROOT/android/expected-cert.txt"
if [ ! -f "$EXP" ]; then
  echo "$CERT" > "$EXP"; echo "cert pin 已建立：$CERT"
else
  if [ "$CERT" != "$(tr -d '\r\n' < "$EXP")" ]; then
    echo "!!! 签名变了：期望 $(cat "$EXP")，实际 $CERT" >&2
    echo "!!! 这样的包会让用户必须卸载重装，拒绝出包" >&2
    exit 1
  fi
  echo "cert pin ok：$CERT"
fi

mkdir -p "$ROOT/release"
cp signed.apk "$ROOT/release/cet4-vocab.apk"
"$SIGNER" verify --print-certs signed.apk | head -3
"$BT/aapt2$EXE" dump badging signed.apk | grep -E "^(package|application-label)" | head -3
ls -l "$ROOT/release/cet4-vocab.apk"