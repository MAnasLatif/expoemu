#!/usr/bin/env node
// =============================================================================
// expoemu — Expo Emulator
//
// Thin, dependency-free dispatcher: every command maps to a bash script in
// ../scripts. Run it from your Expo project folder:
//
//   expoemu setup        one-time install (isolated SDK, AVD, Docker image)
//   expoemu up           phone + container + Metro + open the app
//   expoemu screenshot   …and the other agent-friendly device commands
//   expoemu down         stop everything
//
// The scripts do the real work; this file only routes arguments and exit codes.
// =============================================================================
'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const updates = require('./update-check.js');

const ROOT = path.resolve(__dirname, '..');
const SCRIPTS = path.join(ROOT, 'scripts');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

// --- Command table --------------------------------------------------------------
// script: file in scripts/; prefix: args inserted before the user's args.
// Each list below forwards `expoemu <cmd> …` to `<script> <cmd> …`.
const DEVICE_CMDS = [ // scripts/device.sh — touch, elements, waits, keys
  'tap', 'double-tap', 'long-press', 'swipe', 'drag', 'scroll',
  'ui', 'texts', 'a11y', 'find', 'tap-text', 'long-press-text', 'scroll-to',
  'wait-for', 'wait-gone', 'assert-text', 'assert-no-text',
  'text', 'clear', 'fill', 'hide-keyboard', 'key', 'back', 'home', 'recents',
  'enter', 'lock', 'unlock',
  'logcat', 'reload', 'devmenu', 'open-url', 'activity', 'size', 'adb',
  'ui-server',
];
const SYSTEM_CMDS = [ // scripts/system.sh — device state, capture, info
  'rotate', 'dark-mode', 'font-scale', 'animations', 'network', 'airplane',
  'location', 'battery', 'notifications', 'permission', 'locale', 'record', 'info',
  'sms', 'call', 'biometric',
];
const APP_CMDS = ['app', 'crash', 'perf', 'memory']; // scripts/app.sh

// Commands implemented in Node rather than a script.
const BUILTINS = ['up', 'emulator', 'run', 'baseline', 'compare'];

const COMMANDS = {
  setup:            { script: 'setup.sh' },
  start:            { script: 'start.sh' },
  stop:             { script: 'stop.sh' },
  shell:            { script: 'shell.sh' },
  expo:             { script: 'expo.sh' },
  open:             { script: 'open-app.sh' },
  status:           { script: 'status.sh' },
  doctor:           { script: 'status.sh' },
  screenshot:       { script: 'screenshot.sh' },
  cleanup:          { script: 'cleanup.sh' },
  'check-versions': { script: 'check-versions.sh' },
  down:             { script: 'stop.sh', prefix: ['--all'] },
  devices:          { script: 'devices.sh', prefix: ['list'] },
  install:          { script: 'install-cli.sh' },                 // global `expoemu` command
  update:           { script: 'install-cli.sh', prefix: ['--latest'] },
  uninstall:        { script: 'install-cli.sh', prefix: ['--remove'] },
  device:           { script: 'devices.sh' },   // device create|delete|profiles|list
};
for (const c of DEVICE_CMDS) COMMANDS[c] = { script: 'device.sh', prefix: [c] };
for (const c of SYSTEM_CMDS) COMMANDS[c] = { script: 'system.sh', prefix: [c] };
for (const c of APP_CMDS) COMMANDS[c] = { script: 'app.sh', prefix: [c] };

