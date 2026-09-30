/** Production-build lab probe. Uses isolated fixtures, gzip delivery and CDP throttling. */
import {createServer} from 'node:http';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {gzipSync} from 'node:zlib';
import {spawn} from 'node:child_process';
import {installAccountFixture} from './fixtures/auth-browser.mjs';
import {installMarketplaceFixture} from './fixtures/marketplace-browser.mjs';
const root=resolve(process.argv[2] || 'dist');
const output=process.argv[3] || '/tmp/mobile-performance.json';
const server=createServer(async(req,res)=>{
 try{const path=resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!path.startsWith(root+'/') && path!==root)throw Error();
 let bytes=await readFile(path===root || path.endsWith('/')?join(root,'index.html'):path);
 // Baseline build was captured with public deployment configuration. Route only to the isolated backend.
 if(extname(path)==='.js')bytes=Buffer.from(bytes.toString().replace(/https:\/\/[a-z]+\.supabase\.co/g,'https://catalog.invalid'));
 const compressed=gzipSync(bytes);res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[extname(path)] || 'text/html','Content-Encoding':'gzip','Content-Length':compressed.length,'Cache-Control':'no-store'});res.end(compressed);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(4188,'127.0.0.1',done));
const profile=await mkdtemp(join(tmpdir(),'mobile-lab-'));
const browser=spawn('chromium',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
let log='';browser.stderr.on('data',part=>log+=part);
const pause=ms=>new Promise(done=>setTimeout(done,ms));
async function until(check,message){for(let i=0;i<250;i++){const value=await check();if(value)return value;await pause(100);}throw Error(message);}
let socket;
try{
 const ws=await until(()=>log.match(/ws:\/\/127\.0\.0\.1:\d+/)?.[0],'Browser start');
 const pages=await(await fetch(ws.replace('ws:','http:')+'/json/list')).json();
 socket=new WebSocket(pages.find(page=>page.type==='page').webSocketDebuggerUrl);await new Promise(done=>socket.addEventListener('open',done,{once:true}));
 let sequence=0;const pending=new Map();const network=[];
 socket.addEventListener('message',({data})=>{const event=JSON.parse(data);if(event.id){const waiter=pending.get(event.id);pending.delete(event.id);event.error?waiter.reject(Error(event.error.message)):waiter.resolve(event.result);}if(event.method==='Network.requestWillBeSent')network.push(event.params.request.url);});
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++sequence,{resolve,reject});socket.send(JSON.stringify({id:sequence,method,params}));});
 const evaluate=async expression=>{const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);return result.result.value;};
 const click=async text=>until(()=>evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getBoundingClientRect().width && b.innerText.includes(${JSON.stringify(text)}));if(!b)return false;b.click();return true;})()`),'Button '+text);
 await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Network.enable');await cdp('Network.setCacheDisabled',{cacheDisabled:true});
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await cdp('Emulation.setCPUThrottlingRate',{rate:4});
 await cdp('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1_600_000/8,uploadThroughput:750_000/8});
 await cdp('Browser.grantPermissions',{origin:'http://127.0.0.1:4188',permissions:[]});
 await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`
 (${installAccountFixture.toString()})({signedIn:false});(${installMarketplaceFixture.toString()})();
 window.__lab={lcp:0,cls:0};
 new PerformanceObserver(list=>{for(const e of list.getEntries())window.__lab.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
 new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__lab.cls+=e.value;}).observe({type:'layout-shift',buffered:true});
 const tutor={name:'Tutor aislado',title:'Profesor',institution:'',experienceYears:2,ratePerHour:30000,coverageRadiusKm:5,bio:'',subjects:['Álgebra'],specialties:[]};
 const student={name:'Estudiante aislado',age:20,grade:'Universidad',school:'',sector:'',address:'',phone:'+573001234567',guardianName:'',guardianPhone:'',guardianRelation:'',guardianAuthorized:false,academicGoal:'Aprender',difficultiesOrTopics:'',learningStyles:[],preferredModality:'virtual',preferredSchedule:'',bioNote:''};
 for(const role of ['tutor','student']){const id=window.__authFixture.session(role).user.id;localStorage.setItem('test-account-'+id,JSON.stringify({id,role,profile:role==='tutor'?tutor:student,avatar_path:null,avatar_url:null,version:1}));}
 localStorage.setItem('marketplace-test-offer',JSON.stringify({published:true,draft:{phone:'+573001234567'},listing:{...tutor,id:window.__authFixture.session('tutor').user.id,avatar:'',levels:['Universidad'],modalities:['virtual'],availability:[{day:1,start:'09:00',end:'12:00'}],sector:'',nextAvailable:'',methodologySteps:[],verified:false,matchReasons:[]}}));
 `});
 const capture=async label=>{const {data}=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(output.replace('.json',`-${label}.png`),Buffer.from(data,'base64'));};
 const measurements=[];
 for(let run=1;run<=3;run++){
  await cdp('Storage.clearDataForOrigin',{origin:'http://127.0.0.1:4188',storageTypes:'all'});network.length=0;
  await cdp('Page.navigate',{url:'http://127.0.0.1:4188/'});
  await until(()=>evaluate('(document.body?.innerText || "").includes("Continuar con Google")'),'Login');await pause(1500);
  if(run===1)await capture('login');
  const login=await evaluate(`({...window.__lab,jsBytes:performance.getEntriesByType('resource').filter(r=>r.name.includes('.js')).reduce((sum,r)=>sum+r.encodedBodySize,0)})`);
  await evaluate(`localStorage.setItem('sb-catalog-auth-token',JSON.stringify(window.__authFixture.session('student')))`);
  await cdp('Page.reload');await until(()=>evaluate('(document.body?.innerText || "").includes("Ver tutores")'),'Search');
  await click('Virtual');network.length=0;
  const start=Date.now();await click('Ver tutores');await until(()=>evaluate('(document.body?.innerText || "").includes("Tutor aislado")'),'Results');await pause(700);
  const results={readyMs:Date.now()-start,...await evaluate('window.__lab'),mapRequests:network.filter(url=>/maplibre-gl|openfreemap|\.pbf/.test(url)).length};
  if(run===1)await capture('results');
  const mapStart=Date.now();await click('Ver mapa interactivo');await pause(3500);
  const map={observedMs:Date.now()-mapStart,requests:network.filter(url=>/maplibre-gl|openfreemap|\.pbf/.test(url)).length,...await evaluate(`({jsBytes:performance.getEntriesByType('resource').filter(r=>r.name.includes('maplibre-gl')).reduce((sum,r)=>sum+r.encodedBodySize,0),ready:!!document.querySelector('button[aria-label="Acercar mapa"]:not(:disabled)')})`)};
  const reaction=await evaluate(`(async()=>{const samples=[];for(let i=0;i<20;i++){const label=i%2?'Ver mapa interactivo':'Lista de tutores';const b=[...document.querySelectorAll('button')].find(b=>b.innerText.includes(label));const start=performance.now();b.click();await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));samples.push(performance.now()-start);}return samples;})()`);
  await click('Lista de tutores');
  const filterReaction=await evaluate(`(async()=>{const samples=[];const input=document.querySelector('input[type=text]');for(let i=0;i<20;i++){const start=performance.now();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,i%2?'':'Tutor');input.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));samples.push(performance.now()-start);}return samples;})()`);
  await click('Solicitar tutoría');
  await until(()=>evaluate('Boolean(document.querySelector("[role=dialog] input[type=date]"))'),'Booking');
  await evaluate(`(()=>{const date=new Date();date.setUTCDate(date.getUTCDate()+((8-date.getUTCDay())%7 || 7));const input=document.querySelector('[role=dialog] input[type=date]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,date.toISOString().slice(0,10));input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await pause(100);
  const slotReaction=await evaluate(`(async()=>{const samples=[];const input=document.querySelector('#request-time') || document.querySelector('[role=dialog] input[type=time]');for(let i=0;i<20;i++){const start=performance.now();const select=input.tagName==='SELECT';Object.getOwnPropertyDescriptor(select?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(input,i%2?'09:00':'09:30');input.dispatchEvent(new Event(select?'change':'input',{bubbles:true}));await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));samples.push(performance.now()-start);}return samples;})()`);
  const resources=await evaluate(`performance.getEntriesByType('resource').map(r=>({url:r.name.split('?')[0],type:r.initiatorType,startMs:r.startTime,durationMs:r.duration,encodedBytes:r.encodedBodySize}))`);
  measurements.push({run,login,results,map,tabReactionMs:reaction,filterReactionMs:filterReaction,slotReactionMs:slotReaction,resources});
 }
 const report={browser:(await cdp('Browser.getVersion')).product,viewport:'390x844',network:'1.6Mbps down, 750Kbps up, 150ms latency',cpuSlowdown:4,backend:'isolated JS fixtures, no hosted requests',measurements};
 await writeFile(output,JSON.stringify(report,null,2));console.log(output);
}finally{socket?.close();browser.kill('SIGTERM');server.close();await pause(250);await rm(profile,{recursive:true,force:true});}
