import { t } from './i18n.js';
import React, { useEffect, useLayoutEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { hapticSelection } from './haptics.js';
import { backdrops, zoomLevel } from './render.js';
import { motionEffects, effectOf } from './motion-effects.js';

function Glyph({name}) {
  const shapes={
    zoom:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.2 15.2 5.3 5.3M7.5 10.5h6m-3-3v6"/></>,
    blur:<><circle cx="12" cy="12" r="8" strokeDasharray="1 3"/><circle cx="12" cy="12" r="4.5" strokeDasharray="1 2.5"/><circle cx="12" cy="12" r="1"/></>,
    square:<rect x="4" y="4" width="16" height="16" rx="4"/>,
    story:<rect x="7" y="2.5" width="10" height="19" rx="3"/>,
    wide:<rect x="2.5" y="7" width="19" height="10" rx="3"/>,
    video:<><rect x="3" y="5" width="12" height="14" rx="3"/><path d="m15 10 6-4v12l-6-4"/></>,
    gallery:<><rect x="4" y="3" width="17" height="17" rx="4"/><path d="M2 8v11a3 3 0 0 0 3 3h11m-11-8 4-4 4 4 3-2 4 4"/><circle cx="15.5" cy="8" r="1.5"/></>,
    color:<><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16Z" fill="currentColor"/></>,
    check:<path d="m5 12 4 4L19 6"/>,next:<path d="M5 12h14m-6-6 6 6-6 6"/>,
    shadow:<><rect x="5" y="3" width="10" height="15" rx="3"/><path d="M10 21h6a3 3 0 0 0 3-3V8"/></>,
    none:<><circle cx="12" cy="12" r="8"/><path d="m6.5 17.5 11-11"/></>,
    statusbar:<><rect x="2" y="5" width="20" height="14" rx="4"/><path d="M5 10h3m8 0h3"/><rect x="9.5" y="8" width="5" height="2.5" rx="1.25"/></>,
    sound:<path d="M10 5 5 9H2v6h3l5 4ZM14 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>,
    muted:<path d="M10 5 5 9H2v6h3l5 4ZM15 9l6 6m0-6-6 6"/>,
    edges:<path d="M8 3H6a3 3 0 0 0-3 3v2m13-5h2a3 3 0 0 1 3 3v2M3 16v2a3 3 0 0 0 3 3h2m8 0h2a3 3 0 0 0 3-3v-2"/>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{shapes[name]}</svg>;
}

export function Picker({anchor,label,onClose,className='',children,placement='above',menu=false}) {
  const popup=useRef(null),close=useRef(onClose);close.current=onClose;
  const native='popover' in HTMLElement.prototype;
  const id=useId();
  useLayoutEffect(()=>{
    const element=popup.current,source=anchor.current;
    const anchored=CSS.supports('position-area: block-start');
    const anchorName='--picker-'+element.id.replace(/[^a-z0-9]/gi,'');
    if(!source?.isConnected){close.current();return;}
    source.style.setProperty('anchor-name',anchorName);element.style.setProperty('position-anchor',anchorName);
    if(native)element.showPopover({source});
    const group=element.querySelector('[focusgroup]'),nativeFocus='focusGroup' in HTMLElement.prototype;
    if(group&&!nativeFocus){group.setAttribute('role','menu');for(const item of group.querySelectorAll('button')){item.setAttribute('role','menuitem');item.tabIndex=-1;}}
    const place=()=>{
      if(anchored)return;
      const b=source.getBoundingClientRect(),box=element.getBoundingClientRect(),view=window.visualViewport;
      const left=view?.offsetLeft||0,top=view?.offsetTop||0,width=view?.width||innerWidth,height=view?.height||innerHeight;
      element.style.left=Math.max(left+10,Math.min(b.left,left+width-box.width-10))+'px';
      const targetTop=placement==='below'?b.bottom+10:b.top-box.height-12;
      if(placement==='below')element.style.maxHeight=Math.max(44,top+height-b.bottom-20)+'px';
      element.style.top=(placement==='below'?Math.max(top+10,targetTop):Math.max(top+10,Math.min(targetTop,top+height-box.height-10)))+'px';
    };
    place();
    const toggle=event=>{if(event.newState==='closed')close.current();};
    const outside=event=>{if(!element.contains(event.target)&&!source.contains(event.target))close.current();};
    const escape=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();source.focus({preventScroll:true});close.current();}};
    const keys=event=>{
      if(!menu)return;
      if(event.key==='Tab'){source.focus({preventScroll:true});close.current();return;}
      if(!['Home','End',...(!nativeFocus?['ArrowUp','ArrowDown']:[])].includes(event.key))return;
      const items=[...group.querySelectorAll('button:not(:disabled)')],index=items.indexOf(document.activeElement);if(!items.length)return;
      event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowUp'?-1:1)+items.length)%items.length;items[next].focus({preventScroll:true});
    };
    element.addEventListener('toggle',toggle);element.addEventListener('keydown',keys);document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    window.addEventListener('resize',place);window.addEventListener('scroll',place,true);window.visualViewport?.addEventListener('resize',place);window.visualViewport?.addEventListener('scroll',place);
    element.querySelector('button,input')?.focus({preventScroll:true});
    return()=>{element.removeEventListener('toggle',toggle);element.removeEventListener('keydown',keys);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);window.visualViewport?.removeEventListener('resize',place);window.visualViewport?.removeEventListener('scroll',place);source.style.removeProperty('anchor-name');};
  },[anchor,native,placement,menu]);
  return createPortal(<div ref={popup} id={id} popover={native?'auto':undefined} role={menu?undefined:'group'} aria-label={menu?undefined:label} data-placement={placement} className={'editor-picker '+className}>{menu?<div focusgroup="menu nomemory" aria-label={label}>{children}</div>:children}</div>,anchor.current?.closest('dialog')??document.body);
}

