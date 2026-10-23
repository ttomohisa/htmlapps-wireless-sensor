const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../src/index.template.html'),'utf8');
const originalBuild="<details style=\"margin-top:10px\">\n        <summary data-i18n=\"buildInfo\">Build information</summary>\n        <div class=\"details-body\"><div class=\"build-grid\"><div class=\"build-item\"><span data-i18n=\"appVersion\">App version</span><strong id=\"buildVersion\">—</strong></div><div class=\"build-item\"><span data-i18n=\"builtAt\">Built at</span><strong id=\"builtAt\">—</strong></div><div class=\"build-item\"><span data-i18n=\"dependencies\">Embedded dependencies</span><strong id=\"dependencyCount\">0</strong></div></div></div>\n      </details>";
test('existing metadata block is unique and the final Help scroll-body child',()=>{
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];assert.doesNotMatch(main,/id="buildVersion"/);
 const help=html.match(/<dialog id="helpDialog"[^>]*>([\s\S]*?)<\/dialog>/)[1];
 const start=help.search(/<div class="dialog-body"[^>]*>/);let depth=0,end=-1;
 for(const m of help.slice(start).matchAll(/<div\b[^>]*>|<\/div>/g)){depth+=m[0].startsWith('</')?-1:1;if(depth===0){end=start+m.index;break;}}
 assert.ok(end>start);const body=help.slice(start,end);assert.ok(body.includes(originalBuild));
 assert.match(body.slice(body.indexOf(originalBuild)+originalBuild.length),/^\s*(?:<!--[^]*?-->\s*)?$/);
 for(const id of ["buildVersion", "builtAt", "dependencyCount"])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);
});
test('only the informational page footer is hidden at the existing mobile breakpoint',()=>{
 const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];const start=css.search(/@media\s*\(max-width:\s*640px\)\s*\{/);assert.ok(start>=0);
 const open=css.indexOf('{',start);let depth=1,end=open+1;for(;end<css.length&&depth;end++){if(css[end]==='{')depth++;if(css[end]==='}')depth--;}
 assert.match(css.slice(open+1,end-1),/(?:^|})\s*footer\s*\{\s*display:\s*none\s*;?\s*\}/);
});
test('keyboard disclosure clicks stay in Help; genuine backdrop still closes',()=>{
 const handler=html.match(/helpDialog\.addEventListener\('click',\s*event\s*=>\s*\{(.*?)\}\);/)[1];const dialog={closed:0,getBoundingClientRect(){return{left:20,right:300,top:20,bottom:400}},close(){this.closed++}};
 const run=new Function('helpDialog','event',handler);
 run(dialog,{target:{},currentTarget:dialog,clientX:0,clientY:0});assert.equal(dialog.closed,0);
 run(dialog,{target:dialog,currentTarget:dialog,clientX:0,clientY:0});assert.equal(dialog.closed,1);
});
test('main connection disclosure and distinct P2P privacy remain intact',()=>{
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];assert.match(main,/data-i18n="privacyDetailsBody"/);
 assert.match(html,/localBadge:'No signaling \/ STUN \/ TURN servers'/);assert.match(html,/sensor data travels directly over the established DataChannel/);
});

test('Help allocates remaining height to its scroll body without shrinking the header',()=>{
 const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
 assert.match(css,/#helpDialog\[open\]\s*\{\s*display:\s*flex;\s*flex-direction:\s*column;?\s*\}/);
 assert.match(css,/#helpDialog \.dialog-header\s*\{\s*flex:\s*none;?\s*\}/);
 assert.match(css,/#helpDialog \.dialog-body\s*\{\s*min-height:\s*0;\s*flex:\s*1 1 auto;?\s*\}/);
});
