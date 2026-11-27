import { fontFor, textFontCSS } from './text-fonts.js';
import {badgeAvatar} from './profile-badge.js';

export const textDefaults = {
  version:1, enabled:true, mode:'text', text:'', font:'inter', weight:600, italic:false,
  size:32, color:'#ffffff', opacity:100, shadow:false, rotation:0,
  anchor:'bottom-right', x:.75, y:.85, density:4, tileRotation:-30, snap:true, locked:false,
};
export const textAnchors = ['top-left','top-center','top-right','middle-left','middle-center','middle-right','bottom-left','bottom-center','bottom-right'];
export function clamp(value,min,max) { return Math.max(min,Math.min(max,value)); }
function number(value,fallback,min,max) { return Number.isFinite(Number(value))?clamp(Number(value),min,max):fallback; }

export function textModel(settings) {
  if(Array.isArray(settings.layers)) {
    const texts=settings.layers.filter(layer=>layer.type==='text');
    return textModel({textOverlay:texts.find(layer=>layer.id===settings.selectedLayerId)??texts.at(-1)??{...textDefaults,enabled:false}});
  }
  const legacy={enabled:settings.watermark!=='none',mode:settings.watermark==='tiled'?'tiled':'text',text:settings.watermarkText||'',color:settings.watermarkColor||'#ffffff',opacity:settings.watermarkStrength??100,size:settings.watermark==='none'?32:15.84*(settings.watermarkSize??100)/100,tileRotation:settings.watermark==='tiled'?-36:-30,anchor:settings.watermarkCorner||'bottom-right'};
  const raw={...textDefaults,...(settings.textOverlay ?? legacy)};
  return {...raw,version:1,enabled:Boolean(raw.enabled),text:String(raw.text??'').slice(0,280),
    font:fontFor(raw.font).id,weight:[400,600,700].includes(raw.weight)?raw.weight:600,
    mode:raw.mode==='tiled'&&!raw.badge?'tiled':'text',color:/^#[0-9a-f]{6}$/i.test(raw.color)?raw.color:'#ffffff',
    size:number(raw.size,32,1,10000),opacity:number(raw.opacity,100,0,100),density:number(raw.density,4,1,8),
    x:Number.isFinite(Number(raw.x))?Number(raw.x):.75,y:Number.isFinite(Number(raw.y))?Number(raw.y):.85,rotation:number(raw.rotation,0,-180,180),
    tileRotation:number(raw.tileRotation,-30,-180,180),anchor:textAnchors.includes(raw.anchor)?raw.anchor:null};
}

export function sceneLayers(settings) {
  if(Array.isArray(settings.layers))return settings.layers;
  const model=textModel(settings);
  return [...(settings.hideDevice?[]:[{id:'device',type:'device'}]),...(model.enabled&&model.text.trim()?[{...model,id:'text-legacy',type:'text'}]:[])];
}
export function patchText(settings,changes) {
  const layers=sceneLayers(settings),current=textModel(settings);
  const id=current.id??layers.filter(layer=>layer.type==='text').at(-1)?.id??crypto.randomUUID();
  const model={...current,...changes,id,type:'text'};
  return {layers:layers.some(layer=>layer.id===id)?layers.map(layer=>layer.id===id?model:layer):[...layers,model],selectedLayerId:id,textOverlay:null,watermark:'none'};
}
export function addText(settings,text='Text',badge) {
  const model={...textDefaults,id:crypto.randomUUID(),type:'text',text,anchor:badge?'bottom-left':'middle-center',...(badge?{badge,size:27}:{})};
  return {layers:[...sceneLayers(settings),model],selectedLayerId:model.id,textOverlay:null,watermark:'none'};
}
export function deleteText(settings) {
  const current=textModel(settings),layers=sceneLayers(settings).filter(layer=>layer.id!==current.id);
  return {layers,selectedLayerId:layers.filter(layer=>layer.type==='text').at(-1)?.id??null,textOverlay:null,watermark:'none'};
}

