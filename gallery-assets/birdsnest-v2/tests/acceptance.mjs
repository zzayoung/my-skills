import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

await mkdir('evidence',{recursive:true});
const checks=[],errors=[],externalRequests=[];
let stage='launch',browser;
const report=()=>({checks,errors,externalRequests,stage,testEnvironment:'Headless Chromium / Linux / SwiftShader, 1000x750 desktop and 390x844 touch. Screenshots pause the render loop only during capture. Navigation waits on actual arrival; this is not a user-device FPS benchmark.',passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length});
const save=()=>writeFile('evidence/acceptance.json',JSON.stringify(report(),null,2));
const timeout=(promise,ms,label)=>{let id;return Promise.race([promise,new Promise((_,reject)=>{id=setTimeout(()=>reject(new Error(label+' timed out after '+ms+'ms')),ms);})]).finally(()=>clearTimeout(id));};
const watchdog=setTimeout(async()=>{errors.push('Global watchdog: '+stage);await save();process.exit(1);},480000);
const check=async(name,fn)=>{stage=name;await save();try{const detail=await timeout(fn(),45000,name);checks.push({name,pass:true,detail});console.log('PASS',name,detail??'');}catch(e){checks.push({name,pass:false,error:e.message});console.error('FAIL',name,e.message);}await save();};
function watch(page,prefix=''){page.on('pageerror',e=>{errors.push(prefix+e.message);console.error('PAGEERROR',prefix,e.message);});page.on('console',m=>{if(m.type()==='error'){errors.push(prefix+m.text());console.error('CONSOLE',prefix,m.text());}});}
const settle=page=>page.waitForFunction(()=>window.__birdsnest?.ready&&!window.__birdsnest.getState().transition,null,{timeout:30000});
async function capture(page,name){
 stage='screenshot '+name;await save();
 // Let the queued animation callback finish, but defer its successor until after
 // capture. This avoids compositor starvation on a CPU-only software renderer.
 await page.evaluate(()=>{window.__captureRAF={native:window.requestAnimationFrame,next:null};window.requestAnimationFrame=fn=>{window.__captureRAF.next=fn;return 0;};});
 await page.waitForTimeout(300);
 try{await page.screenshot({path:'evidence/'+name+'.png',timeout:30000});}
 finally{await page.evaluate(()=>{const c=window.__captureRAF;window.requestAnimationFrame=c.native;if(c.next)c.native.call(window,c.next);delete window.__captureRAF;});}
}
const url=pathToFileURL(resolve('dist/birdsnest-v2-offline.html')).href;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1000,height:750},deviceScaleFactor:1});
 await context.route(/^https?:/,r=>{externalRequests.push(r.request().url());return r.abort();});
 const page=await context.newPage();page.setDefaultTimeout(25000);watch(page);
 stage='desktop boot';await save();await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForFunction(()=>window.__birdsnest?.ready,null,{timeout:90000});await settle(page);await page.waitForTimeout(750);
 const state=()=>page.evaluate(()=>window.__birdsnest.getState());
 await check('offline boot without a mandatory welcome overlay',async()=>{assert.equal((await state()).mode,'orbit');assert.equal(await page.locator('#loading').evaluate(el=>getComputedStyle(el).pointerEvents),'none');return await page.title();});
 await check('no remote asset requests',async()=>assert.equal(externalRequests.length,0));
 await capture(page,'01-overview');
 await check('orbit drag changes the actual camera',async()=>{const a=await state();await page.mouse.move(520,310);await page.mouse.down();await page.mouse.move(720,350,{steps:6});await page.mouse.up();await page.waitForTimeout(500);const b=await state();assert.ok(Math.hypot(...a.camera.map((v,i)=>v-b.camera[i]))>20);});
 await check('wheel zoom changes camera distance',async()=>{const a=await state();await page.mouse.wheel(0,-350);await page.waitForFunction(d=>window.__birdsnest.getState().orbitDistance<d-10,a.orbitDistance,{timeout:15000});});
 await check('walk button reaches the actual plaza at eye height',async()=>{await page.locator('#enter').click();await settle(page);const s=await state();assert.equal(s.mode,'walk');assert.ok(s.camera[1]<25&&s.camera[2]>150);return s.camera;});
 await capture(page,'02-plaza');
 await check('W moves without pointer lock',async()=>{await page.locator('#world').focus();const a=await state();await page.keyboard.down('w');try{await page.waitForFunction(p=>{const c=window.__birdsnest.getState().camera;return Math.hypot(c[0]-p[0],c[2]-p[2])>.8;},a.camera,{timeout:15000});}finally{await page.keyboard.up('w');}assert.equal(await page.evaluate(()=>document.pointerLockElement),null);return (await state()).camera;});
 await check('drag rotates the walking camera',async()=>{const a=await state();await page.mouse.move(550,300);await page.mouse.down();await page.mouse.move(720,340,{steps:6});await page.mouse.up();assert.ok(Math.abs(a.yaw-(await state()).yaw)>.1);});
 await check('Ghost toggles and actually ascends',async()=>{await page.keyboard.press('g');const a=await state();assert.equal(a.mode,'ghost');await page.keyboard.down('e');try{await page.waitForFunction(y=>window.__birdsnest.getState().camera[1]>y+1,a.camera[1],{timeout:15000});}finally{await page.keyboard.up('e');}return (await state()).camera;});
 await check('return reaches the saved orbit view',async()=>{await page.keyboard.press('v');await settle(page);assert.equal((await state()).mode,'orbit');});
 await check('weather selection preserves the view mode',async()=>{await page.locator('#climate').click();await page.locator('[data-weather="rain"]').click();await page.locator('#close-panel').click();await page.waitForTimeout(700);assert.equal((await state()).weather,'rain');assert.equal((await state()).mode,'orbit');});
 await capture(page,'03-rain');
 await check('night switch changes environment state',async()=>{await page.locator('#night').click();await page.waitForTimeout(1000);assert.equal((await state()).night,true);});
 await capture(page,'04-night');
 await check('roof section reveals the interior',async()=>{await page.locator('#section').click();assert.equal((await state()).section,'open');});
 await capture(page,'05-section');
 await check('field viewpoint arrives inside the actual field',async()=>{await page.locator('#night').click();await page.locator('#views').click();await page.locator('[data-view="field"]').click();await settle(page);const s=await state();assert.equal(s.mode,'walk');assert.ok(Math.abs(s.camera[0])<40&&Math.abs(s.camera[2])<60);return s.camera;});
 await capture(page,'06-field');
 await check('underground viewpoint remains below grade',async()=>{await page.locator('#views').click();await page.locator('[data-view="basement"]').click();await settle(page);const s=await state();assert.ok(s.camera[1]<18&&s.camera[1]>5);return s.camera;});
 await capture(page,'07-basement');
 await check('hidden interface can be restored',async()=>{await page.keyboard.press('h');assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('quiet')),true);await page.locator('#quiet').click();assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('quiet')),false);});
 await check('Escape closes the panel',async()=>{await page.locator('#views').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#panel').evaluate(e=>e.classList.contains('open')),false);});
 await check('real source geometry renders in bounded draw calls',async()=>{const s=await state();assert.ok(s.stats.triangles>25000);assert.ok(s.stats.calls<250);return s.stats;});
 await check('same-source GLB exports',async()=>{const b64=await page.evaluate(()=>window.__birdsnest.exportPreview());const bytes=Buffer.from(b64,'base64');assert.equal(bytes.toString('utf8',0,4),'glTF');assert.ok(bytes.length>20000);await writeFile('dist/birdsnest-preview.glb',bytes);return{bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};});
 // Close the desktop renderer before creating a mobile context: software GL
 // cannot represent real mobile performance when two full scenes compete.
 await timeout(context.close(),15000,'desktop close');
 const mobileContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await mobileContext.route(/^https?:/,r=>{externalRequests.push(r.request().url());return r.abort();});
 const mobile=await mobileContext.newPage();mobile.setDefaultTimeout(25000);watch(mobile,'mobile:');
 stage='mobile boot';await save();await mobile.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await mobile.waitForFunction(()=>window.__birdsnest?.ready,null,{timeout:90000});await mobile.waitForTimeout(750);
 await check('mobile has no horizontal page overflow',async()=>assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true));
 await capture(mobile,'08-mobile-overview');
 await check('mobile walk-in reaches plaza and exposes a joystick',async()=>{await mobile.locator('#enter').tap();await settle(mobile);assert.equal(await mobile.locator('#joystick').isVisible(),true);assert.equal(await mobile.locator('#touch button').count(),0);const s=await mobile.evaluate(()=>window.__birdsnest.getState());assert.equal(s.mode,'walk');assert.ok(s.camera[2]>150&&s.camera[1]<25);});
 await capture(mobile,'09-mobile-walk');
 await check('real touch drag rotates the view',async()=>{const client=await mobileContext.newCDPSession(mobile),a=await mobile.evaluate(()=>window.__birdsnest.getState().yaw);await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:270,y:350}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:330,y:380}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok(Math.abs(a-await mobile.evaluate(()=>window.__birdsnest.getState().yaw))>.05);});
 await check('real touch joystick moves the camera',async()=>{const client=await mobileContext.newCDPSession(mobile),box=await mobile.locator('#joystick').boundingBox(),a=await mobile.evaluate(()=>window.__birdsnest.getState().camera),x=box.x+box.width/2,y=box.y+box.height/2;await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-30}]});try{await mobile.waitForFunction(p=>{const c=window.__birdsnest.getState().camera;return Math.hypot(c[0]-p[0],c[2]-p[2])>.5;},a,{timeout:15000});}finally{await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}});
 await timeout(mobileContext.close(),15000,'mobile close');
 await check('no uncaught JS, shader or remote-resource errors',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);});
}catch(e){errors.push(e.stack);console.error(e.stack);}
finally{stage='finished';await save();if(browser)await timeout(browser.close(),15000,'browser close').catch(e=>errors.push(e.message));clearTimeout(watchdog);await save();}
assert.equal(errors.length+checks.filter(c=>!c.pass).length,0,'See evidence/acceptance.json');