// Automatic motion for the selected phone or image. The chosen effect's preview phone moves,
// so each choice shows what it does without extra text.
const effectMarks={
  still:<><circle cx="12" cy="12" r="8"/><path d="m6.5 17.5 11-11"/></>,
  spin:<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4v3.5H16"/>,
  float:<path d="M8 21.2h8" opacity=".6"/>,
  sway:<path d="M4.5 9.5c-1 1.6-1 3.4 0 5M19.5 9.5c1 1.6 1 3.4 0 5"/>,
  push:<path d="M4 8V4h4M20 16v4h-4"/>,
};
export function EffectsControls({settings,update,disabled=false,video=false}){
  const current=effectOf(settings);
  return <fieldset className="effect-options" disabled={disabled}><legend className="visually-hidden">{t('Effects')}</legend>
    <div className="effect-row" role="radiogroup" aria-label={t('Effects')}>
      {motionEffects.map(({id,label})=><button key={id} type="button" role="radio" aria-checked={current===id} className={'effect-choice effect-'+id} onClick={()=>{if(current===id)return;hapticSelection();update({motion:id});}}>
        <span className="effect-symbol"><svg viewBox="0 0 24 24" aria-hidden="true">{id!=='still'&&<rect className="effect-phone" x="8.75" y="4.5" width="6.5" height="13.5" rx="2"/>}{effectMarks[id]}</svg></span>
        <span className="effect-label">{t(label)}</span>
      </button>)}
    </div>
  </fieldset>;
}

export function SizeControls({settings,update}) {
  return <div className="choice-row polished-size">{Object.entries({square:'1:1',story:'9:16',wide:'16:9'}).map(([key,label])=><button type="button" key={key} className="polished-option" aria-label={label} aria-pressed={settings.ratio===key} onClick={()=>update({ratio:key})}><span className="option-face"><Glyph name={key}/></span><small>{t(label)}</small></button>)}</div>;
}

