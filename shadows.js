import {createBlurProcessor} from './blur-model.js';
function makeCanvas(){return document.createElement('canvas');}
function size(canvas,width,height){if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}canvas.getContext('2d').clearRect(0,0,width,height);}
// Build one swept silhouette, colour it once, then soften once. Binary unions
// avoid the opacity steps produced by stacking many translucent shadow copies.
export function createLongShadow({preview=false}={}){
  const first=makeCanvas(),second=makeCanvas(),soften=createBlurProcessor({maxSize:preview?360:900});let revision=0;
  const paint=(ctx,source,{width,height,reach,angle,strength,mirror=false})=>{
    if(!strength)return;
    const dx=Math.cos(angle)*reach,dy=Math.sin(angle)*reach,pad=Math.max(2,Math.min(width,height)*.035);
    const fullW=width+Math.abs(dx)+pad*2,fullH=height+Math.abs(dy)+pad*2,scale=Math.min(1,(preview?720:1536)/Math.max(fullW,fullH));
    const w=Math.max(1,Math.ceil(fullW*scale)),h=Math.max(1,Math.ceil(fullH*scale)),ox=pad+Math.max(0,-dx),oy=pad+Math.max(0,-dy);
    size(first,w,h);size(second,w,h);let a=first,b=second;const initial=a.getContext('2d');
    initial.save();if(mirror){initial.translate((ox+width)*scale,oy*scale);initial.scale(-1,1);initial.drawImage(source,0,0,width*scale,height*scale);}else initial.drawImage(source,ox*scale,oy*scale,width*scale,height*scale);initial.restore();
    initial.globalCompositeOperation='source-in';initial.fillStyle='#fff';initial.fillRect(0,0,w,h);initial.globalCompositeOperation='source-over';
    const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))*scale)),vx=dx*scale/steps,vy=dy*scale/steps,total=steps+1;
    for(let count=1;count<total;){const offset=Math.min(count,total-count),graphics=b.getContext('2d');graphics.clearRect(0,0,w,h);graphics.drawImage(a,0,0);graphics.drawImage(a,vx*offset,vy*offset);[a,b]=[b,a];count+=offset;}
    const graphics=a.getContext('2d'),cx=(ox+width/2)*scale,cy=(oy+height/2)*scale;
    const shade=graphics.createLinearGradient(cx,cy,cx+dx*scale,cy+dy*scale);shade.addColorStop(0,'#19151fe6');shade.addColorStop(.7,'#19151f72');shade.addColorStop(1,'#19151f00');
    graphics.globalCompositeOperation='source-in';graphics.fillStyle=shade;graphics.fillRect(0,0,w,h);graphics.globalCompositeOperation='source-over';
    soften(graphics,{mode:'whole',whole:24},++revision);
    ctx.save();ctx.globalAlpha*=Math.min(1,strength/100)*.65;ctx.drawImage(a,-width/2-ox,-height/2-oy,w/scale,h/scale);ctx.restore();
  };
  paint.dispose=()=>{first.width=first.height=second.width=second.height=1;soften.dispose();};return paint;
}
