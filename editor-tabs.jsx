import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { t } from './i18n.js';
import { builtInLooks, lookPreview, sameLook, savedLooks, storeLooks } from './looks.js';
import { hapticSelection, hapticImpact } from './haptics.js';
import { dismissBackdrop } from './dialog-dismiss.js';
import './editor-tabs.css';

const glyph={
  plus:<path d="M12 5v14M5 12h14"/>,
  check:<path d="m5 12 5 5 9-10"/>,
  close:<path d="M7 7l10 10M17 7 7 17"/>,
  back:<path d="m15 5-7 7 7 7"/>,
};
const Glyph=({name})=><svg viewBox="0 0 24 24" aria-hidden="true">{glyph[name]}</svg>;

function LookFace({look}){
  const p=lookPreview(look);
  return <span className="look-face" style={{'--look-bg':p.background,'--look-finish':p.finish}} data-long={p.long||undefined}><i/></span>;
}

// Looks come first: saved looks, then ready-made ones. Long-press a saved look to remove it.
export function LooksRow({settings,onApply,onSave,autoId}){
  const [saved,setSaved]=useState(savedLooks),[removing,setRemoving]=useState(null),hold=useRef(null);
  useEffect(()=>()=>clearTimeout(hold.current),[]);
  function save(){
    const look=onSave();if(!look)return;
    const next=[look,...saved.filter(item=>item.id!==look.id)];if(storeLooks(next))setSaved(next.slice(0,8));hapticImpact('medium');
  }
  function remove(id){const next=saved.filter(item=>item.id!==id);storeLooks(next);setSaved(next);setRemoving(null);hapticImpact('light');}
  const press=look=>({
    onPointerDown:()=>{clearTimeout(hold.current);if(look.custom)hold.current=setTimeout(()=>{setRemoving(look.id);hapticImpact('medium');},480);},
    onPointerUp:()=>clearTimeout(hold.current),onPointerLeave:()=>clearTimeout(hold.current),onPointerCancel:()=>clearTimeout(hold.current),
    onContextMenu:event=>{if(look.custom){event.preventDefault();setRemoving(look.id);}},
  });
  const looks=[...saved.map(item=>({...item,custom:true})),...builtInLooks];
  const currentId=looks.find(look=>sameLook(look,settings))?.id;
  return <div className="looks-row" role="group" aria-label={t('Looks')} onKeyDown={event=>{if(event.key==='Escape')setRemoving(null);}}>
    <button type="button" className="look-tile look-save" onClick={save}><span className="look-face"><Glyph name="plus"/></span><small>{t('Save look')}</small></button>
    {looks.map(look=><div key={look.id} className="look-cell">
      <button type="button" className="look-tile" aria-pressed={look.id===currentId} {...press(look)} onClick={()=>{if(removing){setRemoving(null);return;}hapticSelection();onApply(look);}}>
        <LookFace look={look}/>{look.id===autoId&&<b className="look-auto" title={t('Applied to new screenshots')}>A</b>}<small>{look.custom?look.name:t(look.name)}</small>
      </button>
      {removing===look.id&&<button type="button" className="look-remove" aria-label={t('Remove look')+' '+look.name} onClick={()=>remove(look.id)}><Glyph name="close"/></button>}
    </div>)}
  </div>;
}

// The bottom tab bar: few, stable entries. `context` marks the tab for what was last tapped.
export function ToolTabs({tabs,context,onOpen}){
  return <div className="toolstrip tool-tabs" role="toolbar" aria-label={t('Editor tools')}>
    {tabs.map(tab=><button key={tab.key} data-tool={tab.key} type="button" disabled={tab.disabled} data-context={context===tab.key||undefined} onClick={()=>{hapticSelection();onOpen(tab.key);}}>
      <span>{tab.icon}</span>{t(tab.label)}
    </button>)}
  </div>;
}

// A tab's panel: back, then chips for the tools it merges, then that tool's controls.
export function GroupPanel({label,chips,active,onChip,onBack,children}){
  const row=useRef(null);
  // Keep the chosen chip visible by scrolling only the chip row, never the panel.
  useLayoutEffect(()=>{const node=row.current,chip=node?.querySelector('[aria-pressed=true]');if(!chip)return;const left=chip.offsetLeft-node.offsetLeft,right=left+chip.offsetWidth;if(left<node.scrollLeft)node.scrollLeft=left-8;else if(right>node.scrollLeft+node.clientWidth)node.scrollLeft=right-node.clientWidth+8;},[active]);
  return <div className="group-panel" role="group" aria-label={t(label)}>
    <div className="group-heading">
      <button type="button" className="group-back controls-back" aria-label={t('Back to editor controls')} onClick={onBack}><Glyph name="back"/></button>
      <div ref={row} className="group-chips" role="tablist" aria-label={t(label)}>
        {chips.map(chip=><button key={chip.key} type="button" role="tab" aria-selected={active===chip.key} aria-pressed={active===chip.key} disabled={chip.disabled} onClick={()=>{hapticSelection();onChip(chip.key);}}>{t(chip.label)}</button>)}
      </div>
    </div>
    <div className="group-body" key={active}>{children}</div>
  </div>;
}

