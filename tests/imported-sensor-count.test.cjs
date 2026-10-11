// Regression for an imported session's count being overwritten by live peers
// on a language refresh. Runs real loading, roster, language-click, recording,
// and analysis functions with the same synthetic files used for native QA.
// DOM/timer/render adapters below do not emulate layout, canvas, or WebRTC.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { gunzipSync } = require('node:zlib');
const root = path.join(__dirname, '..');
const input = fs.readFileSync(process.env.WIRELESS_SENSOR_HTML || path.join(root, 'src/index.template.html'), 'utf8');
const payload = input.match(/<script id="self-extract-payload"[^>]*>([\s\S]*?)<\/script>/);
const source = payload ? gunzipSync(Buffer.from(payload[1], 'base64')).toString('utf8') : input;
const lines = source.split('\n');
const primary = 'synthetic-wireless-session-v8.json';
const replacement = 'synthetic-wireless-replacement-v8.json';
const malformed = 'synthetic-invalid-wireless-session.json';
const plain = value => JSON.parse(JSON.stringify(value));

function extract(name) {
  const start = lines.findIndex(line => new RegExp(`^      (?:async )?function ${name}\\(`).test(line));
  assert.ok(start >= 0, `Production function ${name} exists`);
  const end = lines[start].trimEnd().endsWith('}') ? start : lines.findIndex((line, i) => i > start && line === '      }');
  assert.ok(end >= start, `Production function ${name} is complete`);
  return lines.slice(start, end + 1).join('\n');
}

function harness(language = 'en') {
  const dom = new Map(), saved = new Map(), notices = [], warnings = [];
  const $ = key => {
    if (!dom.has(key)) dom.set(key, {
      hidden: true, value: '', textContent: '', innerHTML: '', attributes: {}, events: {},
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(name, handler) { this.events[name] = handler; },
      querySelectorAll() { return []; }, scrollIntoView() {}
    });
    return dom.get(key);
  };
  const ctx = {
    console: { warn: (...args) => warnings.push(args) }, performance: { now: () => 10000 },
    APP_CONFIG: JSON.parse(fs.readFileSync(path.join(root, 'app.config.json'), 'utf8')),
    MAX_SENSORS: 4, SENSOR_COLORS: ['#16624f', '#3e6d9c'], language, role: '',
    storageKeys: { language: 'wireless-sensor:language' },
    EXPERIMENT_PRESETS: { free: { title: 'presetFree' }, impact: { title: 'presetImpact' } },
    experimentPreset: 'free', measurementMode: 'motion', displayMode: 'single',
    receiverPeers: new Map(), selectedReceiverPeerId: '', pendingReceiverPeerId: '', lastRosterRenderAt: 0,
    recording: false, recordingStartedAt: 0, recordingStartedEpochMs: 0, recordingTimer: 0,
    recordSamples: [], recordEvents: [], recordMarkers: [], markerSeq: 0, recordSessionSensors: new Map(),
    loadedSessionMeta: null, lastPostAnalysis: null, selectedAnalysisEventGroupId: '',
    document: { documentElement: { lang: '' } }, $, $$: () => [],
    localStorage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) },
    toast: (message, options) => notices.push({ message, options }),
    setTimeout() {}, setInterval() { return 1; }, clearInterval() {},
    // Unrelated live panels and synchronization are deliberately not executed.
    renderSensorLegend() {}, renderSensorLayoutPanel() {}, updateSelectedPeerUi() {},
    renderExperimentPresetUi() {}, updateMeasurementModeUi() {}, updateDisplayModeUi() {},
    renderImpactPanel() {}, updateSensorResourceUi() {}, runSyncBurst() {}
  };
  vm.createContext(ctx);
  const translationStart = source.indexOf('      const translations={');
  const translationEnd = source.indexOf('      const $=', translationStart);
  assert.ok(translationStart >= 0 && translationEnd > translationStart, 'Real translations are available');
  vm.runInContext(source.slice(translationStart, translationEnd), ctx);
  const names = [
    't', 'formatText', 'readStorage', 'writeStorage', 'applyLanguage', 'setRole',
    'peerName', 'connectedReceiverPeers', 'selectedReceiverPeer', 'syncStatusText', 'renderSensorRoster',
    'normalizePosition', 'normalizeSensorColor', 'loadSessionFromFile', 'toggleRecording', 'rememberRecordingSensor',
    'updateRecordingDuration', 'updateRecordExportButtons', 'renderRecordMarkers', 'sessionPayload',
    'modelForRecordedSensor', 'synchronizedElapsedForRecord', 'recordedSamplesFor', 'recordedEventGroups',
    'recordedSensorAnalysis', 'buildPostAnalysis', 'renderPostAnalysis', 'renderAnalysisMarkers',
    'renderAnalysisEvents', 'renderAnalysisEventDetail', 'renderAnalysisFrequency', 'propagationTextForEvent',
    'positionComplete', 'distanceCm', 'formatDurationMs', 'formatDurationPrecise', 'syncRangeText',
    'vectorMagnitude', 'vibrationValue', 'rms', 'computeFftFromSamples', 'escapeHtml'
  ];
  vm.runInContext(names.map(extract).join('\n'), ctx);
  const binding = source.match(/\$\('#languageButton'\)\.addEventListener\('click',[^\n]*?\);(?=\n|$)/)?.[0];
  assert.ok(binding, 'Actual language click handler exists');
  vm.runInContext(binding, ctx);
  ctx.applyLanguage();
  return { ctx, $, notices, warnings };
}

