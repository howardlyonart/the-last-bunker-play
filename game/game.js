import {NEW_WEAPONS,ARSENAL_NAMES,drawArsenal} from './arsenal.js?v=b0edb1b3bbff';
import {DEBUG_WEAPONS,DEBUG_BOOSTS,loadDebug,saveDebug,debugOptions} from './debug-mode.js?v=b0edb1b3bbff';
import {drawTethers,drawThrusterMissile,drawThrusterSight} from './tether-art.js?v=b0edb1b3bbff';
import {drawReinforcements,drawAdvancedBullet,UPGRADE_LABELS,UPGRADE_ICONS,UPGRADE_COLORS} from './reinforcements-art.js?v=b0edb1b3bbff';
import {drawFreezeRay} from './freeze-art.js?v=b0edb1b3bbff';
import {drawBunkerDetails,drawDistantMountains} from './environment-art.js?v=b0edb1b3bbff';
import {LIGHTNING_TUNING} from './game-mode.js?v=b0edb1b3bbff';
import {Game,makeMesh,makeClusterMesh,clamp} from './engine.js?v=b0edb1b3bbff';
import {glowStrength,shockwaveRadius,particleBrightness,impactHeatColor} from './effects.js?v=b0edb1b3bbff';
import {makeStars,moveStars} from './sky.js?v=b0edb1b3bbff';
import {CinematicAudio} from './sound.js?v=b0edb1b3bbff';
import {renderMesh} from './render-mesh.js?v=b0edb1b3bbff';
import {pointSprite} from './point-sprites.js?v=b0edb1b3bbff';
import {drawGravityOrb,gravityHeatColor} from './gravity.js?v=b0edb1b3bbff';
import {drawChargeLights,drawShieldDome,drawAutoTurret} from './defense-art.js?v=b0edb1b3bbff';
import {drawLightningCast} from './lightning-art.js?v=b0edb1b3bbff';
const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,document.getElementById(id));return elements.get(id);},canvas=$('game'),ctx=canvas.getContext('2d'),aim=$('aim'),fire=$('fire');
let debugPreferences=loadDebug(localStorage);
let debugSampleStart=0,debugFrameCount=0,debugFps=null;
function resetDebugStats(){debugSampleStart=performance.now();debugFrameCount=0;debugFps=null;}
function recordDebugFrame(now){
  if(!game.debugOptions||game.state!=='playing')return;
  debugFrameCount++;
  const elapsed=now-debugSampleStart;
  if(elapsed>=500){debugFps=Math.round(debugFrameCount*1000/elapsed);debugFrameCount=0;debugSampleStart=now;}
}
function syncDebugStats(){
  const el=$('debugStats');el.hidden=!game.debugOptions;
  if(el.hidden)return;
  const status=game.state==='paused'?'PAUSED':game.state==='over'?'ENDED':`${debugFps??'—'} FPS`;
  textValue('debugStats',`${canvas.width} × ${canvas.height} px\n${status}`);
}
let best=0;try{best=Number(localStorage.getItem('last-bunker-best'))||0;}catch{}
let sound=true,audioNeedsTap=false,audio=null,frame=0,last=0,demoTime=0,toastUntil=0,bannerUntil=0,helpPaused=false,firePointer=null;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const game=new Game({onEvent:handleEvent,lightningOnly:LIGHTNING_TUNING});
if(LIGHTNING_TUNING)$('intro').textContent='Lightning tuning · unlimited shots. Tap and release to fire; hold to charge the bunker blast.';
const stars=makeStars();let skyTime=0;
const demo=[{x:390,y:.23,r:45,rx:1,ry:2,rz:.3,sx:.19,sy:.3,sz:.09,mesh:makeClusterMesh()},{x:73,y:.57,r:23,rx:.6,ry:1,rz:2,sx:.3,sy:-.22,sz:.1,mesh:makeMesh(Math.random,false)},{x:360,y:.76,r:18,rx:1,ry:0,rz:3,sx:-.2,sy:.24,sz:.13,mesh:makeMesh(Math.random,false)}];
try{sound=localStorage.getItem('last-bunker-sound')!=='0';}catch{}
let soundEngine=null;
function soundUI(){
  $('soundState').textContent=!sound?'OFF':audioNeedsTap?'TAP':'ON';
  $('sound').setAttribute('aria-label',!sound?'Enable sound':audioNeedsTap?'Tap to start sound':'Disable sound');
  $('sound').setAttribute('aria-pressed',String(sound));
}
function audioFailure(){audioNeedsTap=true;soundUI();toast('Tap ♪ to start sound.');}
function unlockAudio(check=false){
  if(!sound)return;
  try{
    // Use media playback where supported; older browsers retain their normal Web Audio path.
    try{if(globalThis.navigator?.audioSession)navigator.audioSession.type='playback';}catch{}
    if(!soundEngine||audio?.state==='closed'){
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)throw new Error('Audio output unavailable');
      audio=new Audio();soundEngine=new CinematicAudio(audio);void soundEngine.loadGravityShot();void soundEngine.loadLightningShot();
      audio.addEventListener?.('statechange',()=>{if(sound){audioNeedsTap=audio.state!=='running';soundUI();}});
    }
    soundEngine.setEnabled(true);
    return soundEngine.unlock().then(ready=>{
      if(!sound)return;if(!ready){audioFailure();return;}audioNeedsTap=false;soundUI();if(check)soundEngine.play('sound-check');
    }).catch(audioFailure);
  }catch{audioFailure();}
}
function noise(type,data={}){if(!sound||!soundEngine)return;try{soundEngine.play(type,data);}catch{audioFailure();}}
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');toastUntil=performance.now()+2600;}
function handleEvent(type,data){if(type==='wave'){$('waveBanner').textContent=`WAVE ${String(data.wave).padStart(2,'0')}`;$('waveBanner').classList.add('visible');bannerUntil=performance.now()+1900;}
if(type==='upgrade'){toast(NEW_WEAPONS.includes(data.weapon)?`${ARSENAL_NAMES[data.weapon].toUpperCase()} ONLINE`:{pulse:'PULSE CANNON ONLINE',triple:'TRIPLE SHOT ONLINE · 15° SPREAD',bounce:'BOUNCING SHOTS ONLINE · BANK YOUR SHOTS',missile:'SWARM MISSILES ONLINE · AIM WITHIN 3°',lightning:'CHAIN LIGHTNING ONLINE · 5 USES',gravity:'GRAVITY GUN ONLINE · 5 SHOTS',seeker:'SEEKER BALLS ONLINE · 20 SHOTS',repulser:'REPULSER ONLINE · 1 BLAST',mount:'ASTEROID TURRETS ONLINE · 3 SHOTS',chain:'CHAIN SHOT ONLINE · TETHERED PROJECTILES',thruster:'THRUSTER MISSILES ONLINE · 10 SHOTS',freeze:'FREEZE RAY ONLINE · 6 SHOTS',acid:'ACID SHOTGUN ONLINE · CORROSIVE SPREAD'}[data.weapon]);}
if(type==='turret-upgrade')toast(`${data.side.toUpperCase()} AUTO TURRET ONLINE · ${data.count}/2`);if(type==='turret-destroyed')toast(`${data.side.toUpperCase()} TURRET DESTROYED`);
if(type==='shield-up')toast(`SHIELD ${data.hits===6?'II ':''}ONLINE · ${data.hits||3} IMPACTS`);if(type==='shield-hit')toast(`SHIELD · ${data.remaining} IMPACTS LEFT`);if(type==='shield-down')toast('SHIELD DEPLETED');
if(type==='drone-up')toast('FIGHTER DRONE ONLINE · 20 SECONDS');if(type==='minelayer-up')toast('MINELAYER ONLINE · 10 MINES');if(type==='turret-level2')toast('TURRETS II ONLINE · TRIPLE SHOT / 3 HITS');if(type==='asteroid-turret')toast('ASTEROID TURRET ONLINE');if(type==='special-empty')toast(`${UPGRADE_LABELS[data.weapon]} DEPLETED · MISSILES ONLINE`);
if(type==='freeze-empty')toast('FREEZE RAY DEPLETED · MISSILES ONLINE');
if(type==='gravity-empty')toast('GRAVITY DEPLETED · MISSILES ONLINE');
if(type==='lightning-empty')toast('LIGHTNING DEPLETED · MISSILES ONLINE');
if(type==='comet')toast('COMET INBOUND');if(type==='ufo')toast('HOSTILE CRAFT DETECTED');
if(type==='drop')toast(UPGRADE_LABELS[data.type]?`${UPGRADE_LABELS[data.type]} CRATE · SHOOT TO COLLECT`:{shield:'SHIELD CRATE · SHOOT TO COLLECT',turret:'AUTO TURRET CRATE · SHOOT TO COLLECT',triple:'TRIPLE CRATE · SHOOT TO COLLECT',bounce:'BOUNCE CRATE · SHOOT TO COLLECT',missile:'SWARM CRATE · SHOOT TO COLLECT',lightning:'LIGHTNING CRATE · SHOOT TO COLLECT',gravity:'GRAVITY CRATE · SHOOT TO COLLECT',freeze:'FREEZE CRATE · SHOOT TO COLLECT',acid:'ACID CRATE · SHOOT TO COLLECT'}[data.type]);
if(type==='over'){if(!game.debugOptions){best=Math.max(best,game.score);try{localStorage.setItem('last-bunker-best',String(best));}catch{}}$('endScore').textContent=String(game.score).padStart(6,'0');$('endWave').textContent=String(game.wave).padStart(2,'0');$('endDescription').textContent=game.score>=best&&game.score>0?'A new personal best. The line will rise again.':'The bunker fell. Your next stand starts here.';$('endMenu').hidden=false;$('pause').hidden=true;releaseUI();}
if(type==='arsenal-boost')toast(`${ARSENAL_NAMES[data.type].toUpperCase()} ONLINE`);if(type==='armor-hit')toast('ARMOR SPENT · SHrapnel retaliation'.toUpperCase());noise(type,data);}
let viewDirty=true,lastDrawState=null,nextRender=0;
function resize(){viewDirty=true;const rect=$('field').getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);const oldH=game.H;game.H=480*rect.height/rect.width;if(game.state==='playing'||game.state==='paused'){const scale=game.H/oldH;for(const a of game.asteroids)a.y*=scale;for(const p of game.pickups)p.y*=scale;for(const e of game.enemies)e.y*=scale;for(const w of game.spaceDebris)w.y*=scale;for(const t of game.turrets)t.y=game.ground-10;for(const c of [...game.drones,...game.minelayers,...game.mines]){c.y*=scale;if(c.anchorY!==undefined)c.anchorY*=scale;if(c.py!==undefined)c.py*=scale;}game.bullets=[];game.chainBolts=[];game.arsenalShots=[];game.energyLines=[];game.singularityLinks=[];game.trails=[];game.shockwaves=[];for(const h of game.blackHoles)h.y*=scale;game.lightning=[];game.freezeBeams=[];game.particles=[];game.crystals=[];}ctx.setTransform(canvas.width/480,0,0,canvas.height/game.H,0,0);}
new ResizeObserver(resize).observe($('field'));resize();
function glow(color,alpha=ctx.globalAlpha,boost=1){
  const strength=glowStrength(color,alpha),scale=canvas.width/480;
  ctx.shadowColor=color;ctx.shadowBlur=strength*5.5*scale*boost;
}
function mixColor(from,to,amount){const t=clamp(amount,0,1);const rgb=[1,3,5].map(i=>Math.round(parseInt(from.slice(i,i+2),16)*(1-t)+parseInt(to.slice(i,i+2),16)*t));return `rgb(${rgb.join(',')})`;}
function line(points,color='#dce9e2',width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=color;ctx.lineWidth=width;glow(color);ctx.stroke();}
function mesh(a,opacity=1){renderMesh(ctx,a,opacity,glow,mixColor);}
function bunker(t){const y=game.ground,x=240;ctx.save();const damaged=game.flash>0;const ink=damaged?'#ffa071':'#bce8c9';ctx.fillStyle='#0c1513';ctx.beginPath();ctx.moveTo(160,y);ctx.lineTo(164,y-14);ctx.lineTo(178,y-26);ctx.lineTo(302,y-26);ctx.lineTo(316,y-14);ctx.lineTo(320,y);ctx.closePath();ctx.fill();line([[160,y],[164,y-14],[178,y-26],[302,y-26],[316,y-14],[320,y]],ink,1.4);line([[173,y-3],[183,y-18],[297,y-18],[307,y-3]],'#3a5749',.7);drawBunkerDetails(ctx,y,game.state==='menu'?demoTime:game.time);drawChargeLights(ctx,y,game.charge,game.time,glow);line([[159,y],[145,y],[145,y+3]],'#4c6b57');line([[321,y],[335,y],[335,y+3]],'#4c6b57');ctx.fillStyle='#a9d4b7';ctx.font='7px monospace';ctx.textAlign='center';glow(ctx.fillStyle);ctx.fillText('B U N K E R   0 1',240,y+15);
const turretY=game.baseTop-7;ctx.save();ctx.translate(x,turretY);ctx.rotate(game.aim);ctx.translate(0,game.recoil);ctx.fillStyle='#0b1611';
if(game.weapon==='chain'){
 for(const bx of [-8,8]){ctx.fillRect(bx-3,-38,6,30);line([[bx-3,-8],[bx-3,-38],[bx+3,-38],[bx+3,-8]],'#ead5af',1.3);}line([[-8,-21],[-4,-25],[0,-21],[4,-25],[8,-21]],'#fff1cb',1);
}else if(game.weapon==='thruster'){
 ctx.fillRect(-7,-36,14,29);line([[-7,-7],[-7,-36],[0,-42],[7,-36],[7,-7]],'#a9dfff',1.4);for(let cy=-14;cy>=-31;cy-=6)line([[-9,cy],[9,cy]],'#659cc5',1);
}else if(['seeker','repulser','mount'].includes(game.weapon)){
 const color=UPGRADE_COLORS[game.weapon];ctx.fillRect(-9,-35,18,28);line([[-9,-7],[-9,-35],[9,-35],[9,-7]],color,1.5);for(let cy=-13;cy>=-28;cy-=5)line([[-11,cy],[11,cy]],color,.8);if(game.weapon==='seeker'){line([[-11,-33],[-7,-41],[-3,-35],[0,-43],[3,-35],[7,-41],[11,-33]],'#ffd5a0',1.4);}else if(game.weapon==='repulser'){line([[-14,-34],[-14,-40],[14,-40],[14,-34]],'#efb9ff',1.5);line([[-10,-37],[10,-37]],'#ffffff',1.8);}else{line([[-9,-35],[-5,-41],[5,-41],[9,-35]],'#bafbe3',1.4);line([[-4,-38],[4,-38]],'#eafff8',1.5);}
}else if(game.weapon==='missile'){
  ctx.fillRect(-12,-34,24,27);line([[-12,-7],[-12,-34],[12,-34],[12,-7]],ink,1.4);
  for(const bx of [-10,-5,0,5,10]){line([[bx-2,-33],[bx-2,-39],[bx+2,-39],[bx+2,-33]],'#ffa071',1.1);line([[bx,-15],[bx,-24]],'#6e8e7c',.7);}
}else if(game.weapon==='acid'){
  ctx.fillRect(-6,-37,12,30);line([[-6,-7],[-6,-37],[6,-37],[6,-7]],'#b0ef78',1.4);for(const x of [-10,10]){line([[x,-11],[x,-29],[x*.6,-33]],'#6faa48',1);line([[x-2,-23],[x+2,-23]],'#c6ff8a',1.4);}line([[-6,-27],[-12,-38],[12,-38],[6,-27]],'#b0ef78',1.4);line([[-12,-38],[12,-38]],'#e9ffc5',2);
}else if(game.weapon==='freeze'){
  ctx.fillRect(-9,-34,18,27);line([[-9,-7],[-9,-34],[9,-34],[9,-7]],'#87dfff',1.4);for(let cy=-13;cy>=-29;cy-=5)line([[-11,cy],[11,cy]],'#468ecd',1);line([[-11,-35],[-7,-41],[7,-41],[11,-35],[7,-32],[-7,-32],[-11,-35]],'#a3edff',1.2);line([[-6,-37],[6,-37]],'#efffff',1.7);
}else if(game.weapon==='gravity'){
  ctx.fillRect(-10,-36,20,29);line([[-10,-7],[-10,-36],[10,-36],[10,-7]],'#d9b1b5',1.4);
  for(let cy=-15;cy>=-31;cy-=5)line([[-12,cy],[12,cy]],'#ef4856',1.2);
  ctx.fillStyle='#000000';ctx.beginPath();ctx.ellipse(0,-38,9,4,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ff5363';ctx.lineWidth=1.3;glow(ctx.strokeStyle,1,2);ctx.stroke();
}else if(game.weapon==='lightning'){
  line([[-7,-7],[-8,-27],[-12,-35],[-6,-41],[-3,-30]],'#b4dcff',1.5);line([[7,-7],[8,-27],[12,-35],[6,-41],[3,-30]],'#b4dcff',1.5);
  for(let cy=-12;cy>=-28;cy-=5)line([[-7,cy],[7,cy]],'#81b9e8',1);line([[0,-18],[3,-26],[-2,-32],[1,-39]],'#edfaff',1.5);
}else if(game.weapon==='triple'||game.weapon==='bounce'){
  for(const bx of [-7,0,7]){ctx.fillRect(bx-2,-37,4,30);line([[bx-2,-7],[bx-2,-37],[bx+2,-37],[bx+2,-7]],ink,1.1);}
  if(game.weapon==='bounce'){line([[-12,-29],[12,-29]],'#ffa071',1.8);line([[-12,-24],[12,-24]],'#ffa071',1.2);line([[-10,-13],[-13,-18],[-10,-23]],ink,1);line([[10,-13],[13,-18],[10,-23]],ink,1);}
}else{ctx.fillRect(-4,-38,8,33);line([[-4,-7],[-4,-38],[4,-38],[4,-7]],ink,1.4);line([[-6,-36],[6,-36]],ink,.8);}
if(game.holding){const charge=game.charge/game.chargeMax;ctx.strokeStyle=charge>=1?'#ffa071':'#bce8c9';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-39,5+charge*6,-Math.PI/2,Math.PI*2*charge-Math.PI/2);glow(ctx.strokeStyle,1,1+charge);ctx.stroke();ctx.globalAlpha=.12+charge*.2;ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.arc(0,-39,7+charge*12,0,Math.PI*2);ctx.fill();}ctx.restore();ctx.beginPath();ctx.arc(x,turretY,11,Math.PI,0);ctx.lineTo(x+11,turretY+7);ctx.lineTo(x-11,turretY+7);ctx.closePath();ctx.fillStyle='#0c1513';ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=1.2;glow(ink);ctx.stroke();ctx.beginPath();ctx.arc(x,turretY,3,0,Math.PI*2);ctx.stroke();
if(game.state==='playing'&&game.holding){const m=game.muzzle;ctx.setLineDash([2,8]);line([[m.x,m.y],[m.x+Math.sin(game.aim)*85,m.y-Math.cos(game.aim)*85]],'#50755c',.5);ctx.setLineDash([]);}ctx.restore();}
function strokeSegments(segments,color,width){ctx.beginPath();for(const s of segments){ctx.moveTo(s.x,s.y);ctx.lineTo(s.ex,s.ey);}ctx.strokeStyle=color;ctx.lineWidth=width;glow(color);ctx.stroke();}
function drawBurnIn(){
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
  // Batch fading bullet traces by damage and age; keep normal shots subtle and charged shots warm.
  const groups=new Map(),missileCutoffs=new Map();for(const t of game.trails){let segment=t;if(t.missile){let cutoff=missileCutoffs.get(t.missile);if(cutoff===undefined){cutoff=t.missile.distance-Math.max(3,Math.hypot(t.missile.vx,t.missile.vy)*.5);missileCutoffs.set(t.missile,cutoff);}if(t.distanceEnd<cutoff)continue;if(t.distanceStart<cutoff){const u=clamp((cutoff-t.distanceStart)/(t.distanceEnd-t.distanceStart||1),0,1);segment={...t,x:t.x+(t.ex-t.x)*u,y:t.y+(t.ey-t.y)*u};}}const fade=Math.ceil(t.life/t.max*8),exhaust=t.kind==='missile'?Math.max(.08,Math.round((t.exhaust??1)*4)/4):1;const key=t.kind+':'+t.damage+':'+fade+':'+exhaust;if(!groups.has(key))groups.set(key,{damage:t.damage,kind:t.kind,fade,exhaust,segments:[]});groups.get(key).segments.push(segment);}
  for(const g of groups.values()){
    const cold=g.kind==='cometTrail'||g.kind==='photonTrail',missile=g.kind==='missile',power=missile?g.damage>3:g.damage>1,fade=(g.fade/8)**(missile?1.2:2),color=['thrusterTrail','thruster'].includes(g.kind)?'#82cfff':g.kind==='droneTrail'?'#8ddfff':g.kind==='acid'?'#b4ff6d':cold?(g.kind==='photonTrail'?'#ff493f':'#68baff'):missile||power?'#ffa071':'#bce8c9';
    ctx.globalAlpha=fade*g.exhaust*(cold?.07:missile?.05:power?.025+g.damage*.008:.015);strokeSegments(g.segments,color,cold?(g.kind==='cometTrail'?11:6):missile?5:power?6+g.damage*2:4);
    ctx.globalAlpha=fade*g.exhaust*(cold?(g.kind==='cometTrail'?.4:.28):missile?.28+(power?.12:0):power?.16+g.damage*.025:.11);strokeSegments(g.segments,color,cold?(g.kind==='cometTrail'?2.3:1.5):missile?1.2:power?1.5+g.damage*.35:1);
  }
  ctx.restore();
}
function drawBlackHoles(){
  for(const h of game.blackHoles){const fade=Math.min(1,(h.max-h.age)/.35),r=20+Math.min(1,h.age/.18)*5;drawGravityOrb(ctx,h.x,h.y,r,h.age,fade,h.dust);}
}
function drawTurrets(){for(const t of game.turrets)if(!t.dead)drawAutoTurret(ctx,t,game.ground,glow);}
function drawShockwaves(){
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const wave of game.shockwaves){
    const r=shockwaveRadius(wave),wake=shockwaveRadius(wave,Math.max(0,wave.age-(wave.damaging?.12:.065))),fade=clamp(wave.life/wave.max,0,1)**(wave.damaging?.8:2);
    // One sharp moving front; its wake is a continuous translucent annulus, not extra rings.
    const gradient=ctx.createRadialGradient(wave.x,wave.y,Math.max(.1,wake*.85),wave.x,wave.y,r);
    gradient.addColorStop(0,wave.cold?'rgba(150,210,255,0)':'rgba(255,160,90,0)');gradient.addColorStop(.55,wave.cold?'rgba(160,220,255,.025)':'rgba(255,174,106,.025)');gradient.addColorStop(1,wave.cold?'rgba(205,240,255,.18)':'rgba(255,215,160,.18)');
    ctx.shadowBlur=0;ctx.globalAlpha=fade;ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(wave.x,wave.y,r,0,Math.PI*2);ctx.arc(wave.x,wave.y,Math.max(.1,wake*.85),0,Math.PI*2,true);ctx.fill();
    ctx.strokeStyle=wave.color||'#ffe3b4';ctx.lineWidth=wave.damaging?3.5:1.25+clamp((wave.damage-3)/6,0,1)*.6;ctx.globalAlpha=fade*.8;glow(ctx.strokeStyle,ctx.globalAlpha,wave.damaging?3.5:2);ctx.beginPath();ctx.arc(wave.x,wave.y,r,0,Math.PI*2);ctx.stroke();
  }ctx.restore();
}
function drawParticles(){
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
  const groups=new Map();
  for(const p of game.particles){
    if(p.gravityHeat>=.98)continue;const particleColor=p.gravityHeat!==undefined?gravityHeatColor(p.gravityHeat):p.color;
    if(p.kind==='rockDebris'){
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation);ctx.globalAlpha=particleBrightness(p);const r=p.size;line([[-r,-r*.4],[0,-r],[r,r*.3],[r*.2,r],[-r,-r*.4]],particleColor,.8);ctx.restore();continue;
    }
    if(p.kind==='dust'){
      ctx.save();ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;ctx.globalAlpha=particleBrightness(p);ctx.fillStyle=particleColor;ctx.beginPath();ctx.arc(p.x,p.y,p.size*(1+(1-p.life/p.max)*.8),0,Math.PI*2);ctx.fill();ctx.restore();continue;
    }
    const value=particleBrightness(p),level=Math.round(value*12);if(level<1)continue;
    const key=particleColor+':'+level;if(!groups.has(key))groups.set(key,{color:particleColor,alpha:level/12,segments:[]});
    const segments=groups.get(key).segments,speed=Math.hypot(p.vx,p.vy),length=Math.max(p.sparkle?1.1:.7,speed*(p.kind==='iceStreak'?.07:.018)),dx=p.vx/(speed||1)*length,dy=p.vy/(speed||1)*length;
    segments.push({x:p.x,y:p.y,ex:p.x-dx,ey:p.y-dy});
    if(p.sparkle&&value>.6){const r=1.5+value;segments.push({x:p.x-r,y:p.y,ex:p.x+r,ey:p.y},{x:p.x,y:p.y-r,ex:p.x,ey:p.y+r});}
  }
  for(const g of groups.values()){ctx.globalAlpha=g.alpha;strokeSegments(g.segments,g.color,1.1);}
  ctx.restore();
}
function drawLightning(onFlash=false){for(const cast of game.lightning)drawLightningCast(ctx,cast,canvas.width/480,onFlash);}
function drawSpaceDebris(){
  ctx.save();
  for(const p of game.spaceDebris){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation);ctx.globalAlpha=Math.min(1,p.life/1.5)*.85;ctx.fillStyle='#10191d';ctx.beginPath();p.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.strokeStyle=p.gravityHeat!==undefined?gravityHeatColor(p.gravityHeat):p.kind==='canopy'?'#d4efff':'#97bfd1';ctx.lineWidth=.85;glow(ctx.strokeStyle,ctx.globalAlpha);ctx.stroke();ctx.restore();}
  ctx.restore();
}
function drawEnemies(){
  for(const e of game.enemies){
    ctx.save();ctx.translate(e.x,e.y);const flare=(e.flare||0)*((e.hit||0)/(e.hitMax||.12))**.75,col=mixColor(e.frozen?'#8bdfff':e.acid?.length?'#a7ed70':e.kind==='torpedo'?'#ff493f':e.kind==='comet'?'#68baff':'#b5dded','#ffffff',flare*.7);ctx.globalAlpha=clamp(.85+flare*.15,0,1);if(e.frozen){ctx.save();ctx.globalCompositeOperation='lighter';ctx.shadowBlur=0;ctx.globalAlpha=.65;ctx.drawImage(pointSprite('#268dff'),-e.r*3,-e.r*3,e.r*6,e.r*6);ctx.restore();}
    if(e.acid?.length){for(const c of e.acid){const r=(.06+.94*Math.sqrt(c.age/c.max))*e.r;ctx.beginPath();ctx.rect(-150,-150,300,300);ctx.moveTo(c.x*e.r+r,c.y*e.r);ctx.arc(c.x*e.r,c.y*e.r,r,0,Math.PI*2);ctx.clip('evenodd');}}
    if(e.kind==='ufo'){
      ctx.fillStyle='#10191d';ctx.beginPath();ctx.ellipse(0,0,21,5,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=1;glow(col,ctx.globalAlpha,e.frozen?6:1+flare);ctx.stroke();
      ctx.beginPath();ctx.arc(0,-1,10,Math.PI,0);ctx.stroke();line([[-21,0],[-11,7],[11,7],[21,0]],col,1);
      for(let x=-10;x<=10;x+=10){ctx.fillStyle=e.frozen?'#75caff':e.fireTimer<.15?'#f5fcff':'#87cde7';glow(ctx.fillStyle);ctx.fillRect(x-1,1,2,2);}line([[0,8],[0,11]],'#aacfff',1);
    }else if(e.kind==='comet'){
      ctx.save();ctx.globalCompositeOperation='lighter';ctx.shadowBlur=0;ctx.globalAlpha=.72+flare*.28;ctx.drawImage(pointSprite('#68baff'),-64,-64,128,128);ctx.restore();
      ctx.rotate(e.frozen?e.frozenHeading:Math.atan2(e.vx,-e.vy));line([[0,-10],[-7,-3],[-5,6],[0,9],[6,4],[7,-4],[0,-10]],col,1.1);line([[0,-10],[2,1],[-5,6]],'#6eafca',.6);line([[-7,-3],[2,1],[7,-4]],'#86c1d7',.7);ctx.fillStyle='#ecfcff';glow(ctx.fillStyle,ctx.globalAlpha,2.5);ctx.fillRect(-1.5,-2,3,3);
    }else{
      ctx.rotate(e.frozen?e.frozenHeading:Math.atan2(e.vx,-e.vy));line([[0,-5],[-4,0],[0,5],[4,0],[0,-5]],col,1);ctx.fillStyle=e.frozen?'#b9f0ff':'#ffb4a6';glow(ctx.fillStyle,1,1.5);ctx.fillRect(-1,-1,2,2);
    }ctx.restore();
  }
}
function drawShield(){if(game.shieldHits||game.shieldFlash>0)drawShieldDome(ctx,240,game.ground,game.shieldRadius,game.shieldFlash/.3,game.shieldHits,glow,game.shieldCapacity===6?2:1);}
function drawCrystals(){
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.shadowBlur=0;
  for(const c of game.crystals){if(c.gravityHeat>=.98)continue;const color=c.gravityHeat!==undefined?gravityHeatColor(c.gravityHeat):c.color||'#d2efff';ctx.globalCompositeOperation=color==='#000000'?'source-over':'lighter';const age=c.max-c.life;ctx.globalAlpha=(c.life/c.max)**1.6*(.3+.7*(.5+.5*Math.sin(age*65+c.phase))**2);ctx.drawImage(pointSprite(color),c.x-7.5*c.size,c.y-7.5*c.size,16*c.size,16*c.size);}ctx.restore();
}
function drawSky(){
  const H=game.H,ground=game.ground;ctx.save();ctx.shadowBlur=0;
  const haze=ctx.createRadialGradient(240,ground+32,12,240,ground+32,260);haze.addColorStop(0,'rgba(133,197,175,.23)');haze.addColorStop(.38,'rgba(82,144,132,.13)');haze.addColorStop(1,'rgba(35,70,76,0)');ctx.fillStyle=haze;ctx.fillRect(0,Math.max(0,ground-235),480,270);
  for(const star of stars){const brightness=star.brightness*(.94+.06*Math.sin(skyTime*.4+star.phase));ctx.fillStyle=`rgba(181,208,214,${brightness})`;ctx.shadowBlur=0;ctx.fillRect(star.x,star.y*(H-45),star.r,star.r);}drawDistantMountains(ctx,ground);ctx.restore();
}
function draw(t){const H=game.H;ctx.setTransform(canvas.width/480,0,0,canvas.height/H,0,0);ctx.shadowBlur=0;ctx.fillStyle='#080c0e';ctx.fillRect(0,0,480,H);ctx.save();if(game.shake>0&&!reduced)ctx.translate((Math.random()-.5)*5,(Math.random()-.5)*5);drawSky();ctx.strokeStyle='#1b2926';ctx.lineWidth=.5;ctx.setLineDash([2,7]);ctx.beginPath();ctx.moveTo(160,game.baseTop-8);ctx.lineTo(160,H);ctx.moveTo(320,game.baseTop-8);ctx.lineTo(320,H);ctx.stroke();ctx.setLineDash([]);
// Sparse geometric landscape, safe flanks, and the bunker occupying the middle third.
const y=game.ground;line([[0,y],[23,y],[35,y-5],[51,y-2],[65,y-9],[87,y-8],[103,y-3],[122,y-6],[143,y],[160,y]],'#496356',.8);line([[320,y],[344,y-2],[361,y-9],[376,y-5],[392,y-5],[410,y-12],[425,y-3],[447,y-4],[465,y],[480,y]],'#496356',.8);line([[0,y+6],[480,y+6]],'#1e3026',.65);ctx.font='6px monospace';ctx.textAlign='center';ctx.fillStyle='#4d6a59';glow(ctx.fillStyle);ctx.fillText('SAFE GROUND',78,y+16);glow(ctx.fillStyle);ctx.fillText('SAFE GROUND',404,y+16);
if(game.state==='menu'){for(const a of demo){const b=a.preview??={...a};b.y=a.y*(H-60);b.rx=a.rx+demoTime*a.sx;b.ry=a.ry+demoTime*a.sy;b.rz=a.rz+demoTime*a.sz;mesh(b,.65);}}else{drawBurnIn();for(const a of game.asteroids)mesh(a);drawSpaceDebris();drawEnemies();for(const p of game.pickups){ctx.save();ctx.translate(p.x,p.y);const col=UPGRADE_COLORS[p.type]|| (p.type==='turret'?'#d2dfbe':p.type==='shield'?'#97dfff':p.type==='acid'?'#b4ff6d':p.type==='freeze'?'#80dfff':p.type==='gravity'?'#ff6575':p.type==='lightning'?'#b4dcff':p.type==='missile'?'#ffa071':'#bce8c9');ctx.globalAlpha=.82+Math.sin(p.t*6)*.18;line([[0,-16],[16,0],[0,16],[-16,0],[0,-16]],col,1.2);ctx.fillStyle='#0c1915';ctx.fillRect(-7,-7,14,14);ctx.fillStyle=col;ctx.textAlign='center';ctx.font='12px monospace';glow(col,ctx.globalAlpha);ctx.fillText(UPGRADE_ICONS[p.type]||{turret:'T',shield:'◡',triple:'Ⅲ',bounce:'↔',missile:'⋀',lightning:'ϟ',gravity:'●',freeze:'❄',acid:'≈'}[p.type],0,4);ctx.font='6px monospace';ctx.fillText(UPGRADE_LABELS[p.type]||{turret:'TURRET',shield:'SHIELD',triple:'TRIPLE',bounce:'BOUNCE',missile:'SWARM',lightning:'CHAIN',gravity:'GRAVITY',freeze:'FREEZE',acid:'ACID'}[p.type],0,27);ctx.restore();}
const lock=game.weapon==='missile'?game.findMissileTarget():game.weapon==='lightning'?game.lightningAim().target:null;
if(lock){const r=lock.r+9;ctx.save();ctx.setLineDash([]);for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]])line([[lock.x+sx*(r-6),lock.y+sy*r],[lock.x+sx*r,lock.y+sy*r],[lock.x+sx*r,lock.y+sy*(r-6)]],'#ffa071',1);ctx.font='7px monospace';ctx.textAlign='center';ctx.fillStyle='#ffa071';glow(ctx.fillStyle);ctx.fillText('LOCK',lock.x,lock.y-r-7);ctx.restore();}
for(const b of game.bullets){
  if(b.kind==='thruster'){drawThrusterMissile(ctx,b,glow);
  }else if(b.kind==='micro'){ctx.save();ctx.fillStyle='#f0ffff';glow(ctx.fillStyle,1,1.3);ctx.fillRect(b.x-.5,b.y-.5,1,1);ctx.restore();
  }else if(['seeker','mount'].includes(b.kind)){drawAdvancedBullet(ctx,b,glow);
  }else if(b.kind==='gravity'){drawGravityOrb(ctx,b.x,b.y,8,b.age);
  }else if(b.kind==='missile'){
    ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.heading);ctx.scale(.7,.7);line([[0,-5],[-2.5,3],[0,1],[2.5,3],[0,-5]],b.power?'#fff2cf':'#e1eee2',.85);const exhaust=b.exhaust??.12,speed=Math.hypot(b.vx,b.vy),length=Math.max(1,speed*.022*exhaust);ctx.globalAlpha=.35+exhaust*.65;line([[0,3],[0,3+length]],exhaust>.6?'#ffe4b2':'#ffa071',.6+exhaust*.8);ctx.restore();
  }else{const len=b.power?12:6,mag=Math.hypot(b.vx,b.vy);line([[b.x,b.y],[b.x-b.vx/mag*len,b.y-b.vy/mag*len]],b.kind==='plasma'?'#ff88c6':b.kind==='acid'?'#c3ff77':b.power?'#ffa071':'#d9f5e2',b.power?2:1.4);}
}
drawThrusterSight(ctx,game,canvas.width/480);drawReinforcements(ctx,game,glow);drawTethers(ctx,game,glow);drawShockwaves();for(const beam of game.freezeBeams)drawFreezeRay(ctx,beam);drawLightning();drawBlackHoles();drawParticles();drawCrystals();ctx.globalAlpha=1;}
drawTurrets();bunker(t);drawShield();drawArsenal(ctx,game,glow);if(game.lightningFlash>0){ctx.shadowBlur=0;ctx.globalAlpha=game.lightningFirstFrame?1:game.lightningFlash;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,480,H);ctx.globalAlpha=1;if(game.lightningFirstFrame)drawLightning(true);game.lightningFirstFrame=false;}if(game.flash>0){ctx.globalAlpha=game.flash*.4;ctx.fillStyle='#ffa071';ctx.fillRect(0,0,480,H);ctx.globalAlpha=1;}ctx.restore();}
function textValue(id,value){const el=$(id);if(String(el.textContent)!==String(value))el.textContent=value;}
function styleValue(id,key,value){const el=$(id);if(el.style[key]!==value)el.style[key]=value;}
function ammo(n){return n===Infinity?'∞':n}
function sync(){syncDebugStats();const pct=game.charge/game.chargeMax;textValue('health',game.health);styleValue('healthBar','width',game.health+'%');styleValue('healthBar','background',game.health<=30?'#ffa071':'#bce8c9');textValue('wave',String(game.wave||1).padStart(2,'0'));textValue('score',String(game.score).padStart(6,'0'));textValue('best','BEST '+String(best).padStart(6,'0'));textValue('weapon',NEW_WEAPONS.includes(game.weapon)?ARSENAL_NAMES[game.weapon].toUpperCase():{pulse:'PULSE CANNON',triple:'TRIPLE SHOT',bounce:'BOUNCING SHOTS',missile:'SWARM MISSILES',lightning:`CHAIN LIGHTNING [${ammo(game.lightningUses)}]`,gravity:`GRAVITY GUN [${ammo(game.gravityUses)}]`,freeze:`FREEZE RAY [${ammo(game.freezeUses)}]`,acid:'ACID SHOTGUN',seeker:`SEEKER BALLS [${ammo(game.seekerUses)}]`,repulser:`REPULSER [${ammo(game.repulserUses)}]`,mount:`ASTEROID TURRETS [${ammo(game.mountUses)}]`,chain:'CHAIN SHOT',thruster:`THRUSTER MISSILES [${ammo(game.thrusterUses)}]`}[game.weapon]);styleValue('chargeBar','width',pct*100+'%');if($('chargeBar').parentElement.classList.contains('full')!==(pct>=1))$('chargeBar').parentElement.classList.toggle('full',pct>=1);textValue('chargeLabel',game.holding?(pct>=1?(game.firesOnRelease?'RELEASE · SHOT + BLAST':'RELEASE · RADIAL BLAST'):`CHARGING ${game.charge.toFixed(1)} / ${game.chargeMax.toFixed(1)}s`):(game.weapon==='freeze'?'RELEASE TO FREEZE · HOLD 5s':game.weapon==='gravity'?'RELEASE TO IMPLODE · HOLD 5s':game.weapon==='lightning'?'RELEASE TO ARC · HOLD 5s':game.weapon==='missile'?(game.findMissileTarget()?'LOCK · HOLD 5s FOR BLAST':'AIM TO LOCK · HOLD 5s'):game.firesOnRelease?'RELEASE TO FIRE · HOLD 5s':'HOLD 5s · RADIAL BLAST'));textValue('recordTag',game.health+' HP');const disabled=game.state!=='playing';if(fire.disabled!==disabled)fire.disabled=disabled;if(aim.disabled!==disabled)aim.disabled=disabled;}
function loop(now){if(now+.5<nextRender||document.hidden){frame=requestAnimationFrame(loop);return;}if(game.state==='paused'&&lastDrawState==='paused'&&!viewDirty){last=now;frame=requestAnimationFrame(loop);return;}nextRender=now+1000/60-(Math.max(0,now-nextRender)%(1000/60));const dt=Math.min((now-last)/1000,.035);last=now;if(game.state==='menu')demoTime+=reduced?0:dt;game.update(dt);const motionDt=game.state==='menu'?dt:game.frameDt;if(!reduced&&(game.state==='menu'||game.state==='playing')){skyTime+=motionDt;moveStars(stars,motionDt,game.H-45);}if(soundEngine)soundEngine.setUfoActive(sound&&game.state==='playing'&&game.enemies.some(e=>e.kind==='ufo'&&!e.dead&&e.x>=-20&&e.x<=500));if(game.state==='playing'){let delta=0;if(keys.has('ArrowLeft')||keys.has('KeyA'))delta-=65*motionDt;if(keys.has('ArrowRight')||keys.has('KeyD'))delta+=65*motionDt;if(delta){aim.value=clamp(Number(aim.value)+delta,-72,72);onAim();}}if(toastUntil&&now>toastUntil){$('toast').classList.remove('visible');toastUntil=0;}if(bannerUntil&&now>bannerUntil){$('waveBanner').classList.remove('visible');bannerUntil=0;}draw(now/1000);recordDebugFrame(now);sync();lastDrawState=game.state;viewDirty=false;frame=requestAnimationFrame(loop);}
function start(){unlockAudio(true);keys.clear();releaseUI();game.debugOptions=debugOptions(debugPreferences);game.start();resetDebugStats();$('testTools').hidden=!game.debugOptions;aim.value=0;onAim();$('menu').hidden=true;$('pauseMenu').hidden=true;$('endMenu').hidden=true;$('pause').hidden=false;$('pause').setAttribute('aria-label','Pause game');sync();}
function releaseUI(){fire.classList.remove('held');firePointer=null;}
function onAim(){game.setAim(Number(aim.value));const v=Math.round(Number(aim.value));$('angle').textContent=(v<0?'−':v>0?'+':'')+String(Math.abs(v)).padStart(2,'0')+'°';}
aim.addEventListener('input',onAim);$('start').onclick=start;$('again').onclick=start;$('restart').onclick=start;
function pause(){if(game.state!=='playing')return;game.cancelFire();releaseUI();keys.clear();game.state='paused';viewDirty=true;if(soundEngine)soundEngine.setUfoActive(false);sync();$('pauseMenu').hidden=false;$('pause').setAttribute('aria-label','Resume game');}
function resume(){if(game.state!=='paused')return;resetDebugStats();unlockAudio();game.state='playing';$('pauseMenu').hidden=true;$('pause').setAttribute('aria-label','Pause game');last=performance.now();nextRender=0;viewDirty=true;syncDebugStats();}
$('pause').onclick=()=>game.state==='playing'?pause():resume();$('resume').onclick=resume;
fire.addEventListener('pointerdown',e=>{if(game.state!=='playing'||firePointer!==null)return;e.preventDefault();unlockAudio();firePointer=e.pointerId;fire.setPointerCapture(e.pointerId);fire.classList.add('held');game.beginFire();});
function endPointer(e){if(e.pointerId!==firePointer)return;e.preventDefault();if(e.type==='pointercancel'||e.type==='lostpointercapture')game.cancelFire();else game.endFire();releaseUI();}
fire.addEventListener('pointerup',endPointer);fire.addEventListener('pointercancel',endPointer);fire.addEventListener('lostpointercapture',endPointer);fire.addEventListener('contextmenu',e=>e.preventDefault());
const keys=new Set();window.addEventListener('keydown',e=>{if($('helpDialog').open||$('debugDialog').open||$('testDialog').open)return;const code=e.code;if(['Space','ArrowLeft','ArrowRight','KeyA','KeyD','KeyP','Escape'].includes(code))e.preventDefault();if((code==='KeyP'||code==='Escape')&&!e.repeat){game.state==='playing'?pause():resume();return;}if(game.state!=='playing')return;if(code==='Space'&&!keys.has(code)){unlockAudio();game.beginFire();fire.classList.add('held');}keys.add(code);});window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space'){game.endFire();releaseUI();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('blur',()=>pause());
$('help').onclick=()=>{helpPaused=game.state==='playing';if(helpPaused)pause();$('helpDialog').showModal();};$('helpDialog').addEventListener('close',()=>{if(helpPaused)resume();helpPaused=false;});$('swap').onclick=()=>{$('controls').classList.toggle('swapped');try{localStorage.setItem('last-bunker-swap',$('controls').classList.contains('swapped')?'1':'0');}catch{}};try{if(localStorage.getItem('last-bunker-swap')==='1')$('controls').classList.add('swapped');}catch{}
$('sound').onclick=()=>{
  if(sound&&audioNeedsTap){unlockAudio(true);return;}
  sound=!sound;try{localStorage.setItem('last-bunker-sound',sound?'1':'0');}catch{}
  if(soundEngine)soundEngine.setEnabled(sound);soundUI();if(sound)unlockAudio(true);
};
let debugPaused=false,testPaused=false;
function setupSummary(){$('debugSummary').textContent=debugPreferences.mode==='normal'?'NORMAL RUN':debugPreferences.mode==='all'?'DEBUG · ALL WEAPONS + BOOSTS':`DEBUG · ${debugPreferences.weapons.length} WEAPONS / ${debugPreferences.boosts.length} BOOSTS`;}
function updateDebugChoices(){const custom=$('debugMode').value==='custom';for(const key of [...Object.keys(DEBUG_WEAPONS),...Object.keys(DEBUG_BOOSTS)])$('debugPick-'+key).disabled=!custom;$('debugChoices').hidden=!custom;$('debugError').hidden=true;}
function openDebugSetup(){debugPaused=game.state==='playing';if(debugPaused)pause();$('debugMode').value=debugPreferences.mode;for(const key of Object.keys(DEBUG_WEAPONS))$('debugPick-'+key).checked=debugPreferences.weapons.includes(key);for(const key of Object.keys(DEBUG_BOOSTS))$('debugPick-'+key).checked=debugPreferences.boosts.includes(key);updateDebugChoices();$('debugDialog').showModal();}
for(const id of ['debugSetup','pauseDebugSetup','endDebugSetup'])$(id).onclick=openDebugSetup;
$('debugMode').addEventListener('change',updateDebugChoices);
$('saveDebug').onclick=()=>{const value={mode:$('debugMode').value,weapons:Object.keys(DEBUG_WEAPONS).filter(key=>$('debugPick-'+key).checked),boosts:Object.keys(DEBUG_BOOSTS).filter(key=>$('debugPick-'+key).checked)};if(value.mode==='custom'&&!value.weapons.length){$('debugError').hidden=false;return;}debugPreferences=saveDebug(localStorage,value);setupSummary();$('debugDialog').close();};
$('debugDialog').addEventListener('close',()=>{if(debugPaused)resume();debugPaused=false;});
$('testTools').onclick=()=>{if(!game.debugOptions)return;testPaused=game.state==='playing';if(testPaused)pause();for(const key of Object.keys(DEBUG_WEAPONS)){$('testOption-'+key).disabled=!game.debugOptions.weapons.includes(key);$('testOption-'+key).hidden=$('testOption-'+key).disabled;}for(const key of Object.keys(DEBUG_BOOSTS))$('testBoost-'+key).hidden=!game.debugOptions.boosts.includes(key);$('testWeapon').value=game.weapon;$('testFeedback').textContent='';$('testDialog').showModal();};
$('equipTestWeapon').onclick=()=>{if(game.equipDebug($('testWeapon').value)){$('testFeedback').textContent=DEBUG_WEAPONS[game.weapon]+' equipped.';viewDirty=true;sync();}};
for(const key of Object.keys(DEBUG_BOOSTS))$('testBoost-'+key).onclick=()=>{if(game.activateDebug(key)){$('testFeedback').textContent=DEBUG_BOOSTS[key]+' activated.';viewDirty=true;sync();}};
$('returnTest').onclick=()=>$('testDialog').close();
$('testDialog').addEventListener('close',()=>{if(testPaused)resume();testPaused=false;});
setupSummary();soundUI();
sync();requestAnimationFrame(loop);
