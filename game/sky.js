export function makeStars(count=85,rng=Math.random){return Array.from({length:count},()=>{const depth=rng();return {x:rng()*480,y:rng(),r:.4+depth*.9,brightness:.08+depth*depth*.38,speed:3.2+depth*depth*14.3,phase:rng()*Math.PI*2};});}
export function moveStars(stars,dt,height){for(const star of stars)star.y=(star.y+star.speed*dt/Math.max(1,height))%1;}
