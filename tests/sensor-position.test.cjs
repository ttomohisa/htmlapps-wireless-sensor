// Exercises actual application functions with synthetic state. No browser,
// WebRTC, device permissions, hardware or runtime network operations are used.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/index.template.html'),'utf8');
const lines=source.split('\n');
const plain=value=>JSON.parse(JSON.stringify(value));
const unknown={x:null,y:null,z:null};
function extract(name,optional=false){
  const start=lines.findIndex(line=>new RegExp(`^      (?:async )?function ${name}\\(`).test(line));
  if(start<0&&optional)return '';
  assert.ok(start>=0,`Production function ${name} exists`);
  const end=lines[start].trimEnd().endsWith('}')?start:lines.findIndex((line,i)=>i>start&&line==='      }');
  assert.ok(end>=start,`Production function ${name} has an end`);
  return lines.slice(start,end+1).join('\n');
}
function harness(){
  const dom=new Map(),writes=[],notices=[];
  const ctx={console,Blob,Date,Math,Number,Map,Set,performance,MAX_SENSORS:4,SENSOR_COLORS:['#16624f','#3e6d9c'],
    APP_CONFIG:{slug:'wireless-sensor',version:'1.0.0'},language:'en',EXPERIMENT_PRESETS:{free:{title:'Free'}},experimentPreset:'free',measurementMode:'motion',
    recording:false,recordingStartedEpochMs:1700000000000,recordingStartedAt:0,recordSamples:[],recordEvents:[],recordMarkers:[],markerSeq:0,recordingTimer:0,
    recordSessionSensors:new Map(),receiverPeers:new Map(),sensorLayoutSlots:{},loadedSessionMeta:null,lastPostAnalysis:null,selectedAnalysisEventGroupId:'',sensorLayoutRenderSignature:'',
    pendingReceiverPeerId:'',selectedReceiverPeerId:'',document:{activeElement:null},
    $:key=>{if(!dom.has(key))dom.set(key,{hidden:true,value:key==='#outputFilename'?'edited-position-test':'',textContent:'',scrollIntoView(){},querySelectorAll(){return []},classList:{add(){},remove(){}}});return dom.get(key)},
    t:key=>key,formatText:(key,data)=>`${key}: ${Object.entries(data).map(([k,v])=>`${k}=${v}`).join(', ')}`,
    peerName:peer=>peer.customName||`Sensor ${peer.number}`,writeStorage:(key,value)=>writes.push({key,value}),readStorage:key=>writes.findLast(write=>write.key===key)?.value??null,
    toast:(message,options)=>notices.push({message,options}),renderSensorRoster(){},renderSensorLayoutPanel(){},updateSelectedPeerUi(){},renderPostAnalysis(){},updateRecordingDuration(){},updateRecordExportButtons(){},renderExperimentPresetUi(){},updateMeasurementModeUi(){},setRole(){},setTimeout(){},clearTimeout(){},setInterval(){return 1},clearInterval(){},
    stopPeerPing(){},runSyncBurst(){},updateConnectionDiagnostics(){},stopOfferQrCycle(){},stopScanner(){},selectedReceiverPeer:()=>null,startPeerPing(){},startChartLoop(){},announce(){},
    reportSparklineSvg:()=>'',downloadBlob:(blob,filename)=>{ctx.download={blob,filename}}
  };
  vm.createContext(ctx);
  const names=['normalizePosition','normalizeSensorColor','positionComplete','distanceCm','loadSensorLayoutSlots','sensorSlotMetadata','saveSensorLayoutSlots','updateSensorLayoutFromInput','rememberRecordingSensor','loadSessionFromFile','sessionPayload','propagationTextForEvent','buildHtmlReport','saveCsv','normalizedFilenameBase','valueOrEmpty','csvEscape','csvSafeText','modelForRecordedSensor','synchronizedElapsedForRecord','markerAssignmentsForSamples','vectorMagnitude','vibrationValue','rotationMagnitude','escapeHtml','formatDurationMs','formatDurationPrecise','syncRangeText','connectedReceiverPeers','toggleRecording','handleConnectionState','closePeer'];
  vm.runInContext(names.map(name=>extract(name)).join('\n')+'\n'+['clearSensorPosition','persistSensorLayout','focusSensorPosition','canClearSensorPosition'].map(name=>extract(name,true)).join('\n'),ctx);
  return {ctx,dom,writes,notices};
}
function peer(id='a',number=1,position={x:-12.5,y:0,z:3}){
  return {id,number,customName:`Name ${id}`,position:{...position},deviceLabel:'Synthetic device',status:'connected',connectionHealth:'stable',everConnected:true,color:'#16624f',zeroOffset:{active:false},clockModel:{ready:false},pc:{close(){}},latestSample:{seq:10},chartHistory:[{seq:9}]};
}
function edit(ctx,p,field,value){ctx.updateSensorLayoutFromInput({dataset:{layoutField:field},value,closest:()=>({dataset:{layoutPeer:p.id}})});}
function sessionContent(ctx){const {createdAt,...content}=plain(ctx.sessionPayload());return content;}
function clear(ctx,p){assert.equal(typeof ctx.clearSensorPosition,'function','Clear position action exists');ctx.clearSensorPosition(p.id);}
function fixture(version=8){return {format:`browser-kitty-wireless-sensor-v${version}`,experimentPreset:'free',measurementMode:'motion',clockSynchronization:{recordingStartedEpochMs:1700000000000,recordingStartedPerformanceMs:0},sensors:[
  {id:'a',name:'Unknown placement',position:{...unknown},clockModel:{ready:false},color:'#16624f'},
  {id:'b',name:'Known placement',position:{x:100,y:0,z:0},clockModel:{ready:false},color:'#3e6d9c'}],samples:[
  {sensorId:'a',t:1000,synchronizedElapsedMs:1000,receiveElapsedMs:1000,a:{x:2,y:0,z:0},seq:1},
  {sensorId:'b',t:1020,synchronizedElapsedMs:1020,receiveElapsedMs:1020,a:{x:3,y:0,z:0},seq:1}],events:[
  {id:'impact-1',groupId:'group-1',sensorId:'a',peak:2,synchronizedElapsedMs:1000},
  {id:'impact-2',groupId:'group-1',sensorId:'b',peak:3,synchronizedElapsedMs:1020}],markers:[{id:'marker-1',elapsedMs:1000,note:'Synthetic marker'}]};}