const HELP = `expoemu ${pkg.version} — Expo Emulator

Run an Expo app on a native Android emulator (macOS) with the toolchain in
Docker. Run commands from your Expo project folder.
"Text" selectors match visible text, accessibilityLabel, testID or placeholder.

SETUP & LIFECYCLE
  setup [--runtime docker|kiri] [--accept-licenses]   one-time install (also installs the
                                                      global \`expoemu\` command; --no-global skips)
  install | update | uninstall                        the global \`expoemu\` command only
  up [--headless] [--no-animations] [--cold-boot]     phone + container + Metro + open app
  down                                                stop container, all emulators, adb
  status | doctor                                     health check (exit 1 if broken)
  emulator start|stop [--device NAME] [flags]         only the phone(s); stop = all
  start | stop                                        only the container
  expo [--background|--logs|--stop] [expo args]       Metro bundler
  open [--all] [--reinstall]                          install Expo Go if needed, open app
  shell [cmd…]                                        shell / command inside the container
  cleanup --project|--caches|--image|--sdk|--all|--legacy   scoped removal (asks first)

SEVERAL DEVICES AT ONCE
  devices [--json]                  list devices and which are running (--json for scripts/agents)
  device create NAME [--profile phone|small|large|tablet|foldable]
  device delete NAME | device profiles
  --device NAME (or -d NAME)        target a device with ANY command, e.g.
                                    expoemu emulator start --device tablet
                                    expoemu tap-text "Login" --device tablet
  open --all | screenshot --all     every running device

SEE THE SCREEN
  screenshot [--all] [name]         PNG in ./.android-screenshots, prints its path
  record [SECONDS] [name]           MP4 screen recording (max 180 s)
  ui [--xml]                        elements with tap coordinates (or raw XML)
  texts                             visible text only
  a11y [--all]                      accessibility audit (exit 1 on problems)
  find "Text"                       center "X Y" of an element

TOUCH
  tap X Y | double-tap X Y | long-press X Y [ms]
  tap-text "Text" | long-press-text "Text" [ms]
  swipe X1 Y1 X2 Y2 [ms] | drag X1 Y1 X2 Y2 [ms]
  scroll down|up|left|right | scroll-to "Text" [--up] [--max N]

TYPE & KEYS
  fill "Field" "value" [--keep-keyboard]   tap field, clear, type, hide keyboard
  text "hello" | clear | hide-keyboard
  key NAME|CODE | back | home | recents | enter | lock | unlock

WAIT & ASSERT (exit 0 = pass, 1 = fail)
  wait-for "Text" [--timeout S] | wait-gone "Text" [--timeout S]
  assert-text "Text" | assert-no-text "Text"

DEVICE STATE
  rotate portrait|landscape|auto | dark-mode on|off | font-scale 1.3|reset
  animations on|off | network on|off | airplane on|off
  location LAT LON | battery LEVEL|unplug|charge|reset
  notifications open|close|settings
  sms NUMBER "text" | call NUMBER | call accept|end NUMBER
  biometric enroll|touch|fail|status|reset   fingerprint (emulators)
  permission grant|revoke|list [PERM] [PKG] | locale TAG|reset [PKG]
  info                              device summary

APP & DEBUGGING
  app launch|stop|restart|clear|install|uninstall|list|info [PKG]
  logcat [--errors|--all] [-n N] [--follow] [--clear] | crash [-n N]
  perf [--reset] | memory | reload | devmenu | open-url URL | activity | size
  adb ARGS…                         raw adb against the emulator

FLOWS (saved, repeatable tests)
  run [FILE|DIR…] [--var K=V] [--bail] [--report DIR]   run .flow files (default ./.expoemu/flows)
  run --init                                          create an example flow

VISUAL REGRESSION
  baseline NAME [--update]                            save the screen as .expoemu/baselines/NAME.png
  compare NAME | compare A.png B.png                  % of pixels changed + diff image (exit 1 if over)
      [--threshold 0.1] [--tolerance 16] [--mask x1,y1,x2,y2] [--include-status-bar]

OTHER
  ui-server [status|start|stop|remove]   on-device helper that makes UI commands ~10x faster
                                   (automatic on emulators; EXPOEMU_UI_SERVER=0 off, =1 phones too)
  check-versions [--verify-sync]   compare pinned tool versions with upstream
  help | --version

Docs: docs/AGENTS.md in the package (or the project README).`;

// --- Helpers ---------------------------------------------------------------------
// How the user ran us, so hints show the same form:
//   npx cache (…/_npx/…) or the project's node_modules → "npx expoemu"
//   anything else (global install, linked checkout)    → "expoemu"
function commandPrefix(binPath = process.argv[1] || '', cwd = process.cwd()) {
  let real = binPath;
  try { real = fs.realpathSync(binPath); } catch { /* keep as is */ }
  const local = path.join(cwd, 'node_modules') + path.sep;
  if (real.includes(`${path.sep}_npx${path.sep}`) || real.startsWith(local) || binPath.startsWith(local)) {
    return 'npx expoemu';
  }
  return 'expoemu';
}
const CMD = commandPrefix();

function runScript(script, args, extraEnv = {}) {
  const file = path.join(SCRIPTS, script);
  // Invoke through bash so executable bits don't matter after npm install.
  // EXPOEMU_CLI makes the scripts print hints as `npx expoemu …` commands.
  const r = spawnSync('bash', [file, ...args], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env, EXPOEMU_CLI: '1', EXPOEMU_CMD: CMD,
      // lets `status` mention a newer release (read from the daily cache)
      EXPOEMU_UPDATE_AVAILABLE: updates.disabled() ? '' : (updates.availableUpdate(pkg.version) || ''),
      ...extraEnv,
    },
  });
  if (r.error) {
    console.error(`expoemu: failed to run bash: ${r.error.message}`);
    return 1;
  }
  return r.status === null ? 1 : r.status;
}

