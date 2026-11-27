import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {t} from './i18n.js';
import {loadMedia,mediaInfo,releaseMedia} from './media.js';
import {VideoIcon} from './video-icons.jsx';
import {clamp} from './showcase-model.js';
import {effectDuration,effectTiming} from './timeline-model.js';
import './video-timeline.css';
export const videoTime=value=>{const time=Math.max(0,Number(value)||0);return Math.floor(time/60)+':'+String(Math.floor(time%60)).padStart(2,'0')+'.'+Math.floor(time%1*10);};
// Ruler and total length drop the tenths when they would only add noise.
const shortTime=value=>{const time=Math.max(0,Number(value)||0),whole=Math.abs(time-Math.round(time))<.05;return whole?Math.floor(Math.round(time)/60)+':'+String(Math.round(time)%60).padStart(2,'0'):videoTime(time);};
export function videoTicks(start,end){const duration=Math.max(0,end-start),step=[.1,.2,.5,1,2,5,10,15,30,60].find(value=>value>=duration/5)??Math.max(60,Math.ceil(duration/300)*60),ticks=[];for(let time=start;time<end;time+=step)ticks.push(time);if(ticks.length&&end-ticks.at(-1)<step*.6)ticks[ticks.length-1]=end;else ticks.push(end);return ticks;}
const thumbnails=new WeakMap();
async function makeThumbnails(source,signal,onFrame){
  let media;try{media=await loadMedia(mediaInfo(source));if(signal.aborted)return [];const video=media.element,canvas=document.createElement('canvas');canvas.width=80;canvas.height=60;const ctx=canvas.getContext('2d'),frames=[];
    for(let i=0;i<12;i++){if(signal.aborted)return [];const time=Math.min(video.duration-.01,(i+.5)/12*video.duration);await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>finish(new Error('Thumbnail seek timed out.')),5000),done=()=>finish(),fail=()=>finish(new DOMException('Canceled','AbortError'));function finish(error){clearTimeout(timeout);video.removeEventListener('seeked',done);video.removeEventListener('error',fail);signal.removeEventListener('abort',fail);error?reject(error):resolve();}video.addEventListener('seeked',done,{once:true});video.addEventListener('error',fail,{once:true});signal.addEventListener('abort',fail,{once:true});video.currentTime=time;});const scale=Math.max(80/media.width,60/media.height);ctx.drawImage(video,(80-media.width*scale)/2,(60-media.height*scale)/2,media.width*scale,media.height*scale);frames.push(canvas.toDataURL('image/jpeg',.65));onFrame([...frames]);}
    thumbnails.set(source,frames);return frames;
  }finally{releaseMedia(media);}
}

