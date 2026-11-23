# expoemu — daily growth & improvement playbook

Read by the scheduled daily agent at the start of every run. Owner: M Anas Latif.

## Goal
More real users and GitHub stars for expoemu by (1) making the tool better and
(2) reaching people who actually have the problem it solves. Stars follow users.

## Who has this problem (search for them)
- Expo / React Native devs on macOS who want an Android emulator without Android Studio
- People fighting Android SDK / Java / Gradle setup on Mac just to test Expo Go
- Devs using Claude Code / Cursor / Codex who want the agent to run, tap and screenshot their app
- Teams wanting cheap mobile UI tests (flows, visual diffs) without Detox/Maestro setup

Search terms: "expo android emulator mac without android studio", "expo go emulator
apple silicon", "android emulator docker mac expo", "claude code test react native app",
"AI agent android emulator screenshot", "maestro alternative expo".
Places: GitHub issues/discussions in expo/expo, react-native-community, r/reactnative,
r/expo, Stack Overflow [expo]+[android-emulator], dev.to, Hacker News. (Expo Discord: Anas manually.)

## Hard rules
- NEVER post, comment, or open PRs outside MAnasLatif/expoemu. Draft replies for Anas instead.
- Drafted replies must answer the person's actual question first; mention expoemu only
  when it genuinely fits, and disclose "I built this". No copy-paste spam, max 3 per day.
  Only threads from the last ~30 days that are still unresolved.
- No star-for-star, no asking for stars in other people's threads (GitHub ToS + reputation).
- Code changes: always on a branch `agent/<yyyymmdd>-<slug>` + PR to main. Never push to main.
  Run `npm test` before opening a PR. One focused PR per day max. Don't touch release/version files.
- Never publish to npm or create releases. Anas merges and releases.

## Backlog (agent keeps this updated; top = next)
1. Demo GIF/video at the top of README — NEEDS ANAS. Shot list ready: growth/DEMO_SHOTLIST.md
2. Merge queue: PRs #8, #9, #10, #11 are open — Anas reviews/merges, then a release so npm users get them. Agent should avoid stacking more CLI PRs that touch bin/expoemu.js until these land.
3. Launch kit — Show HN + r/reactnative drafts DONE (growth/launch/). Still to draft: dev.to article ("Test Expo on Android without Android Studio"), X/LinkedIn thread. Launch only after the demo GIF exists.
4. `good first issue` label exists — write 3–5 small issues (ideas: `expoemu help <cmd>` per-command help; `profiles --json`; mention `[--json]` for status in the `help` text once #9/#10/#11 land) so contributors can join. (ShellCheck already in CI — dropped.)
5. Awesome lists (awesome-react-native, awesome-expo, awesome-claude-code, awesome-mcp) — draft PR text for Anas
6. Expo's own agent docs (docs.expo.dev/agents/…) list agent-device and Argent as ways for agents to drive emulators — draft a docs PR text for Anas proposing an expoemu page/mention (Anas submits; agent never PRs expo/expo)
7. Get listed on skills directories (skills.sh, claude-plugins.dev, tessl, smithery) — agents' skills already show up there for "android emulator" searches; expoemu's skill should too
8. MCP server wrapper so agents find expoemu through MCP directories (competitors seen: callstack/agent-device, Android-Ui-MCP, expo-android MCP)
9. Positioning vs Meta's "Cuttlefish on Mac" (engineering.fb.com, 2026-11-13: Android virtual devices natively on Apple silicon). Read it when a fetch is allowed; add an honest row to the README comparison (after #8 merges) + FAQ line. People searching "android emulator mac" will now find it.
10. Wider audience: Expo dev builds (not only Expo Go), Linux host investigation — most agent-verify planning issues found on GitHub run on Linux hosts (skrymer-ai#78, agentic-system#874), so Linux support would widen reach a lot
- DONE 2026-11-23: `expoemu status --json` (stable check ids, devices, same exit code) → PR #11 (touches only scripts/status.sh + docs + new test)
- DONE 2026-11-22: `expoemu devices --json` (agent-friendly) → PR #10
- DONE 2026-11-21: "Did you mean …?" typo hints for unknown commands → PR #9
- DONE 2026-11-20: README "Why expoemu?" + comparison table → PR #8

## Notes from runs
- 2026-11-21: GitHub search for live threads mostly surfaces other projects' internal planning issues (agents choosing a mobile driver), not people asking for help — replying there would be unsolicited. Real askers are more likely on Reddit/SO/Expo Discord, but web search returns mostly old tutorials. Agent-device (Callstack) + Maestro MCP are what people pick today; they're the comparison to win.
- Cross-repo GitHub reads are blocked for this scheduled task (403) and WebFetch of github.com issue pages needs approval → thread leads can't be fully verified. Fix: Anas adds read access / approves github.com fetches, or the agent relies on search snippets.
- npm downloads API is blocked from the shell (proxy 403); WebFetch npmjs.com also needs approval.
- 2026-11-22: Web search for Reddit/SO/forum askers again returned only old tutorials/forum posts (2020–2023). Only fresh lead: expo/explore#82 "Support reusing an existing local simulator or emulator" (2026-11-13, 0 comments) — feature request to Expo, unread (cross-repo 403). Expo docs now have pages for agent-device and Argent under /agents/ plus "verify a change with an agent" (EAS simulators) — that's the discovery surface to get onto (backlog 6). Tessl/skills.sh/smithery/mcpservers list many emulator skills; expoemu missing (backlog 7).
- Search for live threads works best via `gh api search/issues` with `is:issue is:open created:>DATE` (needs is:issue).
- 2026-11-23: Again 0 honest threads. Web search → old tutorials; GitHub issue search → other projects' agent-planning/Windows build issues. Tip: cross-repo `gh api repos/...` is 403, but `gh api search/issues -f q='repo:OWNER/NAME is:issue <words>'` returns the issue body — use that to verify leads. expoemu ranks #2 on web search for "expo android emulator mac without android studio" (after nabilfreeman's gist).
