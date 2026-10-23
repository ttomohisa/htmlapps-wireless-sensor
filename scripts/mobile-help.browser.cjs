'use strict';
// Run against the official generated files in the unprivileged PR build job.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const buildSelector = '#helpDialog details:has(#buildVersion)';


async function prepareApp(page,width,label){
 for(const id of ['chooseReceiver','chooseSensor'])assert.equal(await page.locator('#'+id).isVisible(),true,label+': role choice retained');
}
async function smoke(page,results,file){
 const fixture=path.resolve(__dirname,'../tests/fixtures/synthetic-wireless-session-v8.json');
 await page.locator('#openSessionInput').setInputFiles(fixture);await page.waitForFunction(()=>!document.querySelector('#saveJsonButton').disabled);
 await page.locator('#languageButton').click();await page.locator('#languageButton').click();
 await page.locator('#outputFilename').fill('mobile-help-sensors');const pending=page.waitForEvent('download');await page.locator('#saveJsonButton').click();const download=await pending;assert.equal(download.suggestedFilename(),'mobile-help-sensors.json');
 const target=path.join(results,file.includes('self-extract')?'synthetic-loader.json':'synthetic-readable.json');await download.saveAs(target);const saved=JSON.parse(fs.readFileSync(target,'utf8'));assert.equal(saved.format,'browser-kitty-wireless-sensor-v8');assert.equal(saved.sensors.length,2);assert.equal(saved.samples.length,10);
 console.log('PASS synthetic session import, repeated locale switch and edited-name JSON '+file);
}

