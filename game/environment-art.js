import {pointSprite} from './point-sprites.js?v=b0edb1b3bbff';

const conduits=[[[185,-23],[213,-23],[219,-19]],[[262,-22],[288,-22],[291,-17],[291,-5]],[[172,-4],[179,-4],[183,-16]],[[298,-17],[303,-12],[305,-4]]];
const bolts=[[179,-21],[193,-23],[211,-23],[268,-23],[286,-23],[301,-21],[170,-6],[310,-6]];
const antennas=[{x:180,y:-26,height:19,phase:0,color:'#bce8c9'},{x:290,y:-26,height:24,phase:.9,color:'#ffa071'},{x:309,y:-16,height:16,phase:1.8,color:'#a7d7e3'}];
export function antennaBrightness(time,phase){const t=((time+phase)%2.8+2.8)%2.8;return t<.16?1:t<.23?1-(t-.16)/.07*.88:.12;}
export function drawBunkerDetails(ctx,ground,time){
  ctx.save();ctx.translate(0,ground);ctx.shadowBlur=0;ctx.lineWidth=.65;ctx.strokeStyle='#688574';ctx.beginPath();
  for(const points of conduits)points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  for(const x of [198,207,272,281]){ctx.moveTo(x,-24.5);ctx.lineTo(x,-21);}
  ctx.stroke();
  ctx.strokeStyle='#536e65';ctx.lineWidth=.7;ctx.beginPath();
  for(const x of [174,299]){ctx.moveTo(x,-14);ctx.lineTo(x+7,-14);ctx.lineTo(x+10,-4);ctx.lineTo(x,-4);ctx.closePath();for(let y=-12;y<=-6;y+=2.5){ctx.moveTo(x+1,y);ctx.lineTo(x+7+(y+12)*.25,y);}}
  // Low roof vents sit to either side of the cannon mounting.
  for(const x of [191,272]){ctx.moveTo(x,-26);ctx.lineTo(x,-30);ctx.lineTo(x+12,-30);ctx.lineTo(x+12,-26);for(let dx=3;dx<12;dx+=3){ctx.moveTo(x+dx,-29);ctx.lineTo(x+dx,-26);}}
  ctx.stroke();ctx.strokeStyle='#7c9784';ctx.lineWidth=.5;ctx.beginPath();
  for(const [x,y] of bolts){for(let i=0;i<6;i++){const angle=i*Math.PI/3,px=x+Math.cos(angle)*1.25,py=y+Math.sin(angle)*1.25;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();}ctx.stroke();
  ctx.fillStyle='#14231d';for(const [x,y] of bolts)ctx.fillRect(x-.35,y-.35,.7,.7);
  ctx.strokeStyle='#698a83';ctx.lineWidth=.65;ctx.beginPath();
  for(const a of antennas){const top=a.y-a.height;ctx.moveTo(a.x-2,a.y);ctx.lineTo(a.x+2,a.y);ctx.moveTo(a.x,a.y);ctx.lineTo(a.x,top);ctx.moveTo(a.x-3,top+6);ctx.lineTo(a.x+3,top+6);ctx.moveTo(a.x-1.5,top+10);ctx.lineTo(a.x+1.5,top+10);}ctx.stroke();
  ctx.globalCompositeOperation='lighter';for(const a of antennas){const y=a.y-a.height,brightness=antennaBrightness(time,a.phase);ctx.globalAlpha=brightness*.6;ctx.drawImage(pointSprite(a.color),a.x-4,y-4,8,8);ctx.globalAlpha=brightness;ctx.fillStyle=a.color;ctx.fillRect(a.x-.5,y-.5,1,1);}ctx.restore();
}
const ridges=[
  {height:1,color:'#111e22',ink:'#405357',alpha:.42,points:[[0,.4],[28,.58],[56,.49],[90,.87],[111,.7],[138,.99],[169,.61],[198,.7],[224,.42],[254,.66],[283,.46],[313,.83],[337,.69],[362,.95],[389,.62],[416,.75],[443,.52],[480,.7]]},
  {height:.63,color:'#101c1e',ink:'#374b4c',alpha:.48,points:[[0,.45],[33,.62],[63,.4],[101,.64],[130,.54],[159,.91],[185,.6],[211,.78],[244,.43],[276,.67],[304,.51],[335,.77],[366,.43],[402,.71],[438,.52],[480,.76]]}
];
export function drawDistantMountains(ctx,ground){
  const height=Math.min(104,Math.max(30,ground*.19));ctx.save();ctx.shadowBlur=0;ctx.lineWidth=.6;
  for(const ridge of ridges){ctx.beginPath();for(let i=0;i<ridge.points.length;i++){const [x,h]=ridge.points[i],y=ground-4-h*height*ridge.height;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.lineTo(480,ground+1);ctx.lineTo(0,ground+1);ctx.closePath();ctx.globalAlpha=ridge.alpha;ctx.fillStyle=ridge.color;ctx.fill();ctx.strokeStyle=ridge.ink;ctx.stroke();}ctx.restore();
}