async function load(ctx,data){await ctx.loadSessionFromFile({name:'synthetic.json',text:async()=>JSON.stringify(data)});}

test('normalization preserves unknowns and rejects coercible non-coordinate types',()=>{
  const {ctx}=harness();
  for(const value of [null,undefined,'','  ','\t\n',true,false,[],[0],[1],{},NaN,Infinity,-Infinity,'bad','Infinity']){
    assert.deepEqual(plain(ctx.normalizePosition({x:value,y:value,z:value})),unknown,`value ${String(value)}`);
  }
  for(const value of [null,undefined,{}])assert.deepEqual(plain(ctx.normalizePosition(value)),unknown);
});
test('explicit origin, signed fractions and numeric strings survive normalization repeatedly',()=>{
  const {ctx}=harness();
  for(const [input,expected] of [[{x:0,y:0,z:0},{x:0,y:0,z:0}],[{x:-12.5,y:20,z:.3},{x:-12.5,y:20,z:.3}],[{x:' -12.5 ',y:'0',z:'3e1'},{x:-12.5,y:0,z:30}]]){
    assert.deepEqual(plain(ctx.normalizePosition(ctx.normalizePosition(input))),expected);
  }
});
test('rename, axis editing, persisted slot restore and recording retain unknown axes',()=>{
  const {ctx,writes}=harness(),p=peer('a',1,unknown);ctx.receiverPeers.set(p.id,p);
  edit(ctx,p,'name','Renamed');assert.deepEqual(plain(ctx.sensorSlotMetadata(1).position),unknown);
  edit(ctx,p,'x','-2.5');assert.deepEqual(plain(p.position),{x:-2.5,y:null,z:null});
  edit(ctx,p,'x',' ');assert.deepEqual(plain(p.position),unknown);
  ctx.sensorLayoutSlots=ctx.loadSensorLayoutSlots();assert.deepEqual(plain(ctx.sensorSlotMetadata(1).position),unknown);
  assert.equal(ctx.sensorSlotMetadata(1).name,'Renamed');assert.ok(writes.length>0);
  ctx.recording=true;ctx.rememberRecordingSensor(p);assert.deepEqual(plain(ctx.recordSessionSensors.get(p.id).position),unknown);
});
for(const version of [4,5,6,7,8])test(`v${version} import, CSV, JSON and report do not invent position/distance/speed`,async()=>{
  const {ctx,notices}=harness(),data=fixture(version);await load(ctx,data);
  assert.equal(notices.at(-1).message,'sessionLoaded');assert.deepEqual(plain(ctx.recordSamples),data.samples);
  assert.deepEqual(plain(ctx.recordMarkers),data.markers);assert.deepEqual(plain(ctx.recordSessionSensors.get('a').position),unknown);
  assert.equal(ctx.propagationTextForEvent(ctx.recordEvents[1],ctx.recordEvents[0]),'');
  ctx.lastPostAnalysis={sensors:[...ctx.recordSessionSensors.values()].map(meta=>({meta,samples:[],vibrationPeak:2,vibrationRms:2,fft:null})),groups:[{events:ctx.recordEvents}],markers:ctx.recordMarkers,durationMs:1020,samples:2,maxImpact:3,syncMin:null};
  const report=ctx.buildHtmlReport();assert.ok(!report.includes('50.00 m/s'));assert.ok(!report.includes('100.0 cm'));assert.ok(!report.includes('· 0, 0, 0 cm'));assert.ok(report.includes("default-src 'none'"));
  ctx.saveCsv();const csv=await ctx.download.blob.text();assert.deepEqual(csv.split('\r\n')[1].split(',').slice(3,6),['','','']);assert.equal(ctx.download.filename,'edited-position-test.csv');
  const saved=plain(ctx.sessionPayload());assert.equal(saved.format,'browser-kitty-wireless-sensor-v8');assert.deepEqual(saved.sensors[0].position,unknown);assert.deepEqual(saved.samples.map(({synchronizedEpochMs,...sample})=>sample),data.samples);
  await load(ctx,saved);assert.deepEqual(plain(ctx.recordSessionSensors.get('a').position),unknown);
});
test('known origin still produces correct distance and apparent speed',async()=>{
  const {ctx}=harness(),data=fixture();data.sensors[0].position={x:0,y:0,z:0};await load(ctx,data);
  assert.equal(ctx.distanceCm(data.sensors[0].position,data.sensors[1].position),100);
  const text=ctx.propagationTextForEvent(ctx.recordEvents[1],ctx.recordEvents[0]);assert.ok(text.includes('cm=100.0'));assert.ok(text.includes('speed=50.00'));
});
test('Clear and Undo affect only the selected live position and persist without touching session/samples',()=>{
  const {ctx,notices}=harness(),a=peer(),b=peer('b',2);ctx.receiverPeers.set(a.id,a);ctx.receiverPeers.set(b.id,b);
  ctx.recording=true;ctx.rememberRecordingSensor(a);ctx.recording=false;ctx.recordSamples=[{sensorId:'a',seq:1}];
  const original=plain(a),other=plain(b),session=sessionContent(ctx);
  clear(ctx,a);assert.deepEqual(plain(a.position),unknown);assert.deepEqual(plain(b),other);assert.equal(a.customName,original.customName);assert.deepEqual(plain(a.latestSample),original.latestSample);assert.deepEqual(plain(a.chartHistory),original.chartHistory);
  assert.deepEqual(plain(ctx.sensorSlotMetadata(1).position),unknown);assert.deepEqual(sessionContent(ctx),session);
  const undo=notices.at(-1).options.onAction;assert.equal(typeof undo,'function');undo();assert.deepEqual(plain(a.position),original.position);assert.deepEqual(plain(ctx.sensorSlotMetadata(1).position),original.position);assert.deepEqual(sessionContent(ctx),session);
  undo();assert.deepEqual(plain(a.position),original.position);
});
test('empty, repeated, recording and reconnecting clear attempts are no-ops',()=>{
  const {ctx,notices,writes}=harness(),a=peer();ctx.receiverPeers.set(a.id,a);
  ctx.recording=true;clear(ctx,a);assert.equal(writes.length,0);
  ctx.recording=false;a.connectionHealth='reconnecting';clear(ctx,a);assert.equal(writes.length,0);
  a.connectionHealth='stable';clear(ctx,a);const count=notices.length;clear(ctx,a);assert.equal(notices.length,count);assert.equal(writes.length,1);
  clear(ctx,peer('missing',3));assert.equal(writes.length,1);
});
for(const field of ['name','x'])test(`Undo cannot overwrite a newer ${field} edit, even when position is blank again`,()=>{
  const {ctx,notices}=harness(),a=peer();ctx.receiverPeers.set(a.id,a);clear(ctx,a);const undo=notices.at(-1).options.onAction;
  edit(ctx,a,field,field==='name'?'New name':'5');if(field==='x')edit(ctx,a,'x','');const expected=plain(a.position);undo();assert.deepEqual(plain(a.position),expected);if(field==='name')assert.equal(a.customName,'New name');
});
test('Undo cannot restore an old clear over a later clear',()=>{
  const {ctx,notices}=harness(),a=peer();ctx.receiverPeers.set(a.id,a);clear(ctx,a);const oldUndo=notices.at(-1).options.onAction;
  edit(ctx,a,'x','7');clear(ctx,a);const newUndo=notices.at(-1).options.onAction;oldUndo();assert.deepEqual(plain(a.position),unknown);newUndo();assert.deepEqual(plain(a.position),{x:7,y:null,z:null});
});
test('recording start invalidates Undo even after recording stops',()=>{
  const {ctx,notices}=harness(),a=peer();ctx.receiverPeers.set(a.id,a);clear(ctx,a);const undo=notices.at(-1).options.onAction;
  ctx.toggleRecording();undo();assert.deepEqual(plain(a.position),unknown);ctx.toggleRecording();undo();assert.deepEqual(plain(a.position),unknown);assert.deepEqual(plain(ctx.recordSessionSensors.get(a.id).position),unknown);
});
test('transient disconnect and reconnection invalidate Undo for the retained peer',async()=>{
  const {ctx,notices}=harness(),a=peer();ctx.receiverPeers.set(a.id,a);clear(ctx,a);const undo=notices.at(-1).options.onAction;
  await ctx.handleConnectionState('receiver','disconnected',a);undo();assert.deepEqual(plain(a.position),unknown);
  await ctx.handleConnectionState('receiver','connected',a);undo();assert.deepEqual(plain(a.position),unknown);
});
test('close, removal and reused IDs/slots cannot restore a stale position',()=>{
  const {ctx,notices}=harness(),a=peer();ctx.receiverPeers.set(a.id,a);clear(ctx,a);const undo=notices.at(-1).options.onAction;
  ctx.closePeer(a);undo();assert.deepEqual(plain(a.position),unknown);ctx.receiverPeers.delete(a.id);undo();
  const replacement=peer(a.id,1,unknown);ctx.receiverPeers.set(replacement.id,replacement);undo();assert.deepEqual(plain(replacement.position),unknown);
});

