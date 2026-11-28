import {drawMark} from './watermark.js';
import {drawRecordedGesture} from './gesture-render.js';
import {keptVideoSegments,containsVideoTime} from './video-edits.js';
import {cleanStatusProfile,inpaintStatusRows,widenRows,frostSample} from './status-profile.js';
import {cameraAt,anchoredZoom,orderedMoments,sourceSignature} from './showcase-model.js';
import {evaluateTimeline,timelineDuration} from './timeline-model.js';
import {assetShape,drawAssetFrame,isAssetFrame} from './asset-library.js';
import {motionAt,movedPose,turnedDirection} from './motion-effects.js';
import {busyRows,quietRun} from './status-gap.js';
import {createAdjuster,adjustmentKey} from './adjustments.js';
import { drawTextOverlay } from './text-model.js';
import { imageGeometry, imageSettings, cropRect, backgroundGeometry } from './image-model.js';
import { sceneLayers,textGeometry,textModel } from './text-model.js';
import { createBlurProcessor } from './blur-model.js';
import {createLongShadow} from './shadows.js';

export const ratios = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  story: [1080, 1920],
  wide: [1920, 1080],
};

export const devices = {
  pro: { width: 302, height: 640, radius: 48, bezel: 10, camera: 'pill' },
  mini: { width: 306, height: 640, radius: 44, bezel: 12, camera: 'notch' },
  android: { width: 296, height: 640, radius: 31, bezel: 9, camera: 'dot' },
  tablet: { width: 475, height: 640, radius: 38, bezel: 19, camera: 'dot' },
};

export const finishes = {
  graphite: { name: 'Black', swatch: '#343343', rim: ['#777887', '#22222c', '#09090f', '#53535f'] },
  silver: { name: 'Silver', swatch: '#c9cbd4', rim: ['#f4f6ff', '#a4a8b5', '#383b48', '#c1c8d1'] },
  cobalt: { name: 'Glacier', swatch: '#b5c4d4', rim: ['#a5bbeb', '#4f628c', '#17223e', '#6f85ac'] },
  rose: { name: 'Burgundy', swatch: '#58363b', rim: ['#ffe0d4', '#a7776c', '#503734', '#d0a69c'] },
};

export const backdrops = {
  lilac: { name: 'Lilac', colors: ['#e9ddff', '#a78af2', '#7152ce'] },
  frost: { name: 'Frost', colors: ['#e9f9ff', '#a4cbe9', '#527cb4'] },
  peach: { name: 'Peach', colors: ['#ffece5', '#ecaaae', '#bd697a'] },
  moss: { name: 'Moss', colors: ['#e5eee2', '#a9bda9', '#507a67'] },
  dusk: { name: 'Dusk', colors: ['#8883a7', '#514967', '#231d39'] },
  jade: { name: 'Jade', colors: ['#d8f5b2', '#65ae86', '#164b4d'] },
  clay: { name: 'Clay', colors: ['#ffd7a8', '#e7875c', '#8f3f57'] },
  tide: { name: 'Tide', colors: ['#59eadc', '#2694b9', '#273883'], glow: '#7586ff' },
  aurora: { name: 'Aurora', colors: ['#b7a3fc', '#634dbd', '#373c8c'], glow: '#ed8b8a' },
  dawn: { name: 'Dawn', colors: ['#fff5d5', '#e0a9bb', '#a185b2'], glow: '#ffe0a7' },
  ember: { name: 'Ember', colors: ['#ffbe8f', '#cb646d', '#783b73'], glow: '#ff977c' },
};

export const templates = {
  tide: { name: 'Tide', settings: { palette: 'tide', angle: 'front', roll: 0, scale: 89, finish: 'cobalt', halo: false } },
  aurora: { name: 'Aurora', settings: { palette: 'aurora', angle: 'front', roll: 0, scale: 89, finish: 'silver', halo: false } },
  dawn: { name: 'Dawn', settings: { palette: 'dawn', angle: 'front', roll: 0, scale: 89, finish: 'rose', halo: false } },
  ember: { name: 'Ember', settings: { palette: 'ember', angle: 'front', roll: 0, scale: 89, finish: 'graphite', halo: false } },
};

export const defaults = {
  ...templates.aurora.settings,
  brightness:0,contrast:0,saturation:0,warmth:0,
  ratio: 'square', device: 'iphone18', imageEdges:4, background: 'gradient', color: '#746bd6',
  cleanup: 'auto', top: 5, bottom: 0, fit: 'cover', shadow: 55, x: 0, y: 0,
  caption: '', motion: 'still', trimStart: 0, trimEnd: null, statusTime: '12:30', statusBattery: 100,
  statusTone: 'light', statusStyle: 'ios27', zoom: 'fit', shadowStyle: 'soft', shadowAngle: 45,
  watermark: 'none', watermarkText: '', watermarkCorner: 'bottom-right',
  watermarkStrength: 100, watermarkSize: 100, watermarkColor: '#ffffff', watermarkBadge: '',
};

const deviceArt = {
  iphone18: { url: new URL('./assets/apple-iphone18-black.png', import.meta.url).href, width:1350,height:2760,screen:[72,69,1206,2622,180] },
};

const finishImages = {
  graphite: new URL('./assets/apple-iphone18-black.png', import.meta.url).href,
  silver: new URL('./assets/apple-iphone18-silver.png', import.meta.url).href,
  cobalt: new URL('./assets/apple-iphone18-glacier.png', import.meta.url).href,
  rose: new URL('./assets/apple-iphone18-burgundy.png', import.meta.url).href,
};
const statusArt = new Image();
const statusVariants = {};
const finishArt = {};
let loadingDeviceArt;
function imageReady(image, url) {
  return new Promise((resolve,reject)=>{
    image.onload=resolve;
    image.onerror=()=>reject(new Error('Could not load device artwork.'));
    image.src=url;
  });
}
export function loadDeviceArt() {
  loadingDeviceArt ??= Promise.all([
    ...Object.values(deviceArt).map(art=>{art.image=new Image();return imageReady(art.image,art.url);}),
    ...Object.entries(finishImages).map(([key,url])=>{finishArt[key]=new Image();return imageReady(finishArt[key],url);}),
    imageReady(statusArt,new URL('./assets/apple-statusbar.png',import.meta.url).href),
  ]);
  return loadingDeviceArt;
}
function frameForFinish(art, finish) {
  return art===deviceArt.iphone18 ? finishArt[finish] ?? art.image : art.image;
}

// The normalized ratios also recognize downscaled versions of known captures.
const phoneSizes = [
  [1179, 2556, 'pro', 5.15], [1290, 2796, 'pro', 5.15],
  [1206, 2622, 'pro', 5.15], [1320, 2868, 'pro', 5.15],
  [1125, 2436, 'mini', 4.9], [1242, 2688, 'mini', 4.9],
  [1170, 2532, 'mini', 4.9], [1284, 2778, 'mini', 4.9],
  [1080, 2340, 'mini', 5.3], [750, 1334, 'mini', 3.6],
  [1242, 2208, 'mini', 3.6], [1080, 2400, 'android', 4],
  [1440, 3200, 'android', 4], [1080, 2520, 'android', 4],
  [1440, 3120, 'android', 4],
];

export function detectPhone(width, height) {
  if (width < 250 || height <= width) return null;
  const exact = phoneSizes.find(([w, h]) => width === w && height === h);
  const match = exact ?? phoneSizes.find(([w, h]) => Math.abs(w / h - width / height) < .0011);
  return match ? { device: match[2], crop: match[3] } : null;
}

export function suggestDevice() {
  return 'iphone18';
}