export function EdgesControls({settings,update,source}) {
  const requested=Math.max(0,Number.isFinite(settings.imageEdges)?settings.imageEdges:4),value=Math.min(50,requested);
  const shortest=Math.max(1,Math.min(source?.width??100,source?.height??100)),pixels=Math.round(shortest*requested/100);
  const [draft,setDraft]=useState(String(pixels)),[editing,setEditing]=useState(false);
  useEffect(()=>{if(!editing)setDraft(String(pixels));},[pixels,editing]);
  function commit(event){
    const raw=event.currentTarget.value.trim(),number=Math.round(Number(raw)),next=raw!==''&&Number.isSafeInteger(number)?Math.max(0,number):pixels;
    setDraft(String(next));setEditing(false);if(next!==pixels)update({imageEdges:next/shortest*100});
  }
  return <div className="image-edges-controls"><label className="shadow-strength" style={{'--fill':value*2+'%'}}><span className="strength-fill" aria-hidden="true"/><span className="strength-label"><Glyph name="edges"/>{t("Corners")}</span><input type="range" aria-label={t("Image corners")} aria-valuetext={Math.round(shortest*value/100)+' px'} min="0" max="50" step="0.01" value={value} onChange={event=>update({imageEdges:event.target.valueAsNumber})}/></label><label className="corner-value"><input type="text" inputMode="decimal" enterKeyHint="done" aria-label={t('Corner radius in pixels')} value={draft} onFocus={event=>{setEditing(true);event.currentTarget.select();}} onChange={event=>setDraft(event.target.value)} onBlur={commit} onKeyDown={event=>{if(event.key==='Escape'){event.currentTarget.value=String(pixels);event.currentTarget.blur();}if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}}}/><span aria-hidden="true">px</span></label></div>;
}

export function ImageControls({update,replaceSource,isVideo=false}) {
  return <div className="ios-settings-group image-settings"><button type="button" className="ios-setting-row" onClick={replaceSource}><span className="ios-setting-icon"><Glyph name={isVideo?"video":"gallery"}/></span>{t(isVideo?"Replace video":"Replace image")}<Glyph name="next"/></button><button type="button" className="ios-setting-row" onClick={()=>update({x:0,y:0,scale:100,roll:0})}><span className="ios-setting-icon position"><Glyph name="square"/></span>{t(isVideo?"Fit video":"Fit image")}<Glyph name="next"/></button></div>;
}

export function PreviewZoom({settings,update}) {
  const value=zoomLevel(settings.zoom),position=(value+100)/2;
  const amount=(Math.abs(value)/50).toFixed(1).replace(/\.0$/,'');
  const label=value===0?'0':`${value>0?'+':'−'}${amount}×`;
  const description=value===0?'Full phone':`${amount} zoom, ${value>0?'top':'bottom'} of phone`;
  return <div className="preview-zoom" role="group" aria-label={t("Preview zoom")}>
    <div className="preview-zoom-track">
      <output className="zoom-value" aria-hidden="true" style={{left:`calc(8px + (100% - 16px) * ${position/100})`}}>{t(label)}</output>
      <div className="zoom-ruler-ticks" aria-hidden="true">{Array.from({length:25},(_,index)=><i key={index} className={index%6===0?'major':''} style={{left:(index/24*100)+'%'}}/>)}</div>
      <input type="range" aria-label={t("Zoom")} aria-valuetext={description} min="-100" max="100" step="1" value={value} onChange={event=>update({zoom:event.target.valueAsNumber})}/>
      <div className="zoom-checkpoints" role="group" aria-label={t("Zoom checkpoints")}>{[-100,-50,0,50,100].map(level=><button type="button" key={level} style={{left:`calc(8px + (100% - 16px) * ${(level+100)/200})`}} aria-label={level===0?'Full phone':`${level>0?'Top':'Bottom'} ${Math.abs(level)/50}× zoom`} aria-pressed={value===level} onClick={()=>update({zoom:value===level?0:level})}><span>{level===0?'0':`${level<0?'−':''}${Math.abs(level)/50}×`}</span></button>)}</div>
    </div>
    <button type="button" className="zoom-reset" aria-label={t("Reset zoom")} disabled={value===0} onClick={()=>update({zoom:0})}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 4-5 5 5 5M3 9h11a7 7 0 0 1 0 14" transform="translate(1 -2)"/></svg></button>
  </div>;
}

