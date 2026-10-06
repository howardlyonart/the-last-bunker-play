import {pointSprite} from './point-sprites.js?v=b0edb1b3bbff';
let shieldTexture=null;
const chargeColors=['#330d13','#ff253a','#ff8526','#ffe65b','#ffffff'];
export function chargeLightColor(index,charge){return chargeColors[Math.min(4,Math.max(0,Math.floor(charge+1e-8)-Math.abs(index-4)))];}
export function chargeLightLevel(index,charge,time){
  if(charge+1e-8<Math.abs(index-4)+1)return 0;
  return charge>=5?.76+.24*Math.sin(time*7):1;
}
export function drawChargeLights(ctx,ground,charge,time,glow){
  ctx.save();
  for(let i=0;i<9;i++){
    const level=chargeLightLevel(i,charge,time),color=chargeLightColor(i,charge),x=193+i*11;
    ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.fillStyle='#330d13';ctx.fillRect(x,ground-12,6,7);
    ctx.strokeStyle='#60303a';ctx.lineWidth=.65;ctx.strokeRect(x,ground-12,6,7);
    if(level){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=level*.85;ctx.drawImage(pointSprite(color),x+3-24,ground-8.5-24,48,48);ctx.globalAlpha=level;ctx.fillStyle=color;glow(color,level,7);ctx.fillRect(x+.8,ground-11.2,4.4,5.4);ctx.globalCompositeOperation='source-over';}
  }
  ctx.restore();
}
// View-angle falloff: a dim face, brighter rim, then a soft glow outside the sphere.
export function shieldRimGlow(radius){
  if(radius>1)return .24*Math.max(0,1-(radius-1)/.18)**2;
  const u=Math.max(0,radius);return .02+.22*(1-Math.sqrt(1-u*u))**1.35;
}
function shieldSprite(){
  if(shieldTexture)return shieldTexture;
  const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(256,256):document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(128,128,0,128,128,128);
  for(let i=0;i<=40;i++){const u=i/40;gradient.addColorStop(u,`rgba(132,219,255,${shieldRimGlow(u*1.18)})`);}ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);shieldTexture=canvas;return canvas;
}
export function drawShieldDome(ctx,x,ground,radius,flash,hits,glow,layers=1){
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.shadowBlur=0;ctx.globalAlpha=.75+flash*.25;const extent=radius*1.18;
  ctx.drawImage(shieldSprite(),0,0,256,128,x-extent,ground-extent,extent*2,extent);
  ctx.globalAlpha=.35+flash*.45;ctx.strokeStyle='#97dfff';ctx.lineWidth=1+flash;glow(ctx.strokeStyle,ctx.globalAlpha,4);ctx.beginPath();ctx.arc(x,ground,radius,Math.PI,Math.PI*2);ctx.stroke();
  if(layers===2){ctx.globalAlpha=.5+flash*.35;ctx.strokeStyle='#c4caff';ctx.lineWidth=1.1;glow(ctx.strokeStyle,ctx.globalAlpha,4);ctx.beginPath();ctx.arc(x,ground,radius-10,Math.PI,Math.PI*2);ctx.stroke();ctx.globalAlpha=.32;const inner=(radius-10)*1.18;ctx.drawImage(shieldSprite(),0,0,256,128,x-inner,ground-inner,inner*2,inner);}
  ctx.globalAlpha=.65;ctx.font='7px monospace';ctx.textAlign='center';ctx.fillStyle='#97dfff';glow(ctx.fillStyle);ctx.fillText(`SHIELD ${layers===2?'II ':''}${'●'.repeat(hits)}`,x,ground-radius-10);ctx.restore();
}
export function drawAutoTurret(ctx,t,ground,glow){
  ctx.save();ctx.translate(t.x,ground);ctx.fillStyle='#0b1518';ctx.beginPath();ctx.moveTo(-15,0);ctx.lineTo(-10,-13);ctx.lineTo(10,-13);ctx.lineTo(15,0);ctx.closePath();ctx.fill();ctx.strokeStyle='#c7cdbb';ctx.lineWidth=1.1;glow(ctx.strokeStyle);ctx.stroke();
  ctx.shadowBlur=0;ctx.strokeStyle='#627a71';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(-17,2);ctx.lineTo(17,2);ctx.moveTo(-8,-3);ctx.lineTo(-5,-9);ctx.moveTo(8,-3);ctx.lineTo(5,-9);ctx.stroke();
  if(t.level===2){ctx.strokeStyle='#d5aa79';ctx.lineWidth=1.4;glow(ctx.strokeStyle);ctx.strokeRect(-10,-11,20,8);for(let i=0;i<3;i++){ctx.fillStyle=i<(t.hp||0)?'#ffc27d':'#573c2f';ctx.fillRect(-6+i*5,-6,2,2);}}
  ctx.translate(0,-10);ctx.save();ctx.rotate(t.aim);ctx.translate(0,t.recoil);ctx.fillStyle='#0b1518';if(t.level===2){for(const x of [-5,0,5]){ctx.fillRect(x-1.6,-24,3.2,27);ctx.strokeStyle='#ffddac';ctx.lineWidth=.9;glow(ctx.strokeStyle);ctx.strokeRect(x-1.6,-24,3.2,27);}}else ctx.fillRect(-3,-21,6,24);ctx.strokeStyle='#d9dfc8';ctx.lineWidth=1.2;glow(ctx.strokeStyle);ctx.strokeRect(-3,-21,6,24);
  ctx.beginPath();ctx.moveTo(-5,-18);ctx.lineTo(5,-18);ctx.moveTo(-4,-7);ctx.lineTo(4,-7);ctx.stroke();ctx.restore();
  // Fixed trunnion overlaps the barrel root through its full aim and recoil range.
  ctx.fillStyle='#101c1a';ctx.beginPath();ctx.arc(0,0,6.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#c7cdbb';ctx.lineWidth=1.1;glow(ctx.strokeStyle);ctx.stroke();ctx.beginPath();ctx.arc(0,0,2,0,Math.PI*2);ctx.stroke();ctx.restore();
}