export function normalizeSettings(settings = {}) {
  return { ...defaults, ...settings, device: settings.device === 'flat' ? 'flat' : 'iphone18' };
}

// Signed zoom keeps the original top-focused presets in existing drafts.
export function zoomLevel(value) {
  if (value === 'closer') return 46;
  if (value === 'detail') return 100;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(-100, Math.min(100, number)) : 0;
}

export function cropFor(settings, media) {
  // Status replacement never removes or shifts any source pixels, including older drafts.
  return [0, 0];
}

// Forward and inverse source-to-artboard mapping shared with the blur gestures.
// Matches the column projection, zoom anchoring, fit and roll used below.
export function mediaMapping(settings,media,width,height,index=0,count=1) {
  if(settings.pageObjects){
    const item=settings.pageObjects[index];if(!item)return {to:p=>p,from:p=>p};
    const {pose,bounds}=pageObjectPlacement(settings,item,width,height),mapping=mediaMapping(pose,media,bounds.width,bounds.height);
    return {to:p=>{const q=mapping.to(p);return{x:q.x+bounds.x,y:q.y+bounds.y};},from:p=>mapping.from({x:p.x-bounds.x,y:p.y-bounds.y})};
  }
  const moved=movedPose(settings,settings.renderProgress??0);settings=moved.pose;
  const columns=count>1?Math.min(count,Math.max(2,Math.floor(Math.sqrt(count*width/height)))):1;
  const rows=Math.ceil(count/columns),cw=width/columns,ch=height/rows,row=Math.floor(index/columns);
  const remaining=Math.min(columns,count-row*columns),ox=(index%columns+(columns-remaining)/2)*cw,oy=row*ch;
  const rotate=(x,y,a)=>({x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)});
  if(settings.device==='flat'){
    const shape=assetShape(settings,media),b=imageGeometry(settings,shape,cw,ch),flip=settings.imageFlip?-1:1;
    const crop=cropRect(shape,settings.imageCrop);
    return {
      to:p=>{const q=rotate(((p.x*shape.width-crop.x)/crop.width-.5)*b.width*flip,((p.y*shape.height-crop.y)/crop.height-.5)*b.height,b.angle);return {x:ox+b.cx+q.x,y:oy+b.cy+q.y};},
      from:p=>{const q=rotate(p.x-ox-b.cx,p.y-oy-b.cy,-b.angle);return {x:(crop.x+(q.x/b.width*flip+.5)*crop.width)/shape.width,y:(crop.y+(q.y/b.height+.5)*crop.height)/shape.height};},
    };
  }
  const art=deviceArt.iphone18,tw=art.width,th=art.height,[sx,sy,sw,sh]=art.screen;
  const direction=turnedDirection(settings.angle,moved.turn);
  const strength=Math.abs(direction),fw=Math.round(tw*(1-strength*.105));
  const depth=strength?Math.max(1,Math.round(tw*strength*.046)):0,ph=strength?Math.ceil(th*(1+strength*.066))+2:th,pw=strength?fw+depth:tw;
  const level=count>1?0:zoomLevel(settings.zoom),base=Math.min(ch*.86/th,cw*.79/tw)*settings.scale/100,size=base*(1+Math.abs(level)*.0113);
  const cx=ox+cw*(.5+settings.x/100),cy=oy+ch*(.5+settings.y/100)+Math.sign(level)*ph*(size-base)/2,angle=settings.roll*Math.PI/180;
  const fit=(settings.fit==='contain'?Math.min:Math.max)(sw/media.width,sh/media.height),mw=media.width*fit,mh=media.height*fit;
  const dx=sx+(sw-mw)/2,dy=sy+(settings.fit==='contain'?(sh-mh)/2:0);
  function projectPoint(x,y){if(!strength)return{x,y};const px=x/tw*fw,tall=th*(1+direction*.066*(2*x/tw-1));return{x:px+(direction>0?0:depth),y:(ph-2-tall)/2+y/th*tall};}
  function unproject(x,y){if(!strength)return{x,y};const tx=(x-(direction>0?0:depth))/fw*tw,tall=th*(1+direction*.066*(2*tx/tw-1));return{x:tx,y:(y-(ph-2-tall)/2)/tall*th};}
  const mirror=settings.imageFlip?-1:1;
  return {to:p=>{const q=projectPoint(dx+p.x*mw,dy+p.y*mh),r=rotate((q.x-pw/2)*size*mirror,(q.y-ph/2)*size,angle);return{x:cx+r.x,y:cy+r.y};},from:p=>{const r=rotate(p.x-cx,p.y-cy,-angle),q=unproject(r.x/size*mirror+pw/2,r.y/size+ph/2);return{x:(q.x-dx)/mw,y:(q.y-dy)/mh};}};
}

export function pageObjectPlacement(settings,item,width,height){
  const slot=item.slot??{x:0,y:0,width:1,height:1};
  const {pageObjects,...base}=settings;
  return {pose:{...base,...item.pose,imagePattern:item.pose.imagePattern??null,x:(item.pose.x??0)/slot.width,y:(item.pose.y??0)/slot.height},bounds:{x:slot.x*width,y:slot.y*height,width:slot.width*width,height:slot.height*height}};
}
export function pageObjectGeometry(settings,media,width,height,item){
  const placed=pageObjectPlacement(settings,item,width,height),b=placed.bounds,moved=movedPose(placed.pose,settings.renderProgress??0),pose=moved.pose;
  if(pose.device==='flat'){const shape=imageGeometry(pose,assetShape(pose,media),b.width,b.height);return {...shape,cx:shape.cx+b.x,cy:shape.cy+b.y};}
  const art=deviceArt.iphone18,direction=turnedDirection(pose.angle,moved.turn);
  const strength=Math.abs(direction);
  const pw=Math.round(art.width*(1-strength*.105))+(strength?Math.max(1,Math.round(art.width*strength*.046)):0),ph=strength?Math.ceil(art.height*(1+strength*.066))+2:art.height;
  const level=zoomLevel(pose.zoom),base=Math.min(b.height*.86/art.height,b.width*.79/art.width)*(pose.scale??89)/100,size=base*(1+Math.abs(level)*.0113);
  return {width:pw*size,height:ph*size,cx:b.x+b.width*(.5+pose.x/100),cy:b.y+b.height*(.5+pose.y/100)+Math.sign(level)*ph*(size-base)/2,angle:(pose.roll??0)*Math.PI/180};
}

const statusBlurRadius = 17;
const statusBlurKernel = Array.from({length:statusBlurRadius*2+1},(_,index)=>Math.exp(-((index-statusBlurRadius)**2)/(2*6.2**2)));
const statusBlurWeight = statusBlurKernel.reduce((sum,value)=>sum+value,0);

