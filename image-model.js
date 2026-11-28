import { frameAspectFor } from './asset-library.js';
const SOFT_BORDER=1.5;
import { sceneLayers } from './text-model.js';

export function imageLayers(settings) {
  return sceneLayers(settings).filter(layer=>(layer.type==='device'&&!settings.hideDevice)||layer.type==='image');
}
export function imageSettings(settings,id=settings.selectedLayerId) {
  const layer=sceneLayers(settings).find(layer=>layer.id===id&&layer.type==='image');
  return layer?{...settings,...layer,device:'flat'}:settings;
}
export function patchImage(settings,id,changes) {
  if(id==='device')return changes;
  return {layers:sceneLayers(settings).map(layer=>layer.id===id?{...layer,...changes}:layer)};
}
export function duplicateImage(settings,id) {
  const pose=imageSettings(settings,id),copy={id:crypto.randomUUID(),type:'image'};
  for(const key of ['imageCrop','imageCropBasis','scale','x','y','roll','imageEdges','imageFlip','shadow','shadowStyle','shadowAngle'])copy[key]=pose[key];
  copy.x=(pose.x??0)+5;copy.y=(pose.y??0)+5;
  const layers=[...sceneLayers(settings)],index=layers.findIndex(layer=>layer.id===id);layers.splice(index+1,0,copy);
  return {layers,selectedLayerId:copy.id,...(settings.blurEffects?.[id]?{blurEffects:{...settings.blurEffects,[copy.id]:structuredClone(settings.blurEffects[id])}}:{})};
}
export function removeImage(settings,id) {
  return {layers:sceneLayers(settings).filter(layer=>layer.id!==id),selectedLayerId:null,...(id==='device'?{hideDevice:true}:{})};
}

export function isPhoneCapture(media) {
  const ratio=media.width/media.height;
  return media.width>=250&&media.height>=600&&ratio>=.42&&ratio<=.6;
}

export function presentationFor(media,cleanup='auto') {
  if(isPhoneCapture(media))return {device:'iphone18',locked:true,cleanup,scale:89,zoom:0,x:0,y:0,roll:0,hideDevice:false};
  const aspect=media.width/media.height;
  return {device:'flat',cleanup:'off',fit:'contain',imageEdges:4,shadow:38,shadowStyle:'soft',shadowAngle:0,
    ratio:aspect>1.25?'wide':aspect<.8?'portrait':'square',locked:false,scale:100,zoom:0,x:0,y:0,roll:0,selectedLayerId:null,hideDevice:false,
    // Photos that aren't phone screenshots start with a slim white border (removable in Borders).
    ...(media.kind==='image'?{assetKind:'border',assetEmpty:false,borderStyle:'white',borderWidth:SOFT_BORDER,frameAspect:frameAspectFor('border',aspect,{borderWidth:SOFT_BORDER})}:{})};
}

export function imageGeometry(settings,media,width,height) {
  const crop=cropRect(media,settings.imageCrop);
  const fit=settings.imageCropBasis?cropRect(media,settings.imageCropBasis):crop;
  const scale=Math.min(width*.82/fit.width,height*.8/fit.height)*Math.max(.1,Math.min(3,(settings.scale??100)/100));
  const w=crop.width*scale,h=crop.height*scale;
  return {width:w,height:h,cx:width*(.5+(settings.x??0)/100),cy:height*(.5+(settings.y??0)/100),
    angle:(settings.roll??0)*Math.PI/180,radius:Math.min(w,h)*Math.max(0,Math.min(50,settings.imageEdges??4))/100};
}

export const minEdgeCropSize=96;

export function edgeCropPatch(settings,media,box,bounds,edge,dx,dy) {
  const horizontal=edge==='left'||edge==='right';
  const leading=edge==='left'||edge==='top';
  const cos=Math.cos(box.angle),sin=Math.sin(box.angle);
  const delta=horizontal?dx*cos+dy*sin:-dx*sin+dy*cos;
  const rect=cropRect(media,settings.imageCrop);
  const crop={left:rect.x/media.width,right:1-(rect.x+rect.width)/media.width,
    top:rect.y/media.height,bottom:1-(rect.y+rect.height)/media.height};
  // The on-screen left and right edges swap source sides on a mirrored photo.
  const side=horizontal&&settings.imageFlip?(leading?'right':'left'):edge;
  const size=horizontal?box.width:box.height;
  const remaining=horizontal?rect.width/media.width:rect.height/media.height;
  const start=crop[side];
  const maxInset=Math.max(0,Math.min(.9-start,remaining-.05,remaining*(1-minEdgeCropSize/size)));
  const change=Math.max(-start,Math.min(maxInset,(leading?delta:-delta)*remaining/size));
  if(Math.abs(change)<1e-8)return {imageCrop:settings.imageCrop,imageCropBasis:settings.imageCropBasis,x:settings.x,y:settings.y};
  crop[side]=start+change;
  const shift=(leading?1:-1)*change/remaining*size/2;
  return {
    imageCrop:crop,imageCropBasis:settings.imageCropBasis??settings.imageCrop??{},
    x:(settings.x??0)+(horizontal?shift*cos:-shift*sin)/bounds.width*100,
    y:(settings.y??0)+(horizontal?shift*sin:shift*cos)/bounds.height*100,
  };
}

export function cropRect(media,crop={}){
  const c=crop??{},left=Math.max(0,Math.min(.9,Number(c.left)||0)),top=Math.max(0,Math.min(.9,Number(c.top)||0));
  const right=Math.max(0,Math.min(.95-left,Number(c.right)||0)),bottom=Math.max(0,Math.min(.95-top,Number(c.bottom)||0));
  return {x:media.width*left,y:media.height*top,width:media.width*(1-left-right),height:media.height*(1-top-bottom)};
}
export function backgroundGeometry(settings,media,width,height){
  const crop=cropRect(media,settings.imageCrop),scale=Math.max(width/crop.width,height/crop.height)*(settings.scale??100)/100;
  return {cx:width*(.5+(settings.x??0)/100),cy:height*(.5+(settings.y??0)/100),width:crop.width*scale,height:crop.height*scale,angle:(settings.roll??0)*Math.PI/180};
}

// Separating-axis test: rotated bounds can overlap a canvas corner even when
// none of the image itself is inside. Selection UI must follow the real image.
export function imageIntersectsCanvas(box,width,height) {
  if(width<=0||height<=0)return false;
  const dx=box.cx-width/2,dy=box.cy-height/2,c=Math.cos(box.angle),s=Math.sin(box.angle),ac=Math.abs(c),as=Math.abs(s),hw=box.width/2,hh=box.height/2;
  return Math.abs(dx)<width/2+hw*ac+hh*as&&Math.abs(dy)<height/2+hw*as+hh*ac&&
    Math.abs(dx*c+dy*s)<hw+width/2*ac+height/2*as&&Math.abs(-dx*s+dy*c)<hh+width/2*as+height/2*ac;
}
