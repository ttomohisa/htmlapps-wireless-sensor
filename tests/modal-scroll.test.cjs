// Source/artifact contracts only: these do not emulate CSS layout or prove native
// wheel/touch scrolling, focus restoration, Escape, or hardware behavior.
// Removing the modal root rule, broadening it to [open], changing the existing
// dialog geometry, or replacing the shield/Help guidance must fail this suite.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { gzipSync, gunzipSync } = require('node:zlib');
const root = path.join(__dirname, '..');
function decodeHtml(input) {
  const payload = input.match(/<script id="self-extract-payload"[^>]*>([\s\S]*?)<\/script>/);
  return payload ? gunzipSync(Buffer.from(payload[1], 'base64')).toString('utf8') : input;
}
const html = decodeHtml(fs.readFileSync(process.env.WIRELESS_SENSOR_HTML || path.join(root, 'src/index.template.html'), 'utf8'));
const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
assert.ok(css, 'Application stylesheet exists');
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({
  selectors: match[1].trim().split(',').map(value => value.trim()),
  body: match[2].trim()
}));
const compact = value => value.replace(/\s+/g, '');

test('both page roots lock overflow only while a native modal exists', () => {
  for (const tag of ['html', 'body']) {
    const rule = rules.find(rule => rule.selectors.includes(`${tag}:has(dialog:modal)`));
    assert.ok(rule, `${tag} needs a native-modal-only overflow rule`);
    assert.match(rule.body, /(?:^|;)\s*overflow\s*:\s*hidden\s*(?:;|$)/);
    assert.equal(compact(rule.body).replace(/;$/, ''), 'overflow:hidden', 'The fix changes root overflow only');
  }
});
test('ordinary pages and non-modal open dialogs do not receive a root lock', () => {
  for (const rule of rules) {
    for (const selector of rule.selectors) {
      if (/^(?:html|body)(?=[:\s.#[]|$)/.test(selector) && /(?:^|;)\s*(?:overflow(?:-[xy])?\s*:\s*(?:hidden|clip)|position\s*:\s*fixed)\b/.test(rule.body)) {
        assert.match(selector, /^(?:html|body):has\(dialog:modal\)$/, 'Root locking must depend on native modality, not just the open attribute');
      }
    }
  }
});
test('existing bounded dialog geometry is retained with Help-only flex allocation', () => {
  assert.deepEqual([...css.matchAll(/(?<![\w.-])dialog\s*\{([^}]+)\}/g)].map(match => compact(match[1])), ["width:min(680px,calc(100%-28px));max-height:min(760px,calc(100dvh-28px));padding:0;overflow:hidden;border:1pxsolidvar(--line);border-radius:16px;background:var(--surface);color:var(--text);box-shadow:var(--shadow-md);"]);
  assert.deepEqual([...css.matchAll(/\.dialog\-body\s*\{([^}]+)\}/g)].map(match => compact(match[1])), ["padding:20px20px28px;overflow:auto;max-height:calc(100dvh-102px);", "min-height:0;flex:11auto;"]);
});
test('privacy badge matches the checked shield and accurate server-upload wording', () => {
  const badge = html.match(/<div class="local-badge">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(badge, 'Existing privacy badge remains');
  assert.match(badge, /<svg[^>]*aria-hidden="true"/);
  assert.match(badge, /d="M12 3 5 6v5c0 4\.6 2\.8 8 7 10 4\.2-2 7-5\.4 7-10V6z"/);
  assert.match(badge, /d="m9 12 2 2 4-5"/);
  assert.doesNotMatch(badge, /<rect\b/, 'The old padlock body is absent');
  assert.match(badge, /data-i18n="localBadge">計測データのサーバー送信なし<\/span>/);
});
test('Help omits implementation commentary and retains user instructions', () => {
  const help = html.match(/APP:HELP:BEGIN([\s\S]*?)APP:HELP:END/)?.[1];
  assert.match(help || '', /data-i18n="helpDialogScroll"/);
  const translationsText = html.match(/const translations=(\{[\s\S]*?\n      \});/)?.[1];
  assert.ok(translationsText, 'Real translation object remains available');
  const translations = vm.runInNewContext(`(${translationsText})`);
  assert.doesNotMatch(translations.ja.helpDialogScroll, /背景.*スクロール/);
  assert.match(translations.ja.helpDialogScroll, /閉じる.*Esc.*外側/);
  assert.doesNotMatch(translations.en.helpDialogScroll, /background.*scroll/i);
  assert.match(translations.en.helpDialogScroll, /Close.*Esc.*outside/);
});

test('canonical runner includes source and artifact regression checks with failure propagation and environment restoration', () => {
  const runner = fs.readFileSync(path.join(root, 'scripts/check-repository.ps1'), 'utf8');
  assert.match(runner, /tests\/\*\.test\.cjs/);
  assert.match(runner, /try\s*\{[\s\S]*\$env:WIRELESS_SENSOR_HTML\s*=\s*\$null[\s\S]*& node --test @testFiles[\s\S]*if \(\$LASTEXITCODE -ne 0\) \{ throw/);
  assert.match(runner, /tests\/modal-scroll\.test\.cjs/);
  assert.match(runner, /foreach \(\$artifact in \$artifacts\)[\s\S]*& node --test[\s\S]*if \(\$LASTEXITCODE -ne 0\) \{ throw/);
  assert.match(runner, /finally\s*\{[\s\S]*\$env:WIRELESS_SENSOR_HTML\s*=\s*\$previousHtml/);
});

test('artifact reader recognizes the canonical self-extract payload element', () => {
  // An in-memory decoder fixture only, not an app build or browser execution.
  const sample = '<!doctype html><title>Synthetic decoder fixture</title>';
  const payload = gzipSync(Buffer.from(sample)).toString('base64');
  const wrapper = `<script id="self-extract-payload" type="application/octet-stream">${payload}</script>`;
  assert.equal(decodeHtml(wrapper), sample);
  assert.equal(decodeHtml(sample), sample);
  const builder = fs.readFileSync(path.join(root, 'scripts/build-self-extract.ps1'), 'utf8');
  assert.match(builder, /<script id="self-extract-payload" type="application\/octet-stream">/);
});
