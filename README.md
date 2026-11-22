# Expo Emulator (`expoemu`)

[![npm](https://img.shields.io/npm/v/expoemu.svg)](https://www.npmjs.com/package/expoemu)
[![CI](https://github.com/MAnasLatif/expoemu/actions/workflows/ci.yml/badge.svg)](https://github.com/MAnasLatif/expoemu/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Run and test **Expo / React Native apps on a real Android emulator on your
Mac** with one command, and no Android Studio, Java or system-wide Android
SDK. **Expo Emulator** (`expoemu`) — Expo + Android **emu**lator.

```bash
npx expoemu setup   # once per Mac: installs everything, including the `expoemu` command
expoemu up          # then, in any Expo project: phone boots, Metro starts, your app opens
```

- 🐳 **Toolchain in Docker:** JDK 17, Node.js, Bun, Expo CLI, Metro, adb
- 📱 **Native emulator on macOS:** Google's Android Emulator with an Android
  16 (API 36) Pixel device, hardware-accelerated by Hypervisor.framework
- 🤖 **AI-assistant ready:** one command (`npx skills add MAnasLatif/expoemu`)
  gives Claude Code, Cursor, Codex & co. an [Agent Skill](#ai-assistant-skill-let-your-agent-test-the-app)
  to run, inspect, tap through and verify your app on their own
- ⚡ **Fast screen reads:** `ui`, `tap-text`, `wait-for` and the other
  selector commands take ~0.3 s instead of ~3 s, through a small
  [helper on the emulator](#fast-ui-commands-the-ui-server)
- 🧹 **Clean host:** everything on macOS lives in `~/.expoemu` and is
  removed with one command
- 📌 **Reproducible:** every download is version-pinned and checksum-verified

```text
 macOS                                          Docker (or Kiri)
┌───────────────────────────┐   adb (5037)   ┌───────────────────────────┐
│ Android Emulator (native) │◄──────────────►│ Expo CLI · Metro · Bun    │
│ isolated SDK + AVD        │   Metro (8081) │ JDK 17 · adb client       │
│ VS Code / AI agent        │◄──────────────►│ /workspace = your project │
└───────────────────────────┘                └───────────────────────────┘
```

## Requirements

- macOS 13+ on **Intel or Apple Silicon**
- Node.js 18+ or Bun (only to install; `bunx expoemu setup` works too)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/), or
  optionally [Kiri](https://runkiri.com) (see [Using Kiri](#optional-using-kiri-instead-of-docker-desktop))
- About 14 GB free disk space (SDK and system image ~6 GB, phone data and
  quick-boot snapshots ~6 GB, Docker image ~2 GB)
- An Expo project that uses **Expo Go**

## Quick start

**1. Set up once** (from any folder). This is the only time you type `npx`:

```bash
npx expoemu setup     # isolated Android SDK + Pixel phone + Docker image (~10 min, once per Mac)
```

Setup also installs the **`expoemu` command** globally (npm, or Bun if you
ran `bunx expoemu setup`; never sudo). From then on just type `expoemu`.

**2. Then, in any Expo project:**

```bash
cd ~/code/my-expo-app
expoemu up        # phone + container + Metro + opens the app (~30 s)
# … edit code, Fast Refresh updates the phone …
expoemu down      # stop everything
```

Switch projects by running `expoemu up` in another project folder. Nothing
is reinstalled.

**Keeping the command up to date:**

| Command | What it does |
|---------|--------------|
| `expoemu update` | Upgrade to the latest release |
| `expoemu --version` | Show the installed version |
| `npx expoemu install` | (Re)install the `expoemu` command, e.g. after switching Node versions with nvm |
| `expoemu uninstall` | Remove the command (your SDK, devices and settings stay) |

expoemu tells you when a newer release is out: a one-line notice after a
command in your terminal, and a note in `expoemu status`. It checks npm at
most once a day in the background and never slows a command down. To turn it
off, set `EXPOEMU_NO_UPDATE_CHECK=1`. It is always off in CI.

Prefer not to install anything globally? Run `npx expoemu setup --no-global`,
then prefix every command with `npx`, as in `npx expoemu up`. Teams can also
pin a version per project with `npm i -D expoemu` and run `npx expoemu …`.

### Install once, test every project

Your projects stay clean. Everything Expo Emulator needs lives in hidden or
managed places:

| What | Where | In your project? |
|------|-------|------------------|
| The `expoemu` command | npm's global folder (e.g. `~/.nvm/…/bin/expoemu`) | No |
| Android SDK, emulator, the Pixel phone, logs, settings | `~/.expoemu/` | No |
| Toolchain (JDK, Node, Bun, Expo CLI, Metro) | Docker image `expoemu:local` | No |
| Linux `node_modules`, Bun/Expo/Gradle caches | Docker volumes `expoemu_*` | No |
| Screenshots and recordings | `./.android-screenshots/`, git-ignored automatically | Yes, so you and AI assistants can open them |

Dependencies are installed with **your project's own package manager**
(npm, yarn, pnpm or bun, picked from your lockfile) in a mode that never
rewrites your files. No lockfile or config is added to your project. Remove
everything with `expoemu cleanup --all`.

## Commands

| Command | What it does |
|---------|--------------|
| `expoemu setup` | One-time install (idempotent). `--runtime docker\|kiri`, `--accept-licenses`, `--recreate-avd` |
| `expoemu up` | Boot the phone, start the container and Metro, open the app. `--no-animations`, `--headless`, `--cold-boot` |
| `expoemu down` | Stop the container, emulator and adb server (image and caches kept) |
| `expoemu status` | Health check of SDK, emulator, adb, container and Metro (exit 1 if broken) |
| `expoemu emulator start\|stop` | Only the phone |
| `expoemu start` / `stop` | Only the container (runs `bun install` on first use) |
| `expoemu expo [--background\|--logs\|--stop]` | Metro (interactive by default) |
| `expoemu open [--reinstall]` | Install the matching Expo Go if needed and open the app |
| `expoemu shell [cmd…]` | Shell or command in the container, e.g. `expoemu shell npm install zod` (use your project's package manager) |
| `expoemu cleanup …` | Scoped removal: `--project`, `--caches`, `--image`, `--sdk`, `--all` |

### Device actions

In the commands below, a `"Text"` selector matches **visible text,
`accessibilityLabel`, `testID` or a TextInput `placeholder`**. An exact match
wins over a partial one.

**See the screen**

| Command | What it does |
|---------|--------------|
| `screenshot [name]` | PNG in `./.android-screenshots/`, prints its path (also `latest.png`) |
| `record [SECONDS] [name]` | MP4 screen recording (default 10 s, max 180) |
| `ui [--xml]` | Elements with tap coordinates, testIDs and focused/checked/disabled flags (or raw XML) |
| `texts` | Just the visible text |
| `a11y [--all]` | Accessibility audit: buttons/inputs without a label (exit 1), touch targets under 48dp; `--all` adds missing testIDs |
| `find "Text"` | Center `X Y` of an element |
| `ui-server [status\|start\|stop\|remove]` | The helper that makes the commands above fast ([details](#fast-ui-commands-the-ui-server)) |

**Touch**

| Command | What it does |
|---------|--------------|
| `tap X Y` · `double-tap X Y` · `long-press X Y [ms]` | Tap by pixels |
| `tap-text "Sign in"` · `long-press-text "Item" [ms]` | Tap an element |
| `swipe X1 Y1 X2 Y2 [ms]` · `drag X1 Y1 X2 Y2 [ms]` | Gestures |
| `scroll down\|up\|left\|right` | Scrolls inside the scrollable view |
| `scroll-to "Row 30" [--up] [--max N]` | Scroll until an element is visible |

**Type and keys**

| Command | What it does |
|---------|--------------|
| `fill "Email" "me@x.com"` | Tap a field, clear it, type, hide the keyboard |
| `text "hello"` · `clear` · `hide-keyboard` | Typing in the focused field |
| `key NAME` · `back` · `home` · `recents` · `enter` · `lock` · `unlock` | Keys (`key VOLUME_UP`, `key TAB`, …) |

**Wait and assert** (exit 0 = pass, 1 = fail, so they work as test steps)

| Command | What it does |
|---------|--------------|
| `wait-for "Welcome" [--timeout S]` | Wait until an element appears (default 15 s) |
| `wait-gone "Loading" [--timeout S]` | Wait until it disappears |
| `assert-text "Welcome"` · `assert-no-text "Error"` | Check what's on screen |

**Device state** (all reversible)

| Command | What it does |
|---------|--------------|
| `rotate portrait\|landscape\|auto` | Orientation (apps locked in `app.json` stay put) |
| `dark-mode on\|off` · `font-scale 1.3\|reset` · `animations on\|off` | Display |
| `network on\|off` · `airplane on\|off` | Offline testing. Metro keeps working over adb |
| `network edge\|3g\|4g\|gprs\|full` | Slow network: real speed + latency limits (`full` = back to normal) |
| `location 37.42 -122.08` · `battery 15\|unplug\|charge\|reset` | Sensors |
| `notifications open\|close\|settings` | Notification shade, quick settings |
| `sms 5551234 "Code 482913"` · `call 5551234` / `call end 5551234` | Incoming SMS (OTP flows) and phone calls |
| `biometric enroll` · `biometric touch\|fail` · `biometric reset` | Fingerprint login: enroll once, then simulate a matching or wrong finger |
| `permission grant\|revoke\|list [PERM]` | Runtime permissions, e.g. `permission grant CAMERA` |
| `locale ar\|fr-FR\|reset` | Per-app language (reopen the app to apply) |
| `info` | Device summary |

**App and debugging**

| Command | What it does |
|---------|--------------|
| `app launch\|stop\|restart\|clear\|info [PKG]` | App control. `clear` = fresh-install state |
| `app install FILE.apk` · `app uninstall PKG` · `app list` | Manage APKs |
| `logcat [--errors\|--all] [-n N] [--follow]` | JS logs (`ReactNativeJS`) or errors |
| `crash [-n N]` | Recent crashes |
| `perf [--reset]` · `memory` | Jank %, frame-time percentiles, memory use |
| `reload` · `devmenu` · `open-url URL` · `activity` · `size` · `adb …` | Misc |

Prefix every command with `expoemu`, e.g. `expoemu scroll-to "Row 30"`.
App commands target Expo Go unless you set `APP_PACKAGE`. Run
`expoemu help` for the full list.

## AI assistant skill: let your agent test the app

expoemu ships an [Agent Skill](https://agentskills.io) that teaches your coding
agent (Claude Code, Cursor, Codex, GitHub Copilot, Gemini CLI, Windsurf, Cline,
OpenCode and [others](https://www.skills.sh/)) everything about expoemu: every
command, the test workflow, selectors, multi-device testing and fixes for
common problems. With it, the agent can run your app, look at the screen, tap
through flows, check the result and read the logs on its own.

**1. Add the skill to your project** (from the project folder):

```bash
npx skills add MAnasLatif/expoemu
```

The [skills CLI](https://www.skills.sh/) detects your agents and installs the
skill into each one's folder (`.claude/skills/`, `.agents/skills/`, …). Commit
those files so your team and CI agents get the skill too. Useful options:
`-a claude-code` for one agent only, `-g` to install it for all your projects.
Run `npx skills update` later for the latest version.

**2. Mention it in your agent instructions.** Add this to `AGENTS.md`
(or `CLAUDE.md`):

```markdown
## Android testing
Use the `expoemu` skill to run, test and debug this app on Android.
Always verify UI changes on the emulator (screenshot + wait-for/assert)
before saying a task is done.
```

**3. Ask in plain language:**

- "Run the app on Android and show me the home screen."
- "Test sign-in with a wrong password and tell me what error appears."
- "Check the settings screen on a phone and a tablet."
- "What happens when the user is offline?"

The agent picks the right commands, such as `expoemu up`, `screenshot`,
`fill`, `tap-text`, `wait-for` and `logcat`, and reads the screenshots it
takes. Setup (`npx expoemu setup`) still needs one approval from you, because
it accepts the Android SDK license and downloads about 8 GB.

<details>
<summary>What the skill contains</summary>

| File | Purpose |
|------|---------|
| [`SKILL.md`](skills/expoemu/SKILL.md) | When to use expoemu, ground rules, the inspect → act → verify workflow, selectors, gotchas |
| [`references/commands.md`](skills/expoemu/references/commands.md) | Every command and flag |
| [`references/workflows.md`](skills/expoemu/references/workflows.md) | Recipes: forms, red screens, offline, dark mode, permissions, deep links, performance, multi-device |
| [`references/troubleshooting.md`](skills/expoemu/references/troubleshooting.md) | Symptoms and fixes |
| [`evals/evals.json`](skills/expoemu/evals/evals.json) | Scenarios to check an agent uses the skill correctly |

The agent loads `SKILL.md` when a task matches and opens the references only
when it needs them. The skill follows the Agent Skills spec, and CI checks
that it stays in sync with the CLI's commands.

</details>

Without the skill, any agent can still use expoemu. Every action is a plain
`expoemu …` command. See [docs/AGENTS.md](docs/AGENTS.md).

## Configuration

Settings live in `~/.expoemu/config.env`, created by `setup` from
[.env.example](.env.example). In a git clone, they live in the repo's `.env`.

| Variable | Default | Purpose |
|----------|---------|---------|
| `ENV_HOME` | `~/.expoemu` | Isolated SDK, AVD, logs |
| `AVD_RAM_MB` / `AVD_CORES` | `4096` / `4` | Emulator resources |
| `EMULATOR_GPU` | `host` | `swiftshader_indirect` for software rendering |
| `CONTAINER_RUNTIME` | `docker` | `docker` (Docker Desktop) or `kiri` (optional) |
| `CONTAINER_CPUS` / `CONTAINER_MEMORY` | `4` / `6g` | Container limits (CPUs capped to what the engine has) |
| `METRO_PORT` / `ADB_SERVER_PORT` | `8081` / `5037` | Ports |
| `PROJECT_DIR` | — | Fallback project when not run from an Expo folder |

Tool versions are pinned in [config/versions.env](config/versions.env). After
upgrading expoemu, the Docker image rebuilds automatically if its sources
changed.

## Working with several projects

Run `expoemu up` from another project's folder and the container is
recreated with that project mounted. Each project keeps its own Linux
`node_modules` volume. Bun, Expo and Gradle caches are shared.

> **Note:** The container's `node_modules` is a Docker volume that hides your
> macOS `node_modules`. Add packages with your package manager inside the container, e.g. `expoemu shell npm install <pkg>`.
> A macOS `bun install` for editor types also works. The two copies don't
> interfere.

## Saved tests (flows)

Turn a manual check into a repeatable test: a `.flow` file is a list of
expoemu commands, one per line, without the `expoemu` prefix.

```bash
expoemu run --init      # creates .expoemu/flows/example.flow
```

`.expoemu/flows/login.flow`:

```
# Sign-in with a wrong password shows an error
open
wait-for "Sign in" --timeout 60
fill "Email" "${EMAIL:-ada@example.com}"
fill "Password" "wrong-password"
tap-text "Sign in"
wait-for "Invalid password"
screenshot login-error
```

```bash
expoemu run                                   # every flow in .expoemu/flows/
expoemu run login.flow --var EMAIL=qa@x.com   # one flow, with a variable
expoemu run --device tablet                   # same flows on another device
```

```
▶ login — Sign-in with a wrong password shows an error
  ✓ open  (4.7 s)
  ✓ wait-for "Sign in" --timeout 60  (6.9 s)
  …
✓ 3/3 flow(s) passed — report: .android-screenshots/runs/2026-11-16T09-12-04
```

- **On failure:** each flow stops at its first failing step and saves a
  screenshot and recent error logs. All flows still run, unless you pass
  `--bail`. The exit code is 1 if any flow failed.
- **Report:** `summary.md` for people, `junit.xml` for CI, `report.json` for
  tools.
- **Share them:** commit `.expoemu/flows/` so the team and AI assistants run
  the same tests.
- **In CI:** run flows headless on a self-hosted Mac runner. See
  [docs/CI.md](docs/CI.md) for an example workflow and what works where.

## Visual regression (screenshot baselines)

Save how a screen should look, then catch unintended visual changes:

```bash
expoemu baseline settings            # saves .expoemu/baselines/settings.png (commit it)
# … change code …
expoemu compare settings             # ✓ 0.00% of pixels differ — or ✗ + a diff image, exit 1
expoemu baseline settings --update   # accept an intended change
```

- **Diff image:** the diff PNG marks changed pixels in **red**. Ignored areas
  are blue, and the status bar (clock, battery) is ignored by default.
- **Tuning:** `--threshold 0.5` (% of pixels allowed to change, default 0.1),
  `--tolerance 16` (colour noise), `--mask x1,y1,x2,y2` to ignore areas such
  as animations or clocks.
- **Several devices:** each device needs its own baselines. With
  `--device tablet` they live in `.expoemu/baselines/tablet/`.
- **Two files:** `expoemu compare before.png after.png` compares any two
  screenshots.
- **In flows:** `compare settings` works as a step, so flows can check how
  screens look as well as what they say.

No extra tools needed: images are compared with Node's built-in zlib.

## Several devices at once

Test on a phone, a tablet and a small screen side by side, or run two or
three emulators for apps that talk to each other (chat, multiplayer,
driver/rider). All devices share one system image, so each extra device only
adds its own data (~2 GB) and uses its RAM while running.

```bash
expoemu device create tablet --profile tablet
expoemu device create small  --profile small
expoemu devices                          # list devices + which are running
expoemu devices --json                   # same, as JSON (for scripts and agents)

expoemu up                               # default phone, container, Metro, app
expoemu emulator start --device tablet   # boots next to the phone
expoemu emulator start --device small
expoemu open --all                       # open the app on every running device

expoemu fill "Email" "a@x.com" --device tablet   # any command, one device
expoemu tap-text "Send" --device small
expoemu screenshot --all                 # one PNG per device
expoemu emulator stop --device small     # stop one; `down` stops all
```

| Profile | Hardware | Screen | RAM |
|---------|----------|--------|-----|
| `phone` (default) | Pixel 8 | 1080×2400 @420 dpi | 4 GB |
| `small` | small phone | 720×1600 @320 dpi | 2 GB |
| `large` | Pixel 9 Pro XL | 1344×2992 @480 dpi | 4 GB |
| `tablet` | Pixel Tablet | 2560×1600 @320 dpi | 4 GB |
| `foldable` | Pixel Fold (unfolded) | 2208×1840 @420 dpi | 4 GB |

- **Choosing the device:** without `--device`, commands use the default phone
  (also called `default`). `--device` takes a device name or a serial such as
  `emulator-5556`. For `adb`, `shell` and `expo`, put `--device` before the
  command (`expoemu --device tablet adb …`), so their own flags pass
  through.
- **Shared Metro:** one Metro serves every device. Each device runs its own
  copy of the app with its own state.
- **Capacity:** three running devices use about 10 GB of RAM. A Mac with
  16 GB comfortably runs two.
- **Real phones too:** plug in an Android phone with USB debugging on (or use
  `expoemu adb connect <ip>:5555` over Wi-Fi). It appears in `expoemu devices`
  under its model name (e.g. `pixel-7`), and every command works on it with
  `--device pixel-7`. `open --all` and `screenshot --all` include it. Expo Go
  is installed automatically and Metro is tunnelled over USB.

## Optional: using Kiri instead of Docker Desktop

[Kiri](https://runkiri.com) is a small, fast container runtime that speaks
the Docker Engine API. It's **entirely optional**. Docker Desktop stays the
default, and expoemu never installs Kiri or changes your Docker settings.

1. Install Kiri yourself by following [its docs](https://docs.runkiri.com/install/).
   It needs macOS 14 or newer. On Apple Silicon it also needs Apple Rosetta
   (`softwareupdate --install-rosetta`), because the image is `linux/amd64`.
2. Switch expoemu to Kiri: `expoemu setup --runtime kiri --skip-sdk`
3. Use everything as usual. `expoemu status` shows `Container runtime: Kiri`.

The scripts set `DOCKER_HOST=unix://~/.kiri/run/docker.sock` for their own
process only. Your global `docker context` stays as it is. Images and volumes
are separate per runtime.

> **Status:** the adb and Metro networking relies on features Kiri
> documents (`host.docker.internal` → the Mac's loopback, and
> `-p 127.0.0.1:…`). The full flow hasn't yet been run on a real Kiri install,
> and Kiri doesn't document whether file-change events (needed for Fast
> Refresh) cross its file sharing. Please report your results in an issue.

## Fast UI commands (the UI server)

Every selector command (`ui`, `texts`, `tap-text`, `fill`, `scroll-to`,
`wait-for`, `assert-text`, `a11y` …) first reads the screen. Android's
`uiautomator dump` needs about 3 s for that, so a short flow spent most of
its time waiting.

expoemu installs a tiny helper app (`dev.expoemu.server`, ~17 KB, no icon) on
the emulator the first time you run one of these commands. It stays running
and returns exactly the same screen data in ~0.1–0.3 s, so most commands now
finish in under half a second.

- **Automatic on emulators.** On physical phones it's off unless you set
  `EXPOEMU_UI_SERVER=1` (it installs an app on the phone).
- **Never in the way:** if the helper can't be installed, doesn't start or
  stops answering, expoemu falls back to `uiautomator dump` on its own.
  `expoemu status` shows which one each device uses.
- **Quits by itself** after 15 minutes without requests. It only listens on
  the device's own `127.0.0.1`, and every request needs a random token.
- `expoemu ui-server stop` frees Android's single UI-automation connection
  for other tools (Maestro, Appium, `uiautomator`). `ui-server remove`
  uninstalls it. `EXPOEMU_UI_SERVER=0` turns it off completely.
- Source: [server/](server/). The npm package ships the built APK.

## Cleanup and uninstall

```bash
expoemu cleanup --project     # this project's node_modules volume
expoemu cleanup --caches      # all volumes created by expoemu
expoemu cleanup --all         # full uninstall: container, volumes, image, ~/.expoemu
expoemu cleanup --legacy      # upgraded from 0.1.0? remove its old Docker image/volumes
```

Cleanup shows what it will remove and asks first. It only touches resources
labelled `com.expoemu.managed=true` with the `expoemu`
prefix, plus `ENV_HOME` if setup created it. Your projects, other Docker
resources and other Android SDKs are never touched.

## From source (contributors)

```bash
git clone https://github.com/MAnasLatif/expoemu.git && cd expoemu
scripts/setup.sh --project ~/code/my-expo-app
```

Setup also builds the UI server APK (`server/build.sh`, in Docker). Every
`expoemu <cmd>` has a script in [scripts/](scripts/), e.g.
`scripts/emulator-start.sh`, `scripts/device.sh tap-text "Sign in"`. You can
also run `node bin/expoemu.js <cmd>`.

## Documentation

- [Architecture: how the pieces connect](docs/ARCHITECTURE.md)
- [AI assistant guide](docs/AGENTS.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [CI and headless runs](docs/CI.md)

## Contributing

Contributions are welcome: version bumps, Linux/Windows host support, new
device helpers. See [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md). Security issues: [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). The Android SDK components downloaded by `setup` are
provided by Google under the
[Android SDK License Agreement](https://developer.android.com/studio/terms).
