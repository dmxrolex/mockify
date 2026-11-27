import {clamp,gestureKind} from './showcase-model.js';

// Telegram promo-video touch: a frosted-glass ring sized to the phone screen.
// It anticipates the touch, presses in exactly at touch-down, stays while held,
// travels along a swipe, then opens up and fades after release.
const FRAME=1000/60;
// Measured on Telegram's own feature videos: the band is a Gaussian blur of the content beneath
// it (sigma ~4.5% of the screen) with hard, anti-aliased edges. Telegram tints it with the chat's
// theme colour: light blue on the default theme, so "blue" reproduces that exactly
// (38% of rgb(146,181,237), white turns rgb(208,221,244)). "clear" keeps the glass colourless.
const RADIUS=.1907,THICKNESS=.1062,SIGMA=.0025,BLUR=.045; // fractions of the screen's shorter side
const GROW=13*FRAME,FADE_IN=7*FRAME,PRESS_AT=12.3*FRAME,PRESS=10*FRAME;
const LEAD=PRESS_AT+PRESS;                             // ~372 ms from first frame to touch-down
const TAP_HOLD=1.5*FRAME,RELEASE=16*FRAME,FADE_DELAY=5*FRAME;
export const ringStyles=['clear','blue'];

function bezier(x1,y1,x2,y2,t){
  if(t<=0)return 0;if(t>=1)return 1;
  const x=s=>3*(1-s)*(1-s)*s*x1+3*(1-s)*s*s*x2+s*s*s,y=s=>3*(1-s)*(1-s)*s*y1+3*(1-s)*s*s*y2+s*s*s;
  let lo=0,hi=1;for(let i=0;i<30;i++){const mid=(lo+hi)/2;if(x(mid)<t)lo=mid;else hi=mid;}
  return y((lo+hi)/2);
}
const unit=value=>value<0?0:value>1?1:value;
const easeInOut=t=>t<.5?2*t*t:1-2*(1-t)*(1-t);

// Ring size and opacity, `elapsed` in ms from the first visible frame.
export function ringShape(elapsed,hold=TAP_HOLD){
  if(!(elapsed>=0)||elapsed>=LEAD+hold+RELEASE)return null;
  const grow=1-(1-unit(elapsed/GROW))**4;
  let radius=RADIUS*(.5+.5*grow),thickness=THICKNESS*grow;
  const press=unit((elapsed-PRESS_AT)/PRESS),squeeze=1-.5*(.5-.5*Math.cos(Math.PI*press));
  radius*=squeeze;thickness*=squeeze;
  let opacity=1-(1-unit(elapsed/FADE_IN))**3;
  const up=LEAD+hold;
  if(elapsed>up){
    const t=unit((elapsed-up)/RELEASE);
    radius*=1+.9*bezier(.2,0,.75,.6,t);
    thickness*=1-.7*bezier(.85,0,.85,1,t);
    opacity*=1-unit((elapsed-up-FADE_DELAY)/(RELEASE-FADE_DELAY));
  }
  return opacity<=0?null:{outer:radius+thickness/2,inner:Math.max(0,radius-thickness/2),opacity};
}

export function touchState(moment,time){
  const kind=gestureKind(moment);
  if(kind==='none')return null;
  const holdMs=kind==='tap'?TAP_HOLD:clamp(moment.duration??1,.3,4)*1000;
  const sinceTouch=(time-moment.time)*1000,shape=ringShape(sinceTouch+LEAD,holdMs);
  if(!shape)return null;
  let x=moment.x,y=moment.y;
  if(kind==='swipe'){
    const travel=easeInOut(unit(sinceTouch/holdMs));
    x=moment.x+((moment.endX??moment.x)-moment.x)*travel;
    y=moment.y+((moment.endY??Math.max(0,moment.y-.25))-moment.y)*travel;
  }
  return {kind,x,y,...shape};
}

