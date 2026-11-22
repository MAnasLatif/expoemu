#!/usr/bin/env bash
# =============================================================================
# Manage several virtual devices (phones, tablets, foldables) that can run at
# the same time. All devices share one system image; each only adds its own
# data (~2 GB) and uses its own RAM while running (2–4 GB).
#
#   devices [--json]                      list devices and which are running
#                                         (--json: machine-readable, for scripts/agents)
#   device create NAME [--profile P]      new device (default profile: phone)
#   device delete NAME [--yes]            delete a device and its data
#   device profiles                       available profiles
#
# Profiles: phone (Pixel 8, default) · small · large · tablet · foldable
#
# Then:  emulator start --device NAME     (runs next to the others)
#        <any command> --device NAME      (target that device)
#        open --all  ·  screenshot --all  (every running device)
# =============================================================================
source "$(dirname "$0")/lib/common.sh"
load_config

cmd="${1:-list}"; shift || true
case "$cmd" in help|-h|--help) sed -n '2,/^# =====*$/p' "$0"; exit 0 ;; esac
require_sdk

# A JSON string literal (escapes backslash, quote and control characters).
json_str() {
  local v="$1"
  v="${v//\\/\\\\}"; v="${v//\"/\\\"}"
  v="$(printf '%s' "$v" | tr -d '\000-\037')"
  printf '"%s"' "$v"
}

# Read one key from a device's config.ini.
avd_conf() { awk -F= -v k="$2" '$1 == k { print $2 }' "$AVD_HOME/$1.avd/config.ini" 2>/dev/null; }

