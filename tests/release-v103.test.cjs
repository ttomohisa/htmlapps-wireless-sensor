'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const read=relative=>fs.readFileSync(path.join(__dirname,'..',relative),'utf8');
const app=JSON.parse(read('app.config.json'));
const spec=read('APP_SPEC.md');
const log=read('CHANGELOG.md');
const workflow=read('.github/workflows/release-v103.yml');
const validation=read('.github/workflows/build-standalone.yml');
const packageScript=read('scripts/package-release-v103.ps1');
const guardScript=read('scripts/verify-release-state-v103.ps1');
const notes=read('.github/releases/v1.0.3.md');

test('1.0.3 metadata and history are aligned',()=>{
  assert.equal(app.version,'1.0.3');
  assert.match(spec,/\*\*Version:\*\* 1\.0\.3/);
  assert.match(spec,/version is `1\.0\.3`/);
  assert.match(log,/^# Changelog\n\n## 1\.0\.3 - 2026-10-29/);
  assert.match(notes,/Wireless Sensor v1\.0\.3/);
  assert.match(notes,/Android 17/);
});
test('release runs only after main receives the version / workflow commit',()=>{
  assert.ok(workflow.includes('branches:\n      - main'));
  assert.ok(workflow.includes('app.config.json'));
  assert.ok(workflow.includes('.github/workflows/release-v103.yml'));
  assert.ok(workflow.includes('contents: write'));
  assert.ok(workflow.includes('github.ref == \'refs/heads/main\''));
  assert.ok(workflow.includes('gh release create v1.0.3'));
  assert.ok(workflow.includes('--target "$env:GITHUB_SHA"'));
  assert.ok(workflow.includes('./scripts/check-repository.ps1'));
  assert.ok(workflow.includes('./scripts/package-release-v103.ps1'));
  assert.ok(workflow.includes('./scripts/verify-release-state-v103.ps1'));
  assert.ok(workflow.includes('SHA256SUMS.txt'));
});
test('release preflight safely handles the expected missing tag/release',()=>{
  assert.ok(guardScript.includes('releases?per_page=100'));
  assert.ok(guardScript.includes('git/refs/tags?per_page=100'));
  assert.ok(!guardScript.includes('gh release view v1.0.3'));
  assert.ok(!guardScript.includes('git/ref/tags/v1.0.3'));
  assert.ok(guardScript.includes('if ($DryRun)'));
  assert.ok(guardScript.includes('publish=$Publish'));
  assert.ok(validation.includes('verify-release-state-v103.ps1 -DryRun'));
});
test('release package is built and validated before tags may be created',()=>{
  for(const basename of [
    'htmlapps-wireless-sensor-v1.0.3.html',
    'htmlapps-wireless-sensor-v1.0.3.self-extract.html',
    'htmlapps-wireless-sensor-v1.0.3.zip',
    'SHA256SUMS.txt'
  ]){
    assert.ok(workflow.includes(basename) || packageScript.includes(basename));
    assert.ok(validation.includes(basename));
  }
  assert.ok(packageScript.includes('Compress-Archive'));
  assert.ok(packageScript.includes('Expand-Archive'));
  assert.ok(packageScript.includes('Get-Sha256FileHex'));
  assert.ok(!packageScript.includes('Get-FileHash'));
  assert.ok(validation.includes('v103-release-candidate-'));
  assert.ok(workflow.indexOf('Build and validate both standalone variants')<workflow.indexOf('Publish tag v1.0.3'));
});
