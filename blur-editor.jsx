import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Picker } from './editor-controls.jsx';
import { blurEffect, blurTargets, unit } from './blur-model.js';
import { mediaMapping } from './render.js';
import { imageSettings } from './image-model.js';
import { switchPanel } from './ui-motion.js';
import { t } from './i18n.js';
import './blur-editor.css';

function Glyph({name}) {
  const paths={back:<path d="M19 12H5m6-6-6 6 6 6"/>,undo:<path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 0 14"/>,reset:<><path d="M4 9a8 8 0 1 1 0 6M4 3v6h6"/></>,down:<path d="m7 10 5 5 5-5"/>,phone:<rect x="6" y="2" width="12" height="20" rx="3"/>,image:<><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="9" r="1.5"/><path d="m3 16 5-4 4 3 4-5 5 6"/></>,layers:<path d="m3 8 9-5 9 5-9 5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>,design:<rect x="3" y="3" width="18" height="18" rx="3"/>,box:<rect x="4" y="4" width="16" height="16" rx="3" strokeDasharray="3 3"/>,brush:<><path d="m10 14 9-11 3 3-11 9M10 14c-6-1-2 7-8 6 6 3 12-1 9-5Z"/></>,erase:<><path d="m14 3 7 7-10 11H5l-4-4ZM6 12l7 7M11 21h11"/></>,size:<circle cx="12" cy="12" r="8"/>,trash:<path d="M5 7h14m-9-3h4M7 7l1 13h8l1-13m-7 4v5m4-5v5"/>};
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}
function BlurStrength({value,change,mode,onAdjusting}) {
  const [display,setDisplay]=useState(value),pending=useRef(null),frame=useRef(0),dragging=useRef(false),latest=useRef(change);latest.current=change;
  useEffect(()=>{if(!dragging.current&&pending.current===null)setDisplay(value);},[value]);
  useEffect(()=>()=>{cancelAnimationFrame(frame.current);onAdjusting(false);},[]);
  function flush(){cancelAnimationFrame(frame.current);frame.current=0;if(pending.current!==null){const next=pending.current;pending.current=null;latest.current(mode==='whole'?{whole:next}:{strength:next});}}
  function input(e){const next=e.target.valueAsNumber;setDisplay(next);pending.current=next;if(!frame.current)frame.current=requestAnimationFrame(flush);}
  return <label className="text-range"><span>{t('Strength')}</span><input type="range" min="0" max="100" aria-label={t('Blur strength')} aria-valuetext={display+'%'} value={display} style={{'--text-progress':display+'%'}} onPointerDown={e=>{e.currentTarget.dataset.pointerFocus='true';dragging.current=true;onAdjusting(true);change({},true);}} onKeyDown={e=>{delete e.currentTarget.dataset.pointerFocus;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))change({},true);}} onPointerUp={()=>{dragging.current=false;flush();onAdjusting(false);}} onPointerCancel={()=>{dragging.current=false;flush();onAdjusting(false);}} onBlur={e=>{delete e.currentTarget.dataset.pointerFocus;dragging.current=false;flush();onAdjusting(false);}} onChange={input}/><output>{display}%</output></label>;
}
export function BlurInspector({settings,source,session,setSession,change,undo,canUndo,onDone,onAdjusting}) {
  const root=useRef(null),targetButton=useRef(null),sizeButton=useRef(null);
  const [popup,setPopup]=useState(null),[changing,setChanging]=useState(false);
  const targets=blurTargets(settings,source),target=targets.find(item=>item.id===session.target)??targets.at(-2),effect=blurEffect(settings,target.id);
  const navigate=callback=>{if(changing)return;setPopup(null);setChanging(true);switchPanel(root.current,callback).finally(()=>setChanging(false));};
  return <section className="blur-inspector" ref={root} aria-label={t('Blur editor')} onKeyDown={e=>{if(e.key==='Escape'&&!popup){e.preventDefault();onDone();}}}>
    <fieldset className="blur-fields" disabled={changing}>
    <header className="blur-heading"><button type="button" className="round-action controls-back" aria-label={t('Back to editor controls')} onClick={onDone}><Glyph name="back"/></button><h2>{t('Blur')}</h2><button type="button" className="blur-icon" aria-label={t('Undo blur')} disabled={!canUndo} onClick={undo}><Glyph name="undo"/></button><button type="button" className="blur-done" onClick={onDone}>{t('Done')}</button></header>
    <div className="blur-mode-row"><button ref={targetButton} type="button" className="blur-target" aria-label={t('Blur target')} aria-expanded={popup==='target'} onClick={()=>setPopup(popup==='target'?null:'target')}><Glyph name={target.icon}/><span>{t(target.label)}</span><Glyph name="down"/></button>
      <div className="blur-segment" role="group" aria-label={t('Blur coverage')}>{['whole','area'].map(mode=><button key={mode} type="button" aria-pressed={effect.mode===mode} onClick={()=>{if(effect.mode!==mode)navigate(()=>change({mode}));}}>{t(mode==='whole'?'Whole':'Area')}</button>)}</div>
    </div>
    {effect.mode==='area'&&<div className="blur-tools" role="group" aria-label={t('Area tools')}>
      {['box','brush'].map(tool=><button key={tool} type="button" aria-label={t(tool==='box'?'Box blur':'Brush blur')} aria-pressed={session.tool===tool} onClick={()=>navigate(()=>setSession(s=>({...s,tool,erase:false,selected:null})))}><Glyph name={tool}/><span>{t(tool==='box'?'Box':'Brush')}</span></button>)}
      <button ref={sizeButton} type="button" aria-label={t('Brush size')} disabled={session.tool!=='brush'} aria-expanded={popup==='size'} onClick={()=>setPopup(popup==='size'?null:'size')}><Glyph name="size"/></button><button type="button" aria-label={t('Erase blur')} disabled={session.tool!=='brush'} aria-pressed={session.erase} onClick={()=>setSession(s=>({...s,erase:!s.erase}))}><Glyph name="erase"/></button>
    </div>}
    <div className="blur-strength-row"><BlurStrength key={target.id+':'+effect.mode} value={effect.mode==='whole'?effect.whole:effect.strength} mode={effect.mode} change={change} onAdjusting={onAdjusting}/><button type="button" className="blur-icon" aria-label={t('Reset blur')} disabled={!effect.whole&&!effect.regions.length} onClick={()=>{change({whole:0,regions:[]},true);setSession(s=>({...s,selected:null}));}}><Glyph name="reset"/></button></div>
    {popup==='target'&&<Picker anchor={targetButton} label={t('Blur target')} className="blur-target-picker" onClose={()=>setPopup(null)}><div role="radiogroup" aria-label={t('Blur target')} onKeyDown={e=>{if(!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const items=[...e.currentTarget.querySelectorAll('button')],index=items.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?items.length-1:(index+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)+items.length)%items.length;items[next].click();}}>{targets.map(item=><button key={item.id} type="button" role="radio" aria-checked={item.id===target.id} onClick={()=>{targetButton.current?.focus({preventScroll:true});navigate(()=>setSession(s=>({...s,target:item.id,selected:null})));}}><Glyph name={item.icon}/><span>{t(item.label)}</span>{item.id===target.id&&<span className="blur-check" aria-hidden="true">✓</span>}</button>)}</div></Picker>}
    {popup==='size'&&<Picker anchor={sizeButton} label={t('Brush size')} className="blur-size-picker" onClose={()=>setPopup(null)}><label><Glyph name="size"/><input type="range" min="2" max="35" aria-label={t('Brush size')} value={Math.round(session.size*100)} onChange={e=>setSession(s=>({...s,size:e.target.valueAsNumber/100}))}/><Glyph name="size"/></label></Picker>}
    </fieldset>
  </section>;
}

