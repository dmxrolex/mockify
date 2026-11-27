import SelectionToolbar from './selection-toolbar.jsx';
import {captureCanvasGesture,releaseCanvasGesture} from './canvas-gesture.js';
import {useAlignmentGuides} from './alignment-guides.jsx';
import { t } from './i18n.js';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {createPortal,flushSync} from 'react-dom';
import { switchPanel } from './ui-motion.js';
import { ColorPicker } from './editor-controls.jsx';
import { fontFor, loadTextFont, textFonts } from './text-fonts.js';
import { addText, deleteText, patchText, sceneLayers, clamp, textAnchors, textGeometry, textModel } from './text-model.js';

function Glyph({name}) {
  const paths={
    plus:<path d="M12 5v14M5 12h14"/>,
    badge:<><circle cx="9" cy="8" r="2.5"/><path d="M5 16c0-4 8-4 8 0m3-5h4m-4 4h4"/></>,
    back:<path d="M19 12H5m6-6-6 6 6 6"/>,check:<path d="m5 12 4 4L19 6"/>,
    next:<path d="m9 5 7 7-7 7"/>,edit:<><path d="m5 15 10-10 4 4L9 19l-5 1Z"/><path d="m13 7 4 4"/></>,
    trash:<><path d="M4 7h16M9 4h6M6 7l1 13h10l1-13M10 10v7m4-7v7"/></>,
    rotate:<><path d="M5 8a8 8 0 1 1-1 8M5 3v5h5"/></>,
    opacity:<><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16Z" fill="currentColor"/></>,
    position:<>{[6,12,18].flatMap(x=>[6,12,18].map(y=><circle key={x+':'+y} cx={x} cy={y} r="1" fill="currentColor"/>))}</>,
    search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    font:<path d="M4 19 10 5h2l6 14M6 14h10M19 10v9m-2-5h4"/>,
    colour:<><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16Z"/></>,
    size:<><path d="M5 7h14M12 7v13M4 4v6m16-6v6"/></>,
    effects:<><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/></>,
    duplicate:<><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 8V4H4v11h4"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export function Range({label,caption,value,min,max,suffix='',display,onChange}) {
  return <label className="text-range"><span>{t(caption??label)}</span><input type="range" aria-label={label} min={min} max={max} value={value} aria-valuetext={display??value+suffix} style={{'--text-progress':((value-min)/(max-min)*100)+'%'}} onChange={event=>onChange(event.target.valueAsNumber)}/><output>{display??value+suffix}</output></label>;
}

export function Switch({label,caption,checked,onChange}) {
  return <div className="text-switch-row"><span>{t(caption??label)}</span><button type="button" role="switch" aria-label={label} aria-checked={checked} onClick={()=>onChange(!checked)}><span className="text-switch-track"><i/></span></button></div>;
}

function FontOption({font,selected,weight,onSelect,disabled}) {
  const button=useRef(null);const [ready,setReady]=useState(false);
  useEffect(()=>{
    let canceled=false;
    const observer=new IntersectionObserver(entries=>{
      if(!entries.some(entry=>entry.isIntersecting))return;
      observer.disconnect();
      loadTextFont({enabled:true,text:font.name,font:font.id,weight}).then(()=>{if(!canceled)setReady(true);}).catch(()=>{});
    },{rootMargin:'80px'});
    observer.observe(button.current);
    return()=>{canceled=true;observer.disconnect();};
  },[font.id,weight]);
  return <button ref={button} type="button" className="text-font-option" aria-pressed={selected} disabled={disabled} onClick={()=>onSelect(font.id)}><span style={{fontFamily:ready?`"${font.family}",system-ui`:undefined}}>{font.name}</span>{selected&&<Glyph name="check"/>}</button>;
}

export function TextInspector({settings,update,onDone,onAdd,onProfile,profile,badgePending=false}) {
  const model=textModel(settings),hasText=sceneLayers(settings).some(layer=>layer.type==='text');
  const [view,setView]=useState('main'),[query,setQuery]=useState('');
  const [pending,setPending]=useState(false),[error,setError]=useState('');
  const root=useRef(null),request=useRef(0),latest=useRef(settings);latest.current=settings;
  const changeView=next=>switchPanel(root.current,()=>setView(next)).then(changed=>{
    const label={fonts:'Choose text font',colour:'Colour',position:'Position',effects:'Style'}[view];
    if(changed)root.current?.querySelector(next==='main'?`.ios-setting-row[aria-label="${label}"]`:'.ios-text-back')?.focus({preventScroll:true});
  });
  const patch=changes=>{if(hasText)update(patchText(settings,changes));};
  useEffect(()=>{loadTextFont({enabled:true,text:'Text',font:'inter',weight:600}).catch(()=>{});return()=>{++request.current;};},[]);
  useEffect(()=>{root.current.scrollTop=0;},[view]);
  useEffect(()=>{if(!hasText){++request.current;if(view!=='main')changeView('main');}},[hasText,view]);
  async function chooseFont(font) {
    const token=++request.current;setPending(true);setError('');
    try {await loadTextFont({...model,enabled:true,text:model.text||'Text',font});if(token!==request.current||!sceneLayers(latest.current).some(layer=>layer.type==='text'))return;update(patchText(latest.current,{font}));changeView('main');}
    catch {if(token===request.current)setError('This font could not load. Try again.');}
    finally {if(token===request.current)setPending(false);}
  }
  const titles={main:'Text',fonts:'Font',colour:'Colour',position:'Position',effects:'Style'};
  const row=(name,icon,label,value)=> <button type="button" className="ios-setting-row" disabled={!hasText} aria-label={t(label==='Font'?'Choose text font':label)} onClick={()=>changeView(name)}><span className={'ios-setting-icon '+name}><Glyph name={icon}/></span><span>{t(label)}</span><span className="ios-setting-value">{t(value)}</span><Glyph name="next"/></button>;
  return <section className="text-inspector" ref={root} data-view={view} aria-label={t("Text editor")} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();view==='main'?onDone():changeView('main');}}}>
    <div className="text-inspector-heading">
      {view!=='main'&&<button type="button" className="ios-text-back" aria-label={t("Back to Text")} onClick={()=>changeView('main')}><Glyph name="back"/></button>}
      <h2>{t(titles[view])}</h2><button type="button" className="ios-text-done" aria-label={view==='main'?'Finish text editing':'Confirm '+titles[view].toLowerCase()} onClick={()=>view==='main'?onDone():changeView('main')}>{t("Done")}</button>
    </div>
    {error&&<p className="text-font-error" role="alert">{error}</p>}
    {view==='main'&&<div className="text-inspector-fields">
      <button type="button" className="text-add-pill" onClick={onAdd}><Glyph name="plus"/>{t("Add text")}</button>
      {onProfile&&<div className="ios-settings-group"><button type="button" className="ios-setting-row" disabled={badgePending} onClick={onProfile} aria-label={t('Profile badge')}><span className="ios-setting-icon profile-badge-tile"><Glyph name="badge"/></span><span>{t('Profile badge')}</span><span className="ios-setting-value profile-badge-name">{badgePending?t('Loading…'):profile.username?'@'+profile.username:profile.firstName}</span><Glyph name="next"/></button></div>}
      <div className="ios-settings-group">
        {row('fonts','font','Font',fontFor(model.font).name)}
        {row('colour','colour','Colour',<i className="ios-colour-dot" style={{background:model.color}}/>)}
      </div><div className="ios-settings-group">{row('position','position','Position',model.mode==='tiled'?'Tiled':'')}{row('effects','effects','Style','')}</div>
    </div>}
    {view==='fonts'&&<div className="text-font-browser">
      <label className="text-font-search"><Glyph name="search"/><input type="search" aria-label={t("Search fonts")} placeholder={t("Search fonts")} value={query} onChange={event=>setQuery(event.target.value)}/></label>
      <div className="text-font-list ios-settings-group" aria-busy={pending}>{textFonts.filter(font=>font.name.toLowerCase().includes(query.toLowerCase())).map(font=><FontOption key={font.id} font={font} selected={font.id===model.font} weight={model.weight} disabled={pending} onSelect={chooseFont}/>)}</div>
      {pending&&<span role="status" className="visually-hidden">{t("Loading font")}</span>}
    </div>}
    {view==='colour'&&<div className="text-colour-panel"><ColorPicker compact value={model.color} onChange={color=>patch({color})} onClose={()=>changeView('main')}/></div>}
    {view==='position'&&<div className="text-position-panel">{!model.badge&&<div className="ios-settings-group"><Switch label={t("Tiled text")} checked={model.mode==='tiled'} onChange={tiled=>patch({mode:tiled?'tiled':'text'})}/></div>}{model.mode==='tiled'?<><Range label={t("Density")} min={1} max={8} value={model.density} onChange={density=>patch({density})}/><Range label={t("Tile angle")} min={-180} max={180} suffix="°" value={model.tileRotation} onChange={tileRotation=>patch({tileRotation})}/></>:<><div className="text-position-grid" role="group" aria-label={t("Quick text position")}>{textAnchors.map(anchor=><button key={anchor} type="button" aria-label={'Place text '+anchor.replaceAll('-',' ')} aria-pressed={model.anchor===anchor} onClick={()=>patch({anchor})}><span/></button>)}</div><Switch label={t("Snap to objects")} checked={model.snap!==false} onChange={snap=>patch({snap})}/></>}</div>}
    {view==='effects'&&<div className="text-effects-panel ios-settings-group"><Switch label={t("Bold text")} checked={model.weight===700} onChange={bold=>patch({weight:bold?700:400})}/><Switch label={t("Italic text")} checked={model.italic} onChange={italic=>patch({italic})}/><Switch label={t("Text shadow")} caption={t("Shadow")} checked={model.shadow} onChange={shadow=>patch({shadow})}/><Range label={t("Text opacity")} caption={t("Opacity")} min={0} max={100} suffix="%" value={model.opacity} onChange={opacity=>patch({opacity})}/></div>}
  </section>;
}

