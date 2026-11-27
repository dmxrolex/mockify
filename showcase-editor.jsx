import React,{useEffect,useRef,useState} from 'react';
import {clamp,gestureKind} from './showcase-model.js';
import {mediaMapping,createRenderer} from './render.js';
import {t} from './i18n.js';
import './showcase.css';

export function ShowcaseIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3ZM7 2v3m10-3v3M7 19v3m10-3v3"/></svg>;}
export function GestureIcon({kind='tap'}){return <svg viewBox="0 0 24 24" aria-hidden="true">{kind==='hold'?<><circle cx="12" cy="12" r="3"/><path d="M12 3a9 9 0 1 1-9 9"/></>:kind==='swipe'?<><circle cx="5" cy="12" r="3"/><path d="M10 12h11m-4-4 4 4-4 4"/></>:<><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></>}</svg>;}
export function ShowcaseCanvas({settings,source,media=source,index,moment,onAdd,onPatch,disabled}){
  const root=useRef(null),points=useRef(new Map()),gesture=useRef(null),latest=useRef(moment),queued=useRef(null),frame=useRef(0),lens=useRef(null),detail=useRef(null),detailPaint=useRef(null),lensFrame=useRef(0);latest.current=moment;
  useEffect(()=>()=>{cancelAnimationFrame(frame.current);cancelAnimationFrame(lensFrame.current);detailPaint.current?.dispose();if(detail.current)detail.current.width=detail.current.height=1;},[]);
  const mapping=()=>{const bounds=root.current.getBoundingClientRect();return {bounds,map:mediaMapping({...settings,renderProgress:0},source,bounds.width,bounds.height,index)};};
  function patch(changes,id=latest.current?.id){if(!id)return;queued.current={changes:{...queued.current?.changes,...changes},id};if(!frame.current)frame.current=requestAnimationFrame(()=>{frame.current=0;const value=queued.current;queued.current=null;if(value)onPatch(value.changes,value.id);});}
  function down(event){if(event.button!==0||disabled)return;event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);points.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(points.current.size===2){const [a,b]=[...points.current.values()];gesture.current={id:latest.current?.id,distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:latest.current?.zoom??1.65,pinch:true};return;}
    const {bounds,map}=mapping(),p=map.from({x:event.clientX-bounds.left,y:event.clientY-bounds.top});
    // Cache a native-source scene once per drag; never magnify the low-resolution preview.
    detail.current??=document.createElement('canvas');const density=Math.min(3,2560/Math.max(bounds.width,bounds.height));detail.current.width=Math.round(bounds.width*density);detail.current.height=Math.round(bounds.height*density);detailPaint.current??=createRenderer(detail.current,{cacheScene:false});detailPaint.current({...settings,_showcaseEditing:true},media,null,0);
    const existing=event.target.closest('.showcase-focus-point'),endpoint=existing?.dataset.endpoint==='true';if(!existing&&(p.x<0||p.x>1||p.y<0||p.y>1))return;
    const id=latest.current?.id??onAdd({x:clamp(p.x,0,1),y:clamp(p.y,0,1)});if(!existing&&latest.current)patch({x:clamp(p.x,0,1),y:clamp(p.y,0,1)},id);gesture.current={id,endpoint,offset:existing?{x:p.x-(endpoint?(latest.current.endX??latest.current.x):latest.current.x),y:p.y-(endpoint?(latest.current.endY??Math.max(0,latest.current.y-.25)):latest.current.y)}:{x:0,y:0}};
  }
  function move(event){if(!points.current.has(event.pointerId)||disabled)return;points.current.set(event.pointerId,{x:event.clientX,y:event.clientY});const state=gesture.current;if(!state?.id)return;
    if(points.current.size>1){const [a,b]=[...points.current.values()];patch({zoom:clamp(state.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,state.distance),1,2.8)},state.id);return;}
    if(state.pinch)return;const {bounds,map}=mapping(),p=map.from({x:event.clientX-bounds.left,y:event.clientY-bounds.top});const position={x:clamp(p.x-state.offset.x,0,1),y:clamp(p.y-state.offset.y,0,1)};patch(state.endpoint?{endX:position.x,endY:position.y}:{...position,suggested:false},state.id);
    const target=map.to(position);cancelAnimationFrame(lensFrame.current);lensFrame.current=requestAnimationFrame(()=>{lensFrame.current=0;const glass=lens.current,art=detail.current;if(!glass||!art)return;const size=Math.min(112,bounds.width-12,bounds.height-12),dpr=Math.min(devicePixelRatio||1,3),crop=Math.min(size/2,bounds.width,bounds.height),sx=art.width/bounds.width,sy=art.height/bounds.height;if(glass.width!==Math.round(size*dpr))glass.width=glass.height=Math.round(size*dpr);const ctx=glass.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.clearRect(0,0,glass.width,glass.height);ctx.drawImage(art,clamp(target.x-crop/2,0,bounds.width-crop)*sx,clamp(target.y-crop/2,0,bounds.height-crop)*sy,crop*sx,crop*sy,0,0,glass.width,glass.height);const radius=size/2+5;glass.style.width=glass.style.height=size+'px';glass.style.left=clamp(target.x,radius,bounds.width-radius)+'px';const above=target.y-size/2-38;glass.style.top=clamp(above<radius?target.y+size/2+38:above,radius,bounds.height-radius)+'px';glass.hidden=false;});
  }
  function end(event){cancelAnimationFrame(lensFrame.current);lensFrame.current=0;if(lens.current)lens.current.hidden=true;points.current.delete(event.pointerId);if(queued.current){cancelAnimationFrame(frame.current);frame.current=0;const value=queued.current;queued.current=null;onPatch(value.changes,value.id);}if(!points.current.size)gesture.current=null;}
  return <div ref={root} className="showcase-canvas" aria-label={t('Place an animation')} onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} aria-disabled={disabled}>
    <canvas ref={lens} className="animation-magnifier" hidden aria-hidden="true"/>{moment&&gestureKind(moment)==='swipe'&&<SwipeGuide settings={settings} source={source} index={index} moment={moment} root={root}/>}{moment&&gestureKind(moment)==='swipe'&&<FocusPoint endpoint settings={settings} source={source} index={index} moment={moment} root={root} onPatch={onPatch} disabled={disabled}/>}
    {moment&&<FocusPoint settings={settings} source={source} index={index} moment={moment} root={root} onPatch={onPatch} disabled={disabled}/>}
  </div>;
}
function SwipeGuide({settings,source,index,moment,root}){
 const [path,setPath]=useState('');useEffect(()=>{const measure=()=>{const rect=root.current.getBoundingClientRect(),map=mediaMapping({...settings,renderProgress:0},source,rect.width,rect.height,index),a=map.to(moment),b=map.to({x:moment.endX??moment.x,y:moment.endY??Math.max(0,moment.y-.25)});setPath(`M${a.x} ${a.y}L${b.x} ${b.y}`);};const observer=new ResizeObserver(measure);observer.observe(root.current);measure();return()=>observer.disconnect();},[settings,source,index,moment]);
 return <svg className="animation-swipe-guide" aria-hidden="true"><path d={path}/></svg>;
}
function FocusPoint({endpoint=false,settings,source,index,moment,root,onPatch,disabled}){
  const point=useRef(null);
  useEffect(()=>{function measure(){const rect=root.current.getBoundingClientRect(),p=mediaMapping({...settings,renderProgress:0},source,rect.width,rect.height,index).to(endpoint?{x:moment.endX??moment.x,y:moment.endY??Math.max(0,moment.y-.25)}:moment);point.current.style.left=p.x+'px';point.current.style.top=p.y+'px';}const watch=new ResizeObserver(measure);watch.observe(root.current);measure();return()=>watch.disconnect();},[settings,source,index,moment,endpoint]);
  return <button ref={point} data-endpoint={endpoint} type="button" className="showcase-focus-point" disabled={disabled} aria-label={t(endpoint?'Swipe end. Use arrow keys to move.':'Focus point. Use arrow keys to move.')} onKeyDown={event=>{const movement={ArrowLeft:[-.02,0],ArrowRight:[.02,0],ArrowUp:[0,-.02],ArrowDown:[0,.02]}[event.key];if(movement){event.preventDefault();onPatch(endpoint?{endX:clamp((moment.endX??moment.x)+movement[0],0,1),endY:clamp((moment.endY??Math.max(0,moment.y-.25))+movement[1],0,1)}:{x:clamp(moment.x+movement[0],0,1),y:clamp(moment.y+movement[1],0,1),suggested:false},moment.id);}}}>{!endpoint&&moment.focus&&<span className="animation-zoom-label">{(moment.zoom??1.65).toFixed(1)}×</span>}</button>;
}

