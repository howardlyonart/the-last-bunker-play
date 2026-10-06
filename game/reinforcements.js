import {NEW_WEAPONS,NEW_BOOSTS} from './arsenal.js?v=b0edb1b3bbff';
// Reinforcements use gameplay time, so pause and lightning stop their timers.
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const distanceToPath=(x,y,p)=>{const dx=p.ex-p.x,dy=p.ey-p.y,u=clamp(((x-p.x)*dx+(y-p.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-p.x-u*dx,y-p.y-u*dy);};
export const LATE_WEAPONS=['freeze','acid','lightning','gravity','seeker','repulser','mount','chain','thruster',...NEW_WEAPONS];
export const BONUS_TYPES=['drone','minelayer','shield2','turret2',...NEW_BOOSTS];
export function resetReinforcements(g){g.drones=[];g.minelayers=[];g.mines=[];g.seekerUses=0;g.repulserUses=0;g.mountUses=0;g.shieldCapacity=3;g.groundTurretLevel=1;g.nextSupportDrop=18;g.supportDrops=0;}
export function obliterate(g,a){if(a.dead||a.mounted)return;if(a.frozen)g.shatterFrozen(a);else g.destroy(a,false,false);}
export function mountAsteroid(g,a){
  if(a.dead||a.mounted)return;
  if(a.frozen){g.shatterFrozen(a);return;}
  if(a.kind){g.hit(a,3,{x:a.x,y:a.y,weapon:'mount'});return;}
  g.freezeThreat(a);g.destroy(a,true,false);a.dead=false;a.mounted={aim:0,recoil:0,cooldown:.3,shotTimer:0,burstRemaining:0};a.gravityWarp=null;a.gravityPull=false;g.event('asteroid-turret');
}
export function destroyMount(g,a){if(a.dead||!a.mounted)return;a.dead=true;g.frozenBurst(a);g.impactBurst(a.x,a.y,'missile',4);g.event('mount-destroyed');}
export function launchAdvanced(g){
  const type=g.weapon,key=type+'Uses';if(g[key]<=0)return;const m=g.muzzle;
  if(type==='repulser'){const max=.85;g.shockwaves.push({x:240,y:g.ground-13,age:0,life:max,max,radius:Math.hypot(480,g.H)+60,damaging:true,lethal:true,damage:99,hit:new Set(),color:'#e9baff',cold:true});g.flash=.16;g.shake=.2;}
  else{const speed=type==='seeker'?200:540;g.bullets.push({...m,px:m.x,py:m.y,vx:Math.sin(g.aim)*speed,vy:-Math.cos(g.aim)*speed,r:type==='seeker'?6:3,damage:type==='seeker'?10:0,life:type==='seeker'?6:2.5,age:0,kind:type,weapon:type,dead:false});}
  g[key]--;g.fired++;g.recoil=type==='repulser'?14:9;g.event(type+'-shot',{uses:g[key]});if(!g[key]){g.weapon='missile';g.event('special-empty',{weapon:type});}
}
export function steerSeeker(g,b,dt){
  b.age+=dt;let target=null,best=280;
  for(const a of g.targets){if(a.dead||a.y+a.r<0)continue;const d=Math.hypot(a.x-b.x,a.y-b.y);if(d<best){best=d;target=a;}}
  if(target){const dx=target.x-b.x,dy=target.y-b.y,force=360+700*(1-best/280);b.vx+=dx/Math.max(1,best)*force*dt;b.vy+=dy/Math.max(1,best)*force*dt;}
  const speed=Math.hypot(b.vx,b.vy);if(speed>560){b.vx*=560/speed;b.vy*=560/speed;}
}
export function deployBonus(g,type,p){
  if(type==='drone'){g.drones.push({x:clamp(p.x,25,455),y:clamp(p.y,40,g.ground-100),age:0,life:20,heading:0,vx:0,vy:0,cooldown:.15,shotTimer:0,burstRemaining:0,phase:g.rng()*6.28});if(g.drones.length>3)g.drones.shift();g.event('drone-up');return;}
  if(type==='minelayer'){g.minelayers.push({x:clamp(p.x,0,480),y:clamp(p.y,0,g.ground),age:0,heading:0,dropTimer:.35,dropped:0,phase:g.rng()*6.28,vx:0,vy:0});if(g.minelayers.length>3)g.minelayers.shift();g.event('minelayer-up');return;}
  if(type==='shield2'){g.shieldCapacity=6;g.shieldHits=6;g.shieldFlash=.3;g.event('shield-up',{hits:6});g.spark(p.x,p.y,24,'#a2c9ff');return;}
  if(type==='turret2'){g.groundTurretLevel=2;while(g.turretUpgrades<2)g.addTurret();for(const t of g.turrets){t.level=2;t.hp=3;t.dead=false;t.cooldown=.35;t.burstRemaining=0;}g.event('turret-level2');}
}
function closest(g,x,y){let target=null,best=Infinity;for(const a of g.targets){if(a.dead||a.x<0||a.x>480||a.y<0||a.y>g.ground-30)continue;const d=Math.hypot(a.x-x,a.y-y);if(d<best){target=a;best=d;}}return target;}
function tinyRound(g,x,y,a,source){g.bullets.push({x,y,px:x,py:y,vx:Math.sin(a)*620,vy:-Math.cos(a)*620,damage:1,life:1.6,weapon:'pulse',kind:'micro',r:.5,source,dead:false});}
export function updateReinforcements(g,dt){
  for(const d of g.drones){
    const old={x:d.x,y:d.y};d.age+=dt;d.life-=dt;
    const target=closest(g,d.x,d.y),tx=240+175*Math.sin(d.age*.75+d.phase),ty=clamp(g.ground*.42+g.ground*.2*Math.sin(d.age*.95+d.phase),35,g.ground-95),dx=tx-d.x,dy=ty-d.y,len=Math.hypot(dx,dy),speed=Math.min(135,len*2);d.vx=dx/Math.max(1,len)*speed;d.vy=dy/Math.max(1,len)*speed;d.x+=d.vx*dt;d.y+=d.vy*dt;d.heading=Math.atan2(d.vx,-d.vy);g.addTrail({x:old.x,y:old.y,ex:d.x,ey:d.y},1,'droneTrail');g.trails.at(-1).max=g.trails.at(-1).life=.4;
    d.cooldown-=dt;d.shotTimer-=dt;
    if(target&&d.cooldown<=0&&!d.burstRemaining){d.burstRemaining=6;d.shotTimer=0;d.cooldown=1.2;}
    if(target&&d.burstRemaining>0&&d.shotTimer<=0){const aim=Math.atan2(target.x-d.x,d.y-target.y);tinyRound(g,d.x,d.y,aim,'drone');d.burstRemaining--;d.shotTimer=.07;g.event('drone-shot');}
    if(!target)d.burstRemaining=0;
  }g.drones=g.drones.filter(d=>d.life>0);
  for(const c of g.minelayers){
    const old={x:c.x,y:c.y};c.age+=dt;c.dropTimer-=dt;
    if(c.dropped<10){const tx=240+185*Math.sin(c.age*1.05+c.phase),ty=clamp(g.ground*.42+g.ground*.24*Math.sin(c.age*.66+c.phase),35,g.ground-85),dx=tx-c.x,dy=ty-c.y,len=Math.hypot(dx,dy),speed=Math.min(110,len*2);c.vx=dx/Math.max(1,len)*speed;c.vy=dy/Math.max(1,len)*speed;}
    else{c.vx=c.x<240?-130:130;c.vy=-65;}
    c.x+=c.vx*dt;c.y+=c.vy*dt;c.heading=Math.atan2(c.vx,-c.vy);g.addTrail({x:old.x,y:old.y,ex:c.x,ey:c.y},1,'droneTrail');
    if(c.dropped<10&&c.dropTimer<=0){c.dropTimer=.62;c.dropped++;g.mines.push({x:c.x,y:c.y,anchorX:c.x,anchorY:c.y,r:8,age:0,phase:g.rng()*6.28,dead:false});if(g.mines.length>30)g.mines.shift();g.event('mine-drop');}
  }g.minelayers=g.minelayers.filter(c=>c.dropped<10||(c.x>-40&&c.x<520&&c.y>-40));
  for(const m of g.mines)updateMineOrbit(g,m,dt);g.mines=g.mines.filter(m=>!m.dead);
  for(const a of g.asteroids){if(a.dead||!a.mounted)continue;const t=a.mounted;t.recoil*=Math.exp(-dt*15);t.cooldown-=dt;t.shotTimer-=dt;const target=closest(g,a.x,a.y);if(!target){t.burstRemaining=0;continue;}t.aim=Math.atan2(target.x-a.x,a.y-target.y);if(t.cooldown<=0&&!t.burstRemaining){t.burstRemaining=3;t.shotTimer=0;t.cooldown=1.4;}if(t.burstRemaining&&t.shotTimer<=0){tinyRound(g,a.x+Math.sin(t.aim)*(a.r+9),a.y-Math.cos(t.aim)*(a.r+9),t.aim,'mount');t.burstRemaining--;t.shotTimer=.12;t.recoil=2;g.event('drone-shot');}}
  const mounts=g.asteroids.filter(a=>!a.dead&&a.mounted);
  if(mounts.length||g.mines.length)for(const a of g.targets)if(!a.dead)reinforcementContact(g,a,{x:a.x,y:a.y,ex:a.x,ey:a.y},mounts);
  g.limitEffects();
}
export function updateMineOrbit(g,m,dt){
  m.anchorX??=m.x;m.anchorY??=m.y;m.px=m.x;m.py=m.y;m.age+=dt;
  const phase=m.phase||0,angle=m.age*.28+phase,radius=9+2*Math.sin(m.age*.23+phase*1.7),ease=Math.min(1,m.age/4);
  m.x=clamp(m.anchorX+ease*(Math.cos(angle)*radius+2*Math.sin(m.age*.53+phase*.7)),8,472);
  m.y=clamp(m.anchorY+ease*(Math.sin(angle)*radius*.75+2*Math.sin(m.age*.39+phase*1.3)),8,g.ground-12);
}
export function reinforcementContact(g,e,path,mounts=g.asteroids){
  if(e.dead||e.mounted)return false;
  for(const a of mounts){if(a.dead||!a.mounted)continue;if(distanceToPath(a.x,a.y,path)<=a.r+e.r){destroyMount(g,a);g.hit(e,2,{x:a.x,y:a.y,weapon:'missile'});return e.dead;}}
  for(const m of g.mines){if(m.dead)continue;if(distanceToPath(m.x,m.y,path)<=m.r+e.r||(m.px!==undefined&&distanceToPath(e.x,e.y,{x:m.px,y:m.py,ex:m.x,ey:m.y})<=m.r+e.r)){m.dead=true;g.impactBurst(m.x,m.y,'missile',9);g.event('mine-explosion');for(const p of [...g.pickups])if(!p.dead&&Math.hypot(p.x-m.x,p.y-m.y)<=76)g.collect(p);for(const a of [...g.targets])if(!a.dead&&(a===e||Math.hypot(a.x-m.x,a.y-m.y)<=60+a.r))g.hit(a,9,{x:m.x,y:m.y,weapon:'missile'});return e.dead;}}
  return false;
}
