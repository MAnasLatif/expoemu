---
name: expoemu
description: Runs and tests Expo / React Native apps on a real Android emulator on macOS with the expoemu CLI (expoemu). Boots the emulator, starts Metro in Docker, opens the app in Expo Go, then drives it with screenshots, UI inspection, taps by text or testID, typing, scrolling, waits and assertions, logs, crashes and performance. Also changes device state (dark mode, offline, rotation, permissions, language) and runs several devices at once. Use when the user asks to run, test, verify, debug or screenshot an Expo app on Android, check a UI change on a phone or tablet, reproduce an Android bug, or mentions expoemu.
license: MIT
compatibility: macOS (Intel or Apple Silicon) with Docker Desktop or Kiri, Node.js 18+, and an Expo project that runs in Expo Go.
allowed-tools: Bash(expoemu:*) Bash(expoemu:*) Bash(expoemu:*) Read
metadata:
  author: MAnasLatif
  version: "1.2.0"
  homepage: https://github.com/MAnasLatif/expoemu
---

# expoemu: test Expo apps on a real Android emulator

`expoemu` (Expo Emulator) runs the user's Expo app on a native Android emulator
on macOS. The toolchain (Node, Bun, Expo CLI, Metro, adb client) lives in
Docker; the emulator runs natively; nothing is installed into the project.
Every action is a terminal command, so you can see the screen, interact and
verify results yourself.

## Ground rules

- Run every command **from the Expo project root**. The current folder decides
  which project is tested.
- Commands are `expoemu <command>`. `setup` installs this global command. If
  `command -v expoemu` finds nothing, prefix every command in this skill with
  `npx -y`, as in `npx -y expoemu status` (identical behaviour). Or, with the
  user's OK, run `npx -y expoemu install` once.
- Exit codes matter. `0` is success. `1` means failure and a ✗ line on stderr
  says why. Read it before retrying.
- Never use a global `adb`. Use `expoemu adb …` (isolated SDK, right port).
- Install packages **inside the container** with the project's package manager:
  `expoemu shell npm install <pkg>` (or yarn / pnpm / bun to match the lockfile).
- Ask the user before `setup` (it accepts the Android SDK license and downloads
  about 8 GB), before any `cleanup`, and before `device delete`.

## Workflow

Copy this checklist and tick it off:

```
- [ ] 1. expoemu status          → understand what is running
- [ ] 2. expoemu up --no-animations   (if anything is down)
- [ ] 3. Inspect: screenshot + ui
- [ ] 4. Act: tap-text / fill / scroll-to …
- [ ] 5. Verify: wait-for / assert-text / screenshot / logcat --errors
- [ ] 6. Reset any device state you changed
```

**1. Check.** Run `expoemu status`. Exit `0` means everything is ready. Otherwise
follow the hints it prints. If the isolated SDK is missing, setup has never run:
ask the user, then run `npx -y expoemu setup --accept-licenses` (about 10 min,
once per Mac; it also installs the global `expoemu` command).

**2. Start.** Run `expoemu up --no-animations`. It boots the phone, starts the
container and Metro, and opens the app in Expo Go (about 30 s after the first
boot). `--no-animations` keeps screenshots stable.

**3. Inspect the screen.**

```bash
expoemu screenshot home     # prints an absolute PNG path, so Read it to see the screen
expoemu ui                  # every element: "centerX centerY | text | label | testID | class | flags"
expoemu texts               # just the visible strings
expoemu a11y                # accessibility audit (exit 1 on unlabeled buttons/inputs)
```

**4. Act.** Prefer selectors over pixel coordinates:

```bash
expoemu tap-text "Sign in"            # text, accessibilityLabel, testID or placeholder
expoemu fill "Email" "ada@example.com" # tap field, clear, type, hide keyboard
expoemu fill password-input "secret"  # by testID
expoemu scroll-to "Privacy policy"    # scrolls until visible
expoemu tap 540 1210                  # pixels from `ui` / the screenshot
expoemu back
```

