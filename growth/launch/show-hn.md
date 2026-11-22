# Show HN draft (Anas posts; best Tue–Thu ~8–10am US Eastern)

**Title:** Show HN: Expoemu – Android emulator for Expo on macOS, toolchain in Docker

**URL:** https://github.com/MAnasLatif/expoemu

**First comment (post right after submitting):**

Hi HN, I built expoemu because testing an Expo app on Android from a Mac meant
installing Android Studio, a JDK and a system-wide SDK just to get one emulator.

`npx expoemu setup` once, then `expoemu up` in any Expo project: a native
Android 16 emulator boots (Hypervisor.framework, Intel + Apple Silicon), Metro
runs in a container with JDK 17/Node/Bun/Expo CLI/adb, and your app opens.
Everything on the Mac lives in ~/.expoemu and one command removes it. Downloads
are version-pinned and checksum-verified.

The other half is for AI coding agents: an Agent Skill + CLI so Claude Code /
Cursor / Codex can take screenshots, read the UI tree (~0.3 s via a small
on-device helper), tap by text, wait/assert, run saved flows and do pixel
diffs, so the agent can check its own change on a real emulator.

Limits today: macOS host only, Expo Go projects (dev builds not yet), Android only.
I'd love feedback on setup on machines I haven't tried, and on what an agent
would need that's missing.

<!-- Don't ask for stars or upvotes anywhere (HN rules + playbook). -->