async function load(h, filename) {
  h.$('#openSessionInput').value = filename;
  await h.ctx.loadSessionFromFile({ name: filename, text: async () => fs.readFileSync(path.join(__dirname, 'fixtures', filename), 'utf8') });
  assert.equal(h.$('#openSessionInput').value, '', 'File input resets after every attempt');
}
function peer(id) {
  return { id, number: 1, customName: id, status: 'connected', color: '#16624f',
    deviceLabel: 'Synthetic live peer', position: { x: null, y: null, z: null },
    zeroOffset: { active: false }, clockModel: { ready: false } };
}
function content(ctx) {
  const { createdAt, ...session } = plain(ctx.sessionPayload());
  return session;
}
function assertCounts(h, sensors, samples) {
  assert.equal(h.$('#recordSensors').textContent, String(sensors), 'Recording sensor count describes the imported session');
  assert.equal(h.$('#recordSamples').textContent, String(samples));
  assert.equal(h.$('#analysisSensors').textContent, String(sensors));
  assert.equal(h.$('#analysisSamples').textContent, String(samples));
}
function toggleLanguages(h, check) {
  for (let i = 0; i < 4; i++) {
    const expected = h.ctx.language === 'ja' ? 'en' : 'ja';
    h.$('#languageButton').events.click();
    assert.equal(h.ctx.document.documentElement.lang, expected);
    check();
  }
}

for (const language of ['en', 'ja']) test(`${language}: imported 2-sensor / 10-sample counts survive repeated actual language clicks`, async () => {
  const h = harness(language);
  await load(h, primary);
  assert.equal(h.warnings.length, 0);
  assertCounts(h, 2, 10);
  const before = content(h.ctx);
  toggleLanguages(h, () => { assertCounts(h, 2, 10); assert.deepEqual(content(h.ctx), before); });
});

test('replacement import changes 2/10 to 1/3 and keeps the replacement count in both languages', async () => {
  const h = harness();
  await load(h, primary);
  await load(h, replacement);
  assert.equal(h.warnings.length, 0);
  assertCounts(h, 1, 3);
  const before = content(h.ctx);
  assert.equal(before.events.length, 0);
  assert.equal(before.markers[0].note, 'Replacement only');
  toggleLanguages(h, () => { assertCounts(h, 1, 3); assert.deepEqual(content(h.ctx), before); });
});

test('malformed import preserves loaded metadata and 2/10 counts across later language clicks', async () => {
  const h = harness();
  await load(h, primary);
  const before = content(h.ctx), metadata = plain(h.ctx.loadedSessionMeta);
  await load(h, malformed);
  assert.equal(h.warnings.length, 1);
  assert.equal(h.notices.at(-1).message, h.ctx.t('sessionInvalid'));
  assert.deepEqual(plain(h.ctx.loadedSessionMeta), metadata);
  assert.deepEqual(content(h.ctx), before);
  assertCounts(h, 2, 10);
  toggleLanguages(h, () => { assertCounts(h, 2, 10); assert.deepEqual(content(h.ctx), before); });
});

