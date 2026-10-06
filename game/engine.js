import {NEW_WEAPONS,resetArsenal,fireArsenal,updateArsenal,collectArsenal,markPlasma,retaliate} from './arsenal.js?v=b0edb1b3bbff';
import {resetTethers,launchChain,launchThruster,attachThruster,accelerateThruster,awardThrusterEscape,updateChains} from './tether-weapons.js?v=b0edb1b3bbff';
import {LATE_WEAPONS,BONUS_TYPES,resetReinforcements,launchAdvanced,steerSeeker,deployBonus,updateReinforcements,reinforcementContact,mountAsteroid,destroyMount,obliterate} from './reinforcements.js?v=b0edb1b3bbff';
import {taperLightning,prepareLightningBolts,lightningWidthAt} from './lightning-art.js?v=b0edb1b3bbff';
export const SIZE = [
  {radius:8, hp:1, damage:5, score:25},
  {radius:17, hp:4, damage:20, score:75},
  {radius:31, hp:9, damage:50, score:150}
];
export const ASTEROID_COLORS=[{front:'#c7dcd5',back:'#465e57'},{front:'#ddd0b8',back:'#655948'},{front:'#d5bcc8',back:'#604b58'},{front:'#bdcede',back:'#465568'},{front:'#c7c0da',back:'#534b63'},{front:'#d1d4b5',back:'#585d43'}];
export const WEAPONS=['pulse','triple','bounce','missile','lightning','gravity','freeze','acid','seeker','repulser','mount','chain','thruster',...NEW_WEAPONS];
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function radialRadius(w,age=w.age){const u=clamp(age/w.max,0,1),k=w.damaging?2.1:4.6;return 3+(w.radius-3)*(1-Math.exp(-k*u))/(1-Math.exp(-k));}
export const angleDifference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function segmentDistance(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay;const u=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(px-ax-u*dx,py-ay-u*dy);}
// Trace a ray through the rectangular playfield, preserving its remaining distance at each reflection.
export function reflectedPath(x,y,dx,dy,distance,width,height){
  const norm=Math.hypot(dx,dy)||1;dx/=norm;dy/=norm;x=clamp(x,0,width);y=clamp(y,0,height);
  const segments=[];let reflections=0,remaining=distance;
  for(let i=0;i<32&&remaining>1e-7;i++){
    const tx=Math.abs(dx)<1e-9?Infinity:(dx>0?width-x:-x)/dx;
    const ty=Math.abs(dy)<1e-9?Infinity:(dy>0?height-y:-y)/dy;
    const edge=Math.min(tx,ty),travel=Math.min(remaining,Math.max(0,edge));
    const ex=clamp(x+dx*travel,0,width),ey=clamp(y+dy*travel,0,height);
    if(travel>1e-7)segments.push({x,y,ex,ey});x=ex;y=ey;remaining-=travel;
    if(edge<=travel+1e-7){if(Math.abs(tx-edge)<1e-7)dx=-dx;if(Math.abs(ty-edge)<1e-7)dy=-dy;reflections++;}
    else break;
  }
  return {segments,x,y,dx,dy,reflections};
}
function circleEntry(s,x,y,r){
  // Reject distant circles before solving the swept intersection quadratic.
  if(x+r<Math.min(s.x,s.ex)||x-r>Math.max(s.x,s.ex)||y+r<Math.min(s.y,s.ey)||y-r>Math.max(s.y,s.ey))return null;
  const dx=s.ex-s.x,dy=s.ey-s.y,ox=s.x-x,oy=s.y-y,a=dx*dx+dy*dy;
  const c=ox*ox+oy*oy-r*r;if(c<=0)return 0;if(a<1e-12)return null;
  const b=2*(ox*dx+oy*dy),disc=b*b-4*a*c;if(disc<0)return null;
  const t=(-b-Math.sqrt(disc))/(2*a);return t>=0&&t<=1?t:null;
}
export function makeMesh(rng=Math.random,detailed=true){
  const p=(1+Math.sqrt(5))/2;
  const raw=[[-1,p,0],[1,p,0],[-1,-p,0],[1,-p,0],[0,-1,p],[0,1,p],[0,-1,-p],[0,1,-p],[p,0,-1],[p,0,1],[-p,0,-1],[-p,0,1]];
  const vertices=raw.map(v=>{const n=Math.hypot(...v),r=detailed?.73+rng()*.33:.78+rng()*.27;return v.map(x=>x/n*r)});
  let faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  // Shared, perturbed midpoints add uneven facets without separate surface paths.
  // Tiny fragments keep the coarse mesh to avoid drawing detail below pixel scale.
  if(detailed){
    const midpoints=new Map();
    const midpoint=(a,b)=>{const key=Math.min(a,b)*12+Math.max(a,b);if(midpoints.has(key))return midpoints.get(key);
      const v=vertices[a].map((x,i)=>(x+vertices[b][i])*.5+(rng()-.5)*.07),n=Math.hypot(...v),r=.78+rng()*.31,index=vertices.length;
      vertices.push(v.map(x=>x/n*r));midpoints.set(key,index);return index;};
    faces=faces.flatMap(([a,b,c])=>{const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);return [[a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]];});
  }
  const edges=[],known=new Map();faces.forEach((f,fi)=>{for(let i=0;i<3;i++){const a=f[i],b=f[(i+1)%3],key=Math.min(a,b)*vertices.length+Math.max(a,b),edge=known.get(key);if(edge)edge.faces.push(fi);else{const e={a,b,faces:[fi]};known.set(key,e);edges.push(e);}}});
  return {vertices,faces,edges};
}
export function rotateVertex(v,rx,ry,rz){let [x,y,z]=v;let c=Math.cos(rx),s=Math.sin(rx);[y,z]=[y*c-z*s,y*s+z*c];c=Math.cos(ry);s=Math.sin(ry);[x,z]=[x*c+z*s,-x*s+z*c];c=Math.cos(rz);s=Math.sin(rz);return [x*c-y*s,x*s+y*c,z];}
export function makeClusterMesh(rng=Math.random){
  const mesh=makeMesh(rng),vertices=mesh.vertices,available=makeMesh(()=>.5,false).vertices.slice(),lobes=[],count=4+Math.min(2,Math.floor(rng()*3));
  // Broad, overlapping changes of radius make one connected rocky body.
  // Each asteroid is generated independently; no reference-model data is used.
  for(let i=0;i<count;i++){const v=available.splice(Math.min(available.length-1,Math.floor(rng()*available.length)),1)[0],n=Math.hypot(...v);lobes.push({direction:v.map(x=>x/n),width:.25+rng()*.22,height:.18+rng()*.23});}
  const stretch=[.9+rng()*.2,.9+rng()*.2,.9+rng()*.2];
  for(let i=0;i<vertices.length;i++){const v=vertices[i].map(x=>x+(rng()-.5)*.11),n=Math.hypot(...v),d=v.map(x=>x/n);let radius=.74+(rng()-.5)*.07;
    for(const l of lobes){const dot=d.reduce((sum,x,j)=>sum+x*l.direction[j],0);radius+=l.height*Math.exp((dot-1)/(l.width*l.width));}
    vertices[i]=d.map((x,j)=>x*radius*stretch[j]);
  }
  let faces=mesh.faces.map(f=>f.slice());
  const normal=f=>{const n=[0,0,0];for(let i=0;i<f.length;i++){const a=vertices[f[i]],b=vertices[f[(i+1)%f.length]];n[0]+=(a[1]-b[1])*(a[2]+b[2]);n[1]+=(a[2]-b[2])*(a[0]+b[0]);n[2]+=(a[0]-b[0])*(a[1]+b[1]);}const length=Math.hypot(...n)||1;return n.map(x=>x/length);};
  // Merge irregularly chosen neighboring triangles into broad four-sided facets.
  const candidates=mesh.edges.map(e=>({...e,order:rng()})).sort((a,b)=>a.order-b.order),removed=new Set(),target=20+Math.min(7,Math.floor(rng()*8));let merged=0;
  for(const e of candidates){const [i,j]=e.faces;if(merged>=target)break;if(removed.has(i)||removed.has(j)||faces[i].length!==3||faces[j].length!==3)continue;
    const ni=normal(faces[i]),nj=normal(faces[j]);if(ni.reduce((sum,x,k)=>sum+x*nj[k],0)<.65)continue;
    const boundary=new Map();for(const f of [faces[i],faces[j]])for(let k=0;k<3;k++){const a=f[k],b=f[(k+1)%3];if((a===e.a&&b===e.b)||(a===e.b&&b===e.a))continue;boundary.set(a,b);}
    const quad=[boundary.keys().next().value];while(quad.length<4)quad.push(boundary.get(quad.at(-1)));faces[i]=quad;removed.add(j);merged++;
  }
  faces=faces.filter((_,i)=>!removed.has(i));
  // A few clipped corners add small polygonal patches among the larger facets.
  const neighbors=Array.from({length:vertices.length},()=>new Set());for(const f of faces)for(let i=0;i<f.length;i++){neighbors[f[i]].add(f[(i+1)%f.length]);neighbors[f[(i+1)%f.length]].add(f[i]);}
  const selected=new Map(),order=vertices.map((_,i)=>({i,order:rng()})).sort((a,b)=>a.order-b.order);
  for(const {i} of order){if(selected.size>=6)break;if([...neighbors[i]].some(j=>selected.has(j)))continue;selected.set(i,.16+rng()*.2);}
  const endpoints=new Map(),rings=new Map();
  const endpoint=(v,n)=>{const key=v+','+n;if(endpoints.has(key))return endpoints.get(key);const t=selected.get(v),index=vertices.length;vertices.push(vertices[v].map((x,i)=>x+(vertices[n][i]-x)*t));endpoints.set(key,index);return index;};
  faces=faces.map(f=>f.flatMap((v,i)=>{if(!selected.has(v))return [v];const prev=f[(i+f.length-1)%f.length],next=f[(i+1)%f.length],a=endpoint(v,prev),b=endpoint(v,next);if(!rings.has(v))rings.set(v,new Map());rings.get(v).set(b,a);return [a,b];}));
  for(const ring of rings.values()){const cap=[ring.keys().next().value];while(cap.length<ring.size)cap.push(ring.get(cap.at(-1)));faces.push(cap);}
  const used=[...new Set(faces.flat())],indices=new Map(used.map((v,i)=>[v,i])),finalVertices=used.map(i=>vertices[i]);faces=faces.map(f=>f.map(i=>indices.get(i)));
  const bound=Math.max(...finalVertices.map(v=>Math.hypot(...v)));for(const v of finalVertices)for(let i=0;i<3;i++)v[i]*=1.04/bound;
  const edges=[],known=new Map();faces.forEach((f,fi)=>{for(let i=0;i<f.length;i++){const a=f[i],b=f[(i+1)%f.length],key=Math.min(a,b)*finalVertices.length+Math.max(a,b);if(known.has(key))known.get(key).faces.push(fi);else{const e={a,b,faces:[fi]};known.set(key,e);edges.push(e);}}});
  return {vertices:finalVertices,faces,edges,lobes};
}
function compactLife(list){let count=0;for(let i=0;i<list.length;i++)if(list[i].life>0)list[count++]=list[i];list.length=count;return list;}
function compactDead(list){let count=0;for(let i=0;i<list.length;i++)if(!list[i].dead)list[count++]=list[i];list.length=count;return list;}
export class Game {
  constructor({height=680,rng=Math.random,onEvent=()=>{},lightningOnly=false}={}){this.lightningOnly=lightningOnly;this.rng=rng;this.H=height;this.onEvent=onEvent;this.state='menu';this.reset();this.state='menu';}
  get targets(){const targets=[];for(const a of this.asteroids)if(!a.mounted)targets.push(a);for(const e of this.enemies)targets.push(e);return targets;}
  get shieldRadius(){return 112}get ground(){return this.H-28}get baseTop(){return this.ground-26}get muzzle(){return {x:240+Math.sin(this.aim)*(37-this.recoil),y:this.baseTop-7-Math.cos(this.aim)*(37-this.recoil)}}
  reset(){resetArsenal(this);resetReinforcements(this);resetTethers(this);this.health=100;this.shieldHits=0;this.shieldFlash=0;this.nextShieldDrop=24;this.nextTurretDrop=36;this.turretUpgrades=0;this.turretFirstSide=null;this.turrets=[];this.score=0;this.wave=0;this.time=0;this.aim=0;this.recoil=0;this.weapon=this.lightningOnly?'lightning':'pulse';this.lightningUses=this.lightningOnly?Infinity:0;this.gravityUses=0;this.freezeUses=0;this.freezeBeams=[];this.weaponTier=this.lightningOnly?4:0;this.lateWeaponDrops=0;this.blackHoles=[];this.lightning=[];this.lightningFlash=0;this.lightningFirstFrame=false;this.timeStopAge=.4;this.frameDt=0;this.asteroids=[];this.enemies=[];this.spaceDebris=[];this.crystals=[];this.cometSchedule=[];this.ufoTimer=null;this.waveTime=0;this.bullets=[];this.pickups=[];this.particles=[];this.shockwaves=[];this.trails=[];this.holding=false;this.charge=0;this.cooldown=0;this.spawnLeft=0;this.waveDelay=2;this.spawnTimer=0;this.kills=0;this.nextDrop=this.lightningOnly?Infinity:12;this.flash=0;this.shake=0;this.fired=0;this.impacts=0;}
  start(){this.reset();this.state='playing';if(this.debugOptions){this.nextDrop=this.nextShieldDrop=this.nextTurretDrop=this.nextSupportDrop=Infinity;this.equipDebug(this.debugOptions.weapons[0]||'pulse');}this.nextWave();}
  equipDebug(type){if(!this.debugOptions?.weapons.includes(type))return false;this.weapon=type;for(const key of ['lightning','gravity','freeze','seeker','repulser','mount','thruster'])this[key+'Uses']=type===key?Infinity:0;this.cooldown=0;this.event('upgrade',{weapon:type});return true;}
  activateDebug(type){if(!this.debugOptions?.boosts.includes(type))return false;if(type==='charge'){this.charge=this.chargeMax;this.radialBlast();return true;}this.collect({type,x:240,y:this.baseTop-90});return true;}

