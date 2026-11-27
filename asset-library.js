import {loadMedia} from './media.js';
export const assetLibrary=[
  {id:'phone',name:'iPhone mockup',frame:true,width:1206,height:2622},
  {id:'glass',name:'Glass card',frame:true,width:900,height:650},
  {id:'box',name:'Rounded box',frame:true,width:800,height:800},
  {id:'arrow',name:'Arrow',width:900,height:320},
  {id:'curve',name:'Curved arrow',width:700,height:600},
  {id:'circle',name:'Circle outline',width:700,height:700},
];
export const assetFor=kind=>assetLibrary.find(asset=>asset.id===kind);
export const isAssetFrame=pose=>!!assetFor(pose?.assetKind)?.frame;
export const assetShape=(pose,media)=>{const asset=assetFor(pose.assetKind);return asset?.frame?{width:asset.width,height:asset.height}:media;};
export function assetSVG(kind,preview=false){
  const asset=assetFor(kind);if(!asset)throw Error('Unknown asset');
  const shapes={
    phone:preview?'<rect x="20" y="5" width="60" height="90" rx="13" fill="#151518" stroke="#c5c8cc" stroke-width="2"/><rect x="24" y="10" width="52" height="80" rx="10" fill="url(#screen)"/><rect x="40" y="13" width="20" height="5" rx="2.5" fill="#050506"/>':'<rect width="100" height="100" fill="url(#screen)"/><path d="M40 48h20m-10-4v8" stroke="#ffffff99" stroke-width="1"/>',
    glass:'<rect x="7" y="18" width="86" height="64" rx="12" fill="url(#glass)" stroke="#cfe3f4" stroke-opacity=".7" stroke-width="1.3"/><path d="m20 69 22-24 17 17 11-12 14 18" fill="none" stroke="#dae6f0" stroke-width="2" opacity=".7"/><circle cx="66" cy="35" r="5" fill="#dae6f0" opacity=".7"/>',
    box:'<rect x="13" y="13" width="74" height="74" rx="15" fill="#30343c" stroke="#b5bdc9" stroke-width="2"/><path d="m25 69 18-20 15 16 11-10 9 14" fill="none" stroke="#b5bdc9" stroke-width="2"/><circle cx="64" cy="35" r="5" fill="#b5bdc9"/>',
    arrow:'<path d="M10 50h77m-22-22 22 22-22 22" fill="none" stroke="#f7f7fa" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>',
    curve:'<path d="M17 83c-8-39 24-61 65-48M64 15l20 21-22 15" fill="none" stroke="#f7f7fa" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>',
    circle:'<circle cx="50" cy="50" r="37" fill="none" stroke="#f7f7fa" stroke-width="5"/>',
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${preview?100:asset.width}" height="${preview?100:asset.height}" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="screen" x2="1" y2="1"><stop stop-color="#7e91c8"/><stop offset="1" stop-color="#b6abd0"/></linearGradient><linearGradient id="glass" x2="1" y2="1"><stop stop-color="#cde6ff" stop-opacity=".3"/><stop offset="1" stop-color="#7c93bd" stop-opacity=".08"/></linearGradient></defs>${shapes[kind]}</svg>`;
}
export const assetPreview=kind=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(assetSVG(kind,true));
export function loadAsset(kind){return loadMedia({kind:'image',name:assetFor(kind).name+'.svg',blob:new Blob([assetSVG(kind)],{type:'image/svg+xml'})});}

// These shapes stay vector paths at every preview/export size. Image content is
// clipped into a fixed frame, so fitting never changes the object's geometry.
export function drawAssetFrame(ctx,pose,media,width,height){
  const glass=pose.assetKind==='glass',pad=glass?width*.035:width*.025,radius=Math.min(width,height)*(glass?.075:.1);
  ctx.save();ctx.beginPath();ctx.roundRect(0,0,width,height,radius);ctx.clip();
  const fill=ctx.createLinearGradient(0,0,width,height);fill.addColorStop(0,glass?'rgba(212,233,255,.28)':'#434750');fill.addColorStop(1,glass?'rgba(92,116,157,.1)':'#181b21');ctx.fillStyle=fill;ctx.fillRect(0,0,width,height);
  ctx.save();ctx.beginPath();ctx.roundRect(pad,pad,width-pad*2,height-pad*2,Math.max(0,radius-pad));ctx.clip();
  if(!pose.assetEmpty&&media?.element){const scale=Math.max((width-pad*2)/media.width,(height-pad*2)/media.height),w=media.width*scale,h=media.height*scale;ctx.drawImage(media.element,pad+(width-pad*2-w)/2,pad+(height-pad*2-h)/2,w,h);}
  else {ctx.strokeStyle=glass?'#d5e2ef99':'#c1c8d080';ctx.lineWidth=width*.007;ctx.lineCap='round';ctx.lineJoin='round';const x=width*.35,y=height*.32,w=width*.3,h=height*.36;ctx.beginPath();ctx.roundRect(x,y,w,h,width*.025);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y+h*.8);ctx.lineTo(x+w*.38,y+h*.4);ctx.lineTo(x+w*.65,y+h*.7);ctx.lineTo(x+w*.8,y+h*.55);ctx.lineTo(x+w,y+h*.78);ctx.stroke();}
  ctx.restore();ctx.beginPath();ctx.roundRect(width*.0015,height*.0015,width*.997,height*.997,radius);ctx.strokeStyle=glass?'#e9f5ff80':'#c4ccd040';ctx.lineWidth=Math.max(1,width*.003);ctx.stroke();ctx.restore();
}
