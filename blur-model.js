// All masks live in source coordinates, independent of preview/export resolution.
export const unit = value => Math.max(0, Math.min(1, Number(value) || 0));
export function blurEffect(settings, target) {
  return { whole:0, strength:65, mode:'whole', regions:[], ...settings.blurEffects?.[target] };
}
export function patchBlur(settings, target, changes) {
  return {blurEffects:{...settings.blurEffects,[target]:{...blurEffect(settings,target),...changes}}};
}
export function blurTargets(settings, source) {
  if(settings.pageObjects)return [...settings.pageObjects.map((item,index)=>({id:item.id,label:(item.pose.device==='flat'?'Photo ':'Phone ')+(index+1),icon:item.pose.device==='flat'?'image':'phone'})),{id:'background',label:'Canvas background',icon:'layers'},{id:'design',label:'Entire design',icon:'design'}];
  const sources=Array.isArray(source)?source:[source];
  const media=sources.length>1?sources.map((_,i)=>({id:'media:'+i,label:'Screen '+(i+1),icon:'phone'})):
    (Array.isArray(settings.layers)?settings.layers.filter(l=>l.type==='image'||(l.type==='device'&&!settings.hideDevice)):[{id:'device'}]).map((l,i)=>({id:l.id,label:settings.device==='flat'?'Photo '+(i+1):'Phone screen',icon:settings.device==='flat'?'image':'phone'}));
  return [...media,{id:'background',label:'Canvas background',icon:'layers'},{id:'design',label:'Entire design',icon:'design'}];
}

// Three separable box passes approximate a Gaussian. Uses premultiplied alpha,
// preserving transparent uploads in Safari, which may lack Canvas2D filters.
function gaussian(data,width,height,radius,a,b) {
  const size=width*height*4;
  for(let i=0;i<size;i+=4){const alpha=data[i+3]/255;a[i]=data[i]*alpha;a[i+1]=data[i+1]*alpha;a[i+2]=data[i+2]*alpha;a[i+3]=data[i+3];}
  const r=Math.max(0,Math.floor(radius)),fraction=radius-r,count=r*2+1+fraction*2;
  function pass(input,output,horizontal) {
    const lines=horizontal?height:width,length=horizontal?width:height,stride=horizontal?4:width*4;
    for(let line=0;line<lines;line++){
      const start=horizontal?line*width*4:line*4;
      for(let c=0;c<4;c++){
        let sum=0;for(let k=-r;k<=r;k++)sum+=input[start+Math.max(0,Math.min(length-1,k))*stride+c];
        for(let p=0;p<length;p++){
          const edges=input[start+Math.max(0,p-r-1)*stride+c]+input[start+Math.min(length-1,p+r+1)*stride+c];
          output[start+p*stride+c]=(sum+fraction*edges)/count;
          sum+=input[start+Math.min(length-1,p+r+1)*stride+c]-input[start+Math.max(0,p-r)*stride+c];
        }
      }
    }
  }
  for(let n=0;n<3;n++){pass(a,b,true);pass(b,a,false);}
  for(let i=0;i<size;i+=4){const alpha=a[i+3]/255;data[i]=alpha?a[i]/alpha:0;data[i+1]=alpha?a[i+1]/alpha:0;data[i+2]=alpha?a[i+2]/alpha:0;data[i+3]=a[i+3];}
}
function canvas(width,height){const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
function resize(target,width,height){if(target.width!==width||target.height!==height){target.width=width;target.height=height;}}
export function createBlurProcessor({maxSize=900}={}) {
  const scratch=canvas(1,1),mask=canvas(1,1),overlay=canvas(1,1);
  let cachedSource=null,cachedAmount=-1,cachedWidth=0,cachedHeight=0,cachedVersion;
  let bufferA,bufferB;
  function blurred(source,amount,version) {
    const width=source.width,height=source.height;
    if(cachedSource===source&&cachedAmount===amount&&cachedWidth===width&&cachedHeight===height&&cachedVersion===version)return scratch;
    // Only the blurred copy is sampled down. The untouched source stays crisp.
    const scale=Math.min(1,maxSize/Math.max(width,height));
    resize(scratch,Math.max(1,Math.round(width*scale)),Math.max(1,Math.round(height*scale)));
    const ctx=scratch.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,scratch.width,scratch.height);ctx.drawImage(source,0,0,scratch.width,scratch.height);
    const pixels=ctx.getImageData(0,0,scratch.width,scratch.height);
    if(bufferA?.length!==pixels.data.length){bufferA=new Float32Array(pixels.data.length);bufferB=new Float32Array(pixels.data.length);}
    gaussian(pixels.data,scratch.width,scratch.height,Math.min(scratch.width,scratch.height)*amount/100*.045,bufferA,bufferB);
    ctx.putImageData(pixels,0,0);cachedSource=source;cachedAmount=amount;cachedWidth=width;cachedHeight=height;cachedVersion=version;return scratch;
  }
  function apply(ctx,effect,version) {
    if(!effect)return;
    const whole=effect.mode==='area'?0:effect.whole;
    const regions=effect.mode==='area'?effect.regions??[]:[];
    if(!whole&&(!effect.strength||!regions.length))return;
    const {width,height}=ctx.canvas;
    if(whole){const image=blurred(ctx.canvas,whole,'whole:'+version);ctx.clearRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);}
    if(!effect.strength||!regions.length)return;
    const image=blurred(ctx.canvas,effect.strength,'area:'+version);
    resize(mask,width,height);resize(overlay,width,height);
    const m=mask.getContext('2d');m.clearRect(0,0,width,height);m.fillStyle='#fff';m.strokeStyle='#fff';m.lineCap=m.lineJoin='round';
    for(const region of regions){
      m.globalCompositeOperation=region.erase?'destination-out':'source-over';
      if(region.type==='box')m.fillRect(region.x*width,region.y*height,region.w*width,region.h*height);
      else if(region.points?.length){m.lineWidth=region.size*Math.min(width,height);m.beginPath();region.points.forEach((p,i)=>i?m.lineTo(p.x*width,p.y*height):m.moveTo(p.x*width,p.y*height));if(region.points.length===1)m.lineTo(region.points[0].x*width+.01,region.points[0].y*height);m.stroke();}
    }
    const o=overlay.getContext('2d');o.clearRect(0,0,width,height);o.drawImage(image,0,0,width,height);o.globalCompositeOperation='destination-in';o.drawImage(mask,0,0);o.globalCompositeOperation='source-over';
    // Replace masked pixels rather than adding a second semi-transparent image.
    ctx.save();ctx.globalCompositeOperation='destination-out';ctx.drawImage(mask,0,0);ctx.globalCompositeOperation='source-over';ctx.drawImage(overlay,0,0);ctx.restore();
  }
  apply.dispose=()=>{scratch.width=scratch.height=mask.width=mask.height=overlay.width=overlay.height=1;cachedSource=null;bufferA=bufferB=null;};
  return apply;
}
