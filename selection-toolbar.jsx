import React,{useRef,useState} from 'react';
import {Picker} from './editor-controls.jsx';
import {t} from './i18n.js';
export function SelectionIcon({name}){
  const shapes={
    pattern:<>{[4,14].flatMap(x=>[4,14].map(y=><rect key={x+':'+y} x={x} y={y} width="6" height="6" rx="1.5"/>))}</>,
    duplicate:<><rect x="8" y="3" width="13" height="13" rx="2"/><path d="M5 8H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-1"/></>,
    more:<>{[5,12,19].map(x=><circle key={x} cx={x} cy="12" r="1" fill="currentColor" stroke="none"/>)}</>,
    lock:<><rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></>,
    unlock:<><rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 7.6-1.7M12 15v2"/></>,
    front:<><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M4 13H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-1M13 4V3a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-1"/></>,
    back:<><rect x="2" y="13" width="9" height="9" rx="1.5"/><rect x="13" y="2" width="9" height="9" rx="1.5"/><path d="M7 10V8a1 1 0 0 1 1-1h2m4 10h2a1 1 0 0 0 1-1v-2"/></>,
    crop:<path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14"/>,
    frame:<><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/></>,
    frameoff:<><path d="M6 7V5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v8m0 4v2a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-8M10 5h4M3 3l18 18"/></>,
    flip:<><path d="M12 3v2m0 4v2m0 4v2m0 4v.01M9 5 3 9v6l6 4Zm6 0 6 4v6l-6 4Z"/></>,
    trash:<><path d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14M10 10v7m4-7v7"/></>,
    fill:<><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 16 5-5 5 5 3-3 5 5"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{shapes[name]??shapes.more}</svg>;
}
export default function SelectionToolbar({children,style,label,items=[],locked=false,onLock}){
  const anchor=useRef(null),[open,setOpen]=useState(false);
  return <><div className="text-floating-toolbar" role="toolbar" aria-label={t(label)} style={style} onPointerDown={e=>{e.stopPropagation();e.preventDefault();}}>
    {onLock&&<button type="button" className="selection-lock" aria-label={t(locked?'Unlock':'Lock')} aria-pressed={locked} onClick={onLock}><SelectionIcon name={locked?'lock':'unlock'}/></button>}{children}<button ref={anchor} type="button" aria-label={t('More actions')} aria-haspopup="menu" aria-expanded={open} onKeyDown={event=>{if(event.key==='ArrowDown'){event.preventDefault();setOpen(true);}}} onClick={()=>setOpen(!open)}><SelectionIcon name="more"/></button>
  </div>{open&&<Picker menu anchor={anchor} placement="above" label={t('More actions')} className="selection-more-menu action-menu" onClose={()=>setOpen(false)}>{items.map(item=><button key={item.label} type="button" disabled={item.disabled} onClick={()=>{anchor.current?.focus({preventScroll:true});setOpen(false);item.action();}}><SelectionIcon name={item.icon}/><span>{t(item.label)}</span></button>)}</Picker>}</>;
}