// `up`: the whole session in one command, stopping at the first failure.
function up(args) {
  const emuFlags = args.filter((a) => ['--headless', '--no-animations', '--cold-boot'].includes(a));
  const unknown = args.filter((a) => !emuFlags.includes(a));
  if (unknown.length) {
    console.error(`expoemu up: unknown option(s): ${unknown.join(' ')}`);
    return 2;
  }
  const steps = [
    ['emulator-start.sh', emuFlags],
    ['start.sh', []],
    ['expo.sh', ['--background']],
    ['open-app.sh', []],
  ];
  for (const [script, a] of steps) {
    // Intermediate "next step" hints are noise here: up runs those steps itself.
    const code = runScript(script, a, { EXPOEMU_QUIET_HINTS: '1' });
    if (code !== 0) return code;
  }
  console.error(`\nexpoemu: ready. Try: ${CMD} screenshot  |  ${CMD} ui  |  ${CMD} status`);
  return 0;
}

// Commands whose arguments belong to another tool (adb -d, a shell command, expo
// flags): there, --device is only recognised BEFORE the command name.
const PASSTHROUGH = new Set(['adb', 'shell', 'expo']);

// Pull the global "--device NAME" / "-d NAME" / "--device=NAME" option out of
// argv. Returns { device, rest }. The scripts read it as EXPOEMU_DEVICE.
function extractDevice(argv) {
  let device = null;
  const rest = [];
  let cmdSeen = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const allowed = !cmdSeen || !PASSTHROUGH.has(rest[0]);
    if (allowed && (a === '--device' || a === '-d') && i + 1 < argv.length) {
      device = argv[++i];
      continue;
    }
    if (allowed && a.startsWith('--device=')) {
      device = a.slice('--device='.length);
      continue;
    }
    rest.push(a);
    if (!a.startsWith('-')) cmdSeen = true;
  }
  return { device, rest };
}

function main(argv) {
  const code = dispatch(argv);
  notifyUpdate(argv);
  return code;
}

// After the command: refresh the version cache in the background (at most
// once a day) and, in an interactive terminal only, mention a newer release.
function notifyUpdate(argv) {
  const cmd = extractDevice(argv).rest[0];
  const skip = ['update', 'install', 'uninstall', '-v', '--version', 'version'];
  if (updates.disabled() || skip.includes(cmd) || process.platform !== 'darwin') return;
  updates.refreshInBackground();
  const latest = updates.availableUpdate(pkg.version);
  if (latest && process.stderr.isTTY) console.error(`\n${updates.updateMessage(latest, pkg.version, CMD)}`);
}

function dispatch(argv) {
  const { device, rest } = extractDevice(argv);
  if (device) process.env.EXPOEMU_DEVICE = device;
  const [cmd, ...args] = rest;

  if (!cmd || cmd === 'help' || cmd === '-h' || cmd === '--help') {
    console.log(HELP);
    return 0;
  }
  if (cmd === '-v' || cmd === '--version' || cmd === 'version') {
    console.log(pkg.version);
    return 0;
  }
  const known = BUILTINS.includes(cmd) || Object.hasOwn(COMMANDS, cmd);
  if (!known) {
    console.error(`expoemu: unknown command "${cmd}". Run: ${CMD} help`);
    return 2;
  }
  // Checked at runtime, not via package.json "os": a project may list expoemu as a
  // devDependency and `bun install` runs inside the Linux container too.
  if (process.platform !== 'darwin') {
    console.error('expoemu: the Android emulator side currently supports macOS only.');
    return 1;
  }
  if (cmd === 'up') return up(args);
  if (cmd === 'run') return require('./flow.js').run(args, { bin: __filename });
  if (cmd === 'baseline' || cmd === 'compare') return require('./visual.js').main(cmd, args, { bin: __filename });
  if (cmd === 'emulator') {
    const [sub, ...rest] = args;
    if (sub === 'start') return runScript('emulator-start.sh', rest);
    if (sub === 'stop') return runScript('emulator-stop.sh', rest);
    console.error('usage: expoemu emulator start|stop [flags]');
    return 2;
  }

  const entry = COMMANDS[cmd];
  return runScript(entry.script, [...(entry.prefix || []), ...args]);
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { COMMANDS, BUILTINS, HELP, main, dispatch, extractDevice, commandPrefix };
