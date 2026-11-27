// First-draft touches from a screen recording. A small, local change after a quiet moment
// is a tap (a button lighting up); sustained vertical motion is a swipe (a scroll).
import {loadMedia,mediaInfo,releaseMedia} from './media.js';

const FPS=10,WIDTH=72,THRESHOLD=22,ACTIVE=.003,LOCAL=.2,QUIET_GAP=.35;

function seek(video,time,signal){
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>done(new Error('Frame seek timed out')),4000);
    const ok=()=>done(),fail=()=>done(new DOMException('Canceled','AbortError'));
    function done(error){clearTimeout(timer);video.removeEventListener('seeked',ok);signal?.removeEventListener('abort',fail);error?reject(error):resolve();}
    video.addEventListener('seeked',ok,{once:true});signal?.addEventListener('abort',fail,{once:true});video.currentTime=time;
  });
}

function luminance(ctx,w,h){
  const data=ctx.getImageData(0,0,w,h).data,out=new Uint8Array(w*h);
  for(let i=0,j=0;i<out.length;i++,j+=4)out[i]=(data[j]*54+data[j+1]*183+data[j+2]*19)>>8;
  return out;
}

// Vertical content shift between two frames (negative: content moved up).
function verticalShift(a,b,w,h){
  let best=0,bestScore=Infinity;
  const x0=Math.floor(w*.2),x1=Math.ceil(w*.8),y0=Math.floor(h*.15),y1=Math.ceil(h*.85);
  for(let dy=-10;dy<=10;dy++){
    let score=0,count=0;
    for(let y=y0;y<y1;y+=2){const yy=y+dy;if(yy<0||yy>=h)continue;for(let x=x0;x<x1;x+=2){score+=Math.abs(a[y*w+x]-b[yy*w+x]);count++;}}
    score/=Math.max(1,count);if(score<bestScore-.01){bestScore=score;best=dy;}
  }
  return best;
}

export async function detectTouches(source,{start=0,end,signal,progress}={}){
  const media=await loadMedia(mediaInfo(source));
  try{
    const video=media.element,duration=Math.min(end??video.duration,video.duration);
    const w=WIDTH,h=Math.max(16,Math.round(WIDTH*media.height/Math.max(1,media.width)));
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const frames=[];
    const steps=Math.max(2,Math.floor((duration-start)*FPS));
    for(let i=0;i<=steps;i++){
      if(signal?.aborted)throw new DOMException('Canceled','AbortError');
      const time=Math.min(duration-.02,start+i/FPS);
      await seek(video,time,signal);ctx.drawImage(video,0,0,w,h);
      frames.push({time,lum:luminance(ctx,w,h)});progress?.(i/steps);
    }
    // Change map between neighbouring frames.
    const changes=frames.map((frame,i)=>{
      if(!i)return {time:frame.time,fraction:0,x:.5,y:.5};
      const a=frames[i-1].lum,b=frame.lum;let n=0,sx=0,sy=0;
      for(let p=0;p<b.length;p++)if(Math.abs(a[p]-b[p])>THRESHOLD){n++;sx+=p%w;sy+=Math.floor(p/w);}
      return {time:frame.time,fraction:n/b.length,x:n?sx/n/w:.5,y:n?sy/n/h:.5};
    });
    // Group active frames into segments (one quiet frame may sit inside a segment).
    const segments=[];let current=null,quiet=0;
    changes.forEach((change,i)=>{
      if(change.fraction>ACTIVE){if(!current){current={first:i,last:i};segments.push(current);}else current.last=i;quiet=0;}
      else if(current&&++quiet>1)current=null;
    });
    const touches=[];
    for(const segment of segments){
      const first=changes[segment.first],span=changes[segment.last].time-first.time+1/FPS;
      let up=0,down=0;
      for(let i=Math.max(1,segment.first);i<=segment.last;i++){const dy=verticalShift(frames[i-1].lum,frames[i].lum,w,h);if(dy<=-2)up++;else if(dy>=2)down++;}
      const moving=Math.max(up,down),frameCount=segment.last-segment.first+1;
      if(span>=.4&&moving>=Math.max(2,frameCount*.5)){
        // A scroll: the finger travels against the content's direction of motion.
        const upward=up>=down;
        touches.push({kind:'swipe',time:Math.max(start,first.time-.15),x:.5,y:upward?.7:.3,endX:.5,endY:upward?.3:.7,duration:Math.min(.8,Math.max(.3,span*.6))});
      }else if(first.fraction<LOCAL){
        touches.push({kind:'tap',time:Math.max(start,first.time-.1),x:first.x,y:first.y});
      }
    }
    // A small change at the same spot soon after a tap is the highlight ending (the finger lifting).
    const kept=[];
    for(const touch of touches){
      const last=kept.at(-1);
      if(last&&touch.time-last.time<QUIET_GAP)continue;
      if(last&&touch.kind==='tap'&&last.kind==='tap'&&touch.time-last.time<.7&&Math.hypot(touch.x-last.x,touch.y-last.y)<.12)continue;
      kept.push(touch);
    }
    return kept;
  }finally{releaseMedia(media);}
}

// Gentle zooms: taps close together share one push-in centred on them.
export function zoomClusters(taps,{gap=2.5,lead=.45,tail=1,zoom=1.3}={}){
  const clusters=[];
  for(const tap of taps){const last=clusters.at(-1);if(last&&tap.time-last.end<=gap){last.end=tap.time;last.points.push(tap);}else clusters.push({start:tap.time,end:tap.time,points:[tap]});}
  return clusters.map(cluster=>{
    const x=cluster.points.reduce((sum,p)=>sum+p.x,0)/cluster.points.length,y=cluster.points.reduce((sum,p)=>sum+p.y,0)/cluster.points.length;
    return {start:cluster.start-lead,end:cluster.end+tail,x,y,zoom};
  });
}