case "$cmd" in
  list)
    json=false
    while [ $# -gt 0 ]; do
      case "$1" in --json) json=true ;; *) die "unknown option: $1 (try: devices --json)" ;; esac; shift
    done
    running="$(running_emulators 2>/dev/null || true)"
    phones="$(running_targets 2>/dev/null | awk '$3 == "usb"' || true)"
    blocked="$(blocked_targets 2>/dev/null || true)"
    if $json; then
      # One JSON object on stdout; values come from adb, so escape them.
      sep=''
      printf '{"devices":['
      while read -r name; do
        [ -n "$name" ] || continue
        profile="$(avd_conf "$name" expoemu.profile)"; [ -n "$profile" ] || profile=phone
        w="$(avd_conf "$name" hw.lcd.width)"; h="$(avd_conf "$name" hw.lcd.height)"
        [[ "$w" =~ ^[0-9]+$ ]] || w=null; [[ "$h" =~ ^[0-9]+$ ]] || h=null
        serial="$(printf '%s\n' "$running" | awk -v n="$name" '$2 == n { print $1 }')"
        if [ -n "$serial" ]; then st=running; js="$(json_str "$serial")"; else st=stopped; js=null; fi
        isdef=false; [ "$name" = "$AVD_NAME" ] && isdef=true
        printf '%s{"name":%s,"default":%s,"profile":%s,"width":%s,"height":%s,"status":"%s","serial":%s}' \
          "$sep" "$(json_str "$name")" "$isdef" "$(json_str "$profile")" "$w" "$h" "$st" "$js"
        sep=','
      done < <(list_devices)
      sep=''
      printf '],"phones":['
      while read -r s n _; do
        [ -n "$s" ] || continue
        printf '%s{"name":%s,"serial":%s,"status":"connected"}' "$sep" "$(json_str "$n")" "$(json_str "$s")"
        sep=','
      done <<<"$phones"
      while read -r s st; do
        [ -n "$s" ] || continue
        printf '%s{"name":null,"serial":%s,"status":%s}' "$sep" "$(json_str "$s")" "$(json_str "$st")"
        sep=','
      done <<<"$blocked"
      printf ']}\n'
      exit 0
    fi
    printf '%-20s %-9s %-12s %s\n' DEVICE PROFILE SCREEN STATUS
    while read -r name; do
      [ -n "$name" ] || continue
      profile="$(avd_conf "$name" expoemu.profile)"; [ -n "$profile" ] || profile=phone
      screen="$(avd_conf "$name" hw.lcd.width)x$(avd_conf "$name" hw.lcd.height)"
      serial="$(printf '%s\n' "$running" | awk -v n="$name" '$2 == n { print $1 }')"
      label="$name"; [ "$name" = "$AVD_NAME" ] && label="$name*"
      if [ -n "$serial" ]; then status="running ($serial)"; else status=stopped; fi
      printf '%-20s %-9s %-12s %s\n' "$label" "$profile" "$screen" "$status"
    done < <(list_devices)
    echo "* default device (also called \"default\")"
    # Physical phones on the same adb server (USB, or Wi-Fi via adb connect).
    if [ -n "$phones$blocked" ]; then
      echo
      printf '%-20s %-22s %s\n' PHONE SERIAL STATUS
      while read -r s n _; do
        [ -n "$s" ] && printf '%-20s %-22s %s\n' "$n" "$s" "connected (use --device $n)"
      done <<<"$phones"
      while read -r s st; do
        [ -n "$s" ] && printf '%-20s %-22s %s\n' "?" "$s" "$st — allow USB debugging on the phone"
      done <<<"$blocked"
    fi ;;

  profiles)
    printf '%-9s %-16s %s\n' PROFILE HARDWARE SCREEN
    for p in $PROFILES; do
      read -r hw w h dpi ram < <(profile_spec "$p")
      printf '%-9s %-16s %sx%s @%sdpi, %s MB RAM\n' "$p" "$hw" "$w" "$h" "$dpi" "$ram"
    done ;;

  create)
    [ $# -ge 1 ] || die "usage: device create NAME [--profile $(echo "$PROFILES" | tr ' ' '|')]"
    name="$1"; shift; profile=phone
    while [ $# -gt 0 ]; do
      case "$1" in --profile) profile="${2:-}"; shift ;; *) die "unknown option: $1" ;; esac; shift
    done
    [[ "$name" =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,30}$ ]] || die "Device names: letters, digits, - and _ (max 31 chars)"
    [ "$name" != default ] || die "\"default\" is reserved for $AVD_NAME"
    [ ! -f "$AVD_HOME/$name.ini" ] || die "Device '$name' already exists"
    spec="$(profile_spec "$profile")" || die "Unknown profile '$profile'. Choose: $PROFILES"
    [ -d "$SDK_DIR/$SYS_IMG_REL" ] || die "System image missing — run $(cmd setup.sh) first"
    read -r hw w h dpi ram <<<"$spec"
    write_avd "$name" "$hw" "$w" "$h" "$dpi" "$ram" "$profile"
    ok "Created device '$name' ($profile: ${w}x${h} @${dpi}dpi, ${ram} MB RAM)"
    echo "Start it with: $(cmd emulator-start.sh) --device $name" >&2 ;;

  delete)
    [ $# -ge 1 ] || die "usage: device delete NAME [--yes]"
    name="$(device_name "$1")"; yes="${2:-}"
    [ "$name" != "$AVD_NAME" ] || die "The default device can't be deleted here (use: $(cmd setup.sh) --recreate-avd)"
    [ -f "$AVD_HOME/$name.ini" ] || die "No device named '$name'"
    [ -z "$(serial_for_device "$name")" ] || die "Device '$name' is running — stop it first: $(cmd emulator-stop.sh) --device $name"
    if [ "$yes" != --yes ]; then
      [ -t 0 ] || die "Refusing to delete without confirmation in a non-interactive shell (add --yes)."
      read -r -p "Delete device '$name' and all its data? [y/N] " r; [[ "$r" =~ ^[Yy] ]] || { warn "Aborted"; exit 1; }
    fi
    # Both paths are inside $AVD_HOME and the name was validated on creation.
    rm -rf "${AVD_HOME:?}/$name.avd" "${AVD_HOME:?}/$name.ini"
    ok "Deleted device '$name'" ;;

  *) die "Unknown command: $cmd (try: $(cmd devices.sh) help)" ;;
esac