// Live touch recording: while the video plays, tap, hold or slide on the canvas and each
// touch is captured at that moment with its type. Touches are committed when recording stops.
export function TouchRecorder({settings,source,index,now,onTouch,onStop,count=0}){
  const root=useRef(null),active=useRef(new Map()),[rings,setRings]=useState([]);
  const toSource=(event)=>{const rect=root.current.getBoundingClientRect(),map=mediaMapping({...settings,renderProgress:0},source,rect.width,rect.height,index);const p=map.from({x:event.clientX-rect.left,y:event.clientY-rect.top});return {x:clamp(p.x,0,1),y:clamp(p.y,0,1),px:event.clientX-rect.left,py:event.clientY-rect.top};};
  function down(event){
    // Recording owns the canvas: these touches must not select or dismiss anything underneath.
    event.stopPropagation();
    if(event.target.closest('.touch-recorder-bar'))return;
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);
    const p=toSource(event);if(p.x<=0||p.x>=1||p.y<=0||p.y>=1)return;
    active.current.set(event.pointerId,{time:now(),started:performance.now(),start:p,last:p});
    setRings(list=>[...list,{id:event.pointerId,x:p.px,y:p.py}]);
  }
  function move(event){const touch=active.current.get(event.pointerId);if(!touch)return;const p=toSource(event);touch.last=p;setRings(list=>list.map(ring=>ring.id===event.pointerId?{...ring,x:p.px,y:p.py}:ring));}
  function up(event){
    const touch=active.current.get(event.pointerId);if(!touch)return;active.current.delete(event.pointerId);
    setRings(list=>list.filter(ring=>ring.id!==event.pointerId));
    if(event.type==='pointercancel')return;
    const held=(performance.now()-touch.started)/1000,travel=Math.hypot(touch.last.x-touch.start.x,touch.last.y-touch.start.y);
    const kind=travel>.04?'swipe':held>=.35?'hold':'tap';
    onTouch({kind,time:touch.time,x:touch.start.x,y:touch.start.y,endX:touch.last.x,endY:touch.last.y,duration:held});
  }
  return <div ref={root} className="touch-recorder" onPointerDown={down} onClick={event=>event.stopPropagation()} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="application" aria-label={t('Recording touches. Tap, hold or slide on the screen.')}>
    {rings.map(ring=><span key={ring.id} className="touch-recorder-ring" style={{left:ring.x,top:ring.y}}/>)}
    <div className="touch-recorder-bar">
      <span className="touch-recorder-dot" aria-hidden="true"/><span>{t('Recording')}{count?' · '+count:''}</span>
      <button type="button" onClick={onStop}>{t('Stop')}</button>
    </div>
    {!count&&<p className="touch-recorder-hint">{t('Tap, hold or slide where your finger went')}</p>}
  </div>;
}
