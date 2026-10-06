import {clamp,radialRadius} from './engine.js?v=b0edb1b3bbff';
const colors=new Map();
export function luminance(color){
  if(colors.has(color))return colors.get(color);
  let r=190,g=220,b=200,alpha=1;
  if(/^#[a-f0-9]{6}$/i.test(color)){r=parseInt(color.slice(1,3),16);g=parseInt(color.slice(3,5),16);b=parseInt(color.slice(5,7),16);}
  else{const match=color.match(/^rgba?\(([^)]+)\)/);if(match){const v=match[1].split(',').map(Number);[r,g,b]=v;alpha=v[3]??1;}}
  const value=(.2126*r+.7152*g+.0722*b)/255*alpha;if(colors.size<128)colors.set(color,value);return value;
}
export const glowStrength=(color,alpha=1)=>clamp(luminance(color)*alpha,0,1)**2;
export const shockwaveRadius=radialRadius;
export function particleBrightness(p){const age=p.max-p.life,fade=clamp(p.life/p.max,0,1)**1.15;const twinkle=p.sparkle?.22+.78*(.5+.5*Math.sin(age*p.frequency+p.phase))**5:1;return fade*twinkle*(p.brightness??.65);}

export function impactHeatColor(age){
  const stops=[[255,255,255],[255,229,86],[255,133,38],[232,45,27]],u=clamp(age/.5,0,1)*3,i=Math.min(2,Math.floor(u)),t=u-i;
  return '#'+stops[i].map((v,j)=>Math.round(v+(stops[i+1][j]-v)*t).toString(16).padStart(2,'0')).join('');
}

export {lightningOpacity} from './lightning-art.js?v=b0edb1b3bbff';