function hsvToHex(h,s,v) {
  const f=n=>{const k=(n+h/60)%6;return Math.round(255*(v-v*s*Math.max(0,Math.min(k,4-k,1)))).toString(16).padStart(2,'0');};
  return '#'+f(5)+f(3)+f(1);
}
function hexToHsv(hex) {
  const rgb=[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)/255),max=Math.max(...rgb),min=Math.min(...rgb),delta=max-min;
  const h=delta?(max===rgb[0]?(rgb[1]-rgb[2])/delta:max===rgb[1]?(rgb[2]-rgb[0])/delta+2:(rgb[0]-rgb[1])/delta+4)*60:0;
  return[(h+360)%360,max?delta/max:0,max];
}
export function ColorPicker({value,onChange,onClose,compact=false}) {
  const [hsv,setHsv]=useState(()=>hexToHsv(value)),[h,s,v]=hsv;
  const change=next=>{setHsv(next);onChange(hsvToHex(...next));};
  const pick=event=>{
    const bounds=event.currentTarget.getBoundingClientRect(),inset=12;
    change([h,Math.max(0,Math.min(1,(event.clientX-bounds.left-inset)/(bounds.width-inset*2))),1-Math.max(0,Math.min(1,(event.clientY-bounds.top-inset)/(bounds.height-inset*2)))]);
  };
  const colours={'#ffffff':'white','#b5b5bd':'grey','#151515':'black','#ff5f65':'coral','#ffbc56':'orange','#ffdc65':'gold','#9df0c2':'mint','#81d0f5':'blue','#a78bfa':'purple','#ffb4c0':'pink'};
  return <div className="colour-picker-content">
    {!compact&&<div className="picker-heading"><strong>{t("Colours")}</strong><button type="button" className="colour-picker-done" aria-label={t("Done choosing colour")} onClick={onClose}>{t("Done")}</button></div>}
    <div className="colour-spectrum" style={{'--hue':`hsl(${h} 100% 50%)`}} onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);pick(event);}} onPointerMove={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId))pick(event);}}><span className="spectrum-thumb" style={{left:`calc(12px + (100% - 24px) * ${s})`,top:`calc(12px + (100% - 24px) * ${1-v})`,background:value}}/></div>
    <input className="hue-slider" aria-label={t("Hue")} type="range" min="0" max="359" step="1" value={h} style={{'--selected-hue':`hsl(${h} 100% 50%)`}} onChange={event=>change([event.target.valueAsNumber,s,v])}/>
    <div className="colour-accessible-sliders"><input aria-label={t("Colour saturation")} type="range" min="0" max="100" value={Math.round(s*100)} onChange={event=>change([h,event.target.valueAsNumber/100,v])}/><input aria-label={t("Colour brightness")} type="range" min="0" max="100" value={Math.round(v*100)} onChange={event=>change([h,s,event.target.valueAsNumber/100])}/></div>
    <div className="quick-colours" role="group" aria-label={t("Preset colours")}>{Object.entries(colours).map(([colour,name])=><button key={colour} type="button" aria-label={'Choose '+name} aria-pressed={value===colour} onClick={()=>change(hexToHsv(colour))}><span style={{background:colour}}/></button>)}</div>
  </div>;
}

export function BackgroundControls({settings,update,pickPhoto,photo}) {
  const [open,setOpen]=useState(false),trigger=useRef(null);
  return <div className="choice-row polished-background">
    <button type="button" className="background-option gallery-option" aria-label={t("Upload background")} aria-pressed={settings.background==='photo'} onClick={()=>photo?update({background:'photo',selectedLayerId:'background'}):pickPhoto()}><span className="background-face">{photo?.url?<img src={photo.url} alt=""/>:<Glyph name="gallery"/>}</span></button>
    <button ref={trigger} type="button" className="background-option" aria-label={t("Choose background colour")} aria-expanded={open} aria-pressed={settings.background==='solid'} onClick={()=>setOpen(!open)}><span className="background-face colour-wheel"><Glyph name="color"/>{settings.background==='solid'&&<i className="background-colour-dot" style={{background:settings.color}}/>}</span></button>
    {open&&<Picker anchor={trigger} label={t("Background colour picker")} className="colour-picker" onClose={()=>setOpen(false)}><ColorPicker value={settings.color} onChange={color=>update({background:'solid',palette:'custom',color})} onClose={()=>{setOpen(false);trigger.current.focus({preventScroll:true});}}/></Picker>}
    <button type="button" className="background-option" aria-label={t('Screenshot blur')} aria-pressed={settings.background==='blur'} onClick={()=>update({background:'blur'})}><span className="background-face"><Glyph name="blur"/></span></button>
    {['dusk','aurora','tide','frost','dawn','moss','ember','lilac','peach','jade','clay'].map(key=><button type="button" key={key} className="background-option" aria-label={backdrops[key].name} aria-pressed={settings.background==='gradient'&&settings.palette===key} onClick={()=>update({background:'gradient',palette:key})}><span className="background-face preset-face" style={{background:'linear-gradient(140deg,'+backdrops[key].colors.join(',')+')'}}/>{settings.background==='gradient'&&settings.palette===key&&<span className="background-selected"><Glyph name="check"/></span>}</button>)}
  </div>;
}

