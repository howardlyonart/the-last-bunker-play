// Additional weapons share the game's simulation clock and bounded effect budget.
export const NEW_WEAPONS=['railgun','flak','prism','singularity','disc','plasma'];
export const NEW_BOOSTS=['interceptor','magnet','armor','overdrive'];
export const ARSENAL_NAMES={railgun:'Railgun',flak:'Flak cannon',prism:'Prism laser',singularity:'Singularity tether',disc:'Ricochet disc',plasma:'Plasma brand',interceptor:'Interceptor battery',magnet:'Salvage magnet',armor:'Reactive armor',overdrive:'Overdrive capacitor'};
export const ARSENAL_COLORS={railgun:'#bdefff',flak:'#ffd393',prism:'#e9b8ff',singularity:'#a78cff',disc:'#b3ffd4',plasma:'#ff88c6',interceptor:'#9bdfff',magnet:'#8dffe1',armor:'#ffc18e',overdrive:'#ffffab'};
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function distance(x,y,s){const dx=s.ex-s.x,dy=s.ey-s.y,u=clamp(((x-s.x)*dx+(y-s.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-s.x-dx*u,y-s.y-dy*u);}
export function resetArsenal(g){g.arsenalShots=[];g.energyLines=[];g.singularityLinks=[];g.brands=[];g.prismSoundTime=-1;g.interceptor=false;g.interceptorCooldown=0;g.salvageMagnet=false;g.reactiveArmor=0;g.overdriveCapacitor=false;g.overdriveTime=0;}
function line(g,s,color,width=2,life=.15){g.energyLines.push({...s,color,width,life,max:life});if(g.energyLines.length>96)g.energyLines.shift();}
function beam(g,s,damage,pierce=1,color=ARSENAL_COLORS.railgun,ignore=null){
  const dx=s.ex-s.x,dy=s.ey-s.y,den=dx*dx+dy*dy||1;
  const hits=g.targets.filter(a=>a!==ignore&&!a.dead&&distance(a.x,a.y,s)<=a.r+2).map(a=>({a,u:((a.x-s.x)*dx+(a.y-s.y)*dy)/den})).sort((a,b)=>a.u-b.u);
  let first=null;for(const {a} of hits){if(!pierce--)break;first??=a;g.hit(a,damage,{x:a.x,y:a.y,weapon:'pulse'});}
  for(const p of [...g.pickups])if(!p.dead&&distance(p.x,p.y,s)<=16)g.collect(p);
  line(g,color===ARSENAL_COLORS.prism&&first?{...s,ex:first.x,ey:first.y}:s,color,color===ARSENAL_COLORS.railgun?3:1.8);return first;
}
export function fireArsenal(g){
  if(!NEW_WEAPONS.includes(g.weapon))return false;
  const weapon=g.weapon,m=g.muzzle,dx=Math.sin(g.aim),dy=-Math.cos(g.aim),length=Math.hypot(480,g.H)+100,s={...m,ex:m.x+dx*length,ey:m.y+dy*length};
  if(weapon==='railgun'){const charge=clamp(g.charge/g.chargeMax,0,1);beam(g,s,3+charge*12,2+Math.floor(charge*6));}
  if(weapon==='prism'){const a=beam(g,s,.65,1,ARSENAL_COLORS.prism);if(a){const heading=Math.atan2(dx,dy);for(const offset of [-.28,0,.28])beam(g,{x:a.x,y:a.y,ex:a.x+Math.sin(heading+offset)*length,ey:a.y+Math.cos(heading+offset)*length},.24,3,ARSENAL_COLORS.prism,a);}}
  if(weapon==='flak'){const travel=clamp(90+g.charge/g.chargeMax*(g.H-120),60,length*.8);g.arsenalShots.push({...m,vx:dx*330,vy:dy*330,age:0,life:3,kind:'flak',fuse:travel/330});}
  if(weapon==='singularity'){
    const targets=g.targets.filter(a=>!a.dead&&!a.frozen&&a.y>0&&a.y<g.baseTop).sort((a,b)=>distance(a.x,a.y,s)-distance(b.x,b.y,s));
    const a=targets[0],b=a&&targets.slice(1).sort((b,c)=>(b.x-a.x)**2+(b.y-a.y)**2-((c.x-a.x)**2+(c.y-a.y)**2))[0];
    if(a&&b){g.singularityLinks.push({a,b,life:3});if(g.singularityLinks.length>6)g.singularityLinks.shift();line(g,{...m,ex:a.x,ey:a.y},ARSENAL_COLORS.singularity);}
    else line(g,s,ARSENAL_COLORS.singularity,1);
    for(const p of [...g.pickups])if(!p.dead&&distance(p.x,p.y,s)<=16)g.collect(p);
  }
  if(weapon==='disc')g.arsenalShots.push({...m,vx:dx*360,vy:dy*360,age:0,life:3,kind:'disc',hit:new Set(),returning:false});
  if(weapon==='plasma')g.bullets.push({...m,px:m.x,py:m.y,vx:dx*490,vy:dy*490,damage:2,life:2.5,weapon:'plasma',kind:'plasma',dead:false});
  if(g.arsenalShots.length>48)g.arsenalShots.shift();g.recoil=Math.max(g.recoil,weapon==='railgun'?10:4);g.fired++;if(weapon!=='prism'||g.time-(g.prismSoundTime??-1)>.25){g.prismSoundTime=g.time;g.event('shot',{weapon,damage:weapon==='railgun'?5:2});}return true;
}
export function markPlasma(g,a,damage=2){if(a.dead||a.mounted)return;const existing=g.brands.find(b=>b.target===a);if(existing){existing.damage=Math.max(existing.damage,damage);return;}g.brands.push({target:a,damage,life:12});if(g.brands.length>32)g.brands.shift();}
export function collectArsenal(g,type){
  if(!NEW_BOOSTS.includes(type))return false;
  if(type==='interceptor')g.interceptor=true;if(type==='magnet')g.salvageMagnet=true;if(type==='armor')g.reactiveArmor=1;if(type==='overdrive')g.overdriveCapacitor=true;
  g.event('arsenal-boost',{type});return true;
}
export function retaliate(g){
  g.reactiveArmor=0;g.event('armor-hit');g.spark(240,g.baseTop,24,ARSENAL_COLORS.armor);
  for(let i=0;i<15;i++){const angle=(i-7)*.08;g.bullets.push({x:240,y:g.baseTop-4,px:240,py:g.baseTop-4,vx:Math.sin(angle)*580,vy:-Math.cos(angle)*580,damage:2,life:.5,weapon:'pulse',dead:false});}
}
export function updateArsenal(g,dt){
  g.overdriveTime=Math.max(0,g.overdriveTime-dt);
  for(const l of g.energyLines)l.life-=dt;g.energyLines=g.energyLines.filter(l=>l.life>0);
  if(g.state!=='playing')return;
  if(g.salvageMagnet)for(const p of g.pickups){if(p.dead||Math.hypot(p.x-240,p.y-g.baseTop)>220)continue;const dx=240-p.x,dy=g.baseTop-p.y,d=Math.hypot(dx,dy)||1;p.vx=(p.vx||0)*Math.exp(-dt*5)+dx/d*220*dt;p.vy=(p.vy||0)*Math.exp(-dt*3)+dy/d*220*dt;}
  g.interceptorCooldown-=dt;
  if(g.interceptor&&g.interceptorCooldown<=0){const target=g.enemies.filter(e=>!e.dead&&!e.frozen&&e.kind==='torpedo'&&e.y>0).sort((a,b)=>Math.hypot(a.x-240,a.y-g.baseTop)/Math.max(1,Math.hypot(a.vx,a.vy))-Math.hypot(b.x-240,b.y-g.baseTop)/Math.max(1,Math.hypot(b.vx,b.vy)))[0];if(target){g.arsenalShots.push({x:240,y:g.baseTop-6,vx:0,vy:-420,age:0,life:2,kind:'interceptor',target});g.interceptorCooldown=.4;g.event('shot',{weapon:'missile',damage:1});}}
  for(const l of g.singularityLinks){
    const {a,b}=l;l.life-=dt;if(a.dead||b.dead||a.mounted||b.mounted||a.frozen||b.frozen){l.life=0;continue;}const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,force=420*dt;
    a.vx+=dx/d*force;a.vy+=dy/d*force;b.vx-=dx/d*force;b.vy-=dy/d*force;
    if(d<=a.r+b.r+2){l.life=0;g.hit(a,8,{x:a.x,y:a.y,weapon:'missile'});g.hit(b,8,{x:b.x,y:b.y,weapon:'missile'});}
  }g.singularityLinks=g.singularityLinks.filter(l=>l.life>0);
  const remaining=[];for(const b of g.brands){b.life-=dt;if(b.target.dead){const old=b.target;let next=null,best=180;for(const a of g.targets){if(a.dead||a.mounted||a===old)continue;const d=Math.hypot(a.x-old.x,a.y-old.y);if(d<best){best=d;next=a;}}if(next){line(g,{x:old.x,y:old.y,ex:next.x,ey:next.y},ARSENAL_COLORS.plasma,3,.25);b.target=next;b.damage=Math.min(20,b.damage+2);b.life=12;g.hit(next,b.damage,{x:next.x,y:next.y,weapon:'pulse'});}else b.life=0;}if(b.life>0)remaining.push(b);}g.brands=remaining;
  // Capture once: damage can create fragments, but these shots see those next frame.
  const targets=g.arsenalShots.length?g.targets:[];
  for(const b of g.arsenalShots){
    const px=b.x,py=b.y;b.age+=dt;b.life-=dt;
    if(b.kind==='disc'&&b.age>.9){if(!b.returning){b.returning=true;b.hit.clear();}const m=g.muzzle,dx=m.x-b.x,dy=m.y-b.y,d=Math.hypot(dx,dy)||1;b.vx=dx/d*420;b.vy=dy/d*420;if(d<14)b.life=0;}
    if(b.kind==='interceptor'){if(b.target.dead){b.life=0;continue;}const dx=b.target.x-b.x,dy=b.target.y-b.y,d=Math.hypot(dx,dy)||1;b.vx=dx/d*460;b.vy=dy/d*460;}
    b.x+=b.vx*dt;b.y+=b.vy*dt;const path={x:px,y:py,ex:b.x,ey:b.y};
    for(const p of [...g.pickups])if(!p.dead&&distance(p.x,p.y,path)<(b.kind==='disc'?23:19))g.collect(p);
    if(b.kind==='flak'&&b.age>=b.fuse){b.life=0;g.spark(b.x,b.y,18,ARSENAL_COLORS.flak);for(let i=0;i<18;i++){const angle=i*Math.PI/9;g.bullets.push({x:b.x,y:b.y,px:b.x,py:b.y,vx:Math.cos(angle)*420,vy:Math.sin(angle)*420,damage:1.5,life:.22,weapon:'pulse',dead:false});}}
    if(b.kind==='disc'){for(const a of targets)if(!a.dead&&!b.hit.has(a)&&distance(a.x,a.y,path)<=a.r+7){b.hit.add(a);g.hit(a,3,{x:a.x,y:a.y,weapon:'pulse'});}for(const p of [...g.pickups])if(!p.dead&&distance(p.x,p.y,path)<23)g.collect(p);if(!b.returning){if(b.x<8||b.x>472){b.x=clamp(b.x,8,472);b.vx=-b.vx;}if(b.y<8||b.y>g.baseTop-10){b.y=clamp(b.y,8,g.baseTop-10);b.vy=-b.vy;}}}
    if(b.kind==='interceptor'&&distance(b.target.x,b.target.y,path)<b.target.r+4){g.hit(b.target,2,{x:b.target.x,y:b.target.y,weapon:'missile'});b.life=0;}
    g.addTrail(path,1,b.kind==='disc'?'droneTrail':'bullet');
  }g.arsenalShots=g.arsenalShots.filter(b=>b.life>0&&b.x>-50&&b.x<530&&b.y>-50&&b.y<g.H+50);if(g.arsenalShots.length>48)g.arsenalShots.splice(0,g.arsenalShots.length-48);g.limitEffects();
}
export function drawArsenal(ctx,g,glow){
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
  const stroke=(s,color,width,alpha=1)=>{ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;glow(color,alpha,2);ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.ex,s.ey);ctx.stroke();};
  for(const l of g.energyLines)stroke(l,l.color,l.width,l.life/l.max);
  for(const l of g.singularityLinks)stroke({x:l.a.x,y:l.a.y,ex:l.b.x,ey:l.b.y},ARSENAL_COLORS.singularity,2,.65+.25*Math.sin(g.time*20));
  for(const b of g.brands)if(!b.target.dead){ctx.globalAlpha=.7+.3*Math.sin(g.time*12);ctx.strokeStyle=ARSENAL_COLORS.plasma;glow(ctx.strokeStyle);ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(b.target.x,b.target.y,b.target.r+4,0,Math.PI*2);ctx.stroke();}
  for(const b of g.arsenalShots){const color=ARSENAL_COLORS[b.kind];ctx.globalAlpha=1;ctx.strokeStyle=color;glow(color);ctx.lineWidth=1.5;ctx.beginPath();if(b.kind==='disc'){ctx.arc(b.x,b.y,7,0,Math.PI*2);const a=b.age*25;ctx.moveTo(b.x-Math.cos(a)*9,b.y-Math.sin(a)*9);ctx.lineTo(b.x+Math.cos(a)*9,b.y+Math.sin(a)*9);}else{ctx.moveTo(b.x-3,b.y+4);ctx.lineTo(b.x,b.y-5);ctx.lineTo(b.x+3,b.y+4);}ctx.stroke();}
  if(NEW_WEAPONS.includes(g.weapon)){
    const m=g.muzzle;ctx.save();ctx.translate(m.x,m.y);ctx.rotate(g.aim);ctx.globalAlpha=1;ctx.strokeStyle=ARSENAL_COLORS[g.weapon];glow(ctx.strokeStyle,1,2);ctx.lineWidth=1.3;ctx.beginPath();
    if(g.weapon==='railgun'){for(const x of [-4,4]){ctx.moveTo(x,14);ctx.lineTo(x,-9);}for(const y of [2,7,12]){ctx.moveTo(-5,y);ctx.lineTo(5,y);}}
    if(g.weapon==='flak'){ctx.moveTo(-7,10);ctx.lineTo(-9,-3);ctx.lineTo(9,-3);ctx.lineTo(7,10);}
    if(g.weapon==='prism'){ctx.moveTo(0,-9);ctx.lineTo(-6,0);ctx.lineTo(0,6);ctx.lineTo(6,0);ctx.lineTo(0,-9);}
    if(g.weapon==='singularity'){ctx.arc(0,0,7,0,Math.PI*2);ctx.moveTo(-10,-5);ctx.lineTo(-10,5);ctx.moveTo(10,-5);ctx.lineTo(10,5);}
    if(g.weapon==='disc'){ctx.moveTo(-9,5);ctx.lineTo(-9,-3);ctx.lineTo(9,-3);ctx.lineTo(9,5);ctx.moveTo(-5,1);ctx.lineTo(5,1);}
    if(g.weapon==='plasma'){ctx.arc(0,0,5,0,Math.PI*2);ctx.moveTo(8,0);ctx.arc(0,0,8,0,Math.PI*2);}
    ctx.stroke();ctx.restore();
  }
  ctx.globalAlpha=1;ctx.font='6px monospace';ctx.textAlign='center';ctx.shadowBlur=0;const boosts=[];if(g.interceptor)boosts.push('INTERCEPT');if(g.salvageMagnet)boosts.push('MAGNET');if(g.reactiveArmor)boosts.push('ARMOR');if(g.overdriveCapacitor)boosts.push(g.overdriveTime>0?'OVERDRIVE ACTIVE':'CAPACITOR');if(boosts.length){ctx.fillStyle=g.overdriveTime>0?'#ffffab':'#89c1b1';ctx.fillText(boosts.join(' · '),240,g.ground+24);}ctx.restore();
}
