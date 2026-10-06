import {ARSENAL_NAMES,ARSENAL_COLORS} from './arsenal.js?v=b0edb1b3bbff';
const labels=Object.fromEntries(Object.entries(ARSENAL_NAMES).map(([key,value])=>[key,value.toUpperCase()]));
import {pointSprite} from './point-sprites.js?v=b0edb1b3bbff';
export const UPGRADE_LABELS={drone:'DRONE',minelayer:'MINELAYER',shield2:'SHIELD II',turret2:'TURRET II',seeker:'SEEKER',repulser:'REPULSER',mount:'ROCK TURRET',chain:'CHAIN SHOT',thruster:'THRUSTER',...labels};
export const UPGRADE_ICONS={drone:'✦',minelayer:'M',shield2:'◎',turret2:'Ⅱ',seeker:'✹',repulser:'◉',mount:'T+',chain:'∞',thruster:'↑',railgun:'↟',flak:'✳',prism:'◇',singularity:'⊗',disc:'◌',plasma:'✧',interceptor:'⌁',magnet:'∩',armor:'▱',overdrive:'⚡'};
export const UPGRADE_COLORS={drone:'#a5eeff',minelayer:'#e4c291',shield2:'#b5c7ff',turret2:'#ffd6a2',seeker:'#ffb87a',repulser:'#efb9ff',mount:'#a4f1dc',chain:'#ead5af',thruster:'#a9dfff',...ARSENAL_COLORS};
function outline(ctx,points,color,width,glow){ctx.strokeStyle=color;ctx.lineWidth=width;glow(color,ctx.globalAlpha,1.4);ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
export function drawAdvancedBullet(ctx,b,glow){
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.age*8||Math.atan2(b.vx,-b.vy));
  if(b.kind==='seeker'){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.45;ctx.drawImage(pointSprite('#ffb87a'),-19,-19,38,38);ctx.globalAlpha=1;const points=Array.from({length:17},(_,i)=>{const a=i*Math.PI/8,r=i%2?3.2:7;return [Math.sin(a)*r,Math.cos(a)*r];});outline(ctx,points,'#ffe1b2',1.2,glow);ctx.fillStyle='#ffd6a2';ctx.fillRect(-1,-1,2,2);}
  else{outline(ctx,[[0,-6],[-4,0],[0,5],[4,0],[0,-6]],'#a4f1dc',1.3,glow);outline(ctx,[[-2,0],[2,0]],'#f0ffff',1,glow);}
  ctx.restore();
}
export const mineBlink=(time,phase=0)=>.12+.88*Math.max(0,Math.cos(time*4.5+phase))**8;
export function drawReinforcements(ctx,g,glow){
  for(const m of g.mines){
    if(m.dead)continue;ctx.save();ctx.translate(m.x,m.y);ctx.rotate(m.age*.08+(m.phase||0));ctx.globalAlpha=.9;
    ctx.fillStyle='#250c10';ctx.beginPath();ctx.arc(0,0,4.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ff4c50';ctx.lineWidth=1;glow(ctx.strokeStyle,.9,1.8);ctx.stroke();
    ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.moveTo(Math.cos(a-.16)*4.5,Math.sin(a-.16)*4.5);ctx.lineTo(Math.cos(a)*8,Math.sin(a)*8);ctx.lineTo(Math.cos(a+.16)*4.5,Math.sin(a+.16)*4.5);}ctx.lineWidth=.75;ctx.stroke();
    const blink=mineBlink(g.time,m.phase||0);ctx.fillStyle='#ff343d';ctx.globalAlpha=blink;glow(ctx.fillStyle,blink,3);ctx.fillRect(-.75,-.75,1.5,1.5);ctx.restore();
  }
  for(const d of g.drones){ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.heading);ctx.globalAlpha=Math.min(1,d.life/.5);ctx.fillStyle='#101f25';ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(8,6);ctx.lineTo(3,4);ctx.lineTo(0,8);ctx.lineTo(-3,4);ctx.lineTo(-8,6);ctx.closePath();ctx.fill();outline(ctx,[[0,-10],[3,-1],[8,6],[3,4],[0,8],[-3,4],[-8,6],[-3,-1],[0,-10]],'#bcefff',1,glow);outline(ctx,[[0,-6],[0,2]],'#ecffff',.8,glow);outline(ctx,[[-2,8],[0,11+Math.sin(g.time*42)*2],[2,8]],'#7fcfff',1,glow);ctx.restore();}
  for(const c of g.minelayers){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.heading);ctx.fillStyle='#151a1d';ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(12,-6);ctx.lineTo(15,14);ctx.lineTo(-15,14);ctx.lineTo(-12,-6);ctx.closePath();ctx.fill();outline(ctx,[[0,-18],[12,-6],[15,14],[-15,14],[-12,-6],[0,-18]],'#e4c291',1.4,glow);outline(ctx,[[-10,-4],[-7,10],[7,10],[10,-4]],'#8c9ca0',1,glow);for(const x of [-10,10]){outline(ctx,[[x-3,6],[x-3,17],[x+3,17],[x+3,6]],'#d6e1db',1,glow);outline(ctx,[[x,17],[x,22]],'#8cdfff',1.5,glow);}ctx.fillStyle='#b9eaff';glow(ctx.fillStyle);ctx.fillRect(-3,-9,6,3);ctx.restore();}
  for(const a of g.asteroids){if(a.dead||!a.mounted)continue;ctx.save();ctx.translate(a.x,a.y);ctx.fillStyle='#0e2625';ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b8f3d9';ctx.lineWidth=1.1;glow(ctx.strokeStyle,1,2);ctx.stroke();ctx.rotate(a.mounted.aim);ctx.translate(0,a.mounted.recoil);outline(ctx,[[-3,3],[-3,-a.r-9],[3,-a.r-9],[3,3]],'#caffeb',1.3,glow);outline(ctx,[[-5,-a.r-7],[5,-a.r-7]],'#e8ffff',1.2,glow);ctx.restore();}
}
