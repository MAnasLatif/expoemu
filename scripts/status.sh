#!/usr/bin/env bash
# =============================================================================
# Health check for the whole environment. Exit code 0 = everything needed for
# development is up; 1 = something is missing (details printed).
#
#   scripts/status.sh            human-readable report (stderr)
#   scripts/status.sh --json     one JSON object on stdout, same exit code:
#     {"ok":false,"checks":[{"id":"sdk","status":"ok|warn|fail",
#       "message":"…","device":"emulator-5554"?}, …],
#      "devices":[{"serial":"…","name":"…","kind":"emulator|usb",
#       "api":36,"booted":true}, …]}
#   Check ids: update sdk avd adb-server no-device device metro-reverse
#   expo-go ui-server runtime image container container-adb metro
# =============================================================================
source "$(dirname "$0")/lib/common.sh"
source "$(dirname "$0")/lib/ui-server.sh"

JSON=0
for arg in "$@"; do
  case "$arg" in
    --json) JSON=1 ;;
    -h|--help) sed -n '3,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) printf 'expoemu status: unknown option: %s (try --json)\n' "$arg" >&2; exit 2 ;;
  esac
done

load_config

FAIL=0
CHECKS=""      # JSON objects, comma-separated (--json)
DEVICES=""
DEV=""         # serial the current check belongs to ("" = global)

# JSON string literal; tabs/newlines become spaces (messages are one line).
json_str() {
  printf '"%s"' "$(printf '%s' "$1" | tr '\t\r\n' '   ' | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')"
}
# record ID STATUS MESSAGE — messages are trimmed of the human indent.
record() {
  local msg="$3" obj
  msg="${msg#"${msg%%[![:space:]]*}"}"
  obj="{\"id\":$(json_str "$1"),\"status\":\"$2\",\"message\":$(json_str "$msg")"
  [ -n "$DEV" ] && obj="$obj,\"device\":$(json_str "$DEV")"
  CHECKS="${CHECKS:+$CHECKS,}$obj}"
}
pass() { if [ "$JSON" = 1 ]; then record "$1" ok "$2"; else ok "$2"; fi; }
fail() {
  FAIL=1
  if [ "$JSON" = 1 ]; then record "$1" fail "$2"
  else printf '%s ✗%s %s\n' "$C_RED" "$C_RESET" "$2" >&2; fi
}
note() { if [ "$JSON" = 1 ]; then record "$1" warn "$2"; else warn "$2"; fi; }

[ "$JSON" = 1 ] || echo "Expo Emulator status" >&2
if [ -n "${EXPOEMU_UPDATE_AVAILABLE:-}" ]; then
  if [ "${EXPOEMU_CMD:-}" = expoemu ]; then how="expoemu update"; else how="npx expoemu@latest <command>"; fi
  note update "expoemu $EXPOEMU_UPDATE_AVAILABLE is available — update with: $how"
fi

# --- Host SDK ------------------------------------------------------------------
if [ -x "$ADB" ] && [ -x "$EMULATOR_BIN" ]; then
  pass sdk "Isolated SDK: $SDK_DIR (adb $(cat "$SDK_DIR/platform-tools/.installed" 2>/dev/null), emulator $(cat "$SDK_DIR/emulator/.installed" 2>/dev/null))"
else
  fail sdk "Isolated SDK missing — run $(cmd setup.sh)"
fi
[ -f "$AVD_HOME/$AVD_NAME.avd/config.ini" ] && pass avd "AVD: $AVD_NAME" || fail avd "AVD '$AVD_NAME' missing — run $(cmd setup.sh)"

# --- Emulator + adb server -------------------------------------------------------
emus=""
if [ -x "$ADB" ]; then
  if lsof -nP -iTCP:"$ADB_SERVER_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    pass adb-server "adb server listening on 127.0.0.1:$ADB_SERVER_PORT"
    emus="$(running_targets)"
  else
    fail adb-server "adb server not running — $(cmd emulator-start.sh) starts it"
  fi