function degrees(angle) { return ((angle+180)%360+360)%360-180; }

export function TextHandles({settings,update,onSelect,focusRequest=0,menuOpen=false,onTyping,typingHost}) {
  const model=textModel(settings);
  const layer=useRef(null),boxRef=useRef(null),pointers=useRef(new Map()),gesture=useRef(null);
  const alignment=useAlignmentGuides(layer);
  const frame=useRef(0),pending=useRef(null),settingsRef=useRef(settings);settingsRef.current=settings;
  const latest=useRef(model);latest.current=model;
  const [bounds,setBounds]=useState({width:0,height:0});const [selected,setSelected]=useState(true),[dragging,setDragging]=useState(false);
  const [ready,setReady]=useState(''),[announcement,setAnnouncement]=useState('');
  const [typing,setTyping]=useState(false),input=useRef(null),moved=useRef(false);
  useLayoutEffect(()=>{if(focusRequest){setSelected(true);setTyping(true);}},[focusRequest]);
  useLayoutEffect(()=>{
    onTyping?.(typing);
    if(typing){input.current?.focus({preventScroll:true});input.current?.select();}
    return()=>{if(typing)onTyping?.(false);};
  },[typing,onTyping]);
  useEffect(()=>{if(settings.selectedLayerId!==model.id){setSelected(false);setTyping(false);}else setSelected(true);},[settings.selectedLayerId,model.id]);
  const key=model.font+':'+model.weight;
  useEffect(()=>{let canceled=false;loadTextFont({...model,enabled:true,text:model.text||'Text'}).then(()=>{if(!canceled)setReady(key);}).catch(()=>{});return()=>{canceled=true;};},[key,model.enabled,!!model.text.trim()]);
  useLayoutEffect(()=>{
    const parent=layer.current.parentElement;
    const measure=()=>{const b=parent.getBoundingClientRect();setBounds({width:b.width,height:b.height});};
    const observer=new ResizeObserver(measure);observer.observe(parent);measure();
    const deselect=event=>{if(!boxRef.current?.contains(event.target)&&!event.target.closest('.text-floating-toolbar')){setSelected(false);setTyping(false);}};
    parent.addEventListener('pointerdown',deselect);
    return()=>{observer.disconnect();parent.removeEventListener('pointerdown',deselect);};
  },[]);
  const visible=model.enabled&&model.mode==='text'&&(!!model.text.trim()||typing)&&ready===key&&bounds.width>0;
  const box=textGeometry(model,Math.max(1,bounds.width),Math.max(1,bounds.height));
  const commit=changes=>update(patchText(settingsRef.current,changes));
  const flush=()=>{cancelAnimationFrame(frame.current);frame.current=0;if(pending.current){const next=pending.current;pending.current=null;flushSync(()=>commit(next));}};
  useEffect(()=>()=>{cancelAnimationFrame(frame.current);releaseCanvasGesture(layer.current);},[]);
  function begin(event,type) {
    if(event.button!==0)return;
    event.stopPropagation();if(model.locked){setSelected(true);update({selectedLayerId:model.id});onSelect?.();return;}if(!captureCanvasGesture(layer.current,event,{move,end}))return;setSelected(true);if(settings.selectedLayerId!==model.id)update({selectedLayerId:model.id});moved.current=false;
    alignment.start();setDragging(true);pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const rect=layer.current.getBoundingClientRect();const current=latest.current;const geometry=textGeometry(current,rect.width,rect.height);
    const center={x:rect.left+geometry.cx,y:rect.top+geometry.cy};
    const points=[...pointers.current.values()];
    gesture.current={type:points.length>1?'pinch':type,model:{...current,anchor:null,x:geometry.cx/rect.width,y:geometry.cy/rect.height},rect,center,start:{x:event.clientX,y:event.clientY},distance:Math.hypot(event.clientX-center.x,event.clientY-center.y),angle:Math.atan2(event.clientY-center.y,event.clientX-center.x)};
    if(points.length>1){gesture.current.distance=Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y);gesture.current.angle=Math.atan2(points[1].y-points[0].y,points[1].x-points[0].x);gesture.current.start={x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2};}
  }
  function move(event) {
    if(!pointers.current.has(event.pointerId)||!gesture.current)return;
    event.stopPropagation();setDragging(true);pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(Math.hypot(event.clientX-gesture.current.start.x,event.clientY-gesture.current.start.y)>4)moved.current=true;
    const g=gesture.current,points=[...pointers.current.values()];let next={...g.model};
    if(g.type==='pinch'&&points.length>1){const distance=Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y);const angle=Math.atan2(points[1].y-points[0].y,points[1].x-points[0].x);next.size=clamp(g.model.size*distance/Math.max(1,g.distance),1,10000);next.rotation=degrees(g.model.rotation+(angle-g.angle)*180/Math.PI);next.x+=((points[0].x+points[1].x)/2-g.start.x)/g.rect.width;next.y+=((points[0].y+points[1].y)/2-g.start.y)/g.rect.height;}
    else if(g.type==='drag'){next.x+=(event.clientX-g.start.x)/g.rect.width;next.y+=(event.clientY-g.start.y)/g.rect.height;}
    else if(g.type==='resize'){next.size=clamp(g.model.size*Math.hypot(event.clientX-g.center.x,event.clientY-g.center.y)/Math.max(1,g.distance),1,10000);}
    else if(g.type==='rotate'){next.rotation=degrees(g.model.rotation+(Math.atan2(event.clientY-g.center.y,event.clientX-g.center.x)-g.angle)*180/Math.PI);const snap=Math.round(next.rotation/15)*15;if(Math.abs(snap-next.rotation)<3)next.rotation=snap;}
    if(g.type==='drag'&&moved.current){const delta=alignment.snap({...textGeometry(next,g.rect.width,g.rect.height),angle:next.rotation*Math.PI/180},next.snap===false||event.altKey);next.x+=delta.dx/g.rect.width;next.y+=delta.dy/g.rect.height;}
    const geometry=textGeometry(next,g.rect.width,g.rect.height);next.x=geometry.cx/g.rect.width;next.y=geometry.cy/g.rect.height;
    pending.current=next;latest.current=next;
    if(!frame.current)frame.current=requestAnimationFrame(flush);
  }
  function end(event) {
    flush();alignment.clear();
    pointers.current.delete(event.pointerId);gesture.current=null;setDragging(pointers.current.size>0);setAnnouncement('Text position updated');
    if(pointers.current.size){const [id,point]=[...pointers.current.entries()][0];const rect=layer.current.getBoundingClientRect();const current=latest.current;const geometry=textGeometry(current,rect.width,rect.height);gesture.current={type:'drag',model:{...current,anchor:null,x:geometry.cx/rect.width,y:geometry.cy/rect.height},rect,start:point};}
  }
  function keyboard(event,type) {
    if(event.key==='Escape'){event.preventDefault();setTyping(false);setSelected(false);update({selectedLayerId:null});return;}
    if(model.locked)return;
    if(event.key==='Enter'){event.preventDefault();setTyping(true);onSelect?.();return;}
    if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();update(deleteText(settings));return;}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();
    const step=event.shiftKey?10:2;
    if(type==='resize')commit({size:clamp(model.size+(['ArrowRight','ArrowUp'].includes(event.key)?step:-step),1,10000)});
    else if(type==='rotate')commit({rotation:degrees(model.rotation+(['ArrowRight','ArrowUp'].includes(event.key)?step:-step))});
    else {const next={...model,anchor:null,x:box.cx/bounds.width+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0)/bounds.width,y:box.cy/bounds.height+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)/bounds.height};const geometry=textGeometry(next,bounds.width,bounds.height);commit({...next,x:geometry.cx/bounds.width,y:geometry.cy/bounds.height});}
    setAnnouncement(type==='drag'?'Text moved '+event.key.replace('Arrow','').toLowerCase():'Text '+(type==='resize'?'size':'rotation')+' adjusted');
  }
  const events=type=>({onPointerDown:event=>begin(event,type),onPointerMove:move,onPointerUp:end,onPointerCancel:end,onLostPointerCapture:event=>{if(pointers.current.has(event.pointerId))end(event);},onKeyDown:event=>keyboard(event,type)});
  const extentY=(Math.abs(Math.sin(box.angle))*box.width+Math.abs(Math.cos(box.angle))*box.height)/2;
  const toolbarTop=box.cy-extentY>52?box.cy-extentY-52:Math.max(4,box.cy-extentY+4);
  function duplicate() {
    const copy={...model,locked:false,id:crypto.randomUUID(),anchor:null,x:box.cx/bounds.width+.045,y:box.cy/bounds.height+.045};
    const layers=[...sceneLayers(settings)],index=layers.findIndex(item=>item.id===model.id);layers.splice(index+1,0,copy);
    update({layers,selectedLayerId:copy.id});setTyping(false);setSelected(true);
  }
  return <div className="text-handle-layer" ref={layer}>
    {sceneLayers(settings).filter(item=>item.type==='text'&&item.id!==model.id&&item.enabled&&item.mode!=='tiled').map(item=>{const geometry=textGeometry(textModel({textOverlay:item}),Math.max(1,bounds.width),Math.max(1,bounds.height));return <button type="button" key={item.id} data-alignment-object={item.text?.trim()&&item.opacity!==0?item.id:undefined} data-alignment-geometry={JSON.stringify(geometry)} className="text-other-handle" aria-label={'Select text '+item.text} onClick={()=>{update({selectedLayerId:item.id});setSelected(true);setTyping(false);onSelect?.();}} style={{zIndex:2+sceneLayers(settings).findIndex(layer=>layer.id===item.id)*2,left:geometry.cx,top:geometry.cy,width:geometry.width,height:geometry.height,transform:`translate(-50%,-50%) rotate(${item.rotation}deg)`}}/>;})}
    {typing&&typingHost?.current&&createPortal(
      <div className="text-typing-dock" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setTyping(false);}}>
        <label className="text-growing-field" data-value={model.text}><span className="visually-hidden">{t("Edit text on canvas")}</span><textarea ref={input} rows={1} maxLength={280} value={model.text}
          onChange={event=>commit({text:event.target.value,enabled:true})}
          onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape'&&!event.nativeEvent.isComposing){event.preventDefault();setTyping(false);}}}/></label>
        <button type="button" className="ios-text-done" onPointerDown={event=>event.preventDefault()} onClick={()=>setTyping(false)}>{t("Done")}</button>
      </div>,typingHost.current)}
    {visible&&<>
      <div data-alignment-object={model.opacity!==0?model.id:undefined} data-alignment-geometry={JSON.stringify(box)} ref={boxRef} className={'text-selection'+(selected?' selected':'')+(box.cy-box.height/2<38?' rotate-below':'')} style={{zIndex:selected?101:2+sceneLayers(settings).findIndex(layer=>layer.id===model.id)*2,left:box.cx,top:box.cy,width:box.width,height:box.height,transform:`translate(-50%,-50%) rotate(${model.rotation}deg)`}}>
        {!typing&&<button type="button" className="text-move-handle" aria-label={t("Move text. Use arrow keys; Enter to edit.")} {...events('drag')} onClick={()=>{if(!moved.current){if(selected&&menuOpen&&!model.locked)setTyping(true);onSelect?.();}}} onDoubleClick={()=>{if(!model.locked)setTyping(true);onSelect?.();}}/>}
        {selected&&!typing&&!model.locked&&<>{(box.width<55||box.height<18?['se']:['nw','ne','sw','se']).map(corner=><button key={corner} type="button" className={'text-resize-handle '+corner} aria-label={'Resize text '+corner+'. Use arrow keys.'} {...events('resize')}><span/></button>)}<button type="button" className="text-rotate-handle" aria-label={t("Rotate text. Use arrow keys.")} {...events('rotate')}><Glyph name="rotate"/></button></>}
      </div>
      {selected&&!dragging&&!typing&&<SelectionToolbar label="Selected text" locked={model.locked} onLock={()=>{setTyping(false);commit({locked:!model.locked});}} style={{left:clamp(box.cx,98,Math.max(98,bounds.width-98)),top:clamp(toolbarTop,4,Math.max(4,bounds.height-48))}} items={[
        {label:'Duplicate',icon:'duplicate',action:duplicate},
        ...['front','back'].map(direction=>({label:direction==='front'?'Bring to front':'Send to back',icon:direction,action:()=>{const layers=sceneLayers(settings),item=layers.find(l=>l.id===model.id),rest=layers.filter(l=>l.id!==model.id);update({layers:direction==='front'?[...rest,item]:[item,...rest]});}}))]}>
        <button type="button" aria-label={t('Edit text')} disabled={model.locked} onClick={()=>{setTyping(true);onSelect?.();}}><Glyph name="edit"/></button>
        <button type="button" className="text-delete-action" aria-label={t('Delete text')} onClick={()=>{setTyping(false);update(deleteText(settings));}}><Glyph name="trash"/></button>
      </SelectionToolbar>}
    </>}
    {alignment.overlay}<span className="visually-hidden" role="status">{announcement}</span>
  </div>;
}