// Dial and wheel detents use native Telegram haptics.
const detents={unlock(){},tick:hapticSelection};

export function ShadowControls({settings,update,wheel,onWheelChange}) {
  const sound=detents,previous=useRef(null),value=useRef(settings.shadowAngle);value.current=settings.shadowAngle;
  const angleAt=event=>{const b=event.currentTarget.getBoundingClientRect();return Math.atan2(event.clientX-b.left-b.width/2,event.clientY-b.top-b.height/2)*180/Math.PI;};
  const move=event=>{
    if(previous.current===null)return;
    const angle=angleAt(event);let delta=angle-previous.current;if(delta>180)delta-=360;if(delta< -180)delta+=360;previous.current=angle;
    const next=(Math.round(value.current-delta)+360)%360;if(Math.floor(next/3)!==Math.floor(value.current/3))sound.tick();value.current=next;update({shadowAngle:next});
  };
  return wheel?<div className="shadow-workbench">
    <div className="shadow-dial" onMouseDown={sound.unlock} onTouchStart={sound.unlock} onPointerDown={event=>{sound.unlock();event.currentTarget.querySelector('input').focus({preventScroll:true});event.currentTarget.setPointerCapture(event.pointerId);previous.current=angleAt(event);}} onPointerMove={move} onPointerUp={()=>{previous.current=null;}} onPointerCancel={()=>{previous.current=null;}}>
      <svg viewBox="0 0 120 120" className="dial-ticks" style={{transform:`rotate(${settings.shadowAngle}deg)`}} aria-hidden="true">{Array.from({length:60},(_,index)=><path key={index} d={`M60 ${index%5===0?7:10}V15`} transform={`rotate(${index*6} 60 60)`} className={index%5===0?'major':''}/>)}</svg>
      <output>{settings.shadowAngle}<small>°</small></output><span className="dial-stop" aria-hidden="true"/>
      <input className="dial-input" type="range" aria-label={t("Shadow direction")} aria-valuetext={settings.shadowAngle+' degrees'} min="0" max="359" value={settings.shadowAngle} onKeyDown={sound.unlock} onChange={event=>{sound.tick();update({shadowAngle:event.target.valueAsNumber});}}/>
    </div>
    <label className="shadow-strength" style={{'--fill':settings.shadow+'%'}}><span className="strength-fill" aria-hidden="true"/><span className="strength-label"><Glyph name="shadow"/>{t("Intensity")}</span><output>{settings.shadow}%</output><input type="range" aria-label={t("Shadow intensity")} aria-valuetext={settings.shadow+' percent'} min="0" max="100" value={settings.shadow} onChange={event=>update({shadow:event.target.valueAsNumber,shadowStyle:settings.shadowStyle==='none'?'soft':settings.shadowStyle})}/></label>
  </div>:<div className="choice-row shadow-choices">{['none','soft'].map(key=><button type="button" key={key} className="polished-option" aria-label={key+' shadow'} aria-pressed={settings.shadowStyle===key} onClick={()=>update({shadowStyle:key})}><span className="option-face"><Glyph name={key==='none'?'none':'shadow'}/></span></button>)}<button className="polished-option" type="button" aria-label={t("Adjust shadow direction")} aria-pressed={settings.shadowStyle==='long'} onClick={()=>{update({shadowStyle:'long'});onWheelChange(true);}}><span className="option-face shadow-angle-label">{settings.shadowAngle}°</span></button></div>;
}