const statusMask = document.createElement('canvas');
function softenStatusBar(ctx, bounds, media, settings, sample, blend, cleanSource) {
  if (!drawable(media)) return;
  const [x,y,width,height] = bounds;
  const fraction = Math.max(.02,Math.min(.08,(detectPhone(media.width,media.height)?.crop ?? settings.top ?? 5)/100));
  const scale = (settings.fit==='contain'?Math.min:Math.max)(width/media.width,height/media.height);
  const band = Math.min(height*.08,Math.max(width*.1,media.height*fraction*scale));
  const feather = width*.013;
  // Like a real iPhone, the status area reaches the bottom of the Dynamic Island (151 of
  // 1206 screen units); the clean band covers it fully, so app content can't sit half under it.
  const unit = width/1206, island = 151*unit, reach = 48*unit;
  const stripHeight = Math.ceil(Math.max(band,island+reach)+feather*3);
  const sampleWidth = 240;
  const sampleHeight = Math.max(1,Math.ceil(stripHeight*sampleWidth/width));
  resize(sample,sampleWidth,sampleHeight);
  const graphics=sample.getContext('2d',{willReadFrequently:true});
  graphics.clearRect(0,0,sampleWidth,sampleHeight);
  if(drawable(cleanSource)){
    // Status reconstruction comes from the original capture, independent of a
    // live blur preview. This makes its cached background match fresh exports.
    graphics.fillStyle='#111318';graphics.fillRect(0,0,sampleWidth,sampleHeight);
    graphics.save();graphics.scale(sampleWidth/width,sampleHeight/stripHeight);
    drawMedia(graphics,cleanSource,0,0,width,height,settings.fit,cropFor(settings,cleanSource),true);graphics.restore();
  }else{
    const pixelScale=ctx.getTransform().a;
    graphics.drawImage(ctx.canvas,x*pixelScale,y*pixelScale,width*pixelScale,stripHeight*pixelScale,0,0,sampleWidth,sampleHeight);
  }
  const image=graphics.getImageData(0,0,sampleWidth,sampleHeight);
  const pixels=image.data;
  // End inside the first quiet gap below the island when there is one close by, so nothing
  // is sliced; otherwise fade out slowly from the island's bottom edge.
  const rowHeight=stripHeight/sampleHeight,busy=busyRows(pixels,sampleWidth,sampleHeight),gap=quietRun(busy,island/rowHeight,Math.max(2,Math.round(8*unit/rowHeight)));
  const usable=gap&&gap.start*rowHeight<=island+reach;
  const rebuild=widenRows(busy),detailed=rebuild.reduce((sum,value)=>sum+value,0)>sampleHeight*.55;
  if(detailed)frostSample(pixels,sampleWidth,sampleHeight,Math.round(sampleWidth*.04));
  else if(!inpaintStatusRows(pixels,sampleWidth,sampleHeight,rebuild))cleanStatusProfile(pixels,sampleWidth,sampleHeight,statusBlurKernel,statusBlurWeight);
  // A separately coloured status bar (common on Android) is extended down to the island's
  // bottom, as on iPhone, so the edge never cuts through the new icons.
  const islandRow=Math.min(sampleHeight-1,Math.round(island/rowHeight)),appRow=Math.min(sampleHeight-1,islandRow+Math.max(1,Math.round(6*unit/rowHeight)));
  let barDiff=0;for(let col=0;col<sampleWidth;col+=4){const p=col*4,q=(appRow*sampleWidth+col)*4;barDiff+=Math.abs(.2126*(pixels[p]-pixels[q])+.7152*(pixels[p+1]-pixels[q+1])+.0722*(pixels[p+2]-pixels[q+2]));}
  const colouredBar=!detailed&&barDiff/Math.ceil(sampleWidth/4)>40;
  if(colouredBar)for(let row=1;row<=islandRow;row++)pixels.copyWithin(row*sampleWidth*4,0,sampleWidth*4);
  // Status icons take the colour a real iPhone would pick: dark on light backgrounds.
  let light=0,count=0;for(let row=Math.floor(46*unit/rowHeight);row<Math.min(sampleHeight,Math.ceil(136*unit/rowHeight));row++)for(let col=0;col<sampleWidth;col+=2){const at=(row*sampleWidth+col)*4;light+=.2126*pixels[at]+.7152*pixels[at+1]+.0722*pixels[at+2];count++;}
  blend.statusTone=count&&light/count>165?'dark':'light';
  graphics.putImageData(image,0,0);
  resize(blend,width,stripHeight);
  const blended=blend.getContext('2d');
  blended.clearRect(0,0,width,stripHeight);
  blended.drawImage(sample,0,0,width,stripHeight);
  const mask=statusMask.getContext('2d');resize(statusMask,width,stripHeight);mask.clearRect(0,0,width,stripHeight);
  blended.globalCompositeOperation='destination-in';
  // Eased fade instead of a hard line where the clean band meets the app.
  const from=colouredBar?island:usable?gap.start*rowHeight:island,to=colouredBar?island+feather*.6:usable?Math.min(gap.end*rowHeight,from+feather*2.5):Math.min(stripHeight,island+feather*3.5);
  const fade=mask.createLinearGradient(0,from,0,Math.max(from+1,to));
  [[0,1],[.25,.9],[.5,.6],[.75,.25],[1,0]].forEach(([stop,alpha])=>fade.addColorStop(stop,`rgba(255,255,255,${alpha})`));
  mask.fillStyle=fade;mask.fillRect(0,0,width,stripHeight);
  blended.drawImage(statusMask,0,0);
  blended.globalCompositeOperation='source-over';
  ctx.drawImage(blend,x,y);
}