export function BlurCanvas({settings,source,session,setSession,change,onPreview,view,onView}) {
  const root=useRef(null),frame=useRef(0),gesture=useRef(null),latest=useRef(null),pointers=useRef(new Map());
  const [bounds,setBounds]=useState({width:0,height:0}),[live,setLive]=useState(null),[message,setMessage]=useState('');
  const effect=blurEffect(settings,session.target),sources=Array.isArray(source)?source:[source];
  const index=settings.pageObjects?Math.max(0,settings.pageObjects.findIndex(item=>item.id===session.target)):session.target.startsWith('media:')?Number(session.target.split(':')[1]):0,media=sources[index];
  const artboard=['background','design'].includes(session.target),pose=settings.pageObjects?settings:imageSettings(settings,session.target);
  const mapping=artboard?{to:p=>({x:p.x*bounds.width,y:p.y*bounds.height}),from:p=>({x:p.x/bounds.width,y:p.y/bounds.height})}:mediaMapping(pose,media,bounds.width,bounds.height,index,sources.length);
  latest.current={settings,session,effect,mapping};
  useLayoutEffect(()=>{const observer=new ResizeObserver(()=>{setBounds({width:root.current.clientWidth,height:root.current.clientHeight});});observer.observe(root.current);return()=>observer.disconnect();},[]);
  useEffect(()=>()=>{cancelAnimationFrame(frame.current);onPreview(null);},[]);
  useEffect(()=>{gesture.current=null;setLive(null);onPreview(null);},[session.target,session.tool]);
  function rawPoint(event){const b=root.current.getBoundingClientRect();return latest.current.mapping.from({x:(event.clientX-b.left)/b.width*bounds.width,y:(event.clientY-b.top)/b.height*bounds.height});}
  function point(event){const p=rawPoint(event);return {x:unit(p.x),y:unit(p.y)};}
  function begin(e,type='draw',region=null,corner=null){
    if(e.button!==0)return;e.stopPropagation();e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.current.size>1){const [a,b]=[...pointers.current.values()];gesture.current={type:'pan',view,distance:Math.hypot(b.x-a.x,b.y-a.y),mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};setLive(null);onPreview(null);return;}
    const p=point(e),raw=rawPoint(e);
    if(type==='draw'&&(raw.x<0||raw.x>1||raw.y<0||raw.y>1)){setSession(s=>({...s,selected:null}));return;}
    const id=region?.id??crypto.randomUUID();
    const item=region??(session.tool==='box'?{id,type:'box',x:p.x,y:p.y,w:0,h:0}:{id,type:'brush',size:session.size,erase:session.erase,points:[p]});
    gesture.current={pointer:e.pointerId,type,start:p,original:item,item,corner};setSession(s=>({...s,selected:item.type==='box'?id:null}));setLive(item);
  }
  function move(e){
    const g=gesture.current;if(!g)return;e.stopPropagation();pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(g.type==='pan'){
      if(pointers.current.size<2)return;const [a,b]=[...pointers.current.values()],r=root.current.closest('.artboard-frame').getBoundingClientRect();
      const scale=Math.max(1,Math.min(4,g.view.scale*Math.hypot(b.x-a.x,b.y-a.y)/Math.max(1,g.distance))),ratio=scale/g.view.scale;
      const x=(a.x+b.x)/2-(r.left+r.width/2)-(g.mid.x-r.left-r.width/2-g.view.x)*ratio;
      const y=(a.y+b.y)/2-(r.top+r.height/2)-(g.mid.y-r.top-r.height/2-g.view.y)*ratio;
      onView({scale,x:Math.max(-r.width*(scale-1)/2,Math.min(r.width*(scale-1)/2,x)),y:Math.max(-r.height*(scale-1)/2,Math.min(r.height*(scale-1)/2,y))});return;
    }
    if(g.pointer!==e.pointerId)return;const p=point(e),a=g.original;
    if(g.type==='draw'&&a.type==='box')g.item={...a,x:Math.min(g.start.x,p.x),y:Math.min(g.start.y,p.y),w:Math.abs(p.x-g.start.x),h:Math.abs(p.y-g.start.y)};
    else if(g.type==='draw'){const last=g.item.points.at(-1);if(Math.hypot(p.x-last.x,p.y-last.y)>.002)g.item={...g.item,points:[...g.item.points,p]};}
    else if(g.type==='move')g.item={...a,x:Math.max(0,Math.min(1-a.w,a.x+p.x-g.start.x)),y:Math.max(0,Math.min(1-a.h,a.y+p.y-g.start.y))};
    else {const anchor={x:g.corner.includes('w')?a.x+a.w:a.x,y:g.corner.includes('n')?a.y+a.h:a.y};g.item={...a,x:Math.min(anchor.x,p.x),y:Math.min(anchor.y,p.y),w:Math.abs(p.x-anchor.x),h:Math.abs(p.y-anchor.y)};}
    if(!frame.current)frame.current=requestAnimationFrame(()=>{frame.current=0;setLive({...g.item});const regions=latest.current.effect.regions;onPreview(g.type==='draw'?[...regions,g.item]:regions.map(r=>r.id===g.item.id?g.item:r));});
  }
  function finish(e,cancel=false){
    pointers.current.delete(e.pointerId);const g=gesture.current;if(g?.type==='pan'){if(!pointers.current.size)gesture.current=null;return;}if(!g||g.pointer!==e.pointerId)return;
    gesture.current=null;cancelAnimationFrame(frame.current);frame.current=0;setLive(null);onPreview(null);
    if(g.type==='draw'&&g.item.type==='box'&&g.item.w<.005&&g.item.h<.005)g.item={...g.item,x:Math.max(0,Math.min(.8,g.start.x-.1)),y:Math.max(0,Math.min(.9,g.start.y-.05)),w:.2,h:.1};
    if(!cancel&&(g.item.type!=='box'||(g.item.w>.005&&g.item.h>.005))){const regions=latest.current.effect.regions;change({regions:g.type==='draw'?[...regions,g.item]:regions.map(r=>r.id===g.item.id?g.item:r)},true);setMessage(t('Blur area updated'));}
  }
  const events=(type,region,corner)=>({onPointerDown:e=>begin(e,type,region,corner),onPointerMove:move,onPointerUp:e=>finish(e),onPointerCancel:e=>finish(e,true),onLostPointerCapture:e=>finish(e,true)});
  const list=live?[...effect.regions.filter(r=>r.id!==live.id),live]:effect.regions;
  function polygon(r){return [{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}].map(p=>mapping.to(p));}
  function remove(id){change({regions:effect.regions.filter(r=>r.id!==id)},true);setSession(s=>({...s,selected:null}));}
  function keyboard(e,region){if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove(region.id);}else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const step=e.shiftKey?.03:.005;change({regions:effect.regions.map(r=>r.id===region.id?{...r,x:Math.max(0,Math.min(1-r.w,r.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0))),y:Math.max(0,Math.min(1-r.h,r.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)))}:r)},true);}}
  const selected=list.find(r=>r.id===session.selected&&r.type==='box');
  return <div className="blur-canvas" ref={root}>
    <svg className="blur-drawing-surface" viewBox={`0 0 ${bounds.width||1} ${bounds.height||1}`} aria-label={t('Draw blur areas')} {...events('draw')}>
      {list.filter(r=>r.type==='box').map(r=><polygon key={r.id} points={polygon(r).map(p=>p.x+','+p.y).join(' ')} className={r.id===session.selected?'is-selected':''} onPointerDown={e=>{if(session.tool==='box')begin(e,'move',r);else begin(e);}} onPointerMove={move} onPointerUp={e=>finish(e)} onPointerCancel={e=>finish(e,true)} onLostPointerCapture={e=>finish(e,true)}/>)}
      {live?.type==='brush'&&<polyline points={live.points.map(p=>mapping.to(p)).map(p=>p.x+','+p.y).join(' ')} className="blur-live-stroke" strokeWidth={Math.max(4,session.size*Math.min(bounds.width,bounds.height))}/>}
    </svg>
    {list.filter(r=>r.type==='box').map(r=>{const p=mapping.to({x:r.x+r.w/2,y:r.y+r.h/2});return <button key={r.id} type="button" className="blur-region-focus" style={{left:p.x,top:p.y}} aria-label={t('Select blur area. Arrow keys move; Delete removes.')} onFocus={()=>setSession(s=>({...s,selected:r.id}))} onClick={()=>setSession(s=>({...s,selected:r.id}))} onKeyDown={e=>keyboard(e,r)}/>;})}
    {selected&&<>{polygon(selected).map((p,i)=><button key={i} type="button" className="blur-corner" style={{left:p.x,top:p.y}} aria-label={t('Resize blur area')} {...events('resize',selected,['nw','ne','se','sw'][i])}><i/></button>)}<button type="button" className="blur-delete" style={{left:Math.max(24,Math.min(bounds.width-24,polygon(selected)[1].x)),top:Math.max(24,polygon(selected)[1].y-30)}} aria-label={t('Delete blur area')} onClick={()=>remove(selected.id)}><Glyph name="trash"/></button></>}
    <span className="visually-hidden" role="status">{message}</span>
  </div>;
}
