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