// Gaussian-blurred annulus drawn as a radial gradient: works in every WebView,
// including those without CanvasRenderingContext2D.filter.
function erf(x){const s=Math.sign(x),a=Math.abs(x),t=1/(1+.3275911*a);return s*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-a*a));}
function ringGradient(ctx,cx,cy,inner,outer,sigma,colour,alpha){
  const reach=outer+3*sigma,gradient=ctx.createRadialGradient(cx,cy,0,cx,cy,reach),steps=48,k=Math.SQRT2*Math.max(.5,sigma);
  for(let i=0;i<=steps;i++){
    const r=reach*i/steps,a=.5*(erf((outer-r)/k)-erf((inner-r)/k));
    gradient.addColorStop(i/steps,`rgba(${colour[0]},${colour[1]},${colour[2]},${(alpha*Math.max(0,a)).toFixed(4)})`);
  }
  return {gradient,reach};
}
function softRing(ctx,cx,cy,inner,outer,sigma,colour,alpha){
  if(outer<=0||alpha<=0)return;
  const {gradient,reach}=ringGradient(ctx,cx,cy,inner,outer,sigma,colour,alpha);
  ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(cx,cy,reach,0,Math.PI*2);ctx.fill();
}
// Frosted band: a three-pass box blur (a close Gaussian) of a reduced copy of the pixels under
// the ring, upscaled smoothly and cut by the ring's own mask. No canvas filters, so every
// WebView and every export renders it identically.
let band=null,small=null;
function boxBlur(image,width,height,radius){
  const data=image.data,temp=new Float32Array(data.length),r=Math.max(1,Math.round(radius)),scale=1/(r*2+1);
  for(let pass=0;pass<3;pass++){
    for(let y=0;y<height;y++){const row=y*width*4;for(let c=0;c<4;c++){let sum=0;for(let k=-r;k<=r;k++)sum+=data[row+Math.min(width-1,Math.max(0,k))*4+c];for(let x=0;x<width;x++){temp[row+x*4+c]=sum*scale;sum+=data[row+Math.min(width-1,x+r+1)*4+c]-data[row+Math.max(0,x-r)*4+c];}}}
    for(let x=0;x<width;x++){for(let c=0;c<4;c++){let sum=0;for(let k=-r;k<=r;k++)sum+=temp[Math.min(height-1,Math.max(0,k))*width*4+x*4+c];for(let y=0;y<height;y++){data[y*width*4+x*4+c]=sum*scale;sum+=temp[Math.min(height-1,y+r+1)*width*4+x*4+c]-temp[Math.max(0,y-r)*width*4+x*4+c];}}}
  }
}
function frostRing(ctx,cx,cy,inner,outer,blur,opacity,tint){
  if(outer<2||opacity<=0)return;
  const canvas=ctx.canvas,region=Math.ceil(outer+blur*2+2),size=region*2,x0=Math.round(cx-region),y0=Math.round(cy-region);
  const sx=Math.max(0,x0),sy=Math.max(0,y0),sw=Math.min(canvas.width,x0+size)-sx,sh=Math.min(canvas.height,y0+size)-sy;
  if(sw<=0||sh<=0)return;
  band??=document.createElement('canvas');small??=document.createElement('canvas');
  if(band.width!==size){band.width=band.height=size;}
  const factor=Math.max(1,blur/5),w=Math.max(4,Math.round(size/factor));
  if(small.width!==w){small.width=small.height=w;}
  const b=band.getContext('2d'),t=small.getContext('2d',{willReadFrequently:true});
  b.globalCompositeOperation='copy';b.imageSmoothingEnabled=true;b.imageSmoothingQuality='high';
  b.drawImage(canvas,sx,sy,sw,sh,sx-x0,sy-y0,sw,sh);
  t.globalCompositeOperation='copy';t.imageSmoothingEnabled=true;t.imageSmoothingQuality='high';t.drawImage(band,0,0,w,w);
  const pixels=t.getImageData(0,0,w,w);boxBlur(pixels,w,w,Math.max(1,blur/factor-.5));t.putImageData(pixels,0,0);
  b.drawImage(small,0,0,size,size);
  b.globalCompositeOperation='source-over';b.globalAlpha=tint.mix;b.fillStyle=`rgb(${tint.colour})`;b.fillRect(0,0,size,size);b.globalAlpha=1;
  // Telegram's ring has hard edges: cut the band with an anti-aliased annulus path.
  b.globalCompositeOperation='destination-in';b.fillStyle='#fff';b.beginPath();b.arc(region,region,outer,0,Math.PI*2);
  if(inner>.5)b.arc(region,region,inner,0,Math.PI*2,true);
  b.fill();b.globalCompositeOperation='source-over';
  ctx.globalAlpha=opacity;ctx.drawImage(band,x0,y0);ctx.globalAlpha=1;
}

// Sample the screen's brightness once per touch, so colourless glass stays visible on white.
const tone=new Map();
function brightness(ctx,moment,point,radius){
  const key=moment.id+':'+moment.x.toFixed(3)+':'+moment.y.toFixed(3);
  if(tone.has(key))return tone.get(key);
  let light=moment.dark===true?40:180;
  try{
    const size=Math.max(4,Math.round(radius)),x=Math.round(point.x-size/2),y=Math.round(point.y-size/2);
    const data=ctx.getImageData(Math.max(0,x),Math.max(0,y),size,size).data;let sum=0,count=0;
    for(let i=0;i<data.length;i+=16){sum+=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];count++;}
    if(count)light=sum/count;
  }catch{}
  if(tone.size>500)tone.clear();
  tone.set(key,light);return light;
}

// Blue is Telegram's default-theme tint. Clear glass only lifts the blur: a light frost over
// coloured screens and a faint grey over near-white ones, where pure glass would be invisible.
function ringTint(style,light){
  if(style==='blue')return {colour:[146,181,237],mix:.38};
  return light>222?{colour:[178,182,190],mix:.28}:{colour:[240,242,246],mix:.06};
}

export function drawRecordedGesture(ctx,moment,time,project,fallbackUnit){
  const state=touchState(moment,time);
  if(!state)return;
  const point=project(state);
  // Measure the projected phone screen so the ring follows device size and camera zoom.
  const left=project({x:0,y:state.y}),right=project({x:1,y:state.y});
  const top=project({x:state.x,y:0}),bottom=project({x:state.x,y:1});
  const screen=Math.min(Math.hypot(right.x-left.x,right.y-left.y),Math.hypot(bottom.x-top.x,bottom.y-top.y))||fallbackUnit*.45;
  ctx.save();ctx.setTransform(1,0,0,1,0,0);
  try{frostRing(ctx,point.x,point.y,state.inner*screen,state.outer*screen,BLUR*screen,state.opacity,ringTint(moment.ring,brightness(ctx,moment,point,screen*RADIUS)));}
  catch{softRing(ctx,point.x,point.y,state.inner*screen,state.outer*screen,SIGMA*screen,[208,221,244],.6*state.opacity);}
  ctx.restore();
}