async function main() {
  const results = path.resolve(__dirname, '..', 'test-results', 'mobile-help');
  fs.mkdirSync(results, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const file of ['dist/index.html', 'dist/index.self-extract.html', 'wireless-sensor.html']) {
      for (const language of ['ja', 'en']) {
        for (const [width, height] of [[1360, 900], [641, 568], [640, 568], [360, 640], [320, 568], [393, 252]]) {
          const context = await browser.newContext({ viewport: { width, height }, locale: language, reducedMotion: 'reduce' });
          const page = await context.newPage();
          const errors = [], requests = [];
          page.on('pageerror', error => errors.push(error.message));
          page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
          page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
          const label = `${file} ${language} ${width}x${height}`;
          try {
            await page.goto(pathToFileURL(path.resolve(__dirname, '..', file)).href);
            await page.locator('#helpButton').waitFor();
            if (await page.locator('html').getAttribute('lang') !== language) await page.locator('#languageButton').click();
            await page.locator('#languageButton').click();await page.locator('#languageButton').click();
            assert.equal(await page.locator('html').getAttribute('lang'),language,label+': repeated language toggles');
            for(const id of ['buildVersion','builtAt','dependencyCount']){assert.equal(await page.locator('#'+id).count(),1,label+': unique metadata after toggles');assert.ok(!['','—','-'].includes((await page.locator('#'+id).textContent()).trim()),label+': populated metadata after toggles');}
            assert.equal(await page.locator('[data-i18n="localBadge"]').textContent(), language === 'en' ? 'No signaling / STUN / TURN servers' : 'シグナリング / STUN / TURN 不使用', label);
            assert.ok(await page.locator('.local-badge').evaluate(el => {
              const box = el.getBoundingClientRect();
              const range = document.createRange();
              range.selectNodeContents(el.querySelector('[data-i18n="localBadge"]'));
              return box.left >= 0 && box.right <= innerWidth && el.scrollWidth <= el.clientWidth + 1
                && [...range.getClientRects()].every(rect => rect.left >= box.left - 1 && rect.right <= box.right + 1 && rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1);
            }), label + ': badge text fits');
            assert.equal(await page.locator('main #buildVersion').count(), 0, label);
            assert.equal(await page.locator('footer').isVisible(), width > 640, label);
            await prepareApp(page, width, label);

            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label + ': page width');

            await page.locator('#helpButton').click();
            const body = page.locator('#helpDialog .dialog-body');
            assert.ok(await body.evaluate(el => el.lastElementChild.contains(document.querySelector('#buildVersion'))), label + ': build is final body child');
            assert.equal(await page.locator(buildSelector).count(), 1, label);
            assert.equal(await page.locator(buildSelector).isVisible(), true, label);
            for (const id of ['buildVersion', 'builtAt', 'dependencyCount']) assert.equal(await page.locator('#' + id).count(), 1, label);

            if (await page.locator(buildSelector).getAttribute('open') === null) {
              const summary = page.locator(buildSelector).locator('summary');
              await summary.focus();
              await page.keyboard.press('Enter');
              assert.equal(await page.locator(buildSelector).getAttribute('open'), '', label);
              assert.notEqual(await page.locator('#buildVersion').innerText(), '—', label);
              assert.match(await page.locator('#builtAt').innerText(), /\d{4}/, label + ': populated build timestamp');
            }
            await body.evaluate(el => { el.scrollTop = el.scrollHeight; });
            const finalItem = page.locator('#dependencyCount');
            const finalBox = await finalItem.boundingBox(), bodyBox = await body.boundingBox();
            console.log('GEOMETRY ' + label + ' ' + JSON.stringify({ finalBox, bodyBox, viewportHeight: height }));
            assert.ok(finalBox && bodyBox && finalBox.y >= 0 && finalBox.y + finalBox.height <= height && finalBox.y >= bodyBox.y - 1 && finalBox.y + finalBox.height <= bodyBox.y + bodyBox.height + 1, label + ': final Help item reachable');
            assert.ok(await body.evaluate(el => el.scrollWidth <= el.clientWidth + 1), label + ': Help width');
            const headerBox = await page.locator('#helpDialog .dialog-header').boundingBox();
            assert.ok(headerBox && headerBox.x >= 0 && headerBox.x + headerBox.width <= width && headerBox.y >= 0 && headerBox.y + headerBox.height <= height, label + ': header visible');
            const closeBox=await page.locator('#closeHelpButton').boundingBox();
            assert.ok(closeBox && closeBox.x>=0 && closeBox.x+closeBox.width<=width && closeBox.y>=headerBox.y && closeBox.y+closeBox.height<=headerBox.y+headerBox.height+1,label+': Close fits header');
            if (file === 'dist/index.html' && [1360, 320].includes(width)) {
              await page.screenshot({ path: path.join(results, `help-${language}-${width}.png`) });
            }
            const dialogBox = await page.locator('#helpDialog').boundingBox();
            assert.ok(finalBox.y >= dialogBox.y - 1 && finalBox.y + finalBox.height <= dialogBox.y + dialogBox.height + 1, label + ': final item inside dialog');
            assert.ok(dialogBox.y > 1, label + ': top coordinate is genuine backdrop');
            const beforeScroll = await page.evaluate(() => scrollY);
            await page.mouse.move(2, 1);
            await page.mouse.wheel(0, 400);
            await page.waitForTimeout(100);
            assert.equal(await page.evaluate(() => scrollY), beforeScroll, label + ': background locked');
            await page.keyboard.press('Escape');
            assert.equal(await page.locator('#helpDialog').isVisible(), false, label + ': Escape');
            await page.locator('#helpButton').click();
            await page.locator('#closeHelpButton').click();
            assert.equal(await page.locator('#helpDialog').isVisible(), false, label + ': reopen and Close');
            await page.locator('#helpButton').click();
            await page.mouse.click(2, 1);
            assert.equal(await page.locator('#helpDialog').isVisible(), false, label + ': backdrop');
            if(file!=='wireless-sensor.html' && language==='ja' && width===360) await smoke(page,results,file);
            assert.deepEqual(errors, [], label + ': console errors');
            assert.deepEqual(requests, [], label + ': external runtime requests');
            console.log('PASS ' + label);
          } catch (error) {
            await page.screenshot({ path: path.join(results, `failure-${file.replace(/[^a-z0-9]/gi, '-')}-${language}-${width}x${height}.png`) }).catch(() => {});
            throw error;
          } finally {
            await context.close();
          }
        }
      }
    }
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
