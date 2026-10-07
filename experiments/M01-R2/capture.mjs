// M01-R2 experiment capture. Requires the Vite dev server on port 8080.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const out = fileURLToPath(new URL('./evidence/', import.meta.url));
const root = fileURLToPath(new URL('../../', import.meta.url));
mkdirSync(out, { recursive: true });
const baseline = JSON.parse(readFileSync(new URL('../M01-R1/evidence/measurements.json', import.meta.url), 'utf8'));
const baselineHash = createHash('sha256').update(readFileSync(new URL('../M01-R1/evidence/measurements.json', import.meta.url))).digest('hex');
const url = 'http://127.0.0.1:8080/';
const viewports = [[390,844], [412,915], [844,390], [1366,768]];
const phases = ['heat','forge-rest','forge-charge','impact','quench'];
const record = {
  baselineCommit: 'dd43842926ff109dee8df7ddb2731f1eb3afce43',
  baselineMeasurementsSHA256: baselineHash,
  url, dpr: 1, seed: 101,
  capture: { date: '2026-10-07', clock: '2026-10-07T12:00:00Z', swordDesign: 'DEFAULT_DESIGN', phases },
  viewports: []
};
const hash = b => createHash('sha256').update(b).digest('hex');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
record.browser = browser.version();

async function open(width, height) {
  const context = await browser.newContext({ viewport: {width,height}, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.addInitScript(() => {
    let seed = 101;
    Math.random = () => { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed/4294967296; };
    window.__r2Frames = new WeakMap();
    const proto = CanvasRenderingContext2D.prototype;
    const clear = proto.clearRect, translate = proto.translate, image = proto.drawImage;
    proto.clearRect = function(...args) {
      if (this.canvas.isConnected) window.__r2Frames.set(this.canvas,{awaitOuter:true});
      return clear.apply(this,args);
    };
    proto.translate = function(...args) {
      const frame = window.__r2Frames.get(this.canvas);
      if (frame?.awaitOuter) { frame.outer = args; frame.awaitOuter = false; }
      return translate.apply(this,args);
    };
    proto.drawImage = function(img,...args) {
      const frame = window.__r2Frames.get(this.canvas);
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
    if (hud.strikes !== expected) throw new Error('HUD has stale strike count for ' + phase + ': ' + hud.strikes);
    const width=box.width, height=box.height;
    const scale=Math.max(width/1280,height/720);
    const visibleW=width/scale, visibleH=height/scale;
    const frame=window.__r2Frames.get(canvas);
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
    let full=0,within=0;
    for(let y=0;y<720;y++) for(let x=0;x<1280;x++) if(logical[(y*1280+x)*4+3]>=128){
      full++;if(x>=x0&&x<x1&&y>=y0&&y<y1)within++;
    }
    return {
      phase,width,height,scale,visibleW,visibleH,cropX:1280-visibleW,cropY:720-visibleH,
      sceneFraction:visibleW*visibleH/(1280*720),outer,hud,
      bladeVisibleFraction:within/full,visibleBladePixels,overlapPixels,
      overlapFraction:visibleBladePixels?overlapPixels/visibleBladePixels:0,
      impactAnchor:[512*scale+outer[0],475.2*scale+outer[1]],
      hand:frame.hand?{source:frame.hand.img.src.split('/').at(-1),args:frame.hand.args,matrix:frame.hand.matrix}:null
    };
  },phase);
  return {data,png:await page.screenshot({type:'png'})};
}

function metricSubset(frame) {
  return {
    phase: frame.phase,
    bladeVisibleFraction: frame.bladeVisibleFraction,
    overlapFraction: frame.overlapFraction,
    visibleW: frame.visibleW,
    visibleH: frame.visibleH,
    sceneFraction: frame.sceneFraction,
    outer: frame.outer,
    impactAnchor: frame.impactAnchor,
    hand: frame.hand,
    hud: {
      phase: frame.hud.phase, strikes: frame.hud.strikes,
      shape: frame.hud.shape, heat: frame.hud.heat, quality: frame.hud.quality,
      force: frame.hud.force, charging: frame.hud.charging
    }
  };
}

try {
  for (const [width,height] of viewports) {
    const baseViewport = baseline.viewports.find(v => v.width === width && v.height === height);
    if (!baseViewport) throw new Error('Missing M01-R1 baseline viewport ' + width + 'x' + height);
    if (baseViewport.frames.map(f => f.phase).join('|') !== phases.join('|')) throw new Error('Baseline phase sequence changed');
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

    const baselineImage = readFileSync(new URL('../M01-R1/evidence/' + baseViewport.file, import.meta.url)).toString('base64');
    const comparison = await page.evaluate(async ({baselineData,shots,width,height,oldCols}) => {
      const baseImage = new Image();
      baseImage.src = 'data:image/webp;base64,' + baselineData;
      await baseImage.decode();
      const candidateImages = await Promise.all(shots.map(async shot => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + shot.png;
        await img.decode();
        return img;
      }));
      const gap=16, labelH=20, top=34, rowH=height+labelH;
      const board=document.createElement('canvas');
      board.width=2*width+gap;
      board.height=top+shots.length*rowH+8;
      const ctx=board.getContext('2d');
      ctx.fillStyle='#140e0a';ctx.fillRect(0,0,board.width,board.height);
      ctx.fillStyle='#e8dcc4';ctx.font='bold 16px sans-serif';
      ctx.fillText('BASELINE — M01-R1',8,23);
      ctx.fillText('CANDIDATE — M01-R2',width+gap+8,23);
      for(let i=0;i<shots.length;i++){
        const y=top+i*rowH;
        ctx.font='14px sans-serif';
        ctx.fillStyle='#b8a891';
        ctx.fillText(shots[i].phase,8,y+15);
        ctx.fillText(shots[i].phase,width+gap+8,y+15);
        const sx=(i%oldCols)*width;
        const sy=Math.floor(i/oldCols)*(height+28)+28;
        ctx.drawImage(baseImage,sx,sy,width,height,0,y+labelH,width,height);
        ctx.drawImage(candidateImages[i],width+gap,y+labelH,width,height);
      }
      return board.toDataURL('image/webp',.90).split(',')[1];
    },{
      baselineData:baselineImage,
      shots:shots.map(s=>({phase:s.data.phase,png:s.png.toString('base64')})),
      width,height,oldCols:width<height?5:3
    });
    const file='comparison-'+width+'x'+height+'.webp';
    writeFileSync(join(out,file),Buffer.from(comparison,'base64'));
    const candidateFrames=shots.map(s=>metricSubset(s.data));
    const baselineFrames=baseViewport.frames.map(metricSubset);
    record.viewports.push({
      width,height,baselineFile:baseViewport.file,comparisonFile:file,
      baselineFrames,candidateFrames
    });
    console.log('captured ' + width + 'x' + height);
    await context.close();
  }
  record.sourceHashes=Object.fromEntries([
    'package-lock.json','src/game/ForgeCanvas.tsx','src/game/swordDraw.ts',
    'src/game/GameApp.tsx','src/game/screens/ForgeHud.tsx','src/game/catalog.ts',
    'experiments/M01-R1/capture.mjs','experiments/M01-R1/evidence/measurements.json',
    'experiments/M01-R2/capture.mjs'
  ].map(p=>[p,hash(readFileSync(join(root,p)))]));
  record.evidenceHashes=Object.fromEntries(readdirSync(out).filter(p=>/^comparison-.*\.webp$/.test(p)).sort().map(p=>[p,hash(readFileSync(join(out,p)))]));
  writeFileSync(join(out,'measurements.json'),JSON.stringify(record,null,2)+'\n');
  console.log(JSON.stringify(record.viewports.map(v=>({
    viewport:v.width+'x'+v.height,
    phases:v.baselineFrames.map((b,i)=>({
      phase:b.phase,
      heatVisibility:[b.bladeVisibleFraction,v.candidateFrames[i].bladeVisibleFraction],
      overlap:[b.overlapFraction,v.candidateFrames[i].overlapFraction]
    }))
  })),null,2));
} finally {
  await browser.close();
}