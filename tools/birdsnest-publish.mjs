import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { chromium } from '../gallery-assets/birdsnest-v2/node_modules/playwright/index.mjs';
const root='gallery-assets/birdsnest-v2/';
const result=JSON.parse(await readFile(root+'evidence/acceptance.json','utf8'));
if(result.errors.length||result.failed||result.passed<20)throw new Error('Cannot publish a build without passing the actual interaction suite');
const build=JSON.parse(await readFile(root+'dist/build.json','utf8'));
const html=await readFile(root+'dist/birdsnest-v2-offline.html');
if(crypto.createHash('sha256').update(html).digest('hex')!==build.html.sha256)throw new Error('Distribution hash differs from tested build');
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const url=`https://raw.githack.com/zzayoung/my-skills/${sha}/${root}dist/birdsnest-v2-offline.html`;
const publication={sourceCommit:sha,offlineFile:'birdsnest-v2-offline.html',onlinePreview:null,onlineVerified:false,galleryRegistered:false,checks:[],notes:'The browser preview is not a separate GPT Site. Gallery assets have not been uploaded or registered.'};
let browser;
try{
 const response=await fetch(url,{signal:AbortSignal.timeout(45000)});
 const body=await response.text();
 if(!response.ok)throw new Error(`Preview HTTP ${response.status}`);
 if(!body.includes('鸟巢 · 雨后的钢织天空'))throw new Error('Preview did not serve the real experience');
 publication.checks.push('HTTP response contains the generated experience');
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:960,height:640}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>window.__birdsnest?.ready,null,{timeout:90000});
 await page.locator('#enter').click();
 await page.waitForFunction(()=>{const s=window.__birdsnest.getState();return s.mode==='walk'&&!s.transition&&s.camera[2]>150;},null,{timeout:45000});
 if(errors.length)throw new Error(errors.join('\n'));
 publication.checks.push('Hosted browser boot and actual walk-in verified');
 publication.onlinePreview=url;publication.onlineVerified=true;
}catch(e){publication.onlineError=e.message;console.error('ONLINE PREVIEW NOT VERIFIED:',e.message);}
finally{if(browser)await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,10000))]);}
await writeFile(root+'dist/publication.json',JSON.stringify(publication,null,2));
console.log(JSON.stringify(publication));
