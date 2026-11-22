# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `expoemu devices --json` prints the device list (name, profile, screen
  size, running/stopped, serial) and connected phones as one JSON object,
  so scripts and AI agents don't have to parse the table.

## [0.7.0] - 2026-11-16

### Added

- UI commands are about 10x faster. `ui`, `texts`, `find`, `tap-text`,
  `fill`, `scroll`, `scroll-to`, `wait-for`, `assert-text` and `a11y` read
  the screen in ~0.3 s instead of ~3 s through a tiny helper app on the
  emulator (`dev.expoemu.server`). It installs and starts on first use and
  returns exactly what `uiautomator dump` returns. On any problem expoemu
  falls back to uiautomator. `expoemu ui-server status|start|stop|remove`
  manages it, and `expoemu status` shows it per device. On physical phones
  it's opt-in (`EXPOEMU_UI_SERVER=1`). `EXPOEMU_UI_SERVER=0` turns it off.

## [0.6.0] - 2026-11-16

### Added

- Saved test flows: `expoemu run` runs `.flow` files (one expoemu command
  per line, with `${VAR}` / `--var`). Each failed flow saves a screenshot and
  error log. Reports are written as `summary.md`, `junit.xml` and
  `report.json`, and the exit code is 1 on failure. `run --init` creates an
  example.
- Visual regression: `expoemu baseline NAME` and `expoemu compare NAME` (or
  two PNG files) report the % of pixels changed and write a red-marked diff
  image. Thresholds, tolerance and masks can be tuned, and the status bar is
  ignored by default. No extra dependencies.
- [CI guide](docs/CI.md): headless runs on a self-hosted Mac runner, with an
  example GitHub Actions workflow. Explains why GitHub-hosted macOS runners
  can't run the emulator.

## [0.5.0] - 2026-11-16

### Added

- Physical Android phones (USB, or Wi-Fi via `expoemu adb connect`) work
  like emulators. They are listed in `devices` by model name, targeted with
  `--device`, and included in `open --all`, `screenshot --all` and `status`.
- Slow-network profiles: `network gprs|edge|3g|4g|full` (speed + latency).
- `sms`, `call` / `call accept|end`, and `biometric enroll|touch|fail|status|reset`
  for OTP, call-interruption and fingerprint-login testing. `unlock` types
  the test PIN that `biometric enroll` sets.
- `a11y [--all]` accessibility audit: unlabeled buttons/inputs (exit 1),
  touch targets under 48dp, and missing testIDs.
- Notice when a newer release is available (terminal and `status`; checks
  npm at most once a day in the background; `EXPOEMU_NO_UPDATE_CHECK=1` turns
  it off).

### Fixed

- Commands that loop over devices no longer skip every device after the
  first. `adb shell` inside the loop was consuming the device list.

## [0.4.0] - 2026-11-16

### Added

- `npx expoemu setup` is the only `npx` you ever type. Setup also installs the
  global `expoemu` command (npm, or Bun via `bunx`; never sudo; skip with
  `--no-global`), so afterwards it's just `expoemu up`, `expoemu screenshot`
  and so on. New `install`, `update` and `uninstall` commands manage it.
  Hints print the same form you used (`expoemu …` or `npx expoemu …`), and
  all docs and the Agent Skill now use `expoemu …`.

- Agent Skill `expoemu` (`skills/expoemu`) for Claude Code, Cursor, Codex,
  Copilot and other agents. Install with `npx skills add MAnasLatif/expoemu`.
  It includes SKILL.md (workflow, selectors, gotchas), references (all
  commands, recipes, troubleshooting) and evals. CI checks it against the
  Agent Skills spec and the real CLI commands.

## [0.2.0] - 2026-11-16

### Added

- Several emulators at once. Named devices come from profiles (`phone`,
  `small`, `large`, `tablet`, `foldable`) via `device create`, and `devices`
  lists them. `emulator start|stop --device NAME` runs them side by side. A
  global `--device NAME` targets any command at one device. `open --all`
  and `screenshot --all` cover every running device, all served by one
  Metro.

