/** Read-only public deployment smoke. No authentication, submissions or hosted mutations. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
const url=process.argv[2] || 'https://tutor-cucuta.vercel.app/';
const output=resolve(process.argv[3] || 'specs/mobile-first-frontend/evidence/t10-public');
const profile=await mkdtemp(join(tmpdir(),'tutor-hosted-smoke-'));
const pause=ms=>new Promise(done=>setTimeout(done,ms));
const browser=spawn('chromium',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
let log='';browser.stderr.on('data',chunk=>log+=chunk);
let socket;
async function until(check,message){for(let i=0;i<200;i++){const result=await check();if(result)return result;await pause(100);}throw Error(message);}
try{
 await mkdir(output,{recursive:true});
 const endpoint=await until(()=>log.match(/ws:\/\/127\.0\.0\.1:\d+/)?.[0],'Chromium startup failed');
 const pages=await(await fetch(endpoint.replace('ws:','http:')+'/json/list')).json();
 socket=new WebSocket(pages.find(page=>page.type==='page').webSocketDebuggerUrl);
 await new Promise(done=>socket.addEventListener('open',done,{once:true}));
 const pending=new Map();const errors=[];let id=0;
 socket.addEventListener('message',({data})=>{const event=JSON.parse(data);if(event.method==='Runtime.exceptionThrown')errors.push(event.params.exceptionDetails.text);if(event.id){const task=pending.get(event.id);pending.delete(event.id);event.error?task.reject(Error(event.error.message)):task.resolve(event.result);}});
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const response=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.exceptionDetails)throw Error(response.exceptionDetails.text);return response.result.value;};
 await cdp('Page.enable');await cdp('Runtime.enable');
 await cdp('Page.navigate',{url});
 await until(()=>evaluate('Boolean(document.querySelector("input[type=email]"))'),'Hosted login did not load');
 const matrix=[];
 for(const width of [320,360,390,430,768,1280]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<768});await pause(200);
  const state=await evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,email:!!document.querySelector('input[type=email]'),password:!!document.querySelector('input[type=password]'),google:[...document.querySelectorAll('button')].some(b=>b.innerText.includes('Continuar con Google')),smallButtons:[...document.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect();return r.width>0 && (r.width<44 || r.height<44)}).map(b=>b.innerText.trim() || b.getAttribute('aria-label'))})`);
  matrix.push(state);
  assert.ok(state.email && state.password && state.google,'Public authentication controls missing');
  const {data}=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(join(output,`login-${width}.png`),Buffer.from(data,'base64'));
 }
 const assets=await evaluate(`[...document.querySelectorAll('script[src],link[rel=stylesheet]')].map(n=>n.src || n.href).filter(url=>new URL(url).pathname.startsWith('/assets/'))`);
 const report={timestamp:new Date().toISOString(),url,browser:(await cdp('Browser.getVersion')).product,scope:'Public unauthenticated read-only smoke; emulated viewports, not physical devices. No form submitted.',assets,matrix,uncaughtExceptions:errors};
 await writeFile(join(output,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({output,matrix,uncaughtExceptions:errors}));
 assert.deepEqual(errors,[],'Hosted runtime exception');
}finally{socket?.close();browser.kill('SIGTERM');await pause(200);await rm(profile,{recursive:true,force:true});}