let measureCanvas;
export function textGeometry(model,width,height) {
  measureCanvas ??= document.createElement('canvas');
  const ctx=measureCanvas.getContext('2d');
  const unit=Math.min(width,height);
  const angle=model.rotation*Math.PI/180;
  let fontSize=unit*model.size/480,lines,w,h;
  ctx.font=textFontCSS(model,fontSize);
  lines=model.text.split('\n');
  w=Math.max(fontSize*.5,...lines.map(line=>ctx.measureText(line).width));
  h=lines.length*fontSize*1.2;
  const textWidth=w,textHeight=h;
  if(model.badge){w+=fontSize*3.05;h=Math.max(h+fontSize*.75,fontSize*2.5);}
  const extentX=(Math.abs(Math.cos(angle))*w+Math.abs(Math.sin(angle))*h)/2;
  const extentY=(Math.abs(Math.sin(angle))*w+Math.abs(Math.cos(angle))*h)/2;
  const inset=unit*.035;
  const minX=extentX+inset,maxX=width-extentX-inset,minY=extentY+inset,maxY=height-extentY-inset;
  let cx=model.x*width,cy=model.y*height;
  if(model.anchor){const [row,col]=model.anchor.split('-');cx=col==='left'?minX:col==='right'?maxX:width/2;cy=row==='top'?minY:row==='bottom'?maxY:height/2;}
  return {cx,cy,width:w,height:h,textWidth,textHeight,textOffset:model.badge?fontSize*.9:0,fontSize,lineHeight:fontSize*1.2,lines,font:textFontCSS(model,fontSize),angle};
}

export function drawTextOverlay(ctx,settings,width,height,plane='front') {
  if(Array.isArray(settings.layers)) {
    const device=settings.layers.findIndex(layer=>layer.type==='device');
    for(const [index,layer]of settings.layers.entries())if(layer.type==='text'&&(plane==='behind'?index<device:index>device||device<0))drawTextOverlay(ctx,{textOverlay:layer},width,height);
    return true;
  }
  if(plane==='behind')return false;
  if(!settings.textOverlay)return false;
  const model=textModel(settings);
  if(!model.enabled||!model.text.trim()||!model.opacity)return true;
  const box=textGeometry(model,width,height);
  ctx.save();ctx.font=box.font;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle=model.color;ctx.globalAlpha=model.opacity/100;
  if(model.shadow){ctx.shadowColor='#00000080';ctx.shadowBlur=box.fontSize*.18;ctx.shadowOffsetY=box.fontSize*.08;}
  const paint=(x,y)=>{for(const [index,line]of box.lines.entries())ctx.fillText(line,x+box.textOffset,y-box.textHeight/2+box.lineHeight*(index+.5));};
  if(model.badge){
    ctx.translate(box.cx,box.cy);ctx.rotate(box.angle);
    const avatar=badgeAvatar(model.badge.avatar),radius=box.fontSize*.94,ax=-box.width/2+box.fontSize*1.25;
    ctx.fillStyle='#25252b';ctx.beginPath();ctx.roundRect(-box.width/2,-box.height/2,box.width,box.height,box.height/2);ctx.fill();
    ctx.save();ctx.shadowColor='transparent';ctx.beginPath();ctx.arc(ax,0,radius,0,Math.PI*2);ctx.clip();
    ctx.fillStyle='#41688e';ctx.fillRect(ax-radius,-radius,radius*2,radius*2);
    if(avatar)ctx.drawImage(avatar,ax-radius,-radius,radius*2,radius*2);
    else {ctx.fillStyle='#fff';ctx.font='600 '+box.fontSize*.75+'px system-ui';ctx.fillText(String(model.badge.initials??'T').slice(0,8),ax,0);}
    ctx.restore();ctx.fillStyle=model.color;paint(0,0);ctx.restore();return true;
  }
  if(model.mode==='tiled') {
    ctx.translate(width/2,height/2);ctx.rotate(model.tileRotation*Math.PI/180);
    const unit=Math.min(width,height),span=Math.hypot(width,height)/2+box.width+box.height;
    const spacing=2.9-model.density*.23;
    const stepX=Math.max(box.width+box.fontSize*.4,unit*.22)*spacing;
    const stepY=Math.max(box.height+box.fontSize*.5,unit*.12)*spacing;
    let row=0;
    for(let y=-span;y<=span;y+=stepY,row++)for(let x=-span+(row%2?stepX/2:0);x<=span;x+=stepX)paint(x,y);
  } else {ctx.translate(box.cx,box.cy);ctx.rotate(box.angle);paint(0,0);}
  ctx.restore();return true;
}
