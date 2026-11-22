// `expoemu devices --json` against a fake SDK (fake adb + AVD folders), so it
// runs anywhere: no emulator, Docker or macOS needed. Run with: npm test
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'devices.sh');

// adb stand-in: one running emulator (the default device), one USB phone,
// one phone that still waits for "Allow USB debugging".
const FAKE_ADB = `#!/usr/bin/env bash
[ "$1" = -P ] && shift 2
if [ "$1" = devices ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\nR58M\\tdevice\\nABC123\\tunauthorized\\n'
elif [ "$1" = -s ] && [ "$3" = emu ]; then
  printf 'expo_pixel_api36\\r\\nOK\\r\\n'
elif [ "$1" = -s ] && [ "$3" = shell ]; then
  printf 'Pixel 7\\r\\n'
fi
`;

function fakeHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'expoemu-devices-'));
  const tools = path.join(home, 'sdk', 'platform-tools');
  fs.mkdirSync(tools, { recursive: true });
  fs.writeFileSync(path.join(tools, 'adb'), FAKE_ADB, { mode: 0o755 });
  const avd = (name, conf) => {
    fs.mkdirSync(path.join(home, 'avd', `${name}.avd`), { recursive: true });
    fs.writeFileSync(path.join(home, 'avd', `${name}.ini`), '');
    fs.writeFileSync(path.join(home, 'avd', `${name}.avd`, 'config.ini'), conf);
  };
  avd('expo_pixel_api36', 'hw.lcd.width=1080\nhw.lcd.height=2400\n');
  avd('tablet', 'expoemu.profile=tablet\nhw.lcd.width=1600\nhw.lcd.height=2560\n');
  return home;
}

const run = (home, ...args) => spawnSync('bash', [SCRIPT, ...args], {
  encoding: 'utf8',
  env: { ...process.env, ENV_HOME: home, AVD_NAME: 'expo_pixel_api36', NO_COLOR: '1' },
});

test('devices --json prints one parseable object with devices and phones', () => {
  const home = fakeHome();
  try {
    const r = run(home, 'list', '--json');
    assert.strictEqual(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.deepStrictEqual(out.devices, [
      { name: 'expo_pixel_api36', default: true, profile: 'phone', width: 1080, height: 2400, status: 'running', serial: 'emulator-5554' },
      { name: 'tablet', default: false, profile: 'tablet', width: 1600, height: 2560, status: 'stopped', serial: null },
    ]);
    assert.deepStrictEqual(out.phones, [
      { name: 'pixel-7', serial: 'R58M', status: 'connected' },
      { name: null, serial: 'ABC123', status: 'unauthorized' },
    ]);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('devices (table) still lists the same devices', () => {
  const home = fakeHome();
  try {
    const r = run(home, 'list');
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /expo_pixel_api36\*\s+phone\s+1080x2400\s+running \(emulator-5554\)/);
    assert.match(r.stdout, /tablet\s+tablet\s+1600x2560\s+stopped/);
    assert.match(r.stdout, /pixel-7\s+R58M\s+connected/);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('devices rejects unknown options', () => {
  const home = fakeHome();
  try {
    const r = run(home, 'list', '--yaml');
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stderr, /unknown option: --yaml/);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});
