'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

async function main(){
  const browser=await chromium.launch({args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  try{
    const context=await browser.newContext({locale:'ja',viewport:{width:1050,height:830}});
    const pc=await context.newPage(),phone=await context.newPage();
    const uri=pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href;
    const faults=[];
    for(const page of [pc,phone])page.on('pageerror',e=>faults.push(e.message));
    await Promise.all([pc.goto(uri),phone.goto(uri)]);
    await pc.locator('#chooseReceiver').click();
    await pc.waitForFunction(()=>document.querySelector('#offerCode')?.value.startsWith('ws1.'),{timeout:30000});
    const offer=await pc.locator('#offerCode').inputValue();
    await phone.locator('#chooseSensor').click();
    await phone.locator('#sensorOfferInput').fill(offer);
    await phone.locator('#useOfferButton').click();
    await phone.locator('#answerPrepareArea').waitFor({state:'visible',timeout:15000});
    // The manual-code fallback needs no camera: the receiver can paste the answer.
    // The interactive camera path remains covered by the general UI smoke and static tests.
    await phone.locator('#createAnswerButton').click();
    await phone.waitForFunction(()=>document.querySelector('#answerCode')?.value.startsWith('ws1.'),{timeout:30000});
    const answer=await phone.locator('#answerCode').inputValue();
    await pc.locator('#answerInput').fill(answer);
    await pc.locator('#applyAnswerButton').click();
    await Promise.all([
      pc.locator('#receiverLivePanel').waitFor({state:'visible',timeout:30000}),
      phone.locator('#sensorLivePanel').waitFor({state:'visible',timeout:30000})
    ]);
    assert.equal(await pc.locator('#sensorRoster .sensor-roster-card').count(),1);
    assert.deepEqual(faults,[],'no page errors during pairing');
    console.log('PASS real WebRTC manual-QR-code fallback: PC ↔ phone DataChannels connected with no STUN/TURN servers.');
    await context.close();
  }finally{await browser.close();}
}
main().catch(err=>{console.error(err);process.exitCode=1;});
