// Experiment only. Run after the existing Vite dev server starts on port 8080.
// Invokes the production renderer through Vite; does not patch src/game.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const out = fileURLToPath(new URL('./evidence/', import.meta.url));
mkdirSync(out, { recursive: true });
const url = 'http://127.0.0.1:8080/';
const viewports = [[390,844], [412,915], [844,390], [1366,768]];
const record = { base: 'e588242c30c325ac823579079628e1d0cd2231be', url,
  dpr: 1, seed: 101, alphaThreshold: 128, forgeDesignSource: 'DEFAULT_DESIGN in src/game/catalog.ts', viewports: [], quality: {} };
const hash = b => createHash('sha256').update(b).digest('hex');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
record.browser = browser.version();

async function open(width, height) {
  const context = await browser.newContext({ viewport: {width,height}, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.addInitScript(() => {
    let seed = 101;
    Math.random = () => { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed/4294967296; };
    window.__baselineFrames = new WeakMap();
    const proto = CanvasRenderingContext2D.prototype;
    const clear = proto.clearRect, translate = proto.translate, image = proto.drawImage;
    proto.clearRect = function(...args) {
      if (this.canvas.isConnected) window.__baselineFrames.set(this.canvas,{awaitOuter:true});
      return clear.apply(this,args);
    };
    proto.translate = function(...args) {
      const frame = window.__baselineFrames.get(this.canvas);
      if (frame?.awaitOuter) { frame.outer = args; frame.awaitOuter = false; }
      return translate.apply(this,args);
    };
    proto.drawImage = function(img,...args) {
      const frame = window.__baselineFrames.get(this.canvas);
      if (frame && /\/hand(?:-strike)?\.png$/.test(img.src ?? '')) {
        const t = this.getTransform();
        frame.hand = {img,args,matrix:[t.a,t.b,t.c,t.d,t.e,t.f]};
      }
      return image.call(this,img,...args);
    };
  });
  await page.goto(url, {waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Entrar na forja'}).waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el =>
    Object.keys(el).some(k => k.startsWith('__reactProps$') && typeof el[k]?.onClick === 'function')));
  await page.evaluate(() => document.fonts.ready);
  return {context,page};
}

async function snapshot(page, phase) {
  // Allow React's MessageChannel commit to finish without advancing simulation.
  await page.waitForTimeout(25);
  const data = await page.evaluate(async (phase) => {
    const { drawFinishedSword } = await import('/src/game/swordDraw.ts');
    const { DEFAULT_DESIGN } = await import('/src/game/catalog.ts');
    const canvas = document.querySelector('canvas');
    const box = canvas.getBoundingClientRect();
    let fiber = canvas[Object.keys(canvas).find(k => k.startsWith('__reactFiber$'))];
    while (fiber && fiber.type?.name !== 'GameApp') fiber = fiber.return;
    let hook = fiber?.memoizedState, hud = null;
    while (hook) {
      if (hook.memoizedState?.phase && 'shape' in hook.memoizedState) hud = hook.memoizedState;
      hook = hook.next;
    }
    if (!hud) throw new Error('Cannot inspect actual GameApp HUD state');
    const expected = {'heat':0,'forge-rest':3,'forge-charge':3,'impact':4,'quench':8}[phase];
    if (hud.strikes !== expected) throw new Error(`HUD has stale strike count for ${phase}: ${hud.strikes}`);
    const width=box.width, height=box.height;
    const scale=Math.max(width/1280,height/720);
    const visibleW=width/scale, visibleH=height/scale;
    const frame=window.__baselineFrames.get(canvas);
    const outer=frame.outer ?? [(width-1280*scale)/2,(height-720*scale)/2];
    const onAnvil=hud.phase!=='heat';
    const args=[DEFAULT_DESIGN,onAnvil?512:256,onAnvil?471.6:374.4,300,
      {angle:onAnvil?-.08:-.4,heat:hud.heat,shape:onAnvil?hud.shape:.12,assembled:false,quality:hud.quality}];
    function mask(w,h,transform) {
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      const ctx=c.getContext('2d'); ctx.setTransform(...transform);
      drawFinishedSword(ctx,...args); return ctx;
    }
    const sword=mask(width,height,[scale,0,0,scale,...outer]);
    const swordPixels=sword.getImageData(0,0,width,height).data;
    const handCanvas=document.createElement('canvas'); handCanvas.width=width;handCanvas.height=height;
    const handCtx=handCanvas.getContext('2d');
    if(frame.hand) { handCtx.setTransform(...frame.hand.matrix);handCtx.drawImage(frame.hand.img,...frame.hand.args); }
    const handPixels=handCtx.getImageData(0,0,width,height).data;
    let visibleBladePixels=0, overlapPixels=0;
    for(let i=3;i<swordPixels.length;i+=4) if(swordPixels[i]>=128){visibleBladePixels++;if(handPixels[i]>=128)overlapPixels++;}
    const logical=mask(1280,720,[1,0,0,1,0,0]).getImageData(0,0,1280,720).data;
    const x0=-outer[0]/scale,y0=-outer[1]/scale,x1=x0+visibleW,y1=y0+visibleH;
    let full=0,within=0,bounds=[1280,720,0,0];
    for(let y=0;y<720;y++) for(let x=0;x<1280;x++) if(logical[(y*1280+x)*4+3]>=128){
      full++;if(x>=x0&&x<x1&&y>=y0&&y<y1)within++;
      bounds=[Math.min(bounds[0],x),Math.min(bounds[1],y),Math.max(bounds[2],x),Math.max(bounds[3],y)];
    }
    return {phase, width,height,scale,visibleW,visibleH,cropX:1280-visibleW,cropY:720-visibleH,
      sceneFraction:visibleW*visibleH/(1280*720),outer,hud,logicalBladeBounds:bounds,
      bladeVisibleFraction:within/full,visibleBladePixels,overlapPixels,
      overlapFraction:visibleBladePixels?overlapPixels/visibleBladePixels:0,
      impactAnchor:[512*scale+outer[0],475.2*scale+outer[1]],
      hand:frame.hand?{source:frame.hand.img.src.split('/').at(-1),args:frame.hand.args,matrix:frame.hand.matrix}:null,
      bodyText:document.body.innerText};
  },phase);
  const png = await page.screenshot({type:'png'});
  return {data,png};
}

try {
  for (const [width,height] of viewports) {
    const {context,page}=await open(width,height);
    await page.clock.install({time:new Date('2026-10-07T12:00:00Z')});
    await page.clock.pauseAt(new Date('2026-10-07T12:00:01Z'));
    await page.getByRole('button',{name:'Entrar na forja'}).click({force:true});
    await page.clock.runFor(100);
    await page.getByRole('button',{name:'Levar ao fogo'}).waitFor();
    await page.getByRole('button',{name:'Levar ao fogo'}).click({force:true});
    await page.clock.runFor(3400);
    const shots=[await snapshot(page,'heat')];
    await page.getByRole('button',{name:'Retirar do fogo'}).click({force:true});
    await page.clock.runFor(100);
    const strike=async()=>{await page.keyboard.down('Space');await page.clock.runFor(570);await page.keyboard.up('Space');await page.clock.runFor(600);};
    for(let i=0;i<3;i++)await strike();
    shots.push(await snapshot(page,'forge-rest'));
    await page.keyboard.down('Space');await page.clock.runFor(570);
    shots.push(await snapshot(page,'forge-charge'));
    await page.keyboard.up('Space');await page.clock.runFor(128);
    shots.push(await snapshot(page,'impact'));
    await page.clock.runFor(600);
    for(let i=0;i<4;i++)await strike();
    await page.keyboard.down('Space');await page.clock.runFor(650);
    shots.push(await snapshot(page,'quench'));
    const cols=width<height?5:3;
    const encoded=await page.evaluate(async ({shots,width,height,cols})=>{
      const c=document.createElement('canvas'); c.width=cols*width;c.height=Math.ceil(shots.length/cols)*(height+28);
      const ctx=c.getContext('2d');ctx.fillStyle='#140e0a';ctx.fillRect(0,0,c.width,c.height);
      for(let i=0;i<shots.length;i++){
        const img=new Image();img.src=shots[i].src;await img.decode();
        const x=(i%cols)*width,y=Math.floor(i/cols)*(height+28);
        ctx.drawImage(img,x,y+28);ctx.fillStyle='#e8dcc4';ctx.font='16px sans-serif';ctx.fillText(shots[i].label,x+8,y+20);
      }
      return c.toDataURL('image/webp',.90).split(',')[1];
    },{shots:shots.map(s=>({label:s.data.phase,src:'data:image/png;base64,'+s.png.toString('base64')})),width,height,cols});
    const file=`viewport-${width}x${height}.webp`;
    writeFileSync(join(out,file),Buffer.from(encoded,'base64'));
    record.viewports.push({width,height,file,frames:shots.map(s=>s.data)});
    console.log(`captured ${width}x${height}`);
    await context.close();
  }
  const {context,page}=await open(512,480);
  const rendered=await page.evaluate(async()=>{
    const {drawFinishedSword}=await import('/src/game/swordDraw.ts');
    const {DEFAULT_DESIGN}=await import('/src/game/catalog.ts');
    const design={...DEFAULT_DESIGN,steel:'damascus',inscription:'FORJA',runes:true};
    const results=[];
    for(const quality of [20,50,75,95]){
      const c=document.createElement('canvas');c.width=512;c.height=480;
      const raw=c.getContext('2d'),geometry=[];
      const ctx=new Proxy(raw,{
        get(t,k){const v=t[k];if(typeof v!=='function')return v;return (...args)=>{
          geometry.push([k,...args.map(a=>typeof a==='object'?'object':a)]);return v.apply(t,args);
        };},set(t,k,v){t[k]=v;return true;}
      });
      drawFinishedSword(ctx,design,256,340,304,{assembled:true,heat:0,shape:1,quality});
      const pixels=Array.from(raw.getImageData(0,0,512,480).data);
      results.push({quality,png:c.toDataURL('image/png').split(',')[1],geometry,pixels});
    }
    const comparison=document.createElement('canvas');comparison.width=2048;comparison.height=480;
    const ctx=comparison.getContext('2d');ctx.fillStyle='#1e1610';ctx.fillRect(0,0,2048,480);
    for(let i=0;i<results.length;i++){const img=new Image();img.src='data:image/png;base64,'+results[i].png;await img.decode();ctx.drawImage(img,i*512,0);}
    const ref=results[0].pixels;
    for(const result of results){
      let changed=0,maskDiff=0;
      for(let i=0;i<ref.length;i+=4){
        if(ref.slice(i,i+4).some((v,j)=>v!==result.pixels[i+j]))changed++;
        if((ref[i+3]>=128)!==(result.pixels[i+3]>=128))maskDiff++;
      }
      result.changedPixelsVs20=changed;result.silhouetteMaskDiffVs20=maskDiff;delete result.pixels;
    }
    const reference=document.createElement('canvas');reference.width=512;reference.height=320;
    drawFinishedSword(reference.getContext('2d'),design,256,320*.56,320*.95,{assembled:true,heat:0,shape:1,quality:95});
    return {design,width:512,height:480,x:256,y:340,angle:-Math.PI/2.15,lengthPx:304,shape:1,heat:0,assembled:true,
      fontAvailable:document.fonts.check('14px Cinzel'),results,comparison:comparison.toDataURL('image/png').split(',')[1],
      revealPlacementReference:reference.toDataURL('image/png').split(',')[1]};
  });
  for(const result of rendered.results){
    writeFileSync(join(out,`quality-${result.quality}.png`),Buffer.from(result.png,'base64'));delete result.png;
    result.geometrySHA256=hash(JSON.stringify(result.geometry));delete result.geometry;
    result.baseLightness=38+(result.quality-60)*.08;
  }
  writeFileSync(join(out,'quality-comparison.png'),Buffer.from(rendered.comparison,'base64'));delete rendered.comparison;
  writeFileSync(join(out,'reveal-placement-512x320.png'),Buffer.from(rendered.revealPlacementReference,'base64'));delete rendered.revealPlacementReference;
  record.quality=rendered;
  await context.close();
  record.sourceHashes=Object.fromEntries(['package-lock.json','src/game/ForgeCanvas.tsx','src/game/swordDraw.ts','src/game/GameApp.tsx','src/game/screens/ForgeHud.tsx','src/game/screens/RevealScreen.tsx','src/game/screens/GalleryScreen.tsx','src/game/sim.ts','src/game/catalog.ts','src/game/types.ts','src/game/assets.ts'].map(p=>[p,hash(readFileSync(p))]));
  record.evidenceHashes=Object.fromEntries(readdirSync(out).filter(p=>/\.(png|webp)$/.test(p)).sort().map(p=>[p,hash(readFileSync(join(out,p)))]));
  writeFileSync(join(out,'measurements.json'),JSON.stringify(record,null,2)+'\n');
  console.log(JSON.stringify({browser:record.browser,viewports:record.viewports.map(v=>({width:v.width,height:v.height,frames:v.frames.map(f=>({phase:f.phase,shape:f.hud.shape,visible:f.bladeVisibleFraction,overlap:f.overlapFraction}))})),quality:record.quality},null,2));
} finally { await browser.close(); }