function rounded(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fillRound(ctx, x, y, width, height, radius, fill) {
  rounded(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawable(media) {
  return media?.element && (media.kind !== 'video' || media.element.readyState >= 2);
}

function drawMedia(ctx, media, x, y, width, height, fit, [top, bottom] = [0, 0], alignTop = false) {
  if (!drawable(media)) return;
  const sourceY = media.height * top / 100;
  const sourceHeight = media.height * (1 - (top + bottom) / 100);
  const scale = (fit === 'contain' ? Math.min : Math.max)(width / media.width, height / sourceHeight);
  const dx = (width - media.width * scale) / 2;
  const dy = alignTop && fit !== 'contain' ? 0 : (height - sourceHeight * scale) / 2;
  ctx.drawImage(media.element, 0, sourceY, media.width, sourceHeight, x + dx, y + dy, media.width * scale, sourceHeight * scale);
}

function paintBackdrop(ctx, width, height, settings, media, photo, blur) {
  const [light, mid, dark] = backdrops[settings.palette]?.colors ?? [settings.color, settings.color, settings.color];
  if (settings.background === 'transparent') return;
  if (settings.background === 'solid') {
    ctx.fillStyle = backdrops[settings.palette] ? mid : settings.color;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const source = settings.background === 'photo' ? photo : media;
  if ((settings.background === 'photo' || settings.background === 'blur') && drawable(source)) {
    if (settings.background === 'blur') {
      // Downsample first so older webviews without Canvas filter still soften the image.
      blur.width = 18;
      blur.height = Math.max(1, Math.round(18 * height / width));
      const blurred = blur.getContext('2d');
      drawMedia(blurred, source, 0, 0, blur.width, blur.height, 'cover');
      ctx.filter = `blur(${Math.round(width * .035)}px)`;
      ctx.drawImage(blur, -width * .1, -height * .1, width * 1.2, height * 1.2);
      ctx.filter = 'none';
      ctx.fillStyle = '#21163738';
      ctx.fillRect(0, 0, width, height);
    } else {
      const pose=settings.backgroundPose??{},box=backgroundGeometry(pose,source,width,height),crop=cropRect(source,pose.imageCrop);
      ctx.save();ctx.translate(box.cx,box.cy);ctx.rotate(box.angle);if(pose.imageFlip)ctx.scale(-1,1);
      rounded(ctx,-box.width/2,-box.height/2,box.width,box.height,Math.min(box.width,box.height)*(pose.imageEdges??0)/100);ctx.clip();
      ctx.drawImage(source.element,crop.x,crop.y,crop.width,crop.height,-box.width/2,-box.height/2,box.width,box.height);ctx.restore();
    }
    return;
  }
  const glow = ctx.createRadialGradient(width * .36, height * .25, 0, width * .43, height * .36, Math.max(width, height) * .82);
  glow.addColorStop(0, light);
  glow.addColorStop(.46, mid);
  glow.addColorStop(1, dark);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  const highlight = backdrops[settings.palette]?.glow;
  if (highlight) {
    const accent = ctx.createRadialGradient(width * .92, height * .96, 0, width * .92, height * .96, Math.max(width, height) * .85);
    accent.addColorStop(0, highlight);
    accent.addColorStop(1, highlight + '00');
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, width, height);
  }
  if (settings.halo) {
    const unit = Math.max(width, height);
    ctx.lineWidth = unit * .0012;
    ctx.strokeStyle = '#ffffff35';
    for (const radius of [.37, .46, .55]) {
      ctx.beginPath();
      ctx.arc(width * .49, height * .49, unit * radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function sampleOverlay(ctx, x, y, width, height) {
  const shade = ctx.createLinearGradient(0, y + height * .43, 0, y + height);
  shade.addColorStop(0, '#07122300');
  shade.addColorStop(1, '#071223c9');
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, width, height);
  const left = x + width * .095;
  ctx.fillStyle = '#cde1f5';
  ctx.font = `650 ${width * .038}px system-ui, sans-serif`;
  ctx.fillText('THE ALPINE JOURNAL', left, y + height * .648);
  ctx.fillStyle = '#f8fbff';
  ctx.font = `500 ${width * .136}px Georgia, serif`;
  ctx.fillText('Into the', left, y + height * .736);
  ctx.fillText('Dolomites', left, y + height * .808);
  ctx.fillStyle = '#d3e2f0';
  ctx.font = `450 ${width * .044}px system-ui, sans-serif`;
  ctx.fillText('Italy · Trail guide', left, y + height * .867);
  fillRound(ctx, left, y + height * .9, width * .27, height * .042, width * .04, '#e7eef6');
  ctx.fillStyle = '#172c3f';
  ctx.font = `650 ${width * .033}px system-ui, sans-serif`;
  ctx.fillText('EXPLORE', left + width * .051, y + height * .926);
}

function statusOverlay(ctx, x, y, width, height, device, settings, autoTone='light') {
  if (!statusArt.complete || !statusArt.naturalWidth) return;
  // There is no manual tone control, so the background decides unless a look forces dark.
  const tone = settings.statusTone === 'dark' || autoTone === 'dark' ? '#000000' : '#ffffff';
  let layer = statusVariants[tone];
  if (!layer) {
    layer = document.createElement('canvas');
    layer.width = statusArt.width;
    layer.height = statusArt.height;
    const graphics = layer.getContext('2d');
    graphics.drawImage(statusArt, 0, 0);
    graphics.globalCompositeOperation = 'source-in';
    graphics.fillStyle = tone;
    graphics.fillRect(0, 0, layer.width, layer.height);
    statusVariants[tone] = layer;
  }
  const scale = width / 1206;
  ctx.save();
  ctx.translate(x - 72 * scale, y - 69 * scale);
  ctx.scale(scale, scale);
  {
    // Preserve Apple's signal/Wi-Fi artwork; render editable time and charge separately.
    ctx.drawImage(layer, 900, 0, 180, 250, 900, 0, 180, 250);
    ctx.fillStyle = tone;
    ctx.font = '600 51px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(settings.statusTime.replace(/^0/, ''), 300, 165);
    const charge = Math.max(0, Math.min(100, settings.statusBattery ?? 100));
    rounded(ctx, 1092, 147, 72, 35, 10);
    ctx.strokeStyle = tone;
    ctx.lineWidth = 3;
    ctx.globalAlpha = .65;
    ctx.stroke();
    fillRound(ctx, 1168, 157, 4, 14, 2, tone);
    ctx.globalAlpha = 1;
    if (charge) fillRound(ctx, 1097, 152, 62 * charge / 100, 25, Math.min(6, 31 * charge / 100), tone);
  }
  ctx.restore();
}

function drawFrame(ctx, shape, settings, media) {
  const { width, height, radius, bezel, camera } = shape;
  const flat = settings.device === 'flat';
  const [highlight, metal, low, edge] = finishes[settings.finish].rim;
  if (!flat) {
    const body = ctx.createLinearGradient(0, 0, width, height * .55);
    for (const [index, color] of [highlight, metal, edge, low, metal].entries()) {
      body.addColorStop(index / 4, color);
    }
    fillRound(ctx, 0, 0, width, height, radius, body);
    fillRound(ctx, 2, 2, width - 4, height - 4, radius - 2, '#0c0b11');
  }
  const sw = width - bezel * 2;
  const sh = height - bezel * 2;
  ctx.save();
  rounded(ctx, bezel, bezel, sw, sh, Math.max(1, radius - bezel));
  ctx.clip();
  const surface = ctx.createLinearGradient(0, 0, width, height);
  surface.addColorStop(0, '#322c49');
  surface.addColorStop(1, '#13101e');
  ctx.fillStyle = surface;
  ctx.fillRect(bezel, bezel, sw, sh);
  drawMedia(ctx, media, bezel, bezel, sw, sh, settings.fit, cropFor(settings, media));
  if (media?.example) sampleOverlay(ctx, bezel, bezel, sw, sh);
  if (settings.cleanup === 'replace' && !media?.blank) statusOverlay(ctx, bezel, bezel, sw, sh, settings.device, settings);
  if (camera === 'pill') fillRound(ctx, width * .342, bezel + 12, width * .316, height * .035, 14, '#08090e');
  if (camera === 'notch') fillRound(ctx, width * .345, bezel - 9, width * .31, height * .048, 12, '#08090e');
  if (camera === 'dot') fillRound(ctx, width / 2 - 5, bezel + 8, 10, 10, 5, '#0c0d14');
  ctx.restore();
}

function drawDeviceArt(ctx, art, settings, media, statusSample, statusBlend, statusCache, cleanSource) {
  const [x, y, width, height, radius] = art.screen;
  const rebuildStatus = !media?.blank && !media?.example && ['auto', 'replace', 'crop'].includes(settings.cleanup);
  const crop = cropFor(settings, media);
  ctx.save();
  rounded(ctx, x, y, width, height, radius);
  ctx.clip();
  ctx.fillStyle = '#111318';
  ctx.fillRect(x, y, width, height);
  // Preserve the source's original framing; only soften its status pixels in iOS mode.
  drawMedia(ctx, media, x, y, width, height, settings.fit, crop, true);
  if (media?.example) sampleOverlay(ctx, x, y, width, height);
  if (rebuildStatus) {
    if(statusCache?.canvas)ctx.drawImage(statusCache.canvas,x,y);
    else {
      softenStatusBar(ctx,art.screen,media,settings,statusSample,statusBlend,cleanSource);
      if(statusCache){statusCache.canvas=document.createElement('canvas');resize(statusCache.canvas,statusBlend.width,statusBlend.height);statusCache.canvas.getContext('2d').drawImage(statusBlend,0,0);statusCache.tone=statusBlend.statusTone;}
    }
    statusOverlay(ctx, x, y, width, height, 'pro', settings, statusCache?.tone??statusBlend.statusTone);
  }
  ctx.restore();
  ctx.drawImage(frameForFinish(art, settings.finish), 0, 0);
}

function resize(canvas, width, height) {
  if (canvas.width === width && canvas.height === height) return;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}

function project(texture, face, body, direction, rim) {
  if (Math.abs(direction) < .01) return texture;
  const { width, height } = texture;
  const strength = Math.abs(direction);
  const faceWidth = Math.round(width * (1 - strength * .105));
  const depth = Math.max(1, Math.round(width * strength * .046));
  const faceHeight = Math.ceil(height * (1 + strength * .066));
  resize(face, faceWidth, faceHeight);
  resize(body, faceWidth + depth, faceHeight + 2);
  const faceCtx = face.getContext('2d');
  const bodyCtx = body.getContext('2d');
  faceCtx.clearRect(0, 0, face.width, face.height);
  bodyCtx.clearRect(0, 0, body.width, body.height);
  // Draw into integer columns before scaling so neighboring strips have no seams.
  const step = width / faceWidth;
  for (let x = 0; x < faceWidth; x++) {
    const fraction = (x + .5) / faceWidth;
    const tall = Math.round(height * (1 + direction * .066 * (2 * fraction - 1)));
    faceCtx.drawImage(texture, x * step, 0, step, height, x, Math.floor((faceHeight - tall) / 2), 1, tall);
  }
  const backX = direction > 0 ? depth : 0;
  bodyCtx.drawImage(face, backX, 2);
  const metal = bodyCtx.createLinearGradient(0, 0, body.width, body.height);
  metal.addColorStop(0, rim[2]);
  metal.addColorStop(.5, rim[1]);
  metal.addColorStop(1, rim[2]);
  bodyCtx.globalCompositeOperation = 'source-in';
  bodyCtx.fillStyle = metal;
  bodyCtx.fillRect(0, 0, body.width, body.height);
  bodyCtx.globalCompositeOperation = 'source-over';
  bodyCtx.drawImage(face, depth - backX, 0);
  return body;
}

function caption(ctx, value, width, height, background) {
  if (!value.trim()) return;
  ctx.save();
  const size = Math.min(width, height);
  ctx.font = `600 ${size * .035}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = value.trim();
  const maxWidth = width * .84;
  const textWidth = Math.min(ctx.measureText(label).width, maxWidth);
  const paddedWidth = textWidth + size * .042;
  const y = height - size * .067;
  const fill = background === 'transparent' ? '#211a36' : '#211a36d6';
  fillRound(ctx, (width - paddedWidth) / 2, y - size * .03, paddedWidth, size * .06, size * .03, fill);
  ctx.fillStyle = '#fff';
  ctx.fillText(label, width / 2, y, maxWidth);
  ctx.restore();
}

export function createRenderer(canvas,{cacheScene=true}={}) {
  const ctx = canvas.getContext('2d');
  const texture = document.createElement('canvas');
  const textureContext = texture.getContext('2d');
  const face = document.createElement('canvas');
  const body = document.createElement('canvas');
  const blur = document.createElement('canvas');
  const castShadow=createLongShadow({preview:cacheScene});
  const statusSample = document.createElement('canvas');
  statusSample.getContext('2d',{willReadFrequently:true});
  const statusBlend = document.createElement('canvas');
  const deviceCache=document.createElement('canvas'),backdropCache=document.createElement('canvas');
  let sceneKey='',sceneSources=[],scenePhoto;
  let interactivePreview=false;
  let flatMedia,flatKey;
  // Preview soft pixels need only a small working texture. Export keeps its
  // original sampling budget; sharp source pixels never take this path.
  const blurOptions={maxSize:cacheScene?360:900};
  const sourceBlur=createBlurProcessor(blurOptions),backgroundBlur=createBlurProcessor(blurOptions),designBlur=createBlurProcessor(blurOptions);
  const mediaCache=new Map();
  const statusCaches=new Map();
  const projections=new Map();
  const adjustMedia=createAdjuster();
  let projectionPixels=0;
  function dropProjection(id){const entry=projections.get(id);if(!entry)return;projectionPixels-=entry.canvas.width*entry.canvas.height;entry.canvas.width=entry.canvas.height=1;projections.delete(id);}
  function cacheProjection(id,key,source,image){
    dropProjection(id);
    const pixels=image.width*image.height;if(pixels>8000000)return image;
    while(projections.size>=16||projectionPixels+pixels>8000000)dropProjection(projections.keys().next().value);
    const copy=document.createElement('canvas');resize(copy,image.width,image.height);copy.getContext('2d').drawImage(image,0,0);
    projections.set(id,{key,source,canvas:copy});projectionPixels+=pixels;return copy;
  }
  let blurRevision=0;
  let backdropKey,backdropSource,backdropPhoto,backdropRevision=0;
  function blurredMedia(settings,media,target){
    const effect=settings.blurEffects?.[target];
    if(!effect||(!effect.whole&&(!effect.strength||!effect.regions?.length))||!drawable(media))return media;
    const key=adjustmentKey(settings)+JSON.stringify(effect)+':'+(media.kind==='video'?media.element.currentTime:0)+(cacheScene?':'+canvas.width+':'+canvas.height+':'+interactivePreview:'');
    let cached=mediaCache.get(target);
    if(!cached||cached.media!==media||cached.key!==key){
      if(!cached){cached={canvas:document.createElement('canvas')};mediaCache.set(target,cached);}
      // Bound preview work to the actual backing pixels, including headroom for
      // the maximum zoom. Exports retain the existing 4096px source budget.
      const limit=cacheScene?Math.min(4096,Math.max(canvas.width,canvas.height)*(interactivePreview?1:settings.device==='flat'?3:2)):4096;
      const scale=Math.min(1,limit/Math.max(media.width,media.height));resize(cached.canvas,Math.max(1,Math.round(media.width*scale)),Math.max(1,Math.round(media.height*scale)));
      const time=media.kind==='video'?media.element.currentTime:0;
      cached.revision=++blurRevision;cached.time=time;
      const graphics=cached.canvas.getContext('2d');graphics.clearRect(0,0,cached.canvas.width,cached.canvas.height);graphics.drawImage(media.element,0,0,cached.canvas.width,cached.canvas.height);
      sourceBlur(graphics,effect,cached.revision);cached.media=media;cached.key=key;
    }
    return {...media,kind:'image',width:cached.canvas.width,height:cached.canvas.height,element:cached.canvas};
  }
  function drawDevice(settings, media, bounds, progress, collage,target='device',reuseProjection=false) {
    const original=media,adjusted=adjustMedia(media,settings,target,cacheScene?Math.min(4096,Math.max(canvas.width,canvas.height)*2*(settings._timelineScale??1)):4096);media=blurredMedia(settings,adjusted,target);
    const { x, y, width, height } = bounds;
    const flat = settings.device === 'flat'||Boolean(settings.imagePattern);
    if(flat) {
      const pose=movedPose(settings,progress).pose;
      const shapeMedia=assetShape(pose,media),crop=cropRect(shapeMedia,pose.imageCrop),box=imageGeometry(pose,shapeMedia,width,height);
      const resolution=Math.min(1,4096/Math.max(crop.width,crop.height));
      const tw=Math.max(1,Math.round(crop.width*resolution)),th=Math.max(1,Math.round(crop.height*resolution));
      const key=[tw,th,settings.assetKind,settings.assetEmpty,JSON.stringify(settings.imageCrop),adjustmentKey(settings),settings.imageEdges,original.kind==='video'?original.element.currentTime:0,JSON.stringify(settings.blurEffects?.[target])].join(':');
      if(flatMedia!==original||flatKey!==key){
        resize(texture,tw,th);textureContext.clearRect(0,0,tw,th);textureContext.save();
        rounded(textureContext,0,0,tw,th,Math.min(tw,th)*Math.max(0,Math.min(50,settings.imageEdges??4))/100);textureContext.clip();
        if(isAssetFrame(settings)&&settings.assetKind!=='phone')drawAssetFrame(textureContext,settings,media,tw,th);else if(drawable(media))textureContext.drawImage(media.element,crop.x,crop.y,crop.width,crop.height,0,0,tw,th);textureContext.restore();flatMedia=original;flatKey=key;
      }
      if(settings.imagePattern){
        const pattern=settings.imagePattern;
        const limit=(value,min,max,fallback)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
        const unit=Math.min(canvas.width,canvas.height);
        const size=unit*limit(pattern.size,8,75,22)/100;
        const scale=size/Math.max(tw,th),w=tw*scale,h=th*scale;
        const gap=size*limit(pattern.spacing,0,100,35)/100;
        const stepX=Math.max(unit*.04,w+gap),stepY=Math.max(unit*.04,h+gap);
        const span=Math.hypot(canvas.width,canvas.height)/2+size;
        ctx.save();ctx.translate(canvas.width/2,canvas.height/2);
        ctx.rotate(limit(pattern.angle,-180,180,0)*Math.PI/180);
        ctx.globalAlpha=limit(pattern.opacity,0,100,38)/100;
        for(let row=-Math.ceil(span/stepY);row<=Math.ceil(span/stepY);row++){
          const offset=pattern.stagger&&row%2?stepX/2:0;
          for(let x=-Math.ceil(span/stepX)*stepX+offset;x<=span;x+=stepX){
            if(settings.imageFlip){ctx.save();ctx.translate(x,row*stepY);ctx.scale(-1,1);ctx.drawImage(texture,-w/2,-h/2,w,h);ctx.restore();}
            else ctx.drawImage(texture,x-w/2,row*stepY-h/2,w,h);
          }
        }
        ctx.restore();return;
      }
      ctx.save();ctx.translate(x+box.cx,y+box.cy);ctx.rotate(box.angle);
      if(settings.shadow&&settings.shadowStyle!=='none'){
        const angle=((settings.shadowAngle??0)+90)*Math.PI/180,size=Math.min(box.width,box.height);
        if(settings.shadowStyle==='long')castShadow(ctx,texture,{width:box.width,height:box.height,reach:Math.min(width,height)*.31,angle:angle-box.angle,strength:settings.shadow,mirror:settings.imageFlip});
        else {ctx.shadowColor=`rgba(0,0,0,${settings.shadow*.008})`;ctx.shadowBlur=size*(settings.shadowStyle==='hard'?.025:.12);
        ctx.shadowOffsetX=Math.cos(angle)*size*.045;ctx.shadowOffsetY=Math.sin(angle)*size*.045;}
      }
      if(settings.imageFlip)ctx.scale(-1,1);
      ctx.drawImage(texture,-box.width/2,-box.height/2,box.width,box.height);ctx.restore();return;
    }
    flatMedia=null;
    const availableHeight = 640;
    const art = !flat && deviceArt.iphone18.image ? deviceArt.iphone18 : null;
    const shape = art ?? devices[settings.device] ?? {
      width: Math.round(availableHeight * Math.min(3, Math.max(.2, media.width / media.height))),
      height: availableHeight, radius: 18, bezel: 0,
    };
    const previewHeight=Math.max(width,height)*Math.max(settings._timelineScale??1,1)*(original.kind==='video'?Math.max(2.5,1+Math.abs(zoomLevel(settings.zoom))*.018):interactivePreview?1:2);
    const textureScale=cacheScene?Math.min(1,previewHeight/shape.height):1;
    const textureHeight=Math.round(shape.height*textureScale);
    const motion = motionAt(settings, progress);
    let size = Math.min(height * .86 / shape.height, width * .79 / shape.width) * settings.scale / 100 * motion.scale;
    const direction = flat ? 0 : turnedDirection(settings.angle, motion.turn);
    const roll = settings.roll + motion.roll;
    // Cache only page-object previews. Position, scale, signed zoom, rotation and
    // shadow remain live transforms of the same sharp projected artwork.
    const reusable=cacheScene&&reuseProjection;
    const frameArt=art?frameForFinish(art,settings.finish):null;
    const projectionKey=reusable?JSON.stringify([adjustmentKey(settings),shape.width,shape.height,textureScale,settings.device,settings.finish,settings.fit,settings.cleanup,settings.top,settings.bottom,settings.statusTime,settings.statusBattery,settings.statusTone,settings.statusStyle,direction,settings.motion,settings.blurEffects?.[target],original.kind==='video'?original.element.currentTime:0,original.width,original.height,media.width,media.height,!!art,art?.image?.complete,art?.image?.naturalWidth,frameArt?.complete,frameArt?.naturalWidth,statusArt.complete,statusArt.naturalWidth]):'';
    const cachedProjection=reusable?projections.get(target):null;
    let projection;
    if(cachedProjection?.source===original&&cachedProjection.key===projectionKey){
      projection=cachedProjection.canvas;projections.delete(target);projections.set(target,cachedProjection);
    }else{
    resize(texture,Math.round(shape.width*textureScale),Math.round(shape.height*textureScale));
    textureContext.clearRect(0,0,texture.width,texture.height);
    textureContext.save();textureContext.scale(textureScale,textureScale);
    if (art) {
      const key=JSON.stringify([adjustmentKey(settings),settings.fit,settings.top,settings.cleanup,original.kind==='video'?original.element.currentTime:0]);
      let cachedStatus=statusCaches.get(target);
      if(!cachedStatus||cachedStatus.source!==original||cachedStatus.key!==key){cachedStatus?.canvas&&(cachedStatus.canvas.width=cachedStatus.canvas.height=1);cachedStatus={source:original,key};statusCaches.set(target,cachedStatus);}
      drawDeviceArt(textureContext, art, settings, media, statusSample, statusBlend,cachedStatus,adjusted);
    }
    else drawFrame(textureContext, shape, settings, media);
    textureContext.restore();
    projection=project(texture, face, body, direction, finishes[settings.finish].rim);
    if(reusable)projection=cacheProjection(target,projectionKey,original,projection);
    }
    size/=textureScale;
    const level = collage ? 0 : zoomLevel(settings.zoom);
    const baseHeight = projection.height * size;
    const zoom = 1 + Math.abs(level) * .0113;
    size *= zoom;
    const deviceHeight = projection.height * size;
    const offsetY = height / 2 + Math.sign(level) * (deviceHeight - baseHeight) / 2;
    ctx.save();
    ctx.translate(x + width * (.5 + (settings.x + motion.x) / 100), y + offsetY + height * (settings.y + motion.y) / 100);
    ctx.rotate(roll * Math.PI / 180);
    ctx.scale(size, size);
    const style = settings.shadowStyle;
    if (settings.shadow && style !== 'none') {
      const angle = (settings.shadowAngle + 90) * Math.PI / 180;
      if (style === 'long') {
        const reach = Math.min(width, height) * .31;
        const distance = reach / size;
        castShadow(ctx,projection,{width:projection.width,height:projection.height,reach:distance,angle:angle-roll*Math.PI/180,strength:settings.shadow,mirror:settings.imageFlip});
      }
      else {
      ctx.shadowColor = `rgba(27, 12, 56, ${settings.shadow * .006})`;
      ctx.shadowBlur = size * textureHeight * (style === 'hard' ? .019 : .095);
      ctx.shadowOffsetX = Math.cos(angle) * size * textureHeight * .06;
      ctx.shadowOffsetY = Math.sin(angle) * size * textureHeight * .06;
      }
    }
    if(settings.imageFlip)ctx.scale(-1,1);
    ctx.drawImage(projection, -projection.width / 2, -projection.height / 2);
    ctx.restore();
  }
  function paintItems(settings,sources,progress,width,height) {
    const collage = sources.length > 1;
    const columns = collage ? Math.min(sources.length, Math.max(2, Math.floor(Math.sqrt(sources.length * width / height)))) : 1;
    const rows = Math.ceil(sources.length / columns);
    const cellWidth = width / columns;
    const cellHeight = height / rows;
    for (const [index, source] of sources.entries()) {
      if(settings.hideDevice)continue;
      const row = Math.floor(index / columns);
      const remaining = Math.min(columns, sources.length - row * columns);
      drawDevice(settings, source, {
        x: (index % columns + (columns - remaining) / 2) * cellWidth,
        y: row * cellHeight,
        width: cellWidth,
        height: cellHeight,
      }, progress, collage,collage?'media:'+index:'device');
    }
    caption(ctx, settings.caption, width, height, settings.background);
  }
  function backdrop(graphics,width,height,settings,source,photo){
    paintBackdrop(graphics,width,height,settings,source,photo,blur);
    const key=JSON.stringify([width,height,settings.background,settings.palette,settings.color,settings.halo,settings.backgroundPose,source?.kind==='video'?source.element.currentTime:0]);
    if(backdropKey!==key||backdropSource!==source||backdropPhoto!==photo){backdropRevision++;backdropKey=key;backdropSource=source;backdropPhoto=photo;}
    backgroundBlur(graphics,settings.blurEffects?.background,backdropRevision);
  }
  function objectMapping(settings,sources,id) {
    const index=settings.pageObjects?.findIndex(item=>item.id===id)??-1;
    if(index>=0){const item=settings.pageObjects[index],source=sources[item.index];if(source)return mediaMapping(settings,source,canvas.width,canvas.height,index);}
    const layer=sceneLayers(settings).find(layer=>layer.id===id&&layer.type==='text');
    if(layer){
      const box=textGeometry(textModel({textOverlay:layer}),canvas.width,canvas.height),c=Math.cos(box.angle),s=Math.sin(box.angle);
      return {to:p=>{const x=(p.x-.5)*box.width,y=(p.y-.5)*box.height;return {x:box.cx+x*c-y*s,y:box.cy+x*s+y*c};}};
    }
    return {to:p=>({x:p.x*canvas.width,y:p.y*canvas.height})};
  }
  function objectCamera(settings,sources,id){
    const camera=!settings._showcaseEditing&&settings._timelineCameras?.find(camera=>camera.objectId===id);
    if(!camera||!(camera.zoom>1.0001))return null;
    const point=objectMapping(settings,sources,id).to(camera),zoom=Math.max(1,Math.min(2.8,camera.zoom));
    return {...anchoredZoom(point,zoom,canvas.width,canvas.height),zoom};
  }
  function drawObject(settings,sources,id,draw){
    const camera=objectCamera(settings,sources,id);
    ctx.save();
    try{if(camera){ctx.translate(camera.x,camera.y);ctx.scale(camera.zoom,camera.zoom);}draw();}
    finally{ctx.restore();}
  }
  const paintScene = (settings, media, photo, progress = 0) => {
    const { width, height } = canvas;
    // Resizing the preview resets context state; restore quality on every paint.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const sources = Array.isArray(media) ? media : media ? [media] : [];
    if(!settings.pageObjects&&projections.size)for(const id of projections.keys())dropProjection(id);
    if (!sources.length&&!settings.pageObjects) return;
    if(settings.pageObjects){
      const active=new Set(settings.pageObjects.filter(item=>item.pose.device!=='flat'&&!item.pose.hideDevice).map(item=>item.id));
      for(const id of projections.keys())if(!active.has(id))dropProjection(id);
      const mediaIds=new Set(settings.pageObjects.map(item=>item.id));
      for(const entries of [mediaCache,statusCaches])for(const [id,entry]of entries)if(!mediaIds.has(id)){if(entry.canvas)entry.canvas.width=entry.canvas.height=1;entries.delete(id);}
      ctx.clearRect(0,0,width,height);backdrop(ctx,width,height,settings,sources[0],photo);
      const byId=new Map(settings.pageObjects.map(item=>[item.id,item]));
      for(const layer of sceneLayers(settings)){
        if(layer.type==='text')drawObject(settings,sources,layer.id,()=>drawTextOverlay(ctx,{textOverlay:layer},width,height));
        else {const item=byId.get(layer.id);if(!item||item.pose.hideDevice||!sources[item.index])continue;const {pose,bounds}=pageObjectPlacement(settings,item,width,height);pose._timelineScale=objectCamera(settings,sources,item.id)?.zoom??1;drawObject(settings,sources,item.id,()=>drawDevice(pose,sources[item.index],bounds,progress,false,item.id,true));}
      }
      caption(ctx,settings.caption,width,height,settings.background);return;
    }
    if(settings.device==='flat'&&sources.length===1&&Array.isArray(settings.layers)){
      ctx.clearRect(0,0,width,height);backdrop(ctx,width,height,settings,sources[0],photo);
      for(const layer of sceneLayers(settings)){
        if(layer.type==='text')drawTextOverlay(ctx,{textOverlay:layer},width,height);
        else if(layer.type==='image'||(layer.type==='device'&&!settings.hideDevice))drawDevice(imageSettings(settings,layer.id),sources[0],{x:0,y:0,width,height},progress,false,layer.id);
      }
      caption(ctx,settings.caption,width,height,settings.background);return;
    }
    if(!cacheScene){
      ctx.clearRect(0,0,width,height);backdrop(ctx,width,height,settings,sources[0],photo);
      drawTextOverlay(ctx,settings,width,height,'behind');paintItems(settings,sources,progress,width,height);
      drawWatermark(ctx,settings,width,height);return;
    }
    // Text transforms reuse the expensive phone projection and status blur.
    const {layers,textOverlay,selectedLayerId,...deviceSettings}=settings;
    const key=JSON.stringify([deviceSettings,width,height,progress,interactivePreview,sources.map(source=>source.kind==='video'?source.element.currentTime:0),Object.values(finishArt).every(image=>image.complete)]);
    const changed=key!==sceneKey||photo!==scenePhoto||sources.length!==sceneSources.length||sources.some((source,index)=>source!==sceneSources[index]);
    if(changed) {
    ctx.clearRect(0, 0, width, height);
    paintItems(settings,sources,progress,width,height);
    resize(deviceCache,width,height);deviceCache.getContext('2d').clearRect(0,0,width,height);deviceCache.getContext('2d').drawImage(canvas,0,0);
    resize(backdropCache,width,height);const backdropContext=backdropCache.getContext('2d');backdropContext.clearRect(0,0,width,height);
    backdrop(backdropContext,width,height,settings,sources[0],photo);
    sceneKey=key;sceneSources=[...sources];scenePhoto=photo;
    }
    ctx.clearRect(0,0,width,height);ctx.drawImage(backdropCache,0,0);
    drawTextOverlay(ctx,settings,width,height,'behind');
    ctx.drawImage(deviceCache,0,0);
    drawWatermark(ctx, settings, width, height);
  };
  let showcaseCanvas,showcaseRenderer;
  function showcase(settings,media,photo,progress){
    const track=settings.showcase;if(!track?.moments?.length||track.enabled===false||settings._showcaseEditing)return false;
    const sources=Array.isArray(media)?media:[media],index=settings.pageObjects?settings.pageObjects.findIndex(item=>item.itemId===track.targetId):0;
    const object=settings.pageObjects?.[index],source=sources[object?.index??index];
    if(!source||source.kind!=='video'||sourceSignature(source)!==track.signature)return false;
    const time=source.element.currentTime,pose={...settings,...object?.pose},start=pose.trimStart??0,end=pose.trimEnd??source.element.duration??Infinity;
    const kept=keptVideoSegments(pose,source.element.duration??source.duration??end);
    const moments=orderedMoments(track,start,end).filter(moment=>containsVideoTime(kept,moment.time)),camera=cameraAt(moments,time),mapping=mediaMapping(settings,source,canvas.width,canvas.height,index),point=mapping.to(camera);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    const {x:tx,y:ty}=anchoredZoom(point,camera.zoom,canvas.width,canvas.height);
    if(camera.zoom>1.0001){
      // Render from native media at the largest focus scale, not from an upscaled preview.
      const maximum=Math.max(1,...moments.filter(item=>item.focus).map(item=>Math.min(2.8,item.zoom||1))),density=Math.min(maximum,6144/Math.max(canvas.width,canvas.height),Math.sqrt((cacheScene?8_000_000:16_000_000)/(canvas.width*canvas.height)));
      showcaseCanvas??=document.createElement('canvas');resize(showcaseCanvas,Math.round(canvas.width*density),Math.round(canvas.height*density));showcaseRenderer??=createRenderer(showcaseCanvas,{cacheScene:false});
      showcaseRenderer({...settings,showcase:null,mark:null},media,photo,progress);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate(tx,ty);ctx.scale(camera.zoom,camera.zoom);ctx.drawImage(showcaseCanvas,0,0,canvas.width,canvas.height);ctx.restore();
    }else{paintScene(settings,media,photo,progress);designBlur(ctx,settings.blurEffects?.design,++blurRevision);}
    // Map the contact point through the camera while keeping the ring light at every zoom.
    const projectGesture=gesture=>{
      const position=mapping.to(gesture);
      return {x:tx+position.x*camera.zoom,y:ty+position.y*camera.zoom};
    };
    const unit=Math.min(canvas.width,canvas.height);
    for(const moment of moments)drawRecordedGesture(ctx,moment,time,projectGesture,unit);
    return true;
  }
  // The watermark is drawn last, above camera zoom, blur and touches, on previews and exports alike.
  const paint=(settings,...rest)=>{paintFrame(settings,...rest);drawMark(ctx,settings,canvas.width,canvas.height);};
  const paintFrame=(settings,media,photo,progress=0,interactive=false)=>{
    interactivePreview=cacheScene&&interactive;
    if(settings.timeline?.version===2&&!settings._timelineEvaluated){
      const time=settings._timelineTime??progress*timelineDuration(settings.timeline);
      settings=evaluateTimeline(settings,media,time).settings;
    }
    if(settings._timelineEvaluated){
      const sources=Array.isArray(media)?media:media?[media]:[];
      const legacy=[];
      if(!settings._showcaseEditing)for(const camera of settings._timelineLegacyCameras??[]){
        if(!(camera.zoom>1.0001))continue;
        const point=objectMapping(settings,sources,camera.objectId).to(camera),zoom=Math.max(1,Math.min(2.8,camera.zoom));
        legacy.push({...anchoredZoom(point,zoom,canvas.width,canvas.height),zoom});
      }
      // Camera transforms operate on native artwork, not on the preview bitmap.
      // Saving every scope also keeps one clip's zoom off unrelated overlays.
      ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();
      try{for(const camera of legacy){ctx.translate(camera.x,camera.y);ctx.scale(camera.zoom,camera.zoom);}paintScene(settings,media,photo,progress);}
      finally{ctx.restore();}
      designBlur(ctx,settings.blurEffects?.design,++blurRevision);
      const unit=Math.min(canvas.width,canvas.height);
      for(const {objectId,moment,time} of settings._timelineGestures??[]){
        const mapping=objectMapping(settings,sources,objectId),camera=objectCamera(settings,sources,objectId);
        drawRecordedGesture(ctx,moment,time,p=>{
          let point=mapping.to(p);
          if(camera)point={x:camera.x+point.x*camera.zoom,y:camera.y+point.y*camera.zoom};
          // Canvas transforms compose from the last saved local scope outward.
          for(let i=legacy.length-1;i>=0;i--){const camera=legacy[i];point={x:camera.x+point.x*camera.zoom,y:camera.y+point.y*camera.zoom};}
          return point;
        },unit);
      }
      return;
    }
    if(!showcase(settings,media,photo,progress)){paintScene(settings,media,photo,progress);designBlur(ctx,settings.blurEffects?.design,++blurRevision);}
  };
  paint.dispose=()=>{showcaseRenderer?.dispose();if(showcaseCanvas)showcaseCanvas.width=showcaseCanvas.height=1;adjustMedia.dispose();for(const id of projections.keys())dropProjection(id);for(const target of [texture,face,body,blur,statusSample,statusBlend,deviceCache,backdropCache,...[...mediaCache.values(),...[...statusCaches.values()].filter(entry=>entry.canvas)].map(entry=>entry.canvas)]){target.width=target.height=1;}mediaCache.clear();statusCaches.clear();castShadow.dispose();sourceBlur.dispose();backgroundBlur.dispose();designBlur.dispose();};
  return paint;
}

const badges = new Map();
export function loadWatermarkBadge(url) {
  if (!url) return Promise.resolve();
  if (badges.has(url)) return badges.get(url).ready;
  if (badges.size >= 32) badges.delete(badges.keys().next().value);
  const image = new Image();
  const ready = new Promise(resolve => {
    image.onload = resolve;
    image.onerror = resolve;
    image.src = url;
  });
  badges.set(url, { image, ready });
  return ready;
}

function drawWatermark(ctx, settings, width, height) {
  if(drawTextOverlay(ctx,settings,width,height)) return;
  const text = settings.watermarkText.trim();
  const badge = badges.get(settings.watermarkBadge)?.image;
  const hasBadge = settings.watermark === 'corner' && Boolean(badge?.naturalWidth);
  if ((!text && !hasBadge) || settings.watermark === 'none' || settings.watermarkStrength === 0) return;
  const unit = Math.min(width, height);
  const fontSize = unit * .033 * settings.watermarkSize / 100;
  ctx.save();
  ctx.font = `650 ${fontSize}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = settings.watermarkStrength / 100;
  ctx.fillStyle = settings.watermarkColor;
  if (settings.watermark === 'tiled') {
    const tile = Math.max(unit * .24, ctx.measureText(text).width + unit * .13);
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 5);
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#101019b3';
    ctx.lineWidth = Math.max(1, fontSize * .065);
    const span = Math.hypot(width, height) * .6;
    for (let row = -span; row <= span; row += unit * .18) {
      const shift = Math.floor((row + span) / (unit * .18)) % 2 ? tile / 2 : 0;
      for (let at = -span + shift; at <= span; at += tile) {
        ctx.strokeText(text, at, row);
        ctx.fillText(text, at, row);
      }
    }
  } else {
    const limit = width * .74;
    const inset = unit * .032;
    const h = fontSize * 1.68;
    const badgeSize = hasBadge ? h * .79 : 0;
    const badgeSpace = hasBadge ? badgeSize + fontSize * .35 : 0;
    const w = Math.min(limit, ctx.measureText(text).width) + fontSize * (text ? 1.3 : .52) + badgeSpace;
    const x = settings.watermarkCorner.endsWith('right') ? width - inset - w : inset;
    const y = settings.watermarkCorner.startsWith('bottom') ? height - inset - h : inset;
    fillRound(ctx, x, y, w, h, h / 2, '#11131cd6');
    if (hasBadge) {
      const left = x + (text ? fontSize * .28 : (w - badgeSize) / 2);
      const top = y + (h - badgeSize) / 2;
      ctx.save();
      rounded(ctx, left, top, badgeSize, badgeSize, badgeSize / 2);
      ctx.clip();
      ctx.drawImage(badge, left, top, badgeSize, badgeSize);
      ctx.restore();
    }
    ctx.fillStyle = settings.watermarkColor;
    if (text) ctx.fillText(text, x + fontSize * .65 + badgeSpace, y + h / 2, limit);
  }
  ctx.restore();
}
