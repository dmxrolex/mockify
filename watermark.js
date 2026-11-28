// Standalone watermark ("mark"): a page setting drawn on top of every render and export.
// Text (optionally with the Telegram photo) or an image (an uploaded logo or the profile photo),
// placed in a corner, centred, or tiled across the design.
import {badgeAvatar,loadBadgeAvatar} from './profile-badge.js';

export const markPlacements=['top-left','top-right','center','bottom-left','bottom-right','tiled'];
export const markDefaults={kind:'text',on:false,text:'',photo:false,badge:'',initials:'',image:'',shape:'original',style:'pill',placement:'bottom-right',layer:'front',size:100,opacity:100,density:3};

// Older marks (style none/name/text/tiled, corner, size s/m/l) open in the new model unchanged.
export function markOf(settings){
  const raw=settings?.mark??{};
  // Text watermarks are always a pill now; older drafts saved as plain become pills.
  if(raw.kind)return {...markDefaults,...raw,style:'pill'};
  const legacy={...markDefaults};
  if(raw.style&&raw.style!=='none'){legacy.on=true;legacy.text=raw.style==='name'?raw.name??'':raw.text??'';legacy.photo=raw.style==='name';legacy.badge=raw.badge??'';legacy.initials=raw.initials??'';}
  if(raw.style==='tiled')legacy.placement='tiled';else if(raw.corner)legacy.placement=raw.corner;
  if(raw.size)legacy.size={s:80,m:100,l:130}[raw.size]??100;
  if(raw.opacity)legacy.opacity=raw.opacity;
  return legacy;
}
export function markVisible(mark){
  if(!mark.on)return false;
  return mark.kind==='image'?Boolean(mark.image):Boolean(mark.text.trim()||(mark.photo&&(mark.badge||mark.initials)));
}

const images=new Map();
export function loadMarkImage(url){
  if(!/^data:image\/(png|jpeg|webp);base64,[\w+/=]+$/.test(url??'')||url.length>2_000_000)return Promise.resolve();
  if(images.has(url))return images.get(url).ready;
  if(images.size>=16)images.delete(images.keys().next().value);
  const image=new Image(),entry={image:null,ready:new Promise(resolve=>{image.onload=()=>{entry.image=image;resolve();};image.onerror=()=>resolve();image.src=url;})};
  images.set(url,entry);return entry.ready;
}
export const loadMarkAssets=mark=>{const m=mark?.kind?mark:markOf({mark});return Promise.all([loadBadgeAvatar(m.badge),loadMarkImage(m.image)]);};
const markImage=url=>images.get(url)?.image??badgeAvatar(url);

// A transparent logo stays crisp at up to 512px; photos are stored compactly.
export async function prepareMarkImage(file){
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();image.src=url;await image.decode();
    const scale=Math.min(1,512/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    const data=canvas.toDataURL('image/png');await loadMarkImage(data);return data;
  }finally{URL.revokeObjectURL(url);}
}

function pill(ctx,x,y,w,h,r=h/2){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}

