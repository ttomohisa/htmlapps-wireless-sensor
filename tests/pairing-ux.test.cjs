const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');
const icon=fs.readFileSync(path.join(root,'assets/favicon.svg'),'utf8').trim();

test('browser tab favicon is byte-for-byte the repository SVG',()=>{
  const href=source.match(/<link rel="icon" type="image\/svg\+xml" href="(data:image\/svg\+xml,[^"]+)">/)?.[1];
  assert.ok(href,'embedded SVG favicon exists');
  assert.equal(decodeURIComponent(href.slice('data:image/svg+xml,'.length)),icon);
});
test('header uses the canonical favicon geometry and a Presentation Remote-style version pill and shield',()=>{
  const canonical=icon.replace(/^<svg[^>]+>\s*/,'').replace(/\s*<\/svg>\s*$/,'')
    .replace(/^\s*<rect width="64" height="64" rx="16" fill="#16624F"\/>\s*/,'').trim();
  assert.ok(source.includes('<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">'+canonical+'</svg>'));
  assert.match(source,/\.version-badge\s*\{[^}]*border-radius:999px/);
  assert.match(source,/data-i18n="localBadge">計測データのサーバー送信なし/);
  assert.match(source,/m9 12 2 2 4-5/);
});
test('both scan overlays use the same centered square guide',()=>{
  assert.equal((source.match(/class="scan-guide" aria-hidden="true"/g)||[]).length,2);
  assert.match(source,/\.scan-guide\s*\{[^}]*aspect-ratio:1 \/ 1/);
  assert.match(source,/\.scan-guide\s*\{[^}]*transform:translate\(-50%,-50%\)/);
  assert.ok(!source.includes('inset:12% 16%'));
});
test('pairing keeps direct transport, multi-device recording and failure advice',()=>{
  assert.ok(source.includes('new RTCPeerConnection({iceServers:[]})'));
  assert.ok(source.includes('createDataChannel(\'sensor\',{ordered:false,maxRetransmits:0})'));
  assert.ok(source.includes('createDataChannel(\'control\',{ordered:true})'));
  assert.ok(source.includes('scheduleSensorAnswerRegeneration()'));
  assert.ok(source.includes('MAX_SENSORS'));
  for(const key of ['networkLead','checkNearby','checkNetwork','connectionTechnicalDetails','helpNearbyPermission']){
    assert.ok(source.includes('data-i18n="'+key+'"'),'missing UI '+key);
    assert.ok(source.includes(key+':\''),'missing bilingual translation '+key);
  }
  assert.ok(source.includes("tips.hidden=!(stage==='failed'||stage==='slow')"));
  assert.ok(!source.includes('>インターネット通信なし<'));
});