export function StatusControls({settings,update,openTime}) {
  const [open,setOpen]=useState(false),trigger=useRef(null),battery=settings.statusBattery??100,enabled=settings.cleanup!=='off';
  return <div className="choice-row polished-status">
    <button type="button" className="polished-option" aria-label={t("Use original status bar")} aria-pressed={!enabled} onClick={()=>{setOpen(false);update({cleanup:'off'});}}><span className="option-face"><Glyph name="none"/></span><small>{t("Original")}</small></button>
    <button type="button" className="polished-option" aria-label={t("Use iOS status bar")} aria-pressed={enabled} onClick={()=>update({cleanup:'auto'})}><span className="option-face"><Glyph name="statusbar"/></span><small>{t("iOS")}</small></button>
    <button type="button" className="polished-option time-option" aria-label={t("Change status bar time")} disabled={!enabled} onClick={openTime}><span className="option-face time-face">{settings.statusTime.replace(/^0/,'')}</span><small>{t("Time")}</small></button>
    <button ref={trigger} type="button" className="polished-option" aria-label={t("Change battery level")} disabled={!enabled} aria-expanded={open} onClick={()=>setOpen(!open)}><span className="option-face"><span className="battery-glyph"><i style={{width:battery+'%'}}/></span></span><small>{t("Battery")}</small></button>
    {open&&<Picker anchor={trigger} label={t("Battery level")} className="battery-picker" onClose={()=>setOpen(false)}><output>{battery}%</output><div className="battery-well"><div className="battery-fluid" style={{height:battery+'%'}}/><input type="range" aria-label={t("Battery percentage")} aria-valuetext={battery+' percent'} min="0" max="100" value={battery} onChange={event=>update({statusBattery:event.target.valueAsNumber,cleanup:'replace'})}/></div><button className="round-action battery-confirm" type="button" aria-label={t("Confirm battery level")} onClick={()=>{setOpen(false);trigger.current.focus({preventScroll:true});}}><Glyph name="next"/></button></Picker>}
  </div>;
}

function TimeWheel({label,options,initial,onChange,tick,unlock}) {
  const wheel=useRef(null),[selected,setSelected]=useState(initial),previous=useRef(initial);
  useEffect(()=>{wheel.current.scrollTop=initial*44;},[]);
  const select=index=>wheel.current.scrollTo({top:Math.max(0,Math.min(options.length-1,index))*44,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  return <div ref={wheel} className="time-wheel" role="spinbutton" tabIndex="0" aria-label={label} aria-valuemin="0" aria-valuemax={options.length-1} aria-valuenow={selected} aria-valuetext={String(options[selected])} onPointerDown={unlock} onScroll={()=>{const index=Math.max(0,Math.min(options.length-1,Math.round(wheel.current.scrollTop/44)));if(index!==previous.current){previous.current=index;setSelected(index);onChange(index);tick();}}} onKeyDown={event=>{unlock();if(['ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key)){event.preventDefault();select(event.key==='Home'?0:event.key==='End'?options.length-1:previous.current+{ArrowUp:-1,ArrowDown:1,PageUp:-5,PageDown:5}[event.key]);}}}>{options.map((item,index)=><div key={index} aria-hidden="true" className={'time-step'+(index===selected?' selected':'')} onClick={()=>select(index)}>{item}</div>)}</div>;
}

export function TimeControls({value,onDone}) {
  const [initialHour,initialMinute]=value.split(':').map(Number),[hour,setHour]=useState(initialHour%12||12),[minute,setMinute]=useState(initialMinute),[period,setPeriod]=useState(initialHour>=12?1:0);
  const unlock=()=>{},tick=hapticSelection;
  return <div className="time-picker-content"><div className="time-wheel-labels"><span>{t("Hour")}</span><span>{t("Minute")}</span><span>{t("Period")}</span></div><div className="time-wheel-group"><div className="time-selection-band" aria-hidden="true"/>
    <TimeWheel label={t("Hour")} options={Array.from({length:12},(_,index)=>index+1)} initial={(initialHour%12||12)-1} onChange={index=>setHour(index+1)} tick={tick} unlock={unlock}/><TimeWheel label={t("Minute")} options={Array.from({length:60},(_,index)=>String(index).padStart(2,'0'))} initial={initialMinute} onChange={setMinute} tick={tick} unlock={unlock}/><TimeWheel label={t("Period")} options={['AM','PM']} initial={initialHour>=12?1:0} onChange={setPeriod} tick={tick} unlock={unlock}/>
    </div><div className="time-picker-footer"><button type="button" className="time-confirm" onClick={()=>onDone(String(hour%12+period*12).padStart(2,'0')+':'+String(minute).padStart(2,'0'))}>{t("Done")}</button></div></div>;
}