fi
# One block per running device (several can run at once).
# Read from fd 3: `adb shell` inside the loop would otherwise consume stdin
# (the device list) and silently skip the remaining devices.
while read -r serial name kind <&3; do
  [ -n "$serial" ] || continue
  DEV="$serial"
  api="$(adb_host -s "$serial" shell getprop ro.build.version.sdk 2>/dev/null | tr -d '\r')"
  booted="$(adb_host -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')"
  label=Device; [ "$kind" = usb ] && label=Phone
  DEVICES="${DEVICES:+$DEVICES,}{\"serial\":$(json_str "$serial"),\"name\":$(json_str "$name"),\"kind\":$(json_str "$kind"),\"api\":$([[ "$api" =~ ^[0-9]+$ ]] && echo "$api" || echo null),\"booted\":$([ "$booted" = 1 ] && echo true || echo false)}"
  if [ "$booted" = 1 ]; then pass device "$label '$name': $serial (API $api, booted)"; else fail device "$label '$name' ($serial) still booting"; fi
  rev="$(adb_host -s "$serial" reverse --list 2>/dev/null || true)"
  if [[ "$rev" == *"tcp:$METRO_PORT"* ]]; then pass metro-reverse "  adb reverse tcp:$METRO_PORT active"
  else note metro-reverse "  adb reverse for Metro not set ($(cmd expo.sh) or $(cmd open-app.sh) set it)"; fi
  pkgs="$(adb_host -s "$serial" shell pm list packages host.exp.exponent 2>/dev/null || true)"
  if [[ "$pkgs" == *exponent* ]]; then pass expo-go "  Expo Go installed"
  else note expo-go "  Expo Go not installed yet ($(cmd open-app.sh) installs it)"; fi
  export ANDROID_SERIAL="$serial"   # read by the ui_server_* helpers
  why="$(ui_server_unavailable)"
  if [ -z "$why" ]; then
    if ui_server_alive; then pass ui-server "  UI server running (fast UI commands)"
    else pass ui-server "  UI server ready (starts with the first UI command)"; fi
  elif [ "$kind" = emulator ]; then
    note ui-server "  UI server not used: $why — UI commands are slower"
  fi
done 3<<<"$emus"
DEV=""
if [ -x "$ADB" ] && [ -z "$emus" ] && lsof -nP -iTCP:"$ADB_SERVER_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  fail no-device "No emulator running — $(cmd emulator-start.sh)"
fi

# --- Container runtime (Docker Desktop or Kiri) -----------------------------------
if ! command -v docker >/dev/null || ! docker info >/dev/null 2>&1; then
  fail runtime "$RUNTIME_NAME not running (CONTAINER_RUNTIME=$CONTAINER_RUNTIME)"
else
  pass runtime "Container runtime: $RUNTIME_NAME ($(docker info -f '{{.NCPU}} CPUs, server {{.ServerVersion}}' 2>/dev/null))"
  if ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
    fail image "Image missing — $(cmd setup.sh)"
  elif image_outdated; then
    note image "Image $IMAGE_NAME is from older sources — next start rebuilds it"
  else
    pass image "Image $IMAGE_NAME built (up to date)"
  fi
  if container_running; then
    mounted="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/workspace"}}{{.Source}}{{end}}{{end}}' "$CONTAINER_NAME")"
    # Docker Desktop reports bind sources with a /host_mnt prefix.
    pass container "Container running (project: ${mounted#/host_mnt})"
    # Proves the container -> host.docker.internal -> adb server -> emulator path.
    if docker exec "$CONTAINER_NAME" adb devices 2>/dev/null | grep -qE '^emulator-[0-9]+\s+device'; then
      pass container-adb "Container sees the emulator through adb"
    else
      fail container-adb "Container cannot see the emulator via adb (is the emulator running?)"
    fi
  else
    fail container "Container not running — $(cmd start.sh) /path/to/expo-app"
  fi
fi

# --- Metro -----------------------------------------------------------------------------
if curl -fs --max-time 2 "http://127.0.0.1:$METRO_PORT/status" 2>/dev/null | grep -q running; then
  pass metro "Metro running on 127.0.0.1:$METRO_PORT"
else
  note metro "Metro not running ($(cmd expo.sh))"
fi

if [ "$JSON" = 1 ]; then
  printf '{"ok":%s,"checks":[%s],"devices":[%s]}\n' "$([ "$FAIL" = 0 ] && echo true || echo false)" "$CHECKS" "$DEVICES"
fi
exit "$FAIL"
