const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const pointSegment=(x,y,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,u=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a.x-u*dx,y-a.y-u*dy);};
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function inTriangle(p,a,b,c){if(Math.abs(cross(a,b,c))<1e-8)return false;const x=cross(a,b,p),y=cross(b,c,p),z=cross(c,a,p);return (x>=0&&y>=0&&z>=0)||(x<=0&&y<=0&&z<=0);}
export function resetTethers(g){g.chainBolts=[];g.thrusterUses=0;}
export function launchChain(g){
  const m=g.muzzle,forward={x:Math.sin(g.aim),y:-Math.cos(g.aim)},side={x:Math.cos(g.aim),y:Math.sin(g.aim)},rest=6.4,nodes=[];
  // A folded chain starts between the two launch tubes; heavy endpoints pull it open.
  for(let i=0;i<=10;i++){const u=i/10,lateral=(u-.5)*12,fold=i%2?Math.sqrt(rest*rest-1.2*1.2):0;nodes.push({x:m.x+side.x*lateral-forward.x*fold,y:m.y+side.y*lateral-forward.y*fold,vx:forward.x*(330+(u-.5)*60)+side.x*(u-.5)*190,vy:forward.y*(330+(u-.5)*60)+side.y*(u-.5)*190,inverseMass:i===0||i===10?.25:1/.15});}
  g.chainBolts.push({nodes,rest,age:0,life:4.2});if(g.chainBolts.length>8)g.chainBolts.shift();g.fired++;g.recoil=10;g.event('chain-shot');
}
export function launchThruster(g){
  if(g.thrusterUses<=0)return;const m=g.muzzle,speed=470;g.bullets.push({...m,px:m.x,py:m.y,vx:Math.sin(g.aim)*speed,vy:-Math.cos(g.aim)*speed,r:3,damage:0,life:3,age:0,kind:'thruster',weapon:'thruster',dead:false});g.thrusterUses--;g.fired++;g.recoil=7;g.event('thruster-shot');if(!g.thrusterUses){g.weapon='missile';g.event('special-empty',{weapon:'thruster'});}
}
export function attachThruster(g,a,b){
  if(a.dead||a.mounted)return;if(a.frozen){g.shatterFrozen(a);return;}if(a.kind){g.hit(a,3,{x:b.x,y:b.y,weapon:'missile'});return;}
  const speed=Math.hypot(b.vx,b.vy)||1,direction={x:b.vx/speed,y:b.vy/speed};a.thruster={...direction,age:0,force:500};const impulse=80/Math.max(.25,(a.r/17)**2);a.vx+=direction.x*impulse;a.vy+=direction.y*impulse;g.spark(b.x,b.y,10,'#94e5ff',.5);g.event('thruster-attach');
}
export function accelerateThruster(g,a,dt){
  if(!a.thruster||a.dead||a.frozen||a.mounted)return;const t=a.thruster;t.age+=dt;const mass=Math.max(.25,(a.r/17)**2),force=t.force*Math.min(1,t.age/.12)/mass;a.vx+=t.x*force*dt;a.vy+=t.y*force*dt;const speed=Math.hypot(a.vx,a.vy);if(speed>760){a.vx*=760/speed;a.vy*=760/speed;}
  // The engine gimbals and damps tumbling rather than teleporting the rock.
  const damping=Math.exp(-dt*.9);a.sx*=damping;a.sy*=damping;a.sz*=damping;
  const x=a.x-t.x*(a.r+5),y=a.y-t.y*(a.r+5);g.addTrail({x:x-t.x*12,y:y-t.y*12,ex:x,ey:y},1,'thrusterTrail');g.trails.at(-1).life=g.trails.at(-1).max=.28;
}
export function awardThrusterEscape(g,a){if(a.dead)return;g.destroy(a,true,false);g.event('thruster-clear');}
export function solveChain(bolt,dt){
  const nodes=bolt.nodes;
  for(const p of nodes){p.oldX=p.x;p.oldY=p.y;p.vy+=42*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
  // Distance constraints are solved with inverse-mass weighting, preserving COM.
  for(let pass=0;pass<12;pass++)for(let j=0;j<nodes.length-1;j++){const i=pass%2?nodes.length-2-j:j,a=nodes[i],b=nodes[i+1],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,correction=(d-bolt.rest)/d,total=a.inverseMass+b.inverseMass;const x=dx*correction,y=dy*correction;a.x+=x*a.inverseMass/total;a.y+=y*a.inverseMass/total;b.x-=x*b.inverseMass/total;b.y-=y*b.inverseMass/total;}
  for(const p of nodes){p.vx=(p.x-p.oldX)/dt;p.vy=(p.y-p.oldY)/dt;}
}
export function sweptChainHit(a,A,B,t0=1,t1=1,padding=1.5){
  const x0=(a.frameX??a.x)+(a.x-(a.frameX??a.x))*t0,y0=(a.frameY??a.y)+(a.y-(a.frameY??a.y))*t0,p={x:(a.frameX??a.x)+(a.x-(a.frameX??a.x))*t1,y:(a.frameY??a.y)+(a.y-(a.frameY??a.y))*t1},oldA={x:A.oldX+p.x-x0,y:A.oldY+p.y-y0},oldB={x:B.oldX+p.x-x0,y:B.oldY+p.y-y0},r=a.r+padding;
  if(p.x+r<Math.min(oldA.x,oldB.x,A.x,B.x)||p.x-r>Math.max(oldA.x,oldB.x,A.x,B.x)||p.y+r<Math.min(oldA.y,oldB.y,A.y,B.y)||p.y-r>Math.max(oldA.y,oldB.y,A.y,B.y))return false;
  return inTriangle(p,oldA,oldB,B)||inTriangle(p,oldA,B,A)||[[oldA,oldB],[oldB,B],[B,A],[A,oldA]].some(([u,v])=>pointSegment(p.x,p.y,u,v)<=r);
}
export function updateChains(g,dt){
  if(dt<=0)return;const steps=Math.max(1,Math.ceil(dt/(1/120))),h=dt/steps;
  for(const bolt of g.chainBolts){bolt.age+=dt;bolt.life-=dt;for(let step=0;step<steps;step++){
    solveChain(bolt,h);let grounded=false;for(const p of bolt.nodes)if(g.terrainEntry({x:p.oldX,y:p.oldY,ex:p.x,ey:p.y})!==null){grounded=true;break;}
    if(grounded){bolt.life=0;g.spark(bolt.nodes[0].x,bolt.nodes[0].y,8,'#f0d7a5',.5);break;}
    for(const a of [...g.targets]){if(a.dead)continue;for(let i=0;i<bolt.nodes.length-1;i++)if(sweptChainHit(a,bolt.nodes[i],bolt.nodes[i+1],step/steps,(step+1)/steps)){
      g.impactBurst(a.x,a.y,'missile',6);if(a.frozen)g.shatterFrozen(a);else g.destroy(a,true,false);break;
    }}
    for(const p of [...g.pickups])if(!p.dead){const crate={...p,r:16};if(bolt.nodes.slice(1).some((b,i)=>sweptChainHit(crate,bolt.nodes[i],b,step/steps,(step+1)/steps))||[bolt.nodes[0],bolt.nodes.at(-1)].some(b=>sweptChainHit(crate,b,b,step/steps,(step+1)/steps,4.5)))g.collect(p);}
    // Projectile heads are larger than the links and also destroy direct contacts.
    for(const p of [bolt.nodes[0],bolt.nodes.at(-1)])for(const a of g.targets)if(!a.dead&&sweptChainHit(a,p,p,step/steps,(step+1)/steps,4.5)){g.impactBurst(a.x,a.y,'missile',6);if(a.frozen)g.shatterFrozen(a);else g.destroy(a,true,false);}
  }if(bolt.nodes.every(p=>p.y<-35)||bolt.nodes.every(p=>p.x<-35)||bolt.nodes.every(p=>p.x>515))bolt.life=0;}
  g.chainBolts=g.chainBolts.filter(b=>b.life>0);g.limitEffects();
}
