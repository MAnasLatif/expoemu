# r/reactnative (and r/expo) draft — check each sub's self-promo rules first

**Title:** I got tired of installing Android Studio just to test Expo on Android, so I made a one-command emulator setup for Mac (open source)

Body:

On a Mac, testing an Expo app on Android usually means Android Studio + JDK +
SDK + AVD config. I wanted `cd my-app && one command`.

expoemu (MIT, I built it):
- `npx expoemu setup` once (~10 min), then `expoemu up` in any Expo project
- native Android emulator on macOS (Intel + Apple Silicon), Metro/JDK/Expo CLI in Docker
- nothing system-wide: all in ~/.expoemu, `expoemu cleanup --all` removes it
- several devices at once (phone + tablet + foldable), real phones over USB/Wi-Fi
- CLI for screenshots, taps, UI tree, logcat, saved test flows and visual diffs; there's an
  Agent Skill so Claude Code/Cursor can drive and verify the app themselves

Current limits: macOS only, Expo Go projects (dev builds not yet).

Repo: https://github.com/MAnasLatif/expoemu
Happy to hear what breaks on your setup.

<!-- Add the demo GIF here once recorded (growth/DEMO_SHOTLIST.md) — posts with a GIF do much better. -->
