// Read-only observation of the original FioForja package. Save snapshots remain ignored.
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const serial=process.argv[2],name=process.argv[3];
if(!serial||!name||!/^[-\w]+$/.test(serial)||!/^[-\w]+$/.test(name))throw Error('Explicit serial and safe capture name required');
const adb=join(process.env.LOCALAPPDATA,'Android/Sdk/platform-tools/adb.exe');
const command=(...args)=>execFileSync(adb,['-s',serial,...args],{encoding:'utf8',windowsHide:true,timeout:15000});
const foreground=command('shell','dumpsys','activity','activities').split(/\r?\n/).find(l=>/topResumedActivity=|mResumedActivity:/.test(l));
if(!foreground?.includes('com.projetofio.fioforja/.MainActivity'))throw Error('Original app must be foreground');
const pid=command('shell','pidof','com.projetofio.fioforja').trim();
const port=command('forward','tcp:0','localabstract:webview_devtools_remote_'+pid).trim();let ws;
try{
 let pages;const deadline=Date.now()+8000;while(!pages){try{pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();}catch(error){if(Date.now()>=deadline)throw error;await new Promise(done=>setTimeout(done,150));}}
 const target=pages.find(p=>p.type==='page'&&p.url.startsWith('https://localhost/'));if(!target)throw Error('Local page missing');
 const url=new URL(target.webSocketDebuggerUrl);url.hostname='127.0.0.1';url.port=port;
 ws=new WebSocket(url);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 const response=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Observation timeout')),12000);ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.id===41){clearTimeout(timer);resolve(m);}});});
 const expression='JSON.stringify({viewport:{w:innerWidth,h:innerHeight,dpr:devicePixelRatio},rawSave:localStorage.getItem("a-forja-save"),storageKeys:Object.keys(localStorage),text:document.body.innerText,navigation:!!document.querySelector("nav"),controls:[...document.querySelectorAll("button,select")].filter(e=>e.getBoundingClientRect().width).map(e=>{const r=e.getBoundingClientRect();return{label:e.getAttribute("aria-label")||e.textContent.trim(),x:r.x,y:r.y,w:r.width,h:r.height,disabled:e.disabled};})})';
 ws.send(JSON.stringify({id:41,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));
 const result=await response;if(result.result?.exceptionDetails)throw Error(result.result.exceptionDetails.exception?.description || result.result.exceptionDetails.text);
 const observation=JSON.parse(result.result.result.value);observation.observedAt=new Date().toISOString();
 const folder=join(dirname(fileURLToPath(import.meta.url)),'evidence');mkdirSync(folder,{recursive:true});
 writeFileSync(join(folder,name+'.json'),JSON.stringify(observation,null,2));
 writeFileSync(join(folder,name+'.png'),execFileSync(adb,['-s',serial,'exec-out','screencap','-p'],{windowsHide:true,timeout:15000,maxBuffer:20000000}));
 console.log(JSON.stringify({name,viewport:observation.viewport,navigation:observation.navigation,savePresent:!!observation.rawSave,controls:observation.controls}));
}finally{ws?.close();command('forward','--remove','tcp:'+port);}
