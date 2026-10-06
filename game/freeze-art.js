import {pointSprite} from './point-sprites.js?v=b0edb1b3bbff';
export function drawFreezeRay(ctx,beam){
  const fade=Math.max(0,1-beam.age/beam.max)**1.5,half=Math.PI/9;
  ctx.save();ctx.translate(beam.x,beam.y);ctx.rotate(beam.aim);ctx.globalCompositeOperation='lighter';ctx.shadowBlur=0;
  if(!beam.gradient){beam.gradient=ctx.createRadialGradient(0,0,0,0,0,beam.length);beam.gradient.addColorStop(0,'rgba(187,244,255,.65)');beam.gradient.addColorStop(.15,'rgba(77,190,255,.32)');beam.gradient.addColorStop(.65,'rgba(40,131,240,.2)');beam.gradient.addColorStop(1,'rgba(39,123,230,0)');}
  ctx.globalAlpha=fade;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,beam.length,-Math.PI/2-half,-Math.PI/2+half);ctx.closePath();ctx.fillStyle=beam.gradient;ctx.fill();
  ctx.strokeStyle='#9defff';ctx.globalAlpha=fade*.32;ctx.lineWidth=.75;ctx.beginPath();for(const angle of [-half,-half*.38,half*.38,half]){ctx.moveTo(0,0);ctx.lineTo(Math.sin(angle)*beam.length,-Math.cos(angle)*beam.length);}ctx.stroke();
  ctx.globalAlpha=fade*.9;ctx.drawImage(pointSprite('#a8edff'),-24,-24,48,48);ctx.restore();
}