export function MorePanel({items,onBack}){
  return <div className="group-panel more-panel" role="group" aria-label={t('More tools')}>
    <div className="group-heading"><button type="button" className="group-back controls-back" aria-label={t('Back to editor controls')} onClick={onBack}><Glyph name="back"/></button><span className="group-title">{t('More')}</span></div>
    <div className="more-grid">{items.map(item=><button key={item.key} type="button" data-tool={item.key} disabled={item.disabled} onClick={()=>{hapticSelection();item.action();}}><span>{item.icon}</span>{t(item.label)}</button>)}</div>
  </div>;
}

// The single "+" entry point for everything that can be added.
export function AddSheet({items,onClose}){
  const dialog=useRef(null),choice=useRef(null);
  useLayoutEffect(()=>{dialog.current.showModal();dialog.current.querySelector('button')?.focus({preventScroll:true});},[]);
  return <dialog ref={dialog} className="add-sheet" closedby="any" aria-label={t('Add')} onClick={event=>dismissBackdrop(event,()=>dialog.current.close())} onClose={()=>{const action=choice.current;onClose();action?.();}}>
    <div className="add-grid">{items.map(item=><button key={item.key} type="button" disabled={item.disabled} onClick={()=>{choice.current=item.action;dialog.current.close();}}><span>{item.icon}</span><strong>{t(item.label)}</strong>{item.caption&&<small>{t(item.caption)}</small>}</button>)}</div>
  </dialog>;
}

const markGlyph={
  none:<><circle cx="12" cy="12" r="8"/><path d="m6.5 17.5 11-11"/></>,
  name:<><circle cx="9" cy="12" r="3.2"/><path d="M14.5 10.5h5M14.5 13.5h3.5"/><rect x="3" y="7" width="18" height="10" rx="5"/></>,
  text:<><rect x="3" y="7" width="18" height="10" rx="5"/><path d="M8 10.5h8M10 13.5h4"/></>,
  tiled:<path d="M4 9 9 4M4 15 15 4M4 21 21 4M10 21 21 10M16 21l5-5"/>,
};
const cornerGlyph={'top-left':'M8 16V8h8','top-right':'M8 8h8v8','bottom-left':'M8 8v8h8','bottom-right':'M16 8v8H8'};

// Watermark: one panel — pick a style, then place it. Name uses the Telegram photo and @handle.
export function WatermarkPanel({mark,onChange,onBack,onName,namePending=false,hasProfile=true}){
  const styles=[['none','None'],['name','My name'],['text','Text'],['tiled','Tiled']];
  const choose=style=>{hapticSelection();if(style==='name'&&!mark.name&&!mark.badge)onName();onChange({style});};
  return <div className="group-panel watermark-panel" role="group" aria-label={t('Watermark')}>
    <div className="group-heading"><button type="button" className="group-back controls-back" aria-label={t('Back to editor controls')} onClick={onBack}><Glyph name="back"/></button><span className="group-title">{t('Watermark')}</span></div>
    <div className="mark-styles" role="radiogroup" aria-label={t('Watermark style')}>
      {styles.map(([value,label])=><button key={value} type="button" role="radio" aria-checked={mark.style===value} aria-pressed={mark.style===value} disabled={value==='name'&&!hasProfile} onClick={()=>choose(value)}>
        <span><svg viewBox="0 0 24 24" aria-hidden="true">{markGlyph[value]}</svg></span>{t(label)}
      </button>)}
    </div>
    <div className="mark-options" data-style={mark.style}>
      {(mark.style==='text'||mark.style==='tiled'||mark.style==='none')&&<input className="mark-text" type="text" maxLength={40} enterKeyHint="done" placeholder={t('@yourchannel')} aria-label={t('Watermark text')} value={mark.text} disabled={mark.style==='none'} onChange={event=>onChange({text:event.target.value})} onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}}/>}
      {mark.style==='name'&&<span className="mark-name">{namePending?t('Loading…'):mark.name||t('Telegram name')}</span>}
      {mark.style!=='tiled'&&<div className="mark-corners" role="radiogroup" aria-label={t('Watermark position')}>
        {Object.entries(cornerGlyph).map(([corner,path])=><button key={corner} type="button" role="radio" aria-checked={mark.corner===corner} aria-label={t(corner.replace('-',' '))} disabled={mark.style==='none'} onClick={()=>{hapticSelection();onChange({corner});}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={path}/></svg></button>)}
      </div>}
      <div className="mark-sizes" role="radiogroup" aria-label={t('Watermark size')}>
        {[['s','S'],['m','M'],['l','L']].map(([size,label])=><button key={size} type="button" role="radio" aria-checked={mark.size===size} disabled={mark.style==='none'} onClick={()=>{hapticSelection();onChange({size});}}>{label}</button>)}
      </div>
    </div>
  </div>;
}
