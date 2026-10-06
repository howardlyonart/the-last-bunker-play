// Bake tiny luminous particles once; avoid a native shadow blur for each pixel, each frame.
const sprites=new Map();
export function pointSprite(color){
  if(sprites.has(color))return sprites.get(color);
  const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(32,32):document.createElement('canvas');canvas.width=canvas.height=32;
  const ctx=canvas.getContext('2d');ctx.setTransform(2,0,0,2,0,0);ctx.shadowBlur=0;
  const r=parseInt(color.slice(1,3),16),g=parseInt(color.slice(3,5),16),b=parseInt(color.slice(5,7),16),halo=ctx.createRadialGradient(8,8,.3,8,8,5);
  halo.addColorStop(0,`rgba(${r},${g},${b},.23)`);halo.addColorStop(.3,`rgba(${r},${g},${b},.065)`);halo.addColorStop(1,`rgba(${r},${g},${b},0)`);ctx.fillStyle=halo;ctx.fillRect(0,0,16,16);ctx.fillStyle=color;ctx.fillRect(7.5,7.5,1,1);
  sprites.set(color,canvas);return canvas;
}