function TimelineAction({icon,label,onClick,disabled=false,pressed,destructive=false,className=''}){
  return <button type="button" className={'sequence-action '+className+(destructive?' destructive':'')} aria-label={t(label)} title={t(label)} aria-expanded={pressed} disabled={disabled} onClick={onClick}><VideoIcon name={icon}/></button>;
}
function ThumbStrip({source,inPoint=0,outPoint=1,pixels=100}){
  const [frames,setFrames]=useState(()=>source?thumbnails.get(source)??[]:[]);
  useEffect(()=>{if(!source||source.kind!=='video'){setFrames([]);return;}const task=new AbortController();setFrames(thumbnails.get(source)??[]);if(!thumbnails.has(source))makeThumbnails(source,task.signal,value=>{if(!task.signal.aborted)setFrames(value);}).then(value=>{if(!task.signal.aborted)setFrames(value);}).catch(()=>{});return()=>task.abort();},[source]);
  const count=Math.min(40,Math.max(1,Math.ceil(pixels/34))),duration=source?.element?.duration??source?.duration??outPoint;
  return <span className="sequence-thumbnails" aria-hidden="true">{Array.from({length:count},(_,i)=>{const time=inPoint+(i+.5)/count*(outPoint-inPoint),url=source?.kind==='image'?source.url:frames[Math.min(11,Math.max(0,Math.floor(time/Math.max(.001,duration)*12)))];return <span key={i}>{url&&<img src={url} alt="" draggable={false}/>}</span>;})}</span>;
}
const minimum=.1;
const kindTitle={clip:'Clip',overlay:'Overlay',tap:'Tap',hold:'Hold',swipe:'Swipe',camera:'Zoom'};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export default function VideoTimeline({timeline={main:[],overlays:[],gestures:[],cameras:[]},objects=[],sources=[],current=0,duration=0,playing=false,selection,editingEffects=false,onPlay,onSeek,onSelect,onPatch,onSplit,onDelete,onAdd,onReorder}){
  const fitted=useRef(false),root=useRef(null),scroll=useRef(null),gesture=useRef(null),points=useRef(new Map()),hold=useRef(null),lastSeek=useRef(0),currentRef=useRef(current),ignoreScroll=useRef(null),dragMoved=useRef(false);
  currentRef.current=current;
  const [scale,setScale]=useState(36),[viewport,setViewport]=useState(300),[menu,setMenu]=useState(null),[draft,setDraft]=useState(null),[cluster,setCluster]=useState(null),[announcement,setAnnouncement]=useState('');
  const full=Math.max(minimum,Number(duration)||0),value=clamp(current,0,full),pad=viewport/2;
  const main=timeline.main??[],overlays=timeline.overlays??[],gestures=timeline.gestures??[],cameras=timeline.cameras??[];
  const selected=(type,id)=>selection?.type===type&&selection?.id===id;
  const preview=item=>draft?.id===item.id?{...item,...draft.patch}:item;
  const placements=[];let cursor=0;
  for(const clip of main){const item=preview(clip);placements.push({...item,start:cursor,end:cursor+Math.max(minimum,item.out-item.in),type:'clip'});cursor+=Math.max(minimum,item.out-item.in);}
  const owners=new Map([...placements,...overlays.map(item=>({...preview(item),type:'overlay'}))].map(item=>[item.id,item]));
  const objectMap=new Map(objects.map(object=>[object.id,object]));
  const sourceFor=item=>{const object=objectMap.get(item.objectId);return object?sources[object.index]:null;};
  const sourceDuration=item=>{const source=sourceFor(item);return source?.kind==='video'?Math.max(item.out,source.element?.duration??source.duration??item.out):Math.max(item.out,full);};
  const selectionItem=selection?.type==='clip'?main.find(item=>item.id===selection.id):selection?.type==='overlay'?overlays.find(item=>item.id===selection.id):selection?.type==='gesture'?gestures.find(item=>item.id===selection.id):cameras.find(item=>item.id===selection?.id);
  const selectedIndex=main.findIndex(item=>selection?.type==='clip'&&item.id===selection.id);
  const underPlayhead=placements.find(item=>value>=item.start&&value<item.end)??placements.at(-1);
  const splitOwner=selection?.type==='overlay'?owners.get(selection.id):underPlayhead;
  // The button above the playhead adds a touch here, or removes the one already here.
  const touchHere=gestures.find(item=>{const owner=owners.get(item.clipId);if(!owner)return false;const from=owner.start+item.time-owner.in;return value>=from-.05&&value<from+Math.max(.2,effectDuration(item,'gesture'));});
  const canSplit=!!splitOwner&&value-splitOwner.start>=minimum&&(splitOwner.start+splitOwner.out-splitOwner.in)-value>=minimum;
  useLayoutEffect(()=>{const node=scroll.current;if(!node)return;const measure=()=>{setViewport(node.clientWidth);if(!fitted.current&&node.clientWidth>0&&duration>0){fitted.current=true;setScale(clamp(Math.max(36,(node.clientWidth-68)/duration),12,240));}};const observer=new ResizeObserver(measure);observer.observe(node);measure();return()=>observer.disconnect();},[]);
  useLayoutEffect(()=>{const node=scroll.current;if(!node||gesture.current||points.current.size)return;const target=value*scale;if(Math.abs(node.scrollLeft-target)>.7){ignoreScroll.current=target;node.scrollLeft=target;}},[value,scale,viewport]);
  useEffect(()=>{if(!menu&&!cluster)return;const close=event=>{if(!event.target.closest('.sequence-menu,.sequence-cluster-menu,.sequence-menu-anchor')){setMenu(null);setCluster(null);}};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[menu,cluster]);
  useEffect(()=>()=>{clearTimeout(hold.current);cancelAnimationFrame(lastSeek.current);},[]);
  useEffect(()=>{if(menu||cluster)root.current?.querySelector('.sequence-menu button:not(:disabled),.sequence-cluster-menu button')?.focus({preventScroll:true});},[menu,cluster]);
  const seek=time=>{cancelAnimationFrame(lastSeek.current);lastSeek.current=requestAnimationFrame(()=>onSeek?.(clamp(time,0,full)));};
  function settle(time){const target=clamp(time,0,full);seek(target);const node=scroll.current;if(node){ignoreScroll.current=target*scale;node.scrollLeft=ignoreScroll.current;}}
  function changeZoom(next){const nextScale=clamp(next,12,240);ignoreScroll.current=currentRef.current*nextScale;setScale(nextScale);if(scroll.current)scroll.current.scrollLeft=ignoreScroll.current;}
  function select(type,item,time){setMenu(null);setCluster(null);onSelect?.(type,item.id);if(Number.isFinite(time))seek(time);}
  function snapTime(time,event){if(event.altKey)return time;const options=[value,0,full,...placements.flatMap(item=>[item.start,item.end]),...[...gestures,...cameras].filter(item=>item.id!==gesture.current?.item.id).flatMap(item=>{const owner=owners.get(item.clipId);return owner?[owner.start+item.time-owner.in]:[];})];const target=options.reduce((best,candidate)=>Math.abs(candidate-time)<Math.abs(best-time)?candidate:best,Infinity);return Math.abs(target-time)*scale<=6?target:time;}
  function start(event,type,item,action='move'){
    if(event.button!==0||gesture.current)return;event.stopPropagation();dragMoved.current=false;setMenu(null);setCluster(null);
    const owner=type==='gesture'||type==='camera'?owners.get(item.clipId):null;
    if((type==='gesture'||type==='camera')&&!owner)return;
    gesture.current={pointer:event.pointerId,type,item:{...item},owner,action,x:event.clientX,scale,scrollPosition:scroll.current?.scrollLeft??0,patch:null,origin:currentRef.current};
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  // While dragging, the canvas shows the exact frame at the edge being edited.
  function previewFrame(g,patch){
    const item={...g.item,...patch};
    if(g.type==='clip')return g.action==='out'?item.start+item.out-item.in-.001:item.start;
    if(g.type==='overlay')return g.action==='out'?item.start+item.out-item.in-.001:item.start;
    const owner=g.owner,start=owner.start+item.time-owner.in;
    return g.action==='out'?start+effectDuration(item,g.type):start;
  }
  function move(event){
    const g=gesture.current;if(!g||g.pointer!==event.pointerId)return;event.stopPropagation();const dx=event.clientX-g.x;
    if(Math.abs(dx)<4&&!g.moved)return;
    g.moved=true;dragMoved.current=true;clearTimeout(hold.current);
    setMenu(null);
    const item=g.item,delta=dx/g.scale;let patch={};
    if(g.action==='scrub'){
      const time=clamp(g.scrollPosition/g.scale-delta,0,full);
      scroll.current.scrollLeft=time*g.scale;
      seek(time);
      return;
    }
    if(g.action==='reorder'){
      const center=item.start+(item.out-item.in)/2+delta;
      const target=placements.findIndex(clip=>center<clip.start+(clip.out-clip.in)/2);
      g.target=target<0?main.length-1:target;
      setDraft({id:item.id,patch:{},translate:dx});return;
    }
    if(g.type==='clip'){
      if(g.action==='in')patch.in=clamp(item.in+delta,0,item.out-minimum);
      if(g.action==='out')patch.out=clamp(item.out+delta,item.in+minimum,sourceDuration(item));
    }else if(g.type==='overlay'){
      if(g.action==='in'){const change=clamp(delta,-item.in,item.out-item.in-minimum);patch={in:item.in+change,start:Math.max(0,item.start+change)};}
      else if(g.action==='out')patch.out=clamp(item.out+delta,item.in+minimum,Math.min(sourceDuration(item),item.in+full-item.start));
      else patch.start=clamp(snapTime(item.start+delta,event),0,Math.max(0,full-Math.max(minimum,item.out-item.in)));
    }else{
      // Effects only grow from their end; the whole block moves to start earlier.
      const owner=g.owner,start=owner.start+item.time-owner.in;
      patch=g.action==='out'
        ?effectTiming(owner,item,g.type,{duration:effectDuration(item,g.type)+delta})
        :effectTiming(owner,item,g.type,{time:owner.in+snapTime(start+delta,event)-owner.start});
    }
    g.patch=patch;setDraft({id:item.id,patch});
    g.preview=previewFrame(g,patch);seek(g.preview);
  }
  function finish(event,cancel=false){
    const g=gesture.current;if(!g||g.pointer!==event.pointerId)return;gesture.current=null;setDraft(null);
    if(!cancel&&g.moved&&g.action!=='scrub'){
      if(g.action==='reorder'){if(g.target!==undefined)onReorder?.(g.item.id,g.target);}
      else if(g.patch){
        onPatch?.(g.type,g.item.id,g.patch);
        // Keep the edited edge under the playhead so canvas and ruler agree.
        if(g.preview!==undefined)settle(g.preview);
      }
      setAnnouncement(t('Timeline updated'));
    }else if(g.moved&&g.action!=='scrub'&&g.action!=='reorder')settle(g.origin);
    if(event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  }
  const events=(type,item,action)=>({onPointerDown:event=>start(event,type,item,action),onPointerMove:move,onPointerUp:event=>finish(event),onPointerCancel:event=>finish(event,true),onLostPointerCapture:event=>finish(event,true)});
  function keyEdit(event,type,item,action){
    if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();onSelect?.(type,item.id);onDelete?.(type,item.id);return;}
    const amount=event.shiftKey?.25:1/30,delta=event.key==='ArrowLeft'?-amount:event.key==='ArrowRight'?amount:0;if(!delta)return;
    event.preventDefault();let patch={};
    if(type==='clip'){if(action==='in')patch.in=clamp(item.in+delta,0,item.out-minimum);else if(action==='out')patch.out=clamp(item.out+delta,item.in+minimum,sourceDuration(item));else {seek(item.start+delta);return;}}
    else if(type==='overlay'){if(action==='out')patch.out=clamp(item.out+delta,item.in+minimum,sourceDuration(item));else if(action==='in')patch.in=clamp(item.in+delta,0,item.out-minimum);else patch.start=clamp(item.start+delta,0,full-minimum);}
    else{
      const owner=owners.get(item.clipId);if(!owner)return;
      patch=effectTiming(owner,item,type,action==='out'?{duration:effectDuration(item,type)+delta}:{time:item.time+delta});
      if(patch.time!==undefined)seek(owner.start+patch.time-owner.in);
    }
    onPatch?.(type,item.id,patch);
  }
  function trim(type,item,edge){return <button key={edge} type="button" className={'sequence-trim '+edge} aria-label={t(edge==='in'?'Trim start':'Trim end')+' · '+videoTime(item[edge==='in'?'in':'out']??item.time+(item.duration??.65))} title={t(edge==='in'?'Trim start':'Trim end')} {...events(type,item,edge)} onKeyDown={event=>keyEdit(event,type,item,edge)}><span/></button>;}
  function openClipMenu(target,type,item){
    const clip=target.getBoundingClientRect(),section=root.current.getBoundingClientRect();
    setCluster(null);
    setMenu({type,id:item.id,x:clamp(clip.left+clip.width/2-section.left,40,section.width-40),y:clip.bottom-section.top+8});
  }
  function clipBlock(item,index,type='clip'){
    const active=selected(type,item.id),length=Math.max(minimum,item.out-item.in),pixels=length*scale,source=sourceFor(item),title=t(type==='clip'?'Clip':'Overlay')+' '+(index+1);
    const lifted=typeof menu==='object'&&menu?.id===item.id;
    const bodyEvents={
      onPointerDown:event=>{
        if(event.button!==0)return;
        dragMoved.current=false;clearTimeout(hold.current);
        const target=event.currentTarget,{pointerId,clientX,clientY}=event;
        if(type==='overlay')start(event,type,item);
        else if(event.pointerType==='mouse')target.setPointerCapture(pointerId);
        hold.current=setTimeout(()=>{
          const point=points.current.get(pointerId);
          if(!point||distance(point,{x:clientX,y:clientY})>5||!target.isConnected)return;
          // Reordering only makes sense with several clips; otherwise a hold just offers Delete.
          if(type==='clip'&&main.length>1)start({button:0,pointerId,clientX,currentTarget:target,stopPropagation(){}},type,item,'reorder');
          openClipMenu(target,type,item);
          navigator.vibrate?.(8);
          dragMoved.current=true;
        },420);
      },
      onPointerMove:event=>{
        const point=points.current.get(event.pointerId);
        if(type==='clip'&&!gesture.current&&event.pointerType==='mouse'&&point&&Math.abs(event.clientX-point.startX)>=5){
          start({button:0,pointerId:event.pointerId,clientX:point.startX,currentTarget:event.currentTarget,stopPropagation:()=>event.stopPropagation()},type,item,'scrub');
        }
        if(gesture.current)move(event);
      },
      onPointerUp:event=>{clearTimeout(hold.current);finish(event);},
      onPointerCancel:event=>{clearTimeout(hold.current);finish(event,true);},
      onLostPointerCapture:event=>finish(event,true)
    };
    return <div key={item.id} className={'sequence-clip '+(type==='overlay'?'is-overlay':'')+(active?' selected':'')+(lifted?' is-lifted':'')+(draft?.id===item.id&&draft.translate!==undefined?' is-reordering':'')} data-clip-id={item.id} data-kind={type} style={{left:pad+item.start*scale,width:Math.max(4,pixels-2),translate:draft?.id===item.id&&draft.translate!==undefined?draft.translate+'px 0':undefined}}>
      <button type="button" className="sequence-clip-body" aria-label={title+' · '+videoTime(item.start)} aria-pressed={active} title={source?.name??title} {...bodyEvents} onClick={event=>{if(event.detail===0||!dragMoved.current)select(type,item,event.detail===0?item.start:item.start+clamp((event.clientX-event.currentTarget.getBoundingClientRect().left)/scale,0,Math.max(0,item.out-item.in-.001)));}} onContextMenu={event=>{event.preventDefault();openClipMenu(event.currentTarget,type,item);}} onKeyDown={event=>{if(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10'){event.preventDefault();openClipMenu(event.currentTarget,type,item);}else keyEdit(event,type,item);}}>
        <ThumbStrip source={source} inPoint={item.in} outPoint={item.out} pixels={pixels}/>
        {source?.kind!=='video'&&<span className="sequence-clip-badge"><VideoIcon name={source?.kind==='image'?'image':'text'}/></span>}
      </button>{active&&[trim(type,item,'in'),trim(type,item,'out')]}
    </div>;
  }
  function effectPosition(raw,type){
    const item=preview(raw),owner=owners.get(item.clipId);
    if(!owner||item.time>=owner.out||item.time+effectDuration(item,type)<=owner.in)return null;
    const start=Math.max(owner.in,item.time);
    return {item,from:owner.start+start-owner.in,originalFrom:owner.start+Math.max(owner.in,raw.time)-owner.in,
      length:Math.min(owner.out,item.time+effectDuration(item,type))-start};
  }
  function effectBlock({item,from,length},type){
    const kind=type==='camera'?'zoom':item.gesture??'tap',active=editingEffects&&selected(type,item.id),dot=kind==='tap';
    const label=t(kindTitle[type==='camera'?'camera':kind])+' · '+videoTime(from);
    const pixels=dot?0:length*scale,moving=draft?.id===item.id;
    return <div key={item.id} className={'sequence-effect'+(active?' selected':'')+(dot?' is-dot':'')+(moving?' is-moving':'')} data-kind={kind} style={{left:pad+from*scale,width:pixels,'--effect-length':pixels+'px'}}>
      <button type="button" className="sequence-effect-body" aria-label={label} aria-pressed={active} title={label} {...events(type,item,'move')} onKeyDown={event=>keyEdit(event,type,item)} onClick={event=>{if(event.detail===0||!dragMoved.current)select(type,item,from);}}>
        <span className="sequence-effect-capsule"><VideoIcon name={kind}/></span>
      </button>
      {active&&!dot&&<button type="button" className="sequence-duration" aria-label={t('Adjust duration')+' · '+length.toFixed(1)+'s'} title={t('Adjust duration')} {...events(type,item,'out')} onKeyDown={event=>keyEdit(event,type,item,'out')}><span/></button>}
      {moving&&!dot&&<span className="sequence-effect-readout" aria-hidden="true">{length.toFixed(1)}s</span>}
    </div>;
  }
  function effects(items,type){
    const positions=items.map(item=>effectPosition(item,type)).filter(Boolean).sort((a,b)=>a.originalFrom-b.originalFrom),groups=[];
    const gap=editingEffects?28:10;
    for(const position of positions){
      const focus=selected(type,position.item.id),last=groups.at(-1);
      if(!focus&&last&&!last.focus&&(position.originalFrom-last.from)*scale<gap)last.items.push(position);
      else groups.push({focus,from:position.originalFrom,items:[position]});
    }
    return groups.map(group=>group.items.length===1?effectBlock(group.items[0],type):<button type="button" key={group.items[0].item.id} className="sequence-cluster" style={{left:pad+group.from*scale}} aria-label={group.items.length+' '+t(type==='camera'?'Camera animations':'Gestures')} onClick={()=>setCluster({type,items:group.items})}><span>{group.items.length}</span></button>);
  }
  const visibleWidth=duration*scale+viewport+44;
  const bounds=root.current?.getBoundingClientRect(),above=bounds?.top??0,below=typeof window==='undefined'?0:window.innerHeight-(bounds?.top??0)-48;
  const floatAbove=above>below,menuStyle={top:floatAbove?'auto':52,bottom:floatAbove?'calc(100% - 48px)':'auto',maxHeight:Math.max(88,Math.min(380,(floatAbove?above:below)-12))};
  return <section ref={root} className="video-timeline sequence-timeline" data-effects={editingEffects} data-layers={overlays.length?'true':undefined} data-playing={playing} aria-label={t('Video timeline')} onKeyDown={event=>{if(event.key==='Escape'){setMenu(null);setCluster(null);}}}>
    <div className="video-timeline-heading">
      <TimelineAction className="sequence-play" icon={playing?'pause':'play'} label={playing?'Pause video':'Play video'} onClick={onPlay}/>
      <output>{videoTime(value)}<span> / {shortTime(duration)}</span></output>
      <button type="button" className="sequence-action sequence-keyframe" aria-pressed={!!touchHere} aria-label={t(touchHere?'Remove the touch here':'Add a touch here')} title={t(touchHere?'Remove the touch here':'Add a touch here')} disabled={!underPlayhead} onClick={()=>{setMenu(null);if(touchHere){onDelete?.('gesture',touchHere.id);setAnnouncement(t('Timeline updated'));}else onAdd?.('tap');}}><VideoIcon name={touchHere?'remove-keyframe':'add-keyframe'}/></button>
      <div className="video-timeline-actions">
        <TimelineAction icon="split" label="Split at playhead" disabled={!canSplit} onClick={onSplit}/>
        <span className="sequence-menu-anchor"><TimelineAction icon="more" label="Timeline actions" pressed={menu==='selection'} onClick={()=>setMenu(menu==='selection'?null:'selection')}/></span>
      </div>
    </div>
    <div className="sequence-track-window">
      <div ref={scroll} className="sequence-scroll" onScroll={event=>{
        const position=event.currentTarget.scrollLeft;
        if(ignoreScroll.current!==null&&Math.abs(position-ignoreScroll.current)<1){ignoreScroll.current=null;return;}
        if(gesture.current||points.current.size>1)return;
        const time=clamp(position/scale,0,full);if(Math.abs(time-currentRef.current)>.008)seek(time);
      }} onPointerDownCapture={event=>{
        points.current.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX});
        if(points.current.size===2){clearTimeout(hold.current);gesture.current=null;setDraft(null);const [a,b]=[...points.current.values()];points.current.distance=distance(a,b);points.current.scale=scale;event.currentTarget.setPointerCapture(event.pointerId);event.stopPropagation();event.preventDefault();}
      }} onPointerMoveCapture={event=>{
        const point=points.current.get(event.pointerId);if(!point)return;point.x=event.clientX;point.y=event.clientY;
        if(points.current.size===2){event.preventDefault();event.stopPropagation();const [a,b]=[...points.current.values()];changeZoom(points.current.scale*distance(a,b)/Math.max(1,points.current.distance));}
      }} onPointerUpCapture={event=>points.current.delete(event.pointerId)} onPointerCancelCapture={event=>{points.current.delete(event.pointerId);clearTimeout(hold.current);}}>
        <div className="sequence-content" style={{width:visibleWidth,'--timeline-pad':pad+'px'}}>
          <div className="sequence-ruler" aria-hidden="true">{videoTicks(0,Math.max(duration,.1)).map(time=><span key={time} style={{left:pad+time*scale}}>{shortTime(time)}</span>)}</div>
          <div className="sequence-main sequence-row" role="group" aria-label={t('Main clips')}>
            {placements.map((item,index)=>clipBlock(item,index))}
          </div>
          <div className="sequence-secondary">
            <div className="sequence-row sequence-gesture-row" role="group" aria-label={t('Gestures')}><span className="sequence-lane-icon" aria-hidden="true"><VideoIcon name="gestures"/></span><span className="sequence-lane-track" style={{width:duration*scale}}/>{effects(gestures,'gesture')}</div>
            <div className="sequence-row sequence-camera-row" role="group" aria-label={t('Camera animations')}><span className="sequence-lane-icon" aria-hidden="true"><VideoIcon name="zoom"/></span><span className="sequence-lane-track" style={{width:duration*scale}}/>{effects(cameras,'camera')}</div>
            {overlays.map((item,index)=><div key={item.id} className="sequence-row sequence-overlay-row" role="group" aria-label={t('Overlay')+' '+(index+1)}>{clipBlock(preview(item),index,'overlay')}</div>)}
          </div>
        </div>
      </div>
      <div className="sequence-playhead" aria-hidden="true"/>
    </div>
    <input className="sequence-seek" type="range" aria-label={t('Video position')} aria-valuetext={videoTime(value)} min={0} max={full} step="any" value={value} onChange={event=>onSeek?.(event.target.valueAsNumber)}/>
    {typeof menu==='object'&&menu&&<div className="sequence-menu sequence-clip-menu" style={{left:menu.x,top:menu.y}} role="group" aria-label={t('Clip actions')}>
      <TimelineAction icon="trash" label="Delete clip" destructive disabled={menu.type==='clip'&&main.length<2} onClick={()=>{onDelete?.(menu.type,menu.id);setMenu(null);}}/>
    </div>}
    {menu==='selection'&&<div className="sequence-menu" style={menuStyle} role="group" aria-label={t('Timeline actions')}>
      <button type="button" disabled={!selectionItem||!['clip','overlay'].includes(selection?.type)} onClick={()=>{onSelect?.(selection.type,selection.id,{settings:true});setMenu(null);}}><VideoIcon name="video"/>{t('Clip settings')}</button>
      <div className="sequence-menu-pair">
        <button type="button" aria-label={t('Zoom out timeline')} title={t('Zoom out timeline')} disabled={scale<=12} onClick={()=>changeZoom(scale/1.5)}><VideoIcon name="zoom-out"/></button>
        <button type="button" aria-label={t('Zoom in timeline')} title={t('Zoom in timeline')} disabled={scale>=240} onClick={()=>changeZoom(scale*1.5)}><VideoIcon name="zoom-in"/></button>
        <button type="button" aria-label={t('Move earlier')} title={t('Move earlier')} disabled={selectedIndex<=0} onClick={()=>{onReorder?.(selection.id,selectedIndex-1);setMenu(null);}}><VideoIcon name="left"/></button>
        <button type="button" aria-label={t('Move later')} title={t('Move later')} disabled={selectedIndex<0||selectedIndex>=main.length-1} onClick={()=>{onReorder?.(selection.id,selectedIndex+1);setMenu(null);}}><VideoIcon name="right"/></button>
      </div>
      <button type="button" className="destructive" disabled={!selectionItem||(selection?.type==='clip'&&main.length<2)} onClick={()=>{onDelete?.(selection?.type,selection?.id);setMenu(null);}}><VideoIcon name="trash"/>{t('Delete')}</button>
    </div>}
    {cluster&&<div className="sequence-cluster-menu" style={menuStyle} role="group" aria-label={t('Choose animation')}>{cluster.items.map(({item,from})=><button key={item.id} type="button" onClick={()=>select(cluster.type,item,from)}><VideoIcon name={cluster.type==='camera'?'zoom':item.gesture??'tap'}/><span>{t(kindTitle[cluster.type==='camera'?'camera':item.gesture??'tap'])}</span><time>{videoTime(from)}</time></button>)}</div>}
    <span className="visually-hidden" role="status">{announcement}</span>
  </section>;
}