**5. Verify.** Never assume an action worked:

```bash
expoemu wait-for "Welcome" --timeout 20   # exit 0 when it appears
expoemu assert-no-text "Invalid password"
expoemu logcat --errors -n 50            # native + JS errors
expoemu expo --logs                      # Metro / bundling errors
expoemu screenshot after-login
```

After editing code, Fast Refresh updates the app in about 2–5 s. Then
`wait-for` the change, or `expoemu open` (fresh reload) if the screen shows old code.

**6. Clean up.** Undo state you changed (`network on`, `dark-mode off`,
`font-scale reset`, `locale reset`, `rotate portrait`). Leave the emulator
running unless the user asks to stop. `expoemu down` stops everything.

## Selectors

`"Text"` arguments match, case-insensitively, the visible text, the
`accessibilityLabel`, the React Native `testID`, and an empty TextInput's
`placeholder`. An exact match wins over a partial one. If nothing matches, run
`expoemu ui` and use what it shows. When you write app code, add a `testID`
to important elements. It is the most stable selector.

## Key facts and gotchas

- **Coordinates** are device pixels (default phone 1080×2400). Screenshots are
  the same size, so a pixel in a screenshot can be tapped directly.
- **Keyboard**: `fill`, `tap-text` and `scroll` hide the on-screen keyboard
  first. Before a raw `swipe`, run `expoemu hide-keyboard`, because a swipe
  over the keyboard types text.
- **Offline / slow network**: `expoemu network off` cuts the app's internet,
  and `network edge|3g` throttles it (restore with `network on` / `network
  full`). Metro keeps working over adb in both cases.
- **Fresh state**: `expoemu app clear` wipes storage (AsyncStorage,
  SecureStore, permissions) and reopens the project.
- **Rotation** has no effect if `app.json` locks `"orientation"`.
- **Speed**: screen reads (`ui`, `tap-text`, `wait-for` …) take ~0.3 s through
  the on-device UI server, which starts by itself. Before you use another
  UI-automation tool (Maestro, Appium), run `expoemu ui-server stop`.
- **Red error screen**: the stack trace is in `expoemu logcat` (tag `ReactNativeJS`).
- **Several devices**: commands go to the default phone unless you add
  `--device NAME`. For `adb`, `shell` and `expo`, put `--device` before the
  command: `expoemu --device tablet adb shell …`.

## Saved tests (flows)

Projects can keep repeatable tests in `.expoemu/flows/*.flow`, one expoemu
command per line (see [references/workflows.md](references/workflows.md#save-a-flow-as-a-regression-test)).

```bash
expoemu run                    # all flows; exit 1 if any fails, report under .android-screenshots/runs/
expoemu run .expoemu/flows/login.flow --var EMAIL=test@example.com
```

- If `.expoemu/flows/` exists, run it after your code changes to catch regressions.
- After you verify a new flow by hand, offer to save it as a `.flow` file.
- Visual checks: `expoemu compare NAME` against `.expoemu/baselines/NAME.png`
  (exit 1 and a red-marked diff PNG on change). Only run
  `expoemu baseline NAME --update` when the user confirms the change is intended.

## Several devices at once

```bash
expoemu devices                                  # created devices + running state
expoemu devices --json                           # same as JSON (name, status, serial)
expoemu device create tablet --profile tablet    # phone|small|large|tablet|foldable
expoemu emulator start --device tablet           # runs next to the phone
expoemu open --all                               # app on every running device
expoemu tap-text "Send" --device tablet
expoemu screenshot --all                         # one PNG per device
```

Each device costs about 2–4 GB of RAM while running. Three devices fit a 32 GB Mac.

## References

- Every command and flag: [references/commands.md](references/commands.md)
- Recipes (login flow, offline, dark mode, permissions, deep links,
  performance, multi-device chat): [references/workflows.md](references/workflows.md)
- Problems and fixes: [references/troubleshooting.md](references/troubleshooting.md)
