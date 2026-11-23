# expoemu command reference

Every command is `expoemu <command> [args]`, run from the Expo project root.
After `setup` (or `expoemu install`) the global command exists, so `expoemu <command>`
works the same without `npx`.
Exit code `0` = success, `1` = failure (reason on stderr), `2` = usage error.
Add `--device NAME` (or `-d NAME`) to any command to target one device; for
`adb`, `shell` and `expo` put it before the command.

## Contents

- [Setup and lifecycle](#setup-and-lifecycle)
- [Several devices](#several-devices)
- [See the screen](#see-the-screen)
- [Touch](#touch)
- [Type and keys](#type-and-keys)
- [Wait and assert](#wait-and-assert)
- [Device state](#device-state)
- [App control and debugging](#app-control-and-debugging)
- [Flows: saved tests](#flows-saved-tests)
- [Visual regression](#visual-regression)
- [Maintenance](#maintenance)
- [Configuration](#configuration)

## Setup and lifecycle

| Command | What it does |
|---------|--------------|
| `setup [--accept-licenses] [--runtime docker\|kiri] [--recreate-avd] [--skip-sdk] [--skip-docker] [--no-global]` | One-time install: isolated Android SDK + Pixel phone in `~/.expoemu`, Docker image, and the global `expoemu` command (unless `--no-global`). Idempotent. `--accept-licenses` accepts the Android SDK license (ask the user first). |
| `install` | Install only the global `expoemu` command (npm, or Bun when run via `bunx`). Never uses sudo. |
| `update` | Upgrade the global command to the latest release. `status` notes when one is available. |
| `uninstall` | Remove the global command (SDK, devices and settings are kept). |
| `up [--no-animations] [--headless] [--cold-boot]` | Boot the phone, start the container (installs deps on first use), start Metro, open the app in Expo Go. Honors `--device`. |
| `down` | Stop the container, every emulator and the adb server. Image, caches and devices are kept. |
| `status [--json]` (alias `doctor`) | Health check of SDK, devices, adb, container, Metro. Exit `1` if something required is down. `--json` prints `{"ok", "checks": [{"id", "status": "ok\|warn\|fail", "message", "device"?}], "devices": [{"serial", "name", "kind", "api", "booted"}]}` on stdout instead, with the same exit code. |
| `emulator start [--device NAME] [--no-animations] [--headless] [--cold-boot] [--wipe]` | Boot one device (default phone). Several can run at once. |
| `emulator stop [--device NAME] [--keep-adb]` | Stop all devices, or one. |
| `start` / `stop` | Start / stop only the container for the current project. |
| `expo [--background\|--logs\|--stop] [expo args]` | Metro bundler. Default is interactive; `--background` returns once Metro is ready. |
| `open [--all] [--reinstall] [--url URL]` | Install the matching Expo Go if needed and open the project (fresh bundle). `--all` = every running device. |
| `shell [cmd…]` | Shell, or one command, inside the container in `/workspace` (the project). |
| `cleanup --project\|--caches\|--image\|--sdk\|--all\|--legacy [--yes]` | Scoped removal of expoemu's own resources. Shows a plan and asks first. Ask the user before running. |

## Several devices

| Command | What it does |
|---------|--------------|
| `devices` | Created devices, profile, screen size and running serial. `*` marks the default. |
| `device create NAME [--profile phone\|small\|large\|tablet\|foldable]` | New device (shares the system image; ~2 GB data). |
| `device delete NAME [--yes]` | Delete a device and its data (not the default). |
| `device profiles` | List profiles with screen and RAM. |

Profiles: `phone` Pixel 8 1080×2400 (default) · `small` 720×1600, 2 GB ·
`large` Pixel 9 Pro XL 1344×2992 · `tablet` Pixel Tablet 2560×1600 ·
`foldable` Pixel Fold inner 2208×1840.

`--device` accepts a device name, `default`, a serial like `emulator-5556`, or a
connected **physical phone** (USB, or Wi-Fi via `expoemu adb connect IP:5555`)
by its model name from `expoemu devices` (e.g. `pixel-7`) or its serial. All
commands work on phones, except emulator-only ones (`network` speed profiles,
`sms`, `call`, `biometric`, `location`).

## See the screen

| Command | What it does |
|---------|--------------|
| `screenshot [--all] [name]` | PNG in `./.android-screenshots/`, prints the absolute path(s). Also updates `latest.png`. |
| `record [SECONDS] [name]` | MP4 screen recording (default 10 s, max 180), prints the path. |
| `ui [--xml]` | One line per element: `centerX centerY \| text \| content-desc \| testID \| class \| flags` (flags: clickable, focused, checked, disabled). `--xml` saves the raw hierarchy and prints its path. |
| `texts` | Visible strings only. |
| `a11y [--all]` | Accessibility audit of the screen. `ERROR unlabeled`: clickable/input with no text, label or placeholder (exit 1). `WARN small`: touch target under 48×48dp. `--all` adds `WARN no-testid`. |
| `find "Text"` | Center `X Y` of the element (exit 1 if absent). |
| `size` | Screen size in pixels. |
| `activity` | Foreground app / activity. |

## Touch

| Command | What it does |
|---------|--------------|
| `tap X Y` | Tap pixels. |
| `double-tap X Y` | Two quick taps. |
| `long-press X Y [ms]` | Press and hold (default 800 ms). |
| `tap-text "Text"` | Tap an element by selector. Hides the keyboard first. |
| `long-press-text "Text" [ms]` | Long-press an element. |
| `swipe X1 Y1 X2 Y2 [ms]` | Swipe (default 300 ms). |
| `drag X1 Y1 X2 Y2 [ms]` | Drag and drop (default 1000 ms). |
| `scroll down\|up\|left\|right` | Scroll inside the largest scroll view. |
| `scroll-to "Text" [--up] [--max N]` | Scroll until the element is visible (default max 15). Prints `X Y`. |

## Type and keys

| Command | What it does |
|---------|--------------|
| `fill "Field" "value" [--keep-keyboard]` | Tap a field (by text/placeholder/testID), clear it, type, hide the keyboard. |
| `text "hello"` | Type into the focused field. |
| `clear` | Clear the focused field. |
| `hide-keyboard` | Close the on-screen keyboard if shown. |
| `key NAME\|CODE` | Any key: `ENTER`, `TAB`, `DEL`, `VOLUME_UP`, `MENU`, … |
| `back` · `home` · `recents` · `enter` | Shortcuts. |
| `lock` · `unlock` | Screen off / wake and dismiss the lock screen. |

## Wait and assert

All exit `0` on success and `1` on failure, so they work as test steps.

| Command | What it does |
|---------|--------------|
| `wait-for "Text" [--timeout S]` | Wait until the element appears (default 15 s); prints `X Y`. |
| `wait-gone "Text" [--timeout S]` | Wait until it disappears. |
| `assert-text "Text"` | Fail unless on screen. |
| `assert-no-text "Text"` | Fail if on screen. |

## Device state

All reversible. Reset what you change.

| Command | What it does |
|---------|--------------|
| `rotate portrait\|landscape\|reverse-portrait\|reverse-landscape\|auto\|status` | Orientation (no effect if app.json locks it). |
| `dark-mode on\|off\|status` | System dark theme. |
| `font-scale 1.3\|reset\|status` | Accessibility text size (0.85–2.0). |
| `animations on\|off` | System animations. |
| `network on\|off\|status` | Wi-Fi + mobile data. Metro keeps working (adb). |
| `network gprs\|edge\|3g\|4g\|full` | Slow-network profile (speed + latency): gprs ~58 kbit/s, edge ~470 kbit/s, 3g ~14 Mbit/s, 4g ~173 Mbit/s; `full` removes limits. Emulators only. |
| `airplane on\|off\|status` | Airplane mode. |
| `location LAT LON` | GPS position, e.g. `location 37.422 -122.084`. |
| `battery LEVEL\|unplug\|charge\|reset\|status` | Fake battery level / charging. |
| `notifications open\|close\|settings` | Notification shade / quick settings. |
| `sms NUMBER "text"` | Receive an SMS, e.g. an OTP code (emulators). |
| `call NUMBER` · `call accept NUMBER` · `call end NUMBER` | Incoming phone call: ring, answer, hang up (emulators). |
| `biometric enroll [--pin N]` | Add a fingerprint. Sets a test screen-lock PIN (default 1234) first; `unlock` types it. |
| `biometric touch` · `biometric fail` | Matching / non-matching finger on the sensor, for login prompts and the lock screen. |
| `biometric status` · `biometric reset` | Is a fingerprint enrolled? / remove the PIN and fingerprints. |
| `permission grant\|revoke PERM [PKG]` · `permission list [PKG]` | Runtime permissions, e.g. `CAMERA`, `ACCESS_FINE_LOCATION`, `POST_NOTIFICATIONS`, `RECORD_AUDIO`. |
| `locale TAG\|reset\|status [PKG]` | Per-app language (`ar`, `fr-FR`, `ja`); reopen the app (`open`) to apply. |
| `info` | Device summary: model, API, screen, theme, battery, network, app locale. |

`PKG` defaults to `APP_PACKAGE` (Expo Go, `host.exp.exponent`).

## App control and debugging

| Command | What it does |
|---------|--------------|
| `app launch\|stop\|restart [PKG]` | Start / force-stop / restart (Expo Go restart reopens the project). |
| `app clear [PKG]` | Wipe app data; for Expo Go also reopens the project. |
| `app install FILE.apk` · `app uninstall PKG` · `app list` · `app info [PKG]` | Manage APKs. |
| `logcat [--errors\|--all] [-n N] [--follow] [--clear]` | Default: JS + React Native + Expo logs. `--errors`: all errors. |
| `crash [-n N] [--clear]` | Crash log buffer. |
| `perf [--reset]` | Frame stats: jank %, 50/90/95/99th percentile. `--reset`, interact, then `perf`. |
| `memory` | PSS/RSS, Java and native heap (MB). |
| `reload` | Reload the JS bundle. |
| `devmenu` | Open the React Native dev menu. |
| `open-url URL` | Open a deep link (`myapp://path` or `exp://…`). |
| `adb ARGS…` | Raw adb against the target device. |

## Flows: saved tests

| Command | What it does |
|---------|--------------|
| `run [FILE\|DIR…]` | Run `.flow` files (default: every file in `./.expoemu/flows/`). Each flow stops at its first failing step and saves a failure screenshot + error log. Exit 1 if any flow failed. |
| `run --var KEY=VALUE` | Value for `${KEY}` in flows (repeatable); environment variables work too. |
| `run --bail` · `run --report DIR` | Stop after the first failing flow / write the report elsewhere. |
| `run --init` | Create `./.expoemu/flows/example.flow`. |

A `.flow` file holds one expoemu command per line, without the `expoemu`
prefix. The first `#` comment is its title, and `${VAR:-default}` is
expanded. `setup`, `cleanup`, `install`, `uninstall`, `update`, `run` and
`device` are not allowed in flows. Reports go to
`.android-screenshots/runs/<time>/`: `summary.md`, `junit.xml` (CI) and
`report.json`.

## Visual regression

| Command | What it does |
|---------|--------------|
| `baseline NAME [--update]` | Save the current screen as `.expoemu/baselines/NAME.png` (per device with `--device`: `.expoemu/baselines/DEVICE/NAME.png`). Refuses to overwrite without `--update`. |
| `compare NAME` | Screenshot now and compare with the baseline. Prints the diff image path (red = changed, blue = ignored); exit 1 if more than `--threshold` % of pixels differ. |
| `compare A.png B.png` | Compare two image files. |
| options | `--threshold P` (default 0.1 %), `--tolerance N` per-channel noise (default 16), `--mask x1,y1,x2,y2` ignore an area (repeatable), `--include-status-bar` (ignored by default). |

Screens from different devices have different sizes, so keep a baseline per
device. Mask areas that change on their own, such as clocks, animations,
random content, or Expo Go's floating "Tools" tooltip near the top right.

## Maintenance

| Command | What it does |
|---------|--------------|
| `ui-server [status\|start\|stop\|remove]` | The on-device helper behind `ui`, `tap-text`, `wait-for` and every other selector command: ~0.3 s per screen read instead of ~3 s. Starts by itself on emulators and falls back to `uiautomator` on any problem. `stop` frees the accessibility connection for other tools (Maestro, Appium); `remove` uninstalls it. |
| `check-versions [--verify-sync]` | Compare pinned tool versions with upstream. |
| `help` · `--version` | Usage / version. |

## Configuration

Settings file: `~/.expoemu/config.env` (git clone: repo `.env`). Useful keys:
`APP_PACKAGE` (target app, default Expo Go), `AVD_RAM_MB`, `AVD_CORES`,
`EMULATOR_GPU` (`host` or `swiftshader_indirect`), `CONTAINER_RUNTIME`
(`docker` or `kiri`), `METRO_PORT` (8081), `ADB_SERVER_PORT` (5037),
`SCREENSHOT_DIR` (`.android-screenshots`), `EXPOEMU_NO_UPDATE_CHECK=1` (no
newer-version notice), `EXPOEMU_UI_SERVER` (`0` = always use `uiautomator`,
`1` = also use the UI server on physical phones), `EXPOEMU_UI_IDLE_MS` (how long
the screen must be still before it is read, default 300). Environment variables with the
same names override the file for one command.