  event(type,data={}){this.onEvent(type,data)}
  nextWave(){this.wave++;this.spawnLeft=4+Math.min(22,Math.floor(this.wave*1.35));this.spawnTimer=.7;this.waveDelay=2;this.waveTime=0;this.cometSchedule=[5+this.rng()*2];if(this.rng()<.5)this.cometSchedule.push(12+this.rng()*3);this.ufoTimer=8+this.rng()*3;this.event('wave',{wave:this.wave});}
  asteroid(size,x,y,extra={}){const cfg=SIZE[size];const a={size,x,y,r:cfg.radius*(.75+this.rng()*.5),hp:cfg.hp,vx:(this.rng()-.5)*15,vy:(22+this.wave*2.6)*(1+(2-size)*.22)*(.72+this.rng()*.7),rx:this.rng()*6,ry:this.rng()*6,rz:this.rng()*6,sx:(this.rng()-.5)*1.25,sy:(this.rng()-.5)*1.6,sz:(this.rng()-.5)*.65,colors:ASTEROID_COLORS[Math.min(ASTEROID_COLORS.length-1,Math.floor(this.rng()*ASTEROID_COLORS.length))],gravityWarp:null,mesh:size===2?makeClusterMesh(this.rng):makeMesh(this.rng,false),hit:0,hitMax:.12,flare:0,heat:[],dustTimer:.08+this.rng()*.18,collisionCooldown:0,collisionGrace:0,dead:false,...extra};this.asteroids.push(a);return a;}
  spawn(){const size=this.wave<2?2:(this.rng()<.68?2:1);const x=40+this.rng()*400;const a=this.asteroid(size,x,-40);if(this.rng()<.6)a.vx=(210+this.rng()*60-x)/Math.max(4,(this.ground+40)/a.vy);}
  setAim(degrees){this.aim=clamp(degrees,-72,72)*Math.PI/180;}
  get firesOnRelease(){return ['lightning','gravity','freeze','repulser','mount','thruster','railgun','flak','singularity'].includes(this.weapon)}
  beginFire(){if(this.state!=='playing'||this.holding)return;this.holding=true;this.charge=0;if(!this.firesOnRelease&&this.cooldown<=0){this.shoot();this.cooldown=this.fireInterval;}}
  cancelFire(){this.holding=false;this.charge=0;}
  endFire(){if(!this.holding)return;this.holding=false;if(this.state==='playing'){if(this.firesOnRelease&&this.cooldown<=0){const interval=this.fireInterval;this.shoot();this.cooldown=interval;}this.releaseCharge();}this.charge=0;}
  get chargeMax(){return 5}
  get fireInterval(){const rate=this.overdriveTime>0?.55:1;return rate*this.baseFireInterval;}
  get baseFireInterval(){if(this.weapon==='prism')return .09;if(this.weapon==='railgun')return .65;if(this.weapon==='flak')return .6;if(this.weapon==='singularity')return 1.2;if(this.weapon==='disc')return .55;if(this.weapon==='plasma')return .3;if(this.weapon==='chain')return .9;if(this.weapon==='thruster')return .5;if(this.weapon==='seeker')return .42;if(this.weapon==='mount')return .6;if(this.weapon==='repulser')return 1;return this.weapon==='bounce'?.3:this.weapon==='missile'?.55:this.weapon==='gravity'?.85:this.weapon==='lightning'?.5:this.weapon==='freeze'?.65:this.weapon==='acid'?.75:.15}
  shoot(damage=1,offset=0){if(fireArsenal(this))return;if(this.weapon==='chain'){launchChain(this);return;}if(this.weapon==='thruster'){launchThruster(this);return;}if(['seeker','repulser','mount'].includes(this.weapon)){launchAdvanced(this);return;}if(this.weapon==='freeze'){this.castFreeze();return;}if(this.weapon==='gravity'){this.launchGravity();return;}if(this.weapon==='lightning'){this.castLightning();return;}if(this.weapon==='missile'){this.launchMissiles(damage===1?3:damage);return;}const m=this.muzzle;const acid=this.weapon==='acid',angles=acid?[-18,-12,-6,0,6,12,18]:['triple','bounce'].includes(this.weapon)?[-7.5,0,7.5]:[0];for(const deg of angles){const a=this.aim+(deg+(acid?(this.rng()-.5)*2.4:0))*Math.PI/180+offset,speed=acid?460*(.85+this.rng()*.3):520;this.bullets.push({x:m.x,y:m.y,px:m.x,py:m.y,vx:Math.sin(a)*speed,vy:-Math.cos(a)*speed,damage:this.weapon==='acid'?.5:damage,kind:this.weapon==='acid'?'acid':undefined,life:this.weapon==='bounce'?6:2.5,power:damage>1,weapon:this.weapon,bounce:this.weapon==='bounce',dead:false});}this.recoil=Math.max(this.recoil,acid?7:damage>1?5+damage*2:4);this.fired++;this.event('shot',{damage,weapon:this.weapon});}
  releaseCharge(){if(this.charge<this.chargeMax-1e-8)return;this.radialBlast();}
  radialBlast(){
    const x=240,y=this.ground-13,max=1.05,radius=Math.hypot(240,y)+45;
    this.shockwaves.push({x,y,age:0,life:max,max,radius,damage:4,damaging:true,hit:new Set(),color:'#ceefff',cold:true});
    if(this.overdriveCapacitor)this.overdriveTime=4;this.recoil=14;this.flash=.08;this.shake=.15;this.event('charge-wave');
  }
  freezeConeContains(a,beam){
    const dx=a.x-beam.x,dy=beam.y-a.y,distance=Math.hypot(dx,dy),radius=a.r||12;
    return distance<=beam.length+radius&&(distance<=radius||Math.abs(angleDifference(Math.atan2(dx,dy),beam.aim))<=Math.PI/9+Math.asin(Math.min(1,radius/distance)));
  }
  castFreeze(){
    if(this.freezeUses<=0)return;const m=this.muzzle,beam={...m,aim:this.aim,length:Math.hypot(480,this.H)+60,age:0,max:.4},pickups=[...this.pickups];
    this.freezeBeams.push(beam);this.freezeUses--;this.fired++;this.recoil=8;
    for(const a of this.targets)if(!a.dead&&a.y+a.r>=0&&this.freezeConeContains(a,beam))this.freezeThreat(a);
    for(let i=0;i<90;i++){const angle=beam.aim+(this.rng()-.5)*Math.PI*2/9,distance=beam.length*(.04+this.rng()*.9),x=beam.x+Math.sin(angle)*distance,y=beam.y-Math.cos(angle)*distance;if(x<0||x>480||y<0)continue;const life=.3+this.rng()*.4;this.crystals.push({x,y,vx:Math.sin(angle)*35+(this.rng()-.5)*18,vy:-Math.cos(angle)*35,gravity:30,life,max:life,size:.65+this.rng()*.3,phase:this.rng()*Math.PI*2,color:'#8bdeff',kind:'freezeBeamIce'});}
    this.event('freeze',{uses:this.freezeUses});if(!this.freezeUses){this.weapon='missile';this.event('freeze-empty');}
    for(const p of pickups)if(!p.dead&&this.freezeConeContains(p,beam))this.collect(p);this.limitEffects();
  }
  freezeThreat(a){
    if(a.dead)return;if(a.frozen){this.shatterFrozen(a);return;}
    a.frozen=true;a.hit=0;a.flare=0;a.frozenHeading=Math.atan2(a.vx,-a.vy);a.vx=a.vy=0;a.frostAge=0;a.frostTimer=0;a.acid=[];a.thruster=null;if(a.heat)a.heat=[];
    this.spark(a.x,a.y,12,'#a2eaff',.55);
  }
  updateFrost(a,dt){
    a.frostAge+=dt;a.frostTimer-=dt;if(a.frostTimer>0)return;a.frostTimer=.07+this.rng()*.1;
    const angle=this.rng()*Math.PI*2,radius=a.r*(.6+this.rng()*.5),life=.45+this.rng()*.5;
    this.crystals.push({x:a.x+Math.cos(angle)*radius,y:a.y+Math.sin(angle)*radius,vx:(this.rng()-.5)*12,vy:-8-this.rng()*12,life,max:life,size:.65+this.rng()*.3,phase:this.rng()*Math.PI*2,color:'#96e3ff',kind:'frost'});
  }
  frozenBurst(a){
    const count=Math.min(72,24+Math.round(a.r*1.1));
    for(let i=0;i<count;i++){const angle=this.rng()*Math.PI*2,speed=55+this.rng()*220,life=.45+this.rng()*.6;this.crystals.push({x:a.x,y:a.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,gravity:100,drag:1.4,life,max:life,size:.7+this.rng()*1.3,phase:this.rng()*Math.PI*2,color:'#9de4ff',kind:'iceShatter'});}
    this.spark(a.x,a.y,20,'#c2f3ff',1.2);this.event('freeze-shatter');this.limitEffects();
  }
  shatterFrozen(a){
    if(a.dead)return;this.frozenBurst(a);if(a.kind){a.dead=true;this.score+=a.score;}else this.destroy(a,true,false);
  }
  lightningAim(){
    const m=this.muzzle,len=this.H*2+480,s={x:m.x,y:m.y,ex:m.x+Math.sin(this.aim)*len,ey:m.y-Math.cos(this.aim)*len};let target=null,entry=Infinity;
    for(const a of this.targets){if(a.dead||a.y<0||a.x<0||a.x>480)continue;const t=circleEntry(s,a.x,a.y,a.r+7);if(t!==null&&t<entry){entry=t;target=a;}}
    return {target,from:m,to:target?{x:target.x,y:target.y}:{x:s.ex,y:s.ey}};
  }
  lightningPoints(from,to,tier){
    const dx=to.x-from.x,dy=to.y-from.y,distance=Math.hypot(dx,dy)||1,n=Math.max(4,Math.ceil(distance/18)),points=[{...from}];
    for(let i=1;i<n;i++){const u=i/n,jitter=(this.rng()-.5)*(tier===0?22:tier===1?15:10);points.push({x:from.x+dx*u-dy/distance*jitter,y:from.y+dy*u+dx/distance*jitter});}points.push({...to});return points;
  }
  lightningTendrils(bolts){
    const tendrils=[],budgets=[12,72,140],used=[0,0,0];
    for(let parentIndex=0;parentIndex<bolts.length;parentIndex++){
      const parent=bolts[parentIndex],tier=parent.tier,count=[4,8,14][tier]+Math.floor(this.rng()*[3,5,7][tier]);
      for(let j=0;j<count&&used[tier]<budgets[tier];j++){
        const index=Math.min(parent.points.length-2,Math.floor((.1+this.rng()*.8)*(parent.points.length-1))),a=parent.points[index],b=parent.points[index+1],u=this.rng(),from={x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u};
        const angle=Math.atan2(b.y-a.y,b.x-a.x)+(j%2?1:-1)*(.45+this.rng()*.8),length=[45,30,18][tier]+this.rng()*[60,50,37][tier],dx=Math.cos(angle)*length,dy=Math.sin(angle)*length,points=[from],pieces=5+Math.floor(this.rng()*5);
        for(let k=1;k<=pieces;k++){const t=k/pieces,jitter=k===pieces?0:(this.rng()-.5)*7*Math.sin(t*Math.PI);points.push({x:from.x+dx*t-Math.sin(angle)*jitter,y:from.y+dy*t+Math.cos(angle)*jitter});}
        tendrils.push({parentIndex,tier,points,outline:taperLightning(points,[.34,.26,.19][tier]*Math.max(.65,lightningWidthAt(parent,from))),cosmetic:true,damage:0});used[tier]++;
      }
    }
    return tendrils;
  }
  lightningExit(from,to){
    const dx=to.x-from.x,dy=to.y-from.y,n=Math.hypot(dx,dy)||1,vx=dx/n,vy=dy/n;
    const tx=Math.abs(vx)<1e-9?Infinity:(vx>0?480-from.x:-from.x)/vx,ty=Math.abs(vy)<1e-9?Infinity:(vy>0?this.H-from.y:-from.y)/vy;
    const distance=Math.max(0,Math.min(tx,ty))+35;return {x:from.x+vx*distance,y:from.y+vy*distance};
  }
  lightningAnchor(points,target){
    let best=Infinity,anchor=points[0];
    for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y,u=clamp(((target.x-a.x)*dx+(target.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1),p={x:a.x+u*dx,y:a.y+u*dy},d=Math.hypot(p.x-target.x,p.y-target.y);if(d<best){best=d;anchor=p;}}
    return {...anchor};
  }
  castLightning(){
    if(this.lightningUses<=0)return;
    const pickups=[...this.pickups];const aim=this.lightningAim(),eligible=this.targets.filter(a=>!a.dead&&a.x>=0&&a.x<=480&&a.y>=0&&a.y<this.ground),seen=new Set(),bolts=[],hits=new Map();
    const add=(from,to,tier,parentIndex=null)=>{
      const exit=this.lightningExit(from,to),ray={x:from.x,y:from.y,ex:exit.x,ey:exit.y};
      const index=bolts.length;bolts.push({parentIndex,points:this.lightningPoints(from,exit,tier),from:{...from},to:exit,tier,damage:[8,4,2][tier],start:0,end:0,applied:true});
      const reached=[];
      for(const a of eligible){if(circleEntry(ray,a.x,a.y,a.r+8)!==null){if(!hits.has(a))hits.set(a,[8,4,2][tier]);if(!seen.has(a)){seen.add(a);reached.push({target:a,bolt:index});}}}return reached;
    };
    let parents=add(aim.from,aim.target?{x:aim.target.x,y:aim.target.y}:aim.to,0);
    for(let tier=1;tier<=2;tier++){
      const next=[];
      for(const source of parents){
        const parent=source.target,anchor=this.lightningAnchor(bolts[source.bolt].points,parent);
        const neighbors=eligible.filter(a=>!seen.has(a)&&Math.hypot(a.x-parent.x,a.y-parent.y)<=(tier===1?230:190));
        for(const target of neighbors){if(seen.has(target))continue;next.push(...add(anchor,{x:target.x,y:target.y},tier,source.bolt));}
        if(!neighbors.length){const angle=Math.atan2(parent.x-aim.from.x,aim.from.y-parent.y)+(tier===1?.38:-.38);add(anchor,{x:parent.x+Math.sin(angle)*200,y:parent.y-Math.cos(angle)*200},tier,source.bolt);}
      }parents=next;
    }
    prepareLightningBolts(bolts);
    this.lightning.push({age:0,max:.78,bolts,tendrils:this.lightningTendrils(bolts)});if(!this.lightningOnly)this.lightningUses--;this.fired++;this.recoil=12;
    this.lightningFlash=1;this.lightningFirstFrame=true;this.timeStopAge=0;
    for(const [target,damage] of hits)this.hit(target,damage,{x:target.x,y:target.y,weapon:'lightning'});
    this.event('lightning',{uses:this.lightningUses});
    if(!this.lightningOnly&&this.lightningUses===0){this.weapon='missile';this.event('lightning-empty');}
    for(const p of pickups)if(!p.dead&&bolts.some(b=>b.points.slice(1).some((q,i)=>segmentDistance(p.x,p.y,b.points[i].x,b.points[i].y,q.x,q.y)<=16)))this.collect(p);
  }
  advanceLightning(dt){
    for(const cast of this.lightning)cast.age+=dt;this.lightning=this.lightning.filter(c=>c.age<c.max);
    if(this.lightningFirstFrame){this.frameDt=0;return 0;}
    const old=this.timeStopAge,end=Math.min(.4,old+dt);this.timeStopAge=end;this.lightningFlash=clamp(1-end/.1,0,1);
    const slowed=old<.4?(end*end-old*old)/.8+Math.max(0,dt-(end-old)):dt;
    this.frameDt=slowed;return slowed;
  }
  updateSpecialWeapons(dt){
    for(const w of [...this.shockwaves]){
      if(!w.damaging)continue;const oldRadius=radialRadius(w),newRadius=radialRadius(w,w.age+dt);
      for(const p of [...this.pickups])if(!p.dead){const distance=Math.hypot(p.x-w.x,p.y-w.y);if(distance+16>=oldRadius&&distance-16<=newRadius)this.collect(p);}
      for(const a of this.targets){if(a.dead||w.hit.has(a))continue;const distance=Math.hypot(a.x-w.x,a.y-w.y);if(distance+a.r>=oldRadius&&distance-a.r<=newRadius){w.hit.add(a);const oldCount=this.asteroids.length;w.lethal?obliterate(this,a):this.hit(a,w.damage,{x:a.x,y:a.y,weapon:'radial'});for(const child of this.asteroids.slice(oldCount))w.hit.add(child);}}
    }
  }
  findMissileTarget(){
    const m=this.muzzle;let target=null,bestAngle=Infinity,bestDistance=Infinity;
    for(const a of this.targets){
      if(a.dead||a.y<0||a.y>=m.y)continue;
      const angle=Math.atan2(a.x-m.x,m.y-a.y),difference=Math.abs(angleDifference(angle,this.aim)),distance=Math.hypot(a.x-m.x,a.y-m.y);
      if(difference<=Math.PI/60+1e-9&&(difference<bestAngle-1e-9||(Math.abs(difference-bestAngle)<1e-9&&distance<bestDistance))){target=a;bestAngle=difference;bestDistance=distance;}
    }
    return target;
  }
  launchMissiles(damage=3){
    const m=this.muzzle,target=this.findMissileTarget();
    for(let i=0;i<5;i++){
      const angle=this.aim+(i-2)*Math.PI/15+(this.rng()-.5)*.16,speedScale=.78+this.rng()*.44,startSpeed=90*speedScale;
      this.bullets.push({x:m.x,y:m.y,px:m.x,py:m.y,vx:Math.sin(angle)*startSpeed,vy:-Math.cos(angle)*startSpeed,speedScale,heading:angle,launchHeading:angle,age:0,phase:i*Math.PI*2/5,exhaust:.12,distance:0,guidance:'launch',damage,life:40,power:damage>3,kind:'missile',r:1.5,target,bounce:false,dead:false});
    }
    this.recoil=Math.max(this.recoil,damage>3?14:7);this.fired++;this.event('missile',{locked:!!target,damage});
  }
  launchGravity(){
    if(this.gravityUses<=0)return;const m=this.muzzle,speed=280;
    this.bullets.push({x:m.x,y:m.y,px:m.x,py:m.y,vx:Math.sin(this.aim)*speed,vy:-Math.cos(this.aim)*speed,r:8,damage:0,life:4,age:0,kind:'gravity',weapon:'gravity',dead:false});
    this.gravityUses--;this.recoil=11;this.fired++;this.event('gravity-shot',{uses:this.gravityUses});
    if(!this.gravityUses){this.weapon='missile';this.event('gravity-empty');}
  }
  createBlackHole(x,y,target){
    const dust=Array.from({length:72},()=>({radius:100+this.rng()*130,phase:this.rng()*Math.PI*2,size:.55+this.rng()**2*5.5,duration:.9+this.rng()*2,delay:this.rng()*.25,spin:3+this.rng()*3}));
    this.blackHoles.push({x,y,radius:240,age:0,max:3.2,dust});if(this.blackHoles.length>5)this.blackHoles.shift();if(target)this.consumeThreat(target);this.event('black-hole');
  }
  consumeThreat(a){
    if(a.dead)return;if(a.frozen)this.frozenBurst(a);if(a.kind){a.dead=true;this.score+=a.score;}else this.destroy(a,true,false);
    for(let i=0;i<4;i++){const angle=this.rng()*Math.PI*2,life=.2+this.rng()*.15;this.crystals.push({x:a.x+Math.cos(angle)*12,y:a.y+Math.sin(angle)*12,vx:-Math.cos(angle)*30,vy:-Math.sin(angle)*30,life,max:life,size:.7,phase:angle,color:'#ff6270',kind:'gravityDust'});}
  }
  updateBlackHoles(dt){
    for(const a of this.targets){a.gravityPull=false;if(a.mesh)a.gravityWarp=null;}
    for(const h of this.blackHoles){
      h.age+=dt;if(h.age>=h.max)continue;const strength=Math.min(1,h.age/.12)*Math.min(1,(h.max-h.age)/.35);
      const pull=(a,consume)=>{if(a.dead)return;const dx=h.x-a.x,dy=h.y-a.y,d=Math.hypot(dx,dy);if(d>=h.radius)return;if(consume)a.gravityPull=true;const amount=clamp(1-d/h.radius,0,1)*strength;if(a.mesh&&(!a.gravityWarp||amount>a.gravityWarp.amount))a.gravityWarp={angle:Math.atan2(dy,dx),amount};if(!consume)a.gravityHeat=clamp((h.radius-d)/(h.radius-22),0,1);const core=18+(a.r||0)*.35;
        if(consume&&(d<=core||segmentDistance(h.x,h.y,a.x,a.y,a.x+(a.vx||0)*dt,a.y+(a.vy||0)*dt)<=core)){this.consumeThreat(a);return;}
        const acceleration=(380+1000*(1-d/h.radius))*strength,drag=Math.exp(-dt*1.5*strength),n=Math.max(1,d);a.vx=(a.vx||0)*drag+dx/n*acceleration*dt;a.vy=(a.vy||0)*drag+dy/n*acceleration*dt;
      };
      for(const a of this.targets)pull(a,true);
      for(const p of this.pickups){if(p.dead)continue;if(Math.hypot(p.x-h.x,p.y-h.y)<18)this.collect(p);else pull(p,false);}
      for(const p of this.spaceDebris)pull(p,false);for(const p of this.particles)pull(p,false);for(const p of this.crystals)pull(p,false);
    }
    this.blackHoles=this.blackHoles.filter(h=>h.age<h.max);this.limitEffects();
  }
  steerMissile(b,dt){
    b.age+=dt;const age=b.age,scale=b.speedScale||1,boost=clamp((age-.64)/.34,0,1),smooth=u=>u*u*(3-2*u);
    if(b.target?.dead){b.target=null;b.driftAge=age;b.driftHeading=b.heading;b.driftSpeed=Math.hypot(b.vx,b.vy);}
    let speed,desired=b.launchHeading,turn=5;
    if(age<.18){const u=age/.18;speed=(90+330*(1-(1-u)**2))*scale;b.guidance='launch';b.exhaust=.12+.1*u;}
    else if(age<.42){speed=(420-305*smooth((age-.18)/.24))*scale;b.guidance='coast';b.exhaust=.15;}
    else if(b.target){speed=(115+785*smooth(boost))*scale;b.guidance=age<.64?'acquire':'homing';b.exhaust=.2+.8*boost;}
    else{const elapsed=Math.max(0,age-(b.driftAge??.42));speed=55*scale+Math.max(0,(b.driftSpeed??115*scale)-55*scale)*Math.exp(-elapsed*.22);b.guidance='drift';b.exhaust=.08+.08*Math.min(1,speed/(420*scale));}
    if(b.target&&age>=.42){
      const a=b.target,distance=Math.hypot(a.x-b.x,a.y-b.y),lead=Math.min(.18,distance/Math.max(1,speed)*.2),lockAngle=Math.atan2(a.x+(a.vx||0)*lead-b.x,b.y-a.y-(a.vy||0)*lead),acquire=clamp((age-.42)/.22,0,1);
      const weave=Math.sin(age*13+b.phase)*.18*Math.exp(-Math.max(0,age-.64)*5)*clamp(distance/110,0,1);desired=b.launchHeading+angleDifference(lockAngle,b.launchHeading)*smooth(acquire)+weave;turn=7+boost*9;
    }else if(!b.target&&age>=.42){
      const elapsed=Math.max(0,age-(b.driftAge??.42)),chaos=.1+Math.min(1,elapsed/2.5)*.62;
      desired=(b.driftHeading??b.launchHeading)+(Math.sin(age*7+b.phase)*.7+Math.sin(age*17+b.phase*2)*.3)*chaos;turn=3.5;
    }else desired+=Math.sin(age*16+b.phase)*.07;
    b.heading+=clamp(angleDifference(desired,b.heading),-turn*dt,turn*dt);b.vx=Math.sin(b.heading)*speed;b.vy=-Math.cos(b.heading)*speed;
  }
  addTrail(s,damage,kind='bullet',exhaust=1){const max=kind==='micro'?.06:kind==='seeker'?.3:kind==='missile'?.5:damage>1?.3+damage*.1:.22;this.trails.push({...s,damage,kind,exhaust,life:max,max});}
  terrainEntry(s){
    const dx=s.ex-s.x,dy=s.ey-s.y;let hit=null;
    if(dy>0&&s.y<=this.ground&&s.ey>=this.ground)hit=(this.ground-s.y)/dy;
    // Swept intersection with the solid bunker body; the barrel is not a collider.
    let lo=0,hi=1;
    for(const [origin,delta,min,max] of [[s.x,dx,160,320],[s.y,dy,this.baseTop,this.ground]]){
      if(Math.abs(delta)<1e-9){if(origin<min||origin>max)return hit;}
      else{const a=(min-origin)/delta,b=(max-origin)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}
    }
    if(lo<=hi&&lo>=0&&lo<=1)hit=Math.min(hit??Infinity,lo);return hit;
  }
  advanceBullet(b,dt){
    const speed=Math.hypot(b.vx,b.vy);b.px=b.x;b.py=b.y;
    const path=b.bounce?reflectedPath(b.x,b.y,b.vx,b.vy,speed*dt,480,this.H):{segments:[{x:b.x,y:b.y,ex:b.x+b.vx*dt,ey:b.y+b.vy*dt}],dx:b.vx/(speed||1),dy:b.vy/(speed||1)};
    for(const s of path.segments){
      let target=null,entry=Infinity,isCrate=false,terrain=false;const surface=b.bounce?this.terrainEntry(s):null;if(surface!==null){entry=surface;terrain=true;}
      // This search cannot mutate either collection. Keep asteroid-first tie
      // ordering without allocating a target snapshot for every projectile.
      const asteroidCount=this.asteroids.length;
      for(let i=0;i<asteroidCount+this.enemies.length;i++){const a=i<asteroidCount?this.asteroids[i]:this.enemies[i-asteroidCount];if(a.dead||(i<asteroidCount&&a.mounted))continue;const t=circleEntry(s,a.x,a.y,a.r+(b.r||2));if(t!==null&&t<entry){target=a;entry=t;isCrate=false;terrain=false;}}
      for(const p of this.pickups){if(p.dead)continue;const t=circleEntry(s,p.x,p.y,16);if(t!==null&&t<entry){target=p;entry=t;isCrate=true;terrain=false;}}
      const end=target||terrain?{...s,ex:s.x+(s.ex-s.x)*entry,ey:s.y+(s.ey-s.y)*entry}:s;
      if(b.kind==='missile'){const start=b.distance||0;b.distance=start+Math.hypot(end.ex-end.x,end.ey-end.y);this.addTrail({...end,missile:b,distanceStart:start,distanceEnd:b.distance},b.damage,b.kind,b.exhaust);}else if(b.kind!=='gravity')this.addTrail(end,b.kind==='seeker'?2:b.damage,b.kind);b.x=end.ex;b.y=end.ey;
      if(terrain){this.impactBurst(b.x,b.y,'pulse',1);b.dead=true;break;}
      if(target){if(!isCrate&&b.kind==='plasma')markPlasma(this,target);isCrate?this.collect(target):b.kind==='gravity'?this.createBlackHole(target.x,target.y,target):b.kind==='mount'?mountAsteroid(this,target):b.kind==='thruster'?attachThruster(this,target,b):this.hit(target,b.damage,{x:b.x,y:b.y,weapon:['missile','seeker'].includes(b.kind)?'missile':b.weapon||'pulse'});b.dead=true;break;}
    }
    if(b.bounce&&path.reflections>0&&!b.dead)this.event('ricochet');b.vx=path.dx*speed;b.vy=path.dy*speed;b.life-=dt;if(b.kind==='gravity')b.age+=dt;
    if(b.life<=0||(!b.bounce&&(b.y<-20||b.y>this.H+20||b.x<-20||b.x>500)))b.dead=true;
  }
  hit(a,damage,impact={x:a.x,y:a.y,weapon:'pulse'}){
    if(a.dead||a.mounted)return;if(a.frozen&&damage>0){this.shatterFrozen(a);return;}
    const currentFlare=(a.flare||0)*((a.hit||0)/(a.hitMax||.12))**.75;
    a.hp-=damage;a.hitMax=clamp(.10+damage*.018,.12,.26);a.hit=a.hitMax;
    a.flare=Math.max(currentFlare,clamp(.18+damage*.13,.18,1.4));
    if(!a.kind||impact.weapon==='acid'){
      // Store the contact in model coordinates so it tumbles with the rock.
      const dx=(impact.x-a.x)/a.r,dy=(impact.y-a.y)/a.r,n=Math.max(1,Math.hypot(dx,dy)),v=[dx/n,dy/n,Math.sqrt(Math.max(0,1-(dx*dx+dy*dy)/(n*n)))];
      const z=rotateVertex(v,0,0,-(a.rz||0)),y=rotateVertex(z,0,-(a.ry||0),0),local=rotateVertex(y,-(a.rx||0),0,0);
      if(impact.weapon==='acid'){a.acid??=[];a.acid.push({local,x:dx,y:dy,age:0,max:.75,timer:0});if(a.acid.length>6)a.acid.shift();}
      else a.heat.push({local,age:0,max:.5,strength:clamp(.5+damage*.1,.5,1.3)});if(a.heat?.length>8)a.heat.shift();
    }
    this.impactBurst(impact.x,impact.y,impact.weapon,damage,true,!a.kind&&a.hp<=0?this.asteroidBlastScale(a):1);
    if(a.hp<=0)this.destroy(a,true);
  }
  updateAcid(dt){
    for(const a of this.targets){if(a.dead||a.frozen||!a.acid?.length)continue;let damage=0;for(const c of a.acid){const elapsed=Math.min(dt,Math.max(0,c.max-c.age));damage+=elapsed*2;c.age=Math.min(c.max,c.age+dt);c.timer-=dt;if(elapsed>0&&c.timer<=0){c.timer=.07;const angle=this.rng()*Math.PI*2,r=(.06+.94*Math.sqrt(c.age/c.max))*a.r,life=.2+this.rng()*.3,v=a.mesh?rotateVertex(c.local,a.rx,a.ry,a.rz):[c.x,c.y,0],perspective=a.mesh?3.8/(3.8-v[2]):1;this.crystals.push({x:a.x+v[0]*a.r*perspective+Math.cos(angle)*r,y:a.y+v[1]*a.r*perspective+Math.sin(angle)*r,vx:Math.cos(angle)*35,vy:Math.sin(angle)*35,gravity:35,life,max:life,size:.65+this.rng()*.45,phase:this.rng()*6.28,color:'#bcff6f',kind:'acidSpark'});}}a.hp-=damage;if(a.hp<=1e-8){this.spark(a.x,a.y,24,'#beff76',1.3);this.destroy(a,true);}}
  }
  asteroidBlastScale(a){return a.explosionScale??=clamp((.6+this.rng()*.9)*(a.r/SIZE[a.size].radius),.45,1.9);}
  impactBurst(x,y,weapon,damage,ring=true,scale=1){
    const missile=weapon==='missile',triple=weapon==='triple'||weapon==='bounce'||weapon==='lightning'||weapon==='radial',boost=clamp((damage-1)/8,0,1);
    const count=Math.round((missile?72+Math.round(boost*28):triple?24+Math.round(boost*8):18+Math.round(boost*6))*(.7+scale*.3));
    for(let i=0;i<count;i++){
      const angle=(i+this.rng()*.6)/count*Math.PI*2;
      const speed=(missile?360+this.rng()*470:triple?350+this.rng()*180:290+this.rng()*140)*scale;
      const life=(missile?.75+this.rng()*.5:triple?.3+this.rng()*.1:.28+this.rng()*.09)*(.85+scale*.15);
      this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life,max:life,color:weapon==='acid'?'#baff70':weapon==='lightning'||weapon==='radial'?'#d8f1ff':missile?'#ffd7a0':damage>1?'#ffcc99':'#fff1c6',drag:missile?7:triple?9:10,gravity:missile?8:0,sparkle:true,phase:this.rng()*Math.PI*2,frequency:18+this.rng()*20,brightness:missile?1:triple?1:.96,weapon});
    }
    if(missile){const max=.38+boost*.06;if(ring)this.shockwaves.push({x,y,age:0,life:max,max,radius:(112+boost*38)*scale,damage});this.limitEffects();this.event('missile-impact',{damage});}
    if(this.particles.length>500)this.particles.splice(0,this.particles.length-500);
  }
  destroy(a,effectsDone=false,fragment=true){if(a.dead)return;if(a.kind){this.destroyEnemy(a);return;}a.dead=true;this.score+=SIZE[a.size].score;this.kills++;if(!effectsDone){const scale=this.asteroidBlastScale(a);this.spark(a.x,a.y,Math.round([12,18,28][a.size]*scale),'#bce8c9',scale);}this.event('destroy',{size:a.size});
    if(fragment&&a.size>0){const count=a.size===2?2:3;for(let i=0;i<count;i++){const direction=i-(count-1)/2;this.asteroid(a.size-1,clamp(a.x+direction*SIZE[a.size-1].radius*1.3,10,470),a.y,{vx:a.vx+direction*(a.size===2?34:38),vy:Math.max(a.vy*1.22,(22+this.wave*2.6)*(1+(3-a.size)*.22)),hp:SIZE[a.size-1].hp,collisionGrace:.18,colors:a.colors,hit:a.hit,hitMax:a.hitMax,flare:a.flare});}}
    if(this.kills>=this.nextShieldDrop){this.nextShieldDrop=this.kills+48;this.pickups.push({x:clamp(a.x,30,450),y:Math.min(a.y,this.baseTop-60),vx:0,vy:22,type:'shield',dead:false,t:0});this.event('drop',{type:'shield'});}
    if(!this.lightningOnly&&this.kills>=this.nextTurretDrop&&this.turretUpgrades<2){this.nextTurretDrop=this.kills+48;if(this.turretUpgrades+this.pickups.filter(p=>!p.dead&&p.type==='turret').length<2){this.pickups.push({x:clamp(a.x,30,450),y:Math.min(a.y,this.baseTop-60),vx:0,vy:22,type:'turret',dead:false,t:0});this.event('drop',{type:'turret'});}}
    if(!this.lightningOnly&&this.kills>=this.nextSupportDrop){this.nextSupportDrop=this.kills+32;const type=BONUS_TYPES[this.supportDrops++%BONUS_TYPES.length];this.pickups.push({x:clamp(a.x,30,450),y:Math.min(a.y,this.baseTop-60),vx:0,vy:22,type,dead:false,t:0});this.event('drop',{type});}
    if(!this.lightningOnly&&this.kills>=this.nextDrop){this.nextDrop=this.kills+40+4*Math.min(3,Math.floor(this.rng()*4));const tier=Math.max(this.weaponTier,WEAPONS.indexOf(this.weapon)),type=tier>=5?LATE_WEAPONS[this.lateWeaponDrops++%LATE_WEAPONS.length]:WEAPONS[Math.min(5,tier+1)];this.pickups.push({x:clamp(a.x,30,450),y:Math.min(a.y,this.baseTop-60),vx:0,vy:22,type,dead:false,t:0});this.event('drop',{type});}
  }
  comet(){
    const x=35+this.rng()*410,y=-30,tx=210+this.rng()*60,dy=this.baseTop-y,dx=tx-x;
    const reference=(22+this.wave*2.6)*1.25,ratio=(2.3+this.rng()*.5)*1.15,speed=reference*ratio,norm=Math.hypot(dx,dy);
    const enemy={kind:'comet',x,y,vx:dx/norm*speed,vy:dy/norm*speed,r:10,hp:4,damage:20,score:175,hit:0,hitMax:.12,flare:0,dead:false,reference,ratio};
    this.enemies.push(enemy);this.event('comet');return enemy;
  }
  ufo(){
    const direction=this.rng()<.5?1:-1;
    // Descend gradually with difficulty, leaving room above the defenses even on short screens.
    const ceiling=Math.max(35,Math.min(this.H*.58,this.baseTop-150)),y=Math.min(ceiling,70+this.rng()*25+Math.max(0,this.wave-1)*18);
    const enemy={kind:'ufo',x:direction>0?-25:505,y,vx:direction*(62+this.wave*1.5),vy:0,r:19,hp:8,damage:0,score:300,hit:0,hitMax:.12,flare:0,dead:false,age:0,fireTimer:.7,volleys:0};
    this.enemies.push(enemy);this.event('ufo');return enemy;
  }
  torpedo(ship,tx,ty=this.baseTop){
    const x=ship.x,y=ship.y+12,dx=tx-x,dy=ty-y,norm=Math.hypot(dx,dy)||1,speed=78+this.wave*3;
    const p={kind:'torpedo',x,y,vx:dx/norm*speed,vy:dy/norm*speed,r:5,hp:1,damage:2,score:15,targetX:tx,targetY:ty,hit:0,hitMax:.12,flare:0,dead:false};this.enemies.push(p);return p;
  }
  addEnemyTrail(e,px,py){const kind=e.kind==='comet'?'cometTrail':'photonTrail',max=e.kind==='comet'?.85:.34;this.trails.push({x:px,y:py,ex:e.x,ey:e.y,damage:1,kind,life:max,max});}
  energyExplosion(x,y,kind,scale=1){
    if(kind==='comet'){
      for(let i=0;i<40;i++){const angle=(i+this.rng())/40*Math.PI*2,speed=(180+this.rng()*390)*scale,life=.8+this.rng()*.55;this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life,max:life,color:'#72bdff',drag:3.8,gravity:90,sparkle:true,phase:this.rng()*6.28,frequency:25+this.rng()*20,brightness:.9,kind:'iceStreak',crystalTimer:0});}
      // A broad blue glitter shower remains after the initial streaks die away.
      for(let i=0;i<72;i++){const angle=this.rng()*Math.PI*2,speed=(35+this.rng()*120)*scale,life=.85+this.rng()*.7;this.crystals.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed*.4+20,gravity:65+this.rng()*60,drag:1.2,life,max:life,size:.65+this.rng()*.55,phase:this.rng()*6.28,color:i%4===0?'#d1eeff':'#69b9ff',kind:'cometSparkler'});}
    }else this.impactBurst(x,y,kind==='torpedo'?'triple':'missile',kind==='torpedo'?2:3);
    const max=kind==='torpedo'?.22:kind==='comet'?.45:.34;this.shockwaves.push({x,y,age:0,life:max,max,radius:(kind==='torpedo'?24:kind==='comet'?96:64)*scale,damage:3,color:kind==='comet'?'#78bfff':'#bcecff',cold:true});
    this.limitEffects();
  }
  destroyEnemy(e){
    if(e.dead)return;e.dead=true;this.score+=e.score;
    if(e.kind==='ufo'){this.breakUfo(e);this.event('ufo-down');return;}
    this.energyExplosion(e.x,e.y,e.kind,e.kind==='ufo'?1.1:1);this.event(e.kind==='comet'?'comet-explosion':e.kind==='ufo'?'ufo-explosion':'photon-explosion');
  }
  dust(x,y,scale=1){
    for(let i=0;i<14+Math.round(scale*6);i++){
      const speed=45+this.rng()*75,angle=-Math.PI*.15-this.rng()*Math.PI*.7,life=.9+this.rng()*.8;
      this.particles.push({x,y:y-1,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life,max:life,color:'#9c9584',drag:.7,gravity:220,brightness:.26,kind:'dust',floor:y,size:1.8+this.rng()*3});
    }this.limitEffects();
  }
  rockDebris(e,y,scale=1){
    const size=e.kind==='comet'?1:e.size,count=e.debrisCount??4+size*3;
    for(let i=0;i<count;i++){
      const angle=-Math.PI*(.12+this.rng()*.76),speed=(45+this.rng()**2*290)*(.85+size*.12)*Math.sqrt(scale),vx=Math.cos(angle)*speed,vy=Math.sin(angle)*speed,gravity=260+this.rng()*160,life=(-vy+Math.sqrt(vy*vy+2*gravity*(this.ground-y)))/gravity+.35;
      this.particles.push({kind:'rockDebris',x:e.x,y:y-2,vx,vy,gravity,drag:.25+this.rng()*.35,life,max:life,floor:this.ground,size:1.2+size*.6+this.rng()*2.8,rotation:this.rng()*6.28,spin:(this.rng()-.5)*15,color:e.kind==='comet'?'#87cdff':'#adc1b2',brightness:.78});
    }this.limitEffects();
  }
  addTurret(){
    if(this.turretUpgrades>=2)return;if(this.turretUpgrades===0)this.turretFirstSide=this.rng()<.5?'left':'right';
    const side=this.turretUpgrades===0?this.turretFirstSide:this.turretFirstSide==='left'?'right':'left',x=side==='left'?72:408;
    this.turretUpgrades++;this.turrets.push({x,y:this.ground-10,side,level:this.groundTurretLevel,hp:this.groundTurretLevel===2?3:1,aim:0,recoil:0,cooldown:.35,shotTimer:0,burstRemaining:0,dead:false});this.event('turret-upgrade',{side,count:this.turretUpgrades});
  }
  turretContact(e,path){
    if(e.dead)return false;for(const t of this.turrets){if(t.dead)continue;if(circleEntry(path,t.x,t.y,14+e.r)!==null){e.dead=true;t.hp=(t.hp||1)-1;if(t.hp>0){this.impactBurst(t.x,t.y,'triple',2);this.event('turret-hit',{side:t.side,hp:t.hp});return true;}t.dead=true;this.energyExplosion(t.x,t.y,'ufo',1.2);this.rockDebris({x:t.x,size:1,debrisCount:12},this.ground-10);this.dust(t.x,this.ground,1);this.event('turret-destroyed',{side:t.side});return true;}}return false;
  }
  updateTurrets(dt){
    const targets=this.targets.filter(a=>!a.dead&&a.x>=0&&a.x<=480&&a.y>=0&&a.y<this.ground-40);
    for(const t of this.turrets){if(t.dead)continue;t.recoil*=Math.exp(-dt*15);t.cooldown-=dt;t.shotTimer-=dt;
      let target=null,distance=Infinity;for(const a of targets){if(a.dead)continue;const d=Math.hypot(a.x-t.x,a.y-t.y);if(d<distance){target=a;distance=d;}}
      if(!target){t.burstRemaining=0;continue;}const lead=Math.min(.45,distance/520);t.aim=clamp(Math.atan2(target.x+target.vx*lead-t.x,t.y-target.y-target.vy*lead),-1.4,1.4);
      if(t.cooldown<=0&&t.burstRemaining===0){t.burstRemaining=3;t.shotTimer=0;t.cooldown=2.1;}
      if(t.burstRemaining>0&&t.shotTimer<=0){const x=t.x+Math.sin(t.aim)*19,y=t.y-Math.cos(t.aim)*19,speed=520;
        for(const offset of t.level===2?[-7.5,0,7.5]:[0]){const aim=t.aim+offset*Math.PI/180;this.bullets.push({x,y,px:x,py:y,vx:Math.sin(aim)*speed,vy:-Math.cos(aim)*speed,damage:1,life:2.5,weapon:t.level===2?'triple':'pulse',turret:true,dead:false});}t.burstRemaining--;t.shotTimer=.12;t.recoil=3;this.event('turret-shot');
      }
    }
  }
  shieldContact(e){
    return this.shieldHits>0&&e.y<=this.ground&&(e.x-240)**2+(e.y-this.ground)**2<=(this.shieldRadius+e.r)**2;
  }
  surfaceImpact(e,base){
    const blastScale=e.kind?1:this.asteroidBlastScale(e),blocked=base&&this.shieldHits>0,y=blocked?clamp(e.y+e.r,this.ground-this.shieldRadius,this.ground):base?this.baseTop:this.ground,damage=e.kind?e.damage:SIZE[e.size].damage;
    e.dead=true;
    if(e.kind)this.energyExplosion(e.x,y,e.kind,.8);
    else this.impactBurst(e.x,y,'missile',clamp(damage/5,2,9),base,blastScale);
    if(!e.kind||e.kind==='comet')this.rockDebris(e,y,blastScale);if(!base)this.dust(e.x,y,e.kind?1:(.5+e.size*.5)*blastScale);
    if(blocked){this.shieldHits--;this.shieldFlash=.3;this.event('shield-hit',{remaining:this.shieldHits});if(this.shieldHits===0)this.event('shield-down');}
    else if(base&&this.reactiveArmor){retaliate(this);}
    else if(base){this.health=Math.max(0,this.health-damage);this.impacts++;this.shake=.18+damage*.002;this.flash=.13;this.event('impact',{damage});if(this.health<=0){this.state='over';this.cancelFire();this.event('over',{score:this.score,wave:this.wave});}}
    else this.event('ground-impact',{damage});
  }
  collideAsteroids(){
    const rocks=this.asteroids.filter(a=>!a.dead&&a.y+a.r>0&&a.collisionGrace<=0);
    for(let i=0;i<rocks.length;i++)for(let j=i+1;j<rocks.length;j++){
      const a=rocks[i],b=rocks[j];if(a.dead||b.dead)continue;const dx=b.x-a.x,dy=b.y-a.y,radius=a.r+b.r,d2=dx*dx+dy*dy;if(d2>=radius*radius)continue;if(a.mounted||b.mounted){if(a.mounted)destroyMount(this,a);if(b.mounted)destroyMount(this,b);continue;}if(a.frozen||b.frozen){if(a.frozen)this.shatterFrozen(a);if(b.frozen)this.shatterFrozen(b);continue;}const d=Math.sqrt(d2);
      const nx=d>1e-6?dx/d:1,ny=d>1e-6?dy/d:0,ma=a.r**2,mb=b.r**2,total=ma+mb,overlap=radius-d+.01;
      a.x-=nx*overlap*mb/total;a.y-=ny*overlap*mb/total;b.x+=nx*overlap*ma/total;b.y+=ny*overlap*ma/total;
      const closing=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
      if(closing<0){const impulse=-1.55*closing/(1/ma+1/mb);a.vx-=impulse*nx/ma;a.vy-=impulse*ny/ma;b.vx+=impulse*nx/mb;b.vy+=impulse*ny/mb;}
      if(a.collisionCooldown<=0&&b.collisionCooldown<=0){
        const x=a.x+nx*a.r,y=a.y+ny*a.r;
        for(let k=0;k<5;k++){const angle=this.rng()*Math.PI*2,speed=25+this.rng()*45,life=.18+this.rng()*.18;this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life,max:life,color:'#c8d6c9',drag:3,brightness:.48,kind:'chip'});}
        a.collisionCooldown=b.collisionCooldown=.2;
      }
      a.x=clamp(a.x,a.r,480-a.r);b.x=clamp(b.x,b.r,480-b.r);
    }
  }
  asteroidDust(a,dt){
    a.dustTimer-=dt;if(a.dustTimer>0)return;a.dustTimer=.09+this.rng()*.22;
    const speed=Math.hypot(a.vx,a.vy);if(speed<1||a.y<0)return;
    const side=(this.rng()-.5)*a.r*.7,x=a.x-a.vx/speed*a.r*.8+side,y=a.y-a.vy/speed*a.r*.8,life=.25+this.rng()*.25;
    this.crystals.push({x,y,vx:a.vx*.08,vy:a.vy*.08,life,max:life,size:.65+this.rng()*.35,phase:this.rng()*6.28,color:'#b9cbbf',kind:'asteroidDust'});
  }
  retireEscapedThreats(){
    for(const list of [this.asteroids,this.enemies])for(const a of list){
      if(a.dead)continue;const margin=Math.max(24,a.r*1.6+8);
      const leaving=(a.y<-margin&&a.vy<=0)||(a.y>this.H+margin&&a.vy>=0)||(a.x<-margin&&a.vx<=0)||(a.x>480+margin&&a.vx>=0);
      if(!leaving)continue;
      // A live nearby hole may still turn the threat back into view or consume it.
      if(this.blackHoles.some(h=>h.age<h.max&&Math.hypot(a.x-h.x,a.y-h.y)<h.radius))continue;
      if(a.thruster&&!a.kind&&!a.mounted)awardThrusterEscape(this,a);else a.dead=true;
    }
  }
  updateEnemies(dt){
    for(const e of [...this.enemies]){
      if(e.dead)continue;if(e.frozen){this.updateFrost(e,dt);if(!e.gravityPull){e.vx=e.vy=0;continue;}}const px=e.x,py=e.y;e.x+=e.vx*dt;e.y+=e.vy*dt;e.hit=Math.max(0,e.hit-dt);if(reinforcementContact(this,e,{x:px,y:py,ex:e.x,ey:e.y})||this.turretContact(e,{x:px,y:py,ex:e.x,ey:e.y}))continue;if(e.frozen)continue;
      if(e.kind==='ufo'){
        e.age+=dt;e.fireTimer-=dt;
        if(e.x>=12&&e.x<=468&&e.fireTimer<=0){const count=this.wave>=4?3:2;const targets=[{x:240,y:this.baseTop},...this.turrets.filter(t=>!t.dead),...this.asteroids.filter(a=>a.mounted&&!a.dead)];for(let i=0;i<count;i++){const target=targets[(e.volleys+i)%targets.length];this.torpedo(e,target.x+(this.rng()-.5)*(target.x===240?70:8),target.y);}e.volleys++;e.fireTimer=Math.max(.48,.78-this.wave*.025);this.event('photon');}
        if((e.vx>0&&e.x>510)||(e.vx<0&&e.x<-30))e.dead=true;
      }else{
        this.addEnemyTrail(e,px,py);
        if(e.kind==='comet'){e.iceTimer=(e.iceTimer||0)-dt;if(e.iceTimer<=0){e.iceTimer=.02;const life=.45+this.rng()*.4;this.crystals.push({x:px+(this.rng()-.5)*5,y:py-5,vx:-e.vx*.06,vy:-e.vy*.06,life,max:life,size:.6+this.rng()*.4,phase:this.rng()*6.28,color:'#82caff',kind:'cometIce',gravity:35+this.rng()*35});}}
        if(this.shieldContact(e)||(e.x+e.r>160&&e.x-e.r<320&&e.y+e.r>=this.baseTop))this.surfaceImpact(e,true);
        else if(e.y+e.r>=this.ground)this.surfaceImpact(e,false);
      }
      if(this.state==='over')break;
    }
  }
  limitEffects(){if(this.particles.length>500)this.particles.splice(0,this.particles.length-500);if(this.crystals.length>700)this.crystals.splice(0,this.crystals.length-700);if(this.shockwaves.length>32){const active=this.shockwaves.filter(w=>w.damaging);this.shockwaves=[...active,...this.shockwaves.filter(w=>!w.damaging).slice(-(32-active.length))];}}
  breakUfo(e){
    const hull=Array.from({length:8},(_,i)=>[Math.cos(i*Math.PI/4)*21,Math.sin(i*Math.PI/4)*6+1]);
    const shapes=hull.map((p,i)=>[[0,1],p,hull[(i+1)%8]]);
    shapes.push([[-9,-1],[-7,-7],[0,-11],[7,-7],[9,-1]]);
    for(let i=0;i<shapes.length;i++){
      const shape=shapes[i],center=shape[0].map((_,j)=>shape.reduce((sum,p)=>sum+p[j],0)/shape.length),angle=i<8?(i+.5)*Math.PI/4:-Math.PI/2,speed=24+this.rng()*52,life=4+this.rng()*2;
      this.spaceDebris.push({x:e.x+center[0],y:e.y+center[1],vx:e.vx*.18+Math.cos(angle)*speed,vy:Math.sin(angle)*speed,points:shape.map(p=>p.map((x,j)=>x-center[j])),rotation:0,spin:(this.rng()-.5)*2.5,life,max:life,kind:i===8?'canopy':'hull'});
    }
    if(this.spaceDebris.length>45)this.spaceDebris.splice(0,this.spaceDebris.length-45);
  }
  updateEffects(dt){
    for(const beam of this.freezeBeams)beam.age+=dt;this.freezeBeams=this.freezeBeams.filter(beam=>beam.age<beam.max);

    for(const p of this.spaceDebris){p.x+=p.vx*dt;p.y+=p.vy*dt;p.rotation+=p.spin*dt;p.life-=dt;}this.spaceDebris=compactLife(this.spaceDebris);this.shieldFlash=Math.max(0,this.shieldFlash-dt);
    for(const p of this.particles){
      if(p.drag){const damping=Math.exp(-p.drag*dt),travel=(1-damping)/p.drag;p.x+=p.vx*travel;p.y+=p.vy*travel;p.vx*=damping;p.vy=p.vy*damping+(p.gravity||0)*travel;}
      else{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=25*dt;}
      p.life-=dt;
      if(p.kind==='rockDebris'){p.rotation+=p.spin*dt;if(p.y>=p.floor&&p.vy>0){p.y=p.floor;p.vy=-p.vy*.18;p.vx*=.5;p.life=Math.min(p.life,.16);}}
      if(p.kind==='dust'&&p.y>=p.floor&&p.vy>0){p.y=p.floor;p.vy=-p.vy*.12;p.vx*=.6;p.life=Math.min(p.life,.2);}
      if(p.kind==='iceStreak'){
        p.crystalTimer-=dt;if(p.crystalTimer<=0){p.crystalTimer=.025;const life=.3+this.rng()*.35;this.crystals.push({x:p.x,y:p.y,vx:p.vx*.08,vy:p.vy*.08,life,max:life,size:.65+this.rng()*.6,phase:this.rng()*6.28,gravity:40+this.rng()*30,color:'#84caff',kind:'explosionIce'});}
      }
    }
    for(const c of this.crystals){if(c.drag)c.vx*=Math.exp(-c.drag*dt);c.x+=c.vx*dt;c.y+=c.vy*dt+(c.gravity||0)*dt*dt*.5;c.vy+=(c.gravity||0)*dt;c.life-=dt;}
    for(const w of this.shockwaves){w.age+=dt;w.life-=dt;}for(const t of this.trails)t.life-=dt;
    this.particles=compactLife(this.particles);this.crystals=compactLife(this.crystals);this.shockwaves=compactLife(this.shockwaves);this.trails=compactLife(this.trails);if(this.trails.length>1800)this.trails.splice(0,this.trails.length-1800);this.limitEffects();
  }
  collect(p){
    if(p.dead)return;p.dead=true;if(!this.lightningOnly&&collectArsenal(this,p.type))return;if(this.lightningOnly&&(p.type==='turret'||BONUS_TYPES.includes(p.type)||WEAPONS.includes(p.type)))return;if(BONUS_TYPES.includes(p.type)){deployBonus(this,p.type,p);return;}if(p.type==='turret'){this.addTurret();return;}if(p.type==='shield'){this.shieldHits=this.shieldCapacity;this.shieldFlash=.3;this.event('shield-up',{hits:this.shieldHits});this.spark(p.x,p.y,18,'#97dfff');return;}
    if(this.debugOptions&&WEAPONS.includes(p.type)){this.equipDebug(p.type);return;}
    const tier=WEAPONS.indexOf(p.type),current=WEAPONS.indexOf(this.weapon);const recurringLimited=this.weaponTier>=5&&LATE_WEAPONS.includes(p.type);if(tier<0||(tier<current&&!recurringLimited)||(tier===current&&!LATE_WEAPONS.includes(p.type)))return;
    this.weapon=p.type;this.weaponTier=Math.max(this.weaponTier,tier);this.lightningUses=p.type==='lightning'?5:0;this.gravityUses=p.type==='gravity'?5:0;this.freezeUses=p.type==='freeze'?6:0;this.seekerUses=p.type==='seeker'?20:0;this.repulserUses=p.type==='repulser'?1:0;this.mountUses=p.type==='mount'?3:0;this.thrusterUses=p.type==='thruster'?10:0;
    this.cooldown=0;this.event('upgrade',{weapon:p.type});this.spark(p.x,p.y,15,p.type==='acid'?'#b0ff69':p.type==='freeze'?'#7cddff':p.type==='gravity'?'#ff5960':p.type==='missile'?'#ffa071':'#bce8c9');
  }
  spark(x,y,count,color,scale=1){for(let i=0;i<count;i++){const angle=this.rng()*Math.PI*2,speed=(20+this.rng()*95)*scale,life=(.3+this.rng()*.6)*Math.sqrt(scale);this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life,max:life,color});}if(this.particles.length>500)this.particles.splice(0,this.particles.length-500);}
  update(dt){
    if(this.state!=='playing'&&this.state!=='over'){this.frameDt=0;return;}dt=this.advanceLightning(dt);if(dt===0)return;
    if(this.state==='over'){updateArsenal(this,dt);for(const h of this.blackHoles)h.age+=dt;this.blackHoles=this.blackHoles.filter(h=>h.age<h.max);for(const a of this.asteroids){for(const h of a.heat)h.age+=dt;a.heat=a.heat.filter(h=>h.age<h.max);a.hit=Math.max(0,a.hit-dt);}this.time+=dt;this.flash=Math.max(0,this.flash-dt);this.shake=Math.max(0,this.shake-dt);this.updateEffects(dt);return;}
    if(this.state!=='playing')return;
    this.time+=dt;this.waveTime+=dt;this.recoil*=Math.exp(-dt*(this.overdriveTime>0?32:18));if(this.recoil<.01)this.recoil=0;this.flash=Math.max(0,this.flash-dt);this.shake=Math.max(0,this.shake-dt);this.cooldown-=dt;
    if(this.holding){this.charge=Math.min(this.chargeMax,this.charge+dt);if(this.cooldown<=0&&!this.firesOnRelease){this.shoot();this.cooldown=this.fireInterval;}}
    if(this.spawnLeft>0){this.spawnTimer-=dt;if(this.spawnTimer<=0){this.spawn();this.spawnLeft--;this.spawnTimer=Math.max(.6,2.5-this.wave*.08);}}
    if(this.cometSchedule.length&&this.waveTime>=this.cometSchedule[0]){this.cometSchedule.shift();this.comet();}
    if(this.ufoTimer!==null&&this.waveTime>=this.ufoTimer){this.ufoTimer=null;this.ufo();}
    for(const a of this.targets){a.frameX=a.x;a.frameY=a.y;}
    updateArsenal(this,dt);
    this.updateAcid(dt);
    this.updateBlackHoles(dt);
    this.retireEscapedThreats();
    const mounts=this.asteroids.filter(a=>!a.dead&&a.mounted);
    for(const a of this.asteroids){
      if(a.dead)continue;accelerateThruster(this,a,dt);a.collisionCooldown=Math.max(0,a.collisionCooldown-dt);a.collisionGrace=Math.max(0,a.collisionGrace-dt);if(a.frozen){this.updateFrost(a,dt);if(!a.gravityPull){a.vx=a.vy=0;continue;}}const px=a.x,py=a.y;a.x+=a.vx*dt;a.y+=a.vy*dt;if(!a.frozen){a.rx+=a.sx*dt;a.ry+=a.sy*dt;a.rz+=a.sz*dt;}a.hit=Math.max(0,a.hit-dt);
      for(const h of a.heat)h.age+=dt;a.heat=a.heat.filter(h=>h.age<h.max);this.asteroidDust(a,dt);
      if(!a.thruster&&a.x<a.r&&a.vx<0)a.vx=Math.abs(a.vx);if(!a.thruster&&a.x>480-a.r&&a.vx>0)a.vx=-Math.abs(a.vx);
      if(reinforcementContact(this,a,{x:px,y:py,ex:a.x,ey:a.y},mounts)||this.turretContact(a,{x:px,y:py,ex:a.x,ey:a.y}))continue;
      if(this.shieldContact(a)||(a.x+a.r>160&&a.x-a.r<320&&a.y+a.r>=this.baseTop))this.surfaceImpact(a,true);
      else if(a.y+a.r>=this.ground)this.surfaceImpact(a,false);
      if(this.state==='over')break;
    }
    if(this.state==='playing'){this.collideAsteroids();this.updateEnemies(dt);this.updateTurrets(dt);updateReinforcements(this,dt);}
    if(this.state==='playing'){
      this.updateSpecialWeapons(dt);updateChains(this,dt);
      for(const b of this.bullets){if(b.kind==='missile')this.steerMissile(b,dt);if(b.kind==='seeker')steerSeeker(this,b,dt);this.advanceBullet(b,dt);}
      for(const p of this.pickups){if(p.dead)continue;p.x+=(p.vx||0)*dt;p.y+=p.vy*dt;p.t+=dt;if(p.y+12>=this.baseTop&&p.x>=148&&p.x<=332)this.collect(p);else if(p.y>this.ground)p.dead=true;}
    }
    this.updateEffects(dt);this.asteroids=compactDead(this.asteroids);this.enemies=compactDead(this.enemies);this.bullets=compactDead(this.bullets);this.pickups=compactDead(this.pickups);
    if(this.state==='playing'&&!this.spawnLeft&&!this.asteroids.some(a=>!a.mounted)&&!this.enemies.length&&!this.cometSchedule.length&&this.ufoTimer===null){this.waveDelay-=dt;if(this.waveDelay<=0)this.nextWave();}
  }
}
