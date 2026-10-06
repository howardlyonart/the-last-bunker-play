export function lightningOpacity(age,tier){const end=[.78,.56,.34][tier],hold=[.13,.09,.05][tier];return age<=hold?1:Math.max(0,Math.min(1,(end-age)/(end-hold)))**1.8;}
export function lightningTendrilOpacity(age,tier){const end=[.4,.32,.24][tier];return Math.max(0,1-age/end)**1.5;}
export function taperLightning(points,width){
  const left=[],right=[],distances=[0];for(let i=1;i<points.length;i++)distances.push(distances[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));const total=distances.at(-1)||1;
  for(let i=0;i<points.length;i++){const before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)],dx=after.x-before.x,dy=after.y-before.y,n=Math.hypot(dx,dy)||1;
    const radius=width*(1-distances[i]/total)**1.1;left.push({x:points[i].x-dy/n*radius,y:points[i].y+dx/n*radius});right.push({x:points[i].x+dy/n*radius,y:points[i].y-dx/n*radius});}
  return [...left,...right.reverse()];
}
export function lightningWidthAt(bolt,target){
  let total=0,nearest=Infinity,at=0;for(let i=1;i<bolt.points.length;i++){const a=bolt.points[i-1],b=bolt.points[i],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),u=Math.max(0,Math.min(1,((target.x-a.x)*dx+(target.y-a.y)*dy)/(length*length||1))),distance=Math.hypot(target.x-a.x-u*dx,target.y-a.y-u*dy);if(distance<nearest){nearest=distance;at=total+u*length;}total+=length;}
  return bolt.taperScale*Math.max(0,1-at/(total||1))**1.1;
}
export function prepareLightningBolts(bolts){
  for(const bolt of bolts){bolt.taperScale=bolt.parentIndex===null?1:lightningWidthAt(bolts[bolt.parentIndex],bolt.from);const width=[4.8,3.1,1.8][bolt.tier]*bolt.taperScale;
    bolt.renderGeometry={halo:taperLightning(bolt.points,width*2.5),body:taperLightning(bolt.points,width*.5),core:taperLightning(bolt.points,width*.16)};}
}
function path(ctx,points,close=false){points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));if(close)ctx.closePath();}
export function drawLightningCast(ctx,cast,scale=1,onFlash=false){
  ctx.save();ctx.globalCompositeOperation=onFlash?'source-over':'lighter';ctx.lineCap='round';ctx.lineJoin='round';
  for(const bolt of cast.bolts){
    const fade=lightningOpacity(cast.age,bolt.tier);if(fade<=0)continue;const shape=bolt.renderGeometry;
    ctx.beginPath();path(ctx,shape.halo,true);ctx.shadowBlur=0;ctx.globalAlpha=fade*[.23,.16,.11][bolt.tier];ctx.fillStyle='#78bdff';ctx.fill();
    ctx.beginPath();path(ctx,shape.body,true);ctx.globalAlpha=fade*[.95,.8,.65][bolt.tier];ctx.shadowColor='#a8dfff';ctx.shadowBlur=(28-bolt.tier*5)*scale*bolt.taperScale;ctx.fillStyle='#bde8ff';ctx.fill();
    ctx.beginPath();path(ctx,shape.core,true);ctx.shadowBlur=0;ctx.globalAlpha=fade*[1,.85,.65][bolt.tier];ctx.fillStyle='#f3fcff';ctx.fill();
  }
  for(let tier=0;tier<3;tier++){
    const fade=lightningTendrilOpacity(cast.age,tier);if(fade<=0)continue;let count=0;ctx.beginPath();
    for(const tendril of cast.tendrils)if(tendril.tier===tier){path(ctx,tendril.outline,true);count++;}
    if(!count)continue;ctx.globalAlpha=fade*.82;ctx.fillStyle='#d8f3ff';ctx.shadowColor='#8dccff';ctx.shadowBlur=6*scale;ctx.fill();
  }
  ctx.restore();
}
