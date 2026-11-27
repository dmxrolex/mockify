// Source-normalized points survive canvas size, phone pose and export resolution changes.
export const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
export function sourceSignature(source){return [source?.name,source?.blob?.size,source?.width,source?.height].join(':');}
export function momentAt(time,point={x:.5,y:.5},extra={}){return {id:globalThis.crypto.randomUUID(),time:Math.max(0,time),x:clamp(point.x,0,1),y:clamp(point.y,0,1),zoom:1.65,hold:1.2,focus:true,tap:false,...extra};}
export function orderedMoments(track,start=0,end=Infinity){return (track?.moments??[]).filter(m=>Number.isFinite(m.time)&&m.time>=start&&m.time<=end).toSorted((a,b)=>a.time-b.time);}
const smooth=value=>{const t=clamp(value,0,1);return t*t*t*(t*(t*6-15)+10);};
// Blend overlapping focus windows rather than bouncing out between nearby actions.
export function cameraAt(moments,time){
  let weight=0,x=0,y=0,zoom=0;
  for(const moment of moments){if(!moment.focus)continue;const incoming=smooth((time-moment.time+.65)/.65),outgoing=1-smooth((time-moment.time-clamp(moment.hold,.3,4))/.7),w=incoming*outgoing;
    if(w<=0)continue;weight+=w;x+=moment.x*w;y+=moment.y*w;zoom+=(clamp(moment.zoom,1,2.8)-1)*w;}
  if(!weight)return {x:.5,y:.5,zoom:1};
  return {x:x/weight,y:y/weight,zoom:1+zoom/weight*Math.min(1,weight)};
}
// Scaling about this point keeps it stationary instead of panning it to centre.
export function anchoredZoom(point,zoom,width,height){return {x:clamp(point.x,0,width)*(1-zoom),y:clamp(point.y,0,height)*(1-zoom)};}

// Legacy tap-only drafts remain playable. Gesture timing is independent of camera hold.
export function gestureKind(moment){return moment?.gesture??(moment?.tap?'tap':'none');}
export function gestureAt(moment,time){
 const kind=gestureKind(moment),duration=kind==='tap'?.65:clamp(moment.duration??1,.3,4),age=time-moment.time;
 if(kind==='none'||age<0||age>duration)return null;
 const phase=clamp(age/duration,0,1),travel=smooth(phase),fade=Math.min(1,age/.08,(duration-age)/.15);
 return {kind,phase,alpha:clamp(fade,0,1),x:kind==='swipe'?moment.x+((moment.endX??moment.x)-moment.x)*travel:moment.x,y:kind==='swipe'?moment.y+((moment.endY??Math.max(0,moment.y-.25))-moment.y)*travel:moment.y};
}
