export const adjustmentKeys=['brightness','contrast','saturation','warmth'];
export const adjustmentKey=settings=>adjustmentKeys.map(key=>Math.max(-100,Math.min(100,Number(settings[key])||0))).join(',');

// Cached source pixels and lookup tables work identically in Canvas on WebKit
// and Chromium; no reliance on the unsupported iOS Canvas filter property.
export function createAdjuster(){
  const entries=new Map();
  const disposeEntry=entry=>{entry.canvas.width=entry.canvas.height=1;};
  function adjust(media,settings,target,limit=Infinity){
    const values=adjustmentKeys.map(key=>Math.max(-100,Math.min(100,Number(settings[key])||0)));
    if(!values.some(Boolean)||!media?.element||media.blank)return media;
    const scale=Math.min(1,limit/Math.max(media.width,media.height));
    const width=Math.max(1,Math.round(media.width*scale)),height=Math.max(1,Math.round(media.height*scale));
    const time=media.kind==='video'?media.element.currentTime:0,key=values.join(',');
    let entry=entries.get(target);
    if(!entry||entry.source!==media||entry.time!==time||entry.canvas.width!==width||entry.canvas.height!==height){
      if(entry)disposeEntry(entry);
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(media.element,0,0,width,height);
      entry={source:media,time,canvas,ctx,pixels:ctx.getImageData(0,0,width,height),key:null};
      entry.output={...media,element:canvas,width,height};entries.delete(target);entries.set(target,entry);
      let pixels=0;for(const item of entries.values())pixels+=item.canvas.width*item.canvas.height;
      while(entries.size>4||(pixels>8000000&&entries.size>1)){const oldest=entries.keys().next().value,old=entries.get(oldest);pixels-=old.canvas.width*old.canvas.height;disposeEntry(old);entries.delete(oldest);}
    }
    if(entry.key!==key){
      const [brightness,contrast,saturation,warmth]=values,b=brightness*1.275,c=2**(contrast/60),s=1+saturation/100,w=warmth*.35;
      const lookup=[0,1,2].map((_,channel)=>Float32Array.from({length:256},(_,value)=>(value-127.5)*c+127.5+b+(channel===0?w:channel===2?-w:0)));
      const image=entry.ctx.createImageData(width,height),data=image.data,source=entry.pixels.data;
      for(let i=0;i<data.length;i+=4){const r=lookup[0][source[i]],g=lookup[1][source[i+1]],b=lookup[2][source[i+2]],l=.2126*r+.7152*g+.0722*b;data[i]=l+(r-l)*s;data[i+1]=l+(g-l)*s;data[i+2]=l+(b-l)*s;data[i+3]=source[i+3];}
      entry.ctx.putImageData(image,0,0);entry.key=key;
    }
    return entry.output;
  }
  adjust.dispose=()=>{for(const entry of entries.values())disposeEntry(entry);entries.clear();};
  return adjust;
}
