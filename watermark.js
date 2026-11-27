// Standalone watermark ("mark"): a page setting drawn on top of every render and export.
import {badgeAvatar} from './profile-badge.js';

export const markDefaults={style:'none',text:'',name:'',badge:'',initials:'',corner:'bottom-right',size:'m',opacity:100};
export const markCorners=['top-left','top-right','bottom-left','bottom-right'];
const sizes={s:.8,m:1,l:1.3};
export const markOf=settings=>({...markDefaults,...(settings?.mark??{})});
export const markVisible=mark=>mark.style!=='none'&&Boolean(mark.style==='name'?(mark.name||mark.badge||mark.initials):mark.text.trim());

function pill(ctx,x,y,w,h){const r=h/2;ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}

export function drawMark(ctx,settings,width,height){
  const mark=markOf(settings);if(!markVisible(mark))return;
  const unit=Math.min(width,height),font=unit*.03*(sizes[mark.size]??1);
  ctx.save();ctx.globalAlpha=Math.max(.1,Math.min(1,mark.opacity/100));
  ctx.font=`600 ${font}px -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;ctx.textBaseline='middle';
  if(mark.style==='tiled'){
    const text=mark.text.trim(),tile=Math.max(unit*.26,ctx.measureText(text).width+unit*.14),step=unit*.17,span=Math.hypot(width,height)*.6;
    ctx.globalAlpha*=.35;ctx.translate(width/2,height/2);ctx.rotate(-Math.PI/6);ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.shadowColor='#0008';ctx.shadowBlur=font*.3;
    for(let row=-span,i=0;row<=span;row+=step,i++)for(let at=-span+(i%2?tile/2:0);at<=span;at+=tile)ctx.fillText(text,at,row);
    ctx.restore();return;
  }
  const label=mark.style==='name'?mark.name:mark.text.trim(),avatar=mark.style==='name'?badgeAvatar(mark.badge):null;
  const h=font*1.9,disc=mark.style==='name'?h*.78:0,gap=disc?font*.45:0,pad=font*.7;
  const textWidth=Math.min(width*.7,label?ctx.measureText(label).width:0),w=(disc?(h-disc)/2+disc+gap:pad)+textWidth+pad;
  const inset=unit*.035,x=mark.corner.endsWith('right')?width-inset-w:inset,y=mark.corner.startsWith('bottom')?height-inset-h:inset;
  ctx.shadowColor='#0006';ctx.shadowBlur=font*.6;ctx.shadowOffsetY=font*.12;
  pill(ctx,x,y,w,h);ctx.fillStyle='rgba(18,18,22,.72)';ctx.fill();ctx.shadowColor='transparent';
  ctx.lineWidth=Math.max(1,font*.05);ctx.strokeStyle='rgba(255,255,255,.18)';ctx.stroke();
  if(disc){
    const cx=x+(h-disc)/2,cy=y+(h-disc)/2;
    ctx.save();ctx.beginPath();ctx.arc(cx+disc/2,cy+disc/2,disc/2,0,Math.PI*2);ctx.clip();
    if(avatar?.naturalWidth)ctx.drawImage(avatar,cx,cy,disc,disc);
    else{ctx.fillStyle='#0a84ff';ctx.fillRect(cx,cy,disc,disc);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font=`700 ${disc*.42}px -apple-system, system-ui, sans-serif`;ctx.fillText(mark.initials||'•',cx+disc/2,cy+disc/2+disc*.02);}
    ctx.restore();
  }
  if(label){ctx.fillStyle='#ffffff';ctx.textAlign='left';ctx.fillText(label,x+(disc?(h-disc)/2+disc+gap:pad),y+h/2+font*.04,width*.7);}
  ctx.restore();
}
