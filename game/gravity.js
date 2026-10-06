import {pointSprite} from './point-sprites.js?v=b0edb1b3bbff';
let backlight=null;
const heatStops=[[0,0,0],[180,28,24],[244,116,32],[255,229,80],[255,255,255]],heatColors=new Map();
export function gravityHeatColor(progress){
  const step=Math.round(Math.min(1,Math.max(0,progress))*24);if(heatColors.has(step))return heatColors.get(step);
  const u=step/6,i=Math.min(3,Math.floor(u)),t=u-i,color='#'+heatStops[i].map((v,j)=>Math.round(v+(heatStops[i+1][j]-v)*t).toString(16).padStart(2,'0')).join('');heatColors.set(step,color);return color;
}
export function gravityGlowFalloff(u){return (1-Math.min(1,Math.max(0,u)))**2;}
function backlightSprite(){
  if(backlight)return backlight;const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(256,256):document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.shadowBlur=0;
  const g=ctx.createRadialGradient(128,128,0,128,128,128);for(let i=0;i<=20;i++){const u=i/20;g.addColorStop(u,`rgba(255,255,255,${gravityGlowFalloff(u)*.95})`);}ctx.fillStyle=g;ctx.fillRect(0,0,256,256);
  backlight=canvas;return backlight;
}
export function drawGravityOrb(ctx,x,y,r,age,alpha=1,dust=[]){
  ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='lighter';ctx.shadowBlur=0;ctx.globalAlpha=alpha;const extent=r*(r<12?1.75:3.5),sprite=backlightSprite();
  ctx.drawImage(sprite,-extent,-extent,extent*2,extent*2);
  for(const p of dust){const u=(age-p.delay)/p.duration;if(u<0||u>=1)continue;const radius=r+(p.radius-r)*(1-u)**.75,angle=p.phase+u*p.spin,size=p.size*(1-u*.45),px=Math.cos(angle)*radius,py=Math.sin(angle)*radius*.88,color=gravityHeatColor(u);
    ctx.globalAlpha=alpha*Math.min(1,(1-u)*8);ctx.globalCompositeOperation=u<.05?'source-over':'lighter';ctx.drawImage(pointSprite(color),px-7.5*size,py-7.5*size,16*size,16*size);
    if(size>2.5){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(px-size,py);ctx.lineTo(px,py-size*.7);ctx.lineTo(px+size,py);ctx.lineTo(px,py+size*.8);ctx.closePath();ctx.fill();}
  }
  // The opaque center is painted last so backlight and infalling dust stay behind it.
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=alpha;ctx.shadowBlur=0;ctx.fillStyle='#000000';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#f4faff';ctx.lineWidth=1.2;ctx.globalAlpha=alpha*.9;ctx.shadowColor='#ffffff';ctx.shadowBlur=12;ctx.stroke();ctx.restore();
}