// Minimal DOM adapter for production render/event behavior, not visual browser QA.
function layoutDom(ctx){
  let rows=[],html='',rebuilds=0;
  const root={get innerHTML(){return html},set innerHTML(value){html=value;rebuilds++;rows=[];
    for(const match of value.matchAll(/<div class="sensor-layout-row" data-layout-peer="([^"]+)">([\s\S]*?)<\/div>/g)){
      const row={dataset:{layoutPeer:match[1]},controls:[]};
      row.querySelectorAll=selector=>row.controls.filter(control=>selector==='[data-layout-field]'?'layoutField' in control.dataset:selector==='[data-clear-position]'?control.isClear:false);
      row.querySelector=selector=>row.controls.find(control=>selector==='[data-clear-position]'?control.isClear:control.dataset.layoutField===selector.match(/data-layout-field="([^"]+)"/)?.[1])||null;
      for(const input of match[2].matchAll(/<input\b[^>]*data-layout-field="([^"]+)"[^>]*>/g))row.controls.push(control({layoutField:input[1]},row));
      if(/<button\b[^>]*data-clear-position\b/.test(match[2])){const button=control({},row);button.isClear=true;button.type='button';row.controls.push(button);}
      rows.push(row);
    }
  },querySelectorAll(selector){return selector==='[data-layout-peer]'?rows:rows.flatMap(row=>row.querySelectorAll(selector))}};
  function control(dataset,row){return {dataset,value:'',disabled:false,events:{},addEventListener(name,handler){this.events[name]=handler},closest(){return row},focus(){ctx.document.activeElement=this},setAttribute(name,value){this[name]=value}};}
  const oldDollar=ctx.$;ctx.$=selector=>selector==='#sensorLayoutGrid'?root:oldDollar(selector);
  vm.runInContext(extract('renderSensorLayoutPanel'),ctx);
  ctx.renderSensorRoster=()=>ctx.renderSensorLayoutPanel();
  return {root,get rows(){return rows},get rebuilds(){return rebuilds}};
}
test('rendered row offers native clear, retains input nodes, disables during recording and wires Undo',()=>{
  const {ctx,notices}=harness(),a=peer(),b=peer('b',2,unknown);ctx.receiverPeers.set(a.id,a);ctx.receiverPeers.set(b.id,b);const layout=layoutDom(ctx);
  ctx.renderSensorLayoutPanel();const row=layout.rows[0],x=row.querySelector('[data-layout-field="x"]'),button=row.querySelector('[data-clear-position]');
  assert.ok(button,'Native per-sensor clear button is rendered');assert.equal(button.type,'button');assert.equal(button.disabled,false);assert.equal(layout.rows[1].querySelector('[data-clear-position]').disabled,true);
  const name=layout.rows[1].querySelector('[data-layout-field="name"]');name.focus();name.value='Typing';a.position.x=4;ctx.renderSensorLayoutPanel();assert.equal(ctx.document.activeElement,name);assert.equal(name.value,'Typing');assert.equal(layout.rebuilds,1,'An unrelated update must not replace focused inputs');
  button.focus();button.events.click();assert.deepEqual(plain(a.position),unknown);assert.equal(x.value,'');assert.equal(button.disabled,true);assert.equal(ctx.document.activeElement,x,'Clear intentionally focuses X for entering a new placement');
  notices.at(-1).options.onAction();assert.equal(x.value,'4');assert.equal(button.disabled,false);assert.equal(layout.rebuilds,1);
  ctx.toggleRecording();assert.equal(button.disabled,true);ctx.toggleRecording();assert.equal(button.disabled,false);
});
test('bilingual clear and Undo labels/help exist and actions do not shrink XYZ grid columns',()=>{
  const translated=source.match(/      const translations=([\s\S]*?)\n      const \$/)?.[1];
  assert.ok(translated,'Translation object is discoverable');
  const ctx={};vm.createContext(ctx);vm.runInContext('translations='+translated,ctx);
  assert.equal(ctx.translations.en.sensorPositionClear,'Clear position');assert.equal(ctx.translations.ja.sensorPositionClear,'位置をクリア');
  for(const language of ['en','ja'])for(const key of ['sensorPositionCleared','sensorPositionRestored','sensorPositionUndo','helpSensorPosition'])assert.ok(ctx.translations[language][key],`${language}:${key}`);
  assert.match(source,/\.sensor-layout-actions\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/);
  assert.match(source,/APP:HELP:BEGIN[\s\S]*data-i18n="helpSensorPosition"[\s\S]*APP:HELP:END/);
});
test('an uncommitted edit away and back invalidates Undo before blur',()=>{
  const {ctx,notices}=harness(),a=peer();ctx.receiverPeers.set(a.id,a);const layout=layoutDom(ctx);ctx.renderSensorLayoutPanel();clear(ctx,a);
  const undo=notices.at(-1).options.onAction,x=layout.rows[0].querySelector('[data-layout-field="x"]');
  // Returning to the last committed blank value need not dispatch change.
  x.value='5';x.events.input?.();x.value='';x.events.input?.();undo();
  assert.deepEqual(plain(a.position),unknown,'Any newer input edit ends the old Undo');
});
