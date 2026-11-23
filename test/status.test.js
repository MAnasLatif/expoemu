// Tests for `expoemu status --json` (scripts/status.sh) using stub adb,
// emulator, lsof and docker binaries — no emulator or Docker needed.
// Run with: npm test
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const STATUS = path.join(ROOT, 'scripts', 'status.sh');

function stub(file, body) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `#!/bin/sh\n${body}\n`);
  fs.chmodSync(file, 0o755);
}

// A temp ENV_HOME plus a bin dir that shadows docker (always "not running").
// withDevice adds a fake SDK whose adb reports one booted emulator.
function sandbox({ withDevice = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'expoemu-status-'));
  const bin = path.join(dir, 'bin');
  const home = path.join(dir, 'home');
  stub(path.join(bin, 'docker'), 'exit 1');
  if (withDevice) {
    stub(path.join(bin, 'lsof'), 'exit 0');
    stub(path.join(home, 'sdk', 'emulator', 'emulator'), 'exit 0');
    stub(path.join(home, 'sdk', 'platform-tools', 'adb'), `
case "$*" in
  *" devices") printf 'List of devices attached\\nemulator-5554\\tdevice\\n' ;;
  *"emu avd name"*) echo 'expo_pixel_api36' ;;
  *"ro.build.version.sdk"*) echo 36 ;;
  *"sys.boot_completed"*) echo 1 ;;
  *"reverse --list"*) echo 'emulator-5554 tcp:1 tcp:1' ;;
  *"pm list packages"*) echo 'package:host.exp.exponent' ;;
esac`);
    fs.mkdirSync(path.join(home, 'avd', 'expo_pixel_api36.avd'), { recursive: true });
    fs.writeFileSync(path.join(home, 'avd', 'expo_pixel_api36.avd', 'config.ini'), '');
  }
  const env = {
    ...process.env,
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
    ENV_HOME: home,
    EXPOEMU_CONFIG: path.join(dir, 'none.env'),
    EXPOEMU_UI_SERVER: '0',
    METRO_PORT: '1', // nothing listens there
    NO_COLOR: '1',
  };
  delete env.EXPOEMU_UPDATE_AVAILABLE;
  return { dir, env };
}

const run = (env, ...args) => spawnSync('bash', [STATUS, ...args], { encoding: 'utf8', env });

test('status --json prints one JSON object on stdout and keeps the exit code', () => {
  const { dir, env } = sandbox();
  try {
    const r = run(env, '--json');
    assert.strictEqual(r.status, 1);
    assert.strictEqual(r.stderr, '', 'nothing human-readable on stderr in --json mode');
    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.ok, false);
    assert.deepStrictEqual(out.devices, []);
    const byId = Object.fromEntries(out.checks.map((c) => [c.id, c]));
    assert.strictEqual(byId.sdk.status, 'fail');
    assert.strictEqual(byId.avd.status, 'fail');
    assert.strictEqual(byId.runtime.status, 'fail');
    assert.strictEqual(byId.metro.status, 'warn');
    for (const c of out.checks) assert.ok(['ok', 'warn', 'fail'].includes(c.status), c.status);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('status --json reports running devices and per-device checks', () => {
  const { dir, env } = sandbox({ withDevice: true });
  try {
    const out = JSON.parse(run(env, '--json').stdout);
    assert.deepStrictEqual(out.devices, [
      { serial: 'emulator-5554', name: 'expo_pixel_api36', kind: 'emulator', api: 36, booted: true },
    ]);
    const device = out.checks.filter((c) => c.device === 'emulator-5554').map((c) => [c.id, c.status]);
    assert.deepStrictEqual(device, [
      ['device', 'ok'], ['metro-reverse', 'ok'], ['expo-go', 'ok'], ['ui-server', 'warn'],
    ]);
    const adb = out.checks.find((c) => c.id === 'adb-server');
    assert.strictEqual(adb.status, 'ok');
    assert.strictEqual(adb.device, undefined, 'global checks carry no device');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('status --json escapes quotes and reports updates as warnings', () => {
  const { dir, env } = sandbox();
  try {
    const r = run({ ...env, AVD_NAME: 'say "hi"\\x', EXPOEMU_UPDATE_AVAILABLE: '9.9.9' }, '--json');
    const out = JSON.parse(r.stdout);
    assert.match(out.checks.find((c) => c.id === 'avd').message, /say "hi"\\x/);
    assert.strictEqual(out.checks[0].id, 'update');
    assert.strictEqual(out.checks[0].status, 'warn');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('status without --json keeps the human report on stderr', () => {
  const { dir, env } = sandbox();
  try {
    const r = run(env);
    assert.strictEqual(r.status, 1);
    assert.strictEqual(r.stdout, '');
    assert.match(r.stderr, /Expo Emulator status/);
    assert.match(r.stderr, /✗ Isolated SDK missing/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('status rejects unknown options with exit 2', () => {
  const r = spawnSync('bash', [STATUS, '--nope'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /unknown option: --nope/);
});