### Changed

- Install once, test every project. The first-run dependency install uses the
  project's own package manager (npm `ci`, yarn/pnpm frozen lockfile, bun),
  and `bun install --no-save` when there is no lockfile, so nothing is
  written into the project. `.android-screenshots/` ignores itself in git.
- Upgrading from 0.1.0: the npm 0.1.0 package used older internal names for
  its folder and Docker resources. The folder moves to `~/.expoemu`
  automatically on first run (no re-download), the old container is
  replaced, and `npx expoemu cleanup --legacy` removes the old image and
  volumes.

### Added

- npm package **`expoemu`**: `npx expoemu setup | up | down | status | screenshot |
  ui | tap-text | logcat …` from the Expo project folder, for people and AI
  assistants. `up` starts the phone, container and Metro, and opens the app
  in one command.
- Settings for npm installs live in `~/.expoemu/config.env`
  (`EXPOEMU_CONFIG` overrides). Git clones keep using `.env`.
- The Docker image rebuilds automatically when its sources change (for
  example after upgrading expoemu).
- Release workflow: pushing a `vX.Y.Z` tag publishes to npm with provenance.
- Many more device actions, all available as `npx expoemu <cmd>`:
  - touch: `double-tap`, `long-press`, `long-press-text`, `drag`, `scroll
    left|right`, `scroll-to`
  - typing: `fill`, `clear`, `hide-keyboard`, `recents`, `enter`, `lock`,
    `unlock`
  - wait and assert: `wait-for`, `wait-gone`, `assert-text`,
    `assert-no-text`, `texts`, `ui --xml`
  - device state: `rotate`, `dark-mode`, `font-scale`, `animations`,
    `network`, `airplane`, `location`, `battery`, `notifications`,
    `permission`, `locale`, `record`, `info`
  - app and debugging: `app launch|stop|restart|clear|install|uninstall|list|info`,
    `crash`, `perf`, `memory`
- Selectors match `testID`, `accessibilityLabel` and placeholders, and
  prefer exact matches. `APP_PACKAGE` selects the target app (Expo Go by
  default).
- Optional [Kiri](https://runkiri.com) container runtime
  (`CONTAINER_RUNTIME=kiri` or `scripts/setup.sh --runtime kiri`). Docker
  Desktop stays the default. The global docker context is never changed.

### Changed

- Commands now target the Expo project in the current folder before the
  saved `PROJECT_DIR`.

### Fixed

- `scripts/start.sh` caps `CONTAINER_CPUS` to the engine's CPU count instead
  of failing on small VMs.
- `open` force-stops Expo Go first, so a quick-boot snapshot can't leave
  stale code on screen.
- Gboard's stylus tutorial no longer hijacks typing. The emulator
  advertises stylus input, so `emulator start` disables handwriting.
- `scroll`/`tap-text`/`fill` hide the on-screen keyboard first, which stops
  accidental glide typing. Scroll swipes start inside the scroll view.
- Expo Go's first-run developer menu is dismissed after install or
  `app clear`.

## [0.1.0] - 2026-11-15

### Added

- Docker image: Ubuntu 24.04, OpenJDK 17, Node.js 24.22.3, Bun 1.4.4, Android
  cmdline-tools and platform-tools 37.0.3.
- Native macOS Android Emulator (build 16863232) with an Android 16 / API 36
  Google APIs image (x86_64 on Intel, arm64 on Apple Silicon), installed into
  an isolated `~/.expoemu`. macOS doesn't need Java.
- Shared adb server: the container's adb client talks to the macOS server
  through `host.docker.internal`.
- Metro on `127.0.0.1` with `adb reverse` into the emulator.
- Scripts: `setup`, `start`, `stop`, `shell`, `expo`, `open-app`,
  `emulator-start`, `emulator-stop`, `screenshot`, `device`, `status`,
  `cleanup`, `check-versions`.
- Agent-friendly device control: UI element listing, tap by text,
  screenshots, logcat filters.
- Open-source project files: MIT license, contributing guide, code of
  conduct, security policy, CI, Dependabot.