// Measures and draws one mark centred at 0,0 in the current transform.
function stamp(ctx,mark,unit){
  const scale=mark.size/100;
  if(mark.kind==='image'){
    const image=markImage(mark.image);if(!image?.naturalWidth)return null;
    const long=unit*.2*scale,ratio=image.naturalWidth/image.naturalHeight,w=mark.shape==='circle'?long:ratio>=1?long:long*ratio,h=mark.shape==='circle'?long:ratio>=1?long/ratio:long;
    return {w,h,draw(){ctx.save();if(mark.shape==='circle'){ctx.beginPath();ctx.arc(0,0,w/2,0,Math.PI*2);ctx.clip();const side=Math.min(image.naturalWidth,image.naturalHeight);ctx.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,-w/2,-h/2,w,h);}else{ctx.shadowColor='#0005';ctx.shadowBlur=unit*.012;ctx.drawImage(image,-w/2,-h/2,w,h);}ctx.restore();}};
  }
  const font=unit*.03*scale,label=mark.text.trim(),avatar=mark.photo?markImage(mark.badge):null,hasDisc=mark.photo&&(avatar?.naturalWidth||mark.initials);
  ctx.font=`600 ${font}px -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;
  const plain=mark.style==='plain',h=font*1.9,disc=hasDisc?(plain?font*1.5:h*.78):0,gap=disc&&label?font*.45:0,pad=plain?0:font*.7;
  const textWidth=label?Math.min(unit*1.6,ctx.measureText(label).width):0,w=(disc?(plain?0:(h-disc)/2)+disc+gap:pad)+textWidth+(label?pad:(plain?0:(h-disc)/2));
  return {w,h,draw(){
    ctx.save();ctx.textBaseline='middle';ctx.font=`600 ${font}px -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;
    const x=-w/2,y=-h/2;
    if(!plain){ctx.save();ctx.shadowColor='#0006';ctx.shadowBlur=font*.6;ctx.shadowOffsetY=font*.12;pill(ctx,x,y,w,h);ctx.fillStyle='rgba(18,18,22,.72)';ctx.fill();ctx.restore();ctx.lineWidth=Math.max(1,font*.05);ctx.strokeStyle='rgba(255,255,255,.18)';pill(ctx,x,y,w,h);ctx.stroke();}
    let cursor=x+(disc?(plain?0:(h-disc)/2):pad);
    if(disc){
      ctx.save();ctx.beginPath();ctx.arc(cursor+disc/2,0,disc/2,0,Math.PI*2);ctx.clip();
      if(avatar?.naturalWidth)ctx.drawImage(avatar,cursor,-disc/2,disc,disc);
      else{ctx.fillStyle='#0a84ff';ctx.fillRect(cursor,-disc/2,disc,disc);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font=`700 ${disc*.42}px -apple-system, system-ui, sans-serif`;ctx.fillText(mark.initials||'•',cursor+disc/2,disc*.02);}
      ctx.restore();cursor+=disc+gap;
    }
    if(label){ctx.fillStyle='#ffffff';ctx.textAlign='left';if(plain){ctx.shadowColor='#000a';ctx.shadowBlur=font*.5;ctx.shadowOffsetY=font*.06;}ctx.fillText(label,cursor,font*.04,textWidth);}
    ctx.restore();
  }};
}

export function drawMark(ctx,settings,width,height){
  const mark=markOf(settings);if(!markVisible(mark))return;
  const unit=Math.min(width,height);
  ctx.save();ctx.globalAlpha=Math.max(.05,Math.min(1,mark.opacity/100));
  const item=stamp(ctx,mark,unit);if(!item){ctx.restore();return;}
  if(mark.placement==='tiled'){
    // Density 1 (airy) … 5 (dense) sets the spacing between repeats.
    const spacing=1.9-(Math.max(1,Math.min(5,mark.density))-1)*.28,stepX=item.w+unit*.08*spacing+item.w*(spacing-1),stepY=item.h+unit*.1*spacing;
    const span=Math.hypot(width,height)*.62;ctx.translate(width/2,height/2);ctx.rotate(-Math.PI/7);
    for(let y=-span,row=0;y<=span;y+=stepY,row++)for(let x=-span+(row%2?stepX/2:0);x<=span;x+=stepX){ctx.save();ctx.translate(x,y);item.draw();ctx.restore();}
  }else{
    const inset=unit*.035,cx=mark.placement==='center'?width/2:mark.placement.endsWith('right')?width-inset-item.w/2:inset+item.w/2;
    const cy=mark.placement==='center'?height/2:mark.placement.startsWith('bottom')?height-inset-item.h/2:inset+item.h/2;
    ctx.translate(cx,cy);item.draw();
  }
  ctx.restore();
}
