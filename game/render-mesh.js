import {pointSprite} from './point-sprites.js?v=b0edb1b3bbff';
import {clamp} from './engine.js?v=b0edb1b3bbff';
import {impactHeatColor} from './effects.js?v=b0edb1b3bbff';
const meshes=new WeakMap(),actors=new WeakMap();
function geometry(mesh){
  if(meshes.has(mesh))return meshes.get(mesh);
  const vertices=mesh.vertices.slice(),faceNormals=mesh.faces.map(f=>{const n=[0,0,0];for(let i=0;i<f.length;i++){const a=vertices[f[i]],b=vertices[f[(i+1)%f.length]];n[0]+=(a[1]-b[1])*(a[2]+b[2]);n[1]+=(a[2]-b[2])*(a[0]+b[0]);n[2]+=(a[0]-b[0])*(a[1]+b[1]);}return n;});
  const lines=mesh.edges.map(e=>({a:e.a,b:e.b,faces:e.faces}));
  const data={vertices,faceNormals,lines,segments:null};meshes.set(mesh,data);return data;
}
function heatSegments(g){
  if(g.segments)return;
  g.segments=[];
  for(let line=0;line<g.lines.length;line++){const l=g.lines[line],a=g.vertices[l.a],b=g.vertices[l.b];let last=l.a;
    for(let j=1;j<=8;j++){let id=l.b;if(j<8){id=g.vertices.length;const u=j/8;g.vertices.push([a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u]);}const u=(j-.5)/8;g.segments.push({a:last,b:id,line,x:a[0]+(b[0]-a[0])*u,y:a[1]+(b[1]-a[1])*u,z:a[2]+(b[2]-a[2])*u});last=id;}
  }
}
export function renderMesh(ctx,a,opacity,glow,mixColor){
  const g=geometry(a.mesh),heat=a.heat||[];if(heat.length||a.acid?.length)heatSegments(g);
  let cache=actors.get(a);if(!cache||cache.points.length<g.vertices.length*2){cache={points:new Float64Array(g.vertices.length*2),stamps:new Uint32Array(g.vertices.length),front:new Array(g.faceNormals.length),visible:new Array(g.lines.length),corrosion:null,frame:0};actors.set(a,cache);}const frame=++cache.frame,points=cache.points;
  const cx=Math.cos(a.rx),sx=Math.sin(a.rx),cy=Math.cos(a.ry),sy=Math.sin(a.ry),cz=Math.cos(a.rz),sz=Math.sin(a.rz);
  const m=[cz*cy,cz*sy*sx-sz*cx,cz*sy*cx+sz*sx,sz*cy,sz*sy*sx+cz*cx,sz*sy*cx-cz*sx,-sy,cy*sx,cy*cx];
  const warp=a.gravityWarp,amount=warp?.amount||0,wa=warp?.angle||0,wc=Math.cos(wa),ws=Math.sin(wa),shrink=1-.88*amount**1.35;
  const project=i=>{if(cache.stamps[i]===frame)return;cache.stamps[i]=frame;const v=g.vertices[i],x=m[0]*v[0]+m[1]*v[1]+m[2]*v[2],y=m[3]*v[0]+m[4]*v[1]+m[5]*v[2],z=m[6]*v[0]+m[7]*v[1]+m[8]*v[2],p=a.r*3.8/(3.8-z);let ox=x*p,oy=y*p;if(warp){const along=(ox*wc+oy*ws)*shrink*(1+2.6*amount),across=(-ox*ws+oy*wc)*shrink*(1-.7*amount);ox=along*wc-across*ws;oy=along*ws+across*wc;}points[i*2]=a.x+ox;points[i*2+1]=a.y+oy;};
  const front=cache.front,visible=cache.visible;
  for(let i=0;i<g.faceNormals.length;i++){const n=g.faceNormals[i];front[i]=m[6]*n[0]+m[7]*n[1]+m[8]*n[2]>0;}
  for(let i=0;i<g.lines.length;i++){visible[i]=false;for(const face of g.lines[i].faces)if(front[face]){visible[i]=true;break;}}
  const acid=a.acid||[];if(g.segments&&acid.length&&!cache.corrosion)cache.corrosion=new Float32Array(g.segments.length);
  const corrosion=acid.length?cache.corrosion:null;
  if(corrosion){corrosion.fill(Infinity);for(const c of acid){if(!c.distances)c.distances=g.segments.map(s=>Math.hypot(s.x-c.local[0],s.y-c.local[1],s.z-c.local[2]));const radius=.06+.94*Math.sqrt(c.age/c.max);for(let i=0;i<corrosion.length;i++)corrosion[i]=Math.min(corrosion[i],c.distances[i]-radius);}}
  const segment=(i,j)=>{project(i);project(j);ctx.moveTo(points[i*2],points[i*2+1]);ctx.lineTo(points[j*2],points[j*2+1]);};
  ctx.save();if(a.frozen){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=opacity*.38;ctx.drawImage(pointSprite('#268dff'),a.x-a.r*2.8,a.y-a.r*2.8,a.r*5.6,a.r*5.6);ctx.globalCompositeOperation='source-over';}ctx.lineJoin='round';ctx.lineCap='round';const flare=(a.flare||0)*((a.hit||0)/(a.hitMax||.12))**.75;
  for(const f of [false,true]){const color=mixColor(a.frozen?(f?'#8cdeff':'#286dc3'):(f?(a.colors?.front||'#d6e8df'):(a.colors?.back||'#48615b')),'#fff5dd',flare*(f?.22:.12));ctx.strokeStyle=color;ctx.lineWidth=(f?1.15:.65)+flare*(f?.3:.12);ctx.globalAlpha=clamp(opacity*((f?.86:.46)+flare*(f?.18:.14)),0,1);glow(color,ctx.globalAlpha,a.frozen?5:1+flare*.35);ctx.beginPath();if(corrosion){for(let i=0;i<g.segments.length;i++){const s=g.segments[i];if(visible[s.line]===f&&corrosion[i]>0)segment(s.a,s.b);}}else for(let i=0;i<a.mesh.edges.length;i++)if(visible[i]===f)segment(g.lines[i].a,g.lines[i].b);ctx.stroke();}
  ctx.globalCompositeOperation='lighter';
  for(const h of heat){
    if(!h.renderBands){h.renderBands=Array.from({length:6},()=>[]);const [x,y,z]=h.local;for(let i=0;i<g.segments.length;i++){const s=g.segments[i],weight=clamp(1-Math.hypot(s.x-x,s.y-y,s.z-z)/.72,0,1)**1.4;if(weight>.01)h.renderBands[Math.min(5,Math.floor(weight*6))].push(i);}}
    const color=impactHeatColor(h.age),fade=(1-h.age/h.max)**.55;ctx.strokeStyle=color;ctx.lineWidth=1.9;
    for(let band=0;band<6;band++){const indices=h.renderBands[band];if(!indices.length)continue;ctx.globalAlpha=clamp(opacity*fade*((band+.5)/6)*h.strength,0,1);glow(color,ctx.globalAlpha,3.2);ctx.beginPath();let any=false;for(const i of indices){const s=g.segments[i];if(visible[s.line]&&(!corrosion||corrosion[i]>0)){any=true;segment(s.a,s.b);}}if(any)ctx.stroke();}
  }
  if(corrosion){for(let band=0;band<3;band++){const color=['#f0ffb2','#aeff62','#67c739'][band];ctx.strokeStyle=color;ctx.lineWidth=band===0?2.1:1.25;ctx.globalAlpha=opacity*(.95-band*.22);glow(color,ctx.globalAlpha,2.8);ctx.beginPath();for(let i=0;i<corrosion.length;i++){const d=corrosion[i],s=g.segments[i];if(visible[s.line]&&d>band*.055&&d<=(band+1)*.055)segment(s.a,s.b);}ctx.stroke();}}ctx.restore();
}