test('an imported session count is independent of remaining live peers', async () => {
  const h = harness();
  h.ctx.receiverPeers.set('live', peer('live'));
  await load(h, primary);
  toggleLanguages(h, () => {
    assertCounts(h, 2, 10);
    assert.equal(h.$('#connectedSensorCount').textContent, '1 / 4');
  });
});

test('without an imported session, idle and stopped recording counts retain live-peer behavior', () => {
  const h = harness();
  assert.equal(h.$('#recordSensors').textContent, '0');
  h.ctx.receiverPeers.set('live', peer('live'));
  h.ctx.recordSessionSensors.set('old-a', { id: 'old-a' });
  h.ctx.recordSessionSensors.set('old-b', { id: 'old-b' });
  toggleLanguages(h, () => assert.equal(h.$('#recordSensors').textContent, '1'));
  h.ctx.receiverPeers.get('live').status = 'disconnected';
  h.ctx.renderSensorRoster();
  assert.equal(h.$('#recordSensors').textContent, '0');
});

test('active recording counts all remembered sensors even after one peer disconnects', () => {
  const h = harness();
  h.ctx.receiverPeers.set('live-a', peer('live-a'));
  h.ctx.receiverPeers.set('live-b', peer('live-b'));
  h.ctx.toggleRecording();
  h.ctx.receiverPeers.get('live-b').status = 'disconnected';
  toggleLanguages(h, () => {
    assert.equal(h.$('#recordSensors').textContent, '2');
    assert.equal(h.$('#connectedSensorCount').textContent, '1 / 4');
  });
  h.ctx.toggleRecording();
  assert.equal(h.$('#recordSensors').textContent, '1', 'Stopping retains the original live-peer count behavior');
});

for (const liveCount of [0, 1]) test(`starting recording clears the imported session and shows ${liveCount} current sensors`, async () => {
  const h = harness();
  await load(h, primary);
  if (liveCount) h.ctx.receiverPeers.set('live', peer('live'));
  h.ctx.toggleRecording();
  assert.equal(h.ctx.loadedSessionMeta, null);
  assert.equal(h.ctx.recording, true);
  assert.equal(h.ctx.recordSamples.length, 0);
  assert.equal(h.ctx.recordEvents.length, 0);
  assert.equal(h.ctx.recordMarkers.length, 0);
  assert.deepEqual([...h.ctx.recordSessionSensors.keys()], liveCount ? ['live'] : []);
  assert.equal(h.$('#loadedSessionBadge').hidden, true);
  assert.equal(h.$('#postAnalysisPanel').hidden, true);
  toggleLanguages(h, () => assert.equal(h.$('#recordSensors').textContent, String(liveCount)));
  h.ctx.toggleRecording();
  assert.equal(h.$('#recordSensors').textContent, String(liveCount));
});

test('canonical source and generated checks include this count regression and restore the artifact selector', () => {
  const runner = fs.readFileSync(path.join(root, 'scripts/check-repository.ps1'), 'utf8');
  assert.match(runner, /tests\/\*\.test\.cjs/);
  assert.match(runner, /foreach \(\$artifact in \$artifacts\)[\s\S]*tests\/imported-sensor-count\.test\.cjs[\s\S]*if \(\$LASTEXITCODE -ne 0\) \{ throw/);
  assert.match(runner, /finally\s*\{[\s\S]*\$env:WIRELESS_SENSOR_HTML\s*=\s*\$previousHtml/);
});

test('bilingual Help explains imported counts and replacement by a new recording', () => {
  const h = harness();
  assert.match(source, /APP:HELP:BEGIN[\s\S]*data-i18n="helpLoadedSession"[\s\S]*APP:HELP:END/);
  assert.match(h.ctx.t('helpLoadedSession'), /sensor count.*language.*new recording/i);
  h.ctx.language = 'ja';
  assert.match(h.ctx.t('helpLoadedSession'), /センサー数.*言語.*新しい記録/);
});
