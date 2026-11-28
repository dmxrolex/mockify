import React, { useEffect, useRef, useState } from 'react';
import { t } from './i18n.js';
import { hapticImpact, hapticSelection } from './haptics.js';
import './draft-tiles.css';

function Glyph({name='image'}) {
  const paths={image:<><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="15.5" cy="8.5" r="1.5"/><path d="m4 17 5-5 4 4 3-3 5 5"/></>,trash:<path d="M5 7h14m-9-3h4M7 7l1 13h8l1-13m-7 4v5m4-5v5"/>,play:<path d="m9 6 9 6-9 6Z"/>};
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

// Saved drafts: tap to continue editing. Hold (or right-click / context-menu key) shows a delete
// button on that draft only; tapping it asks once more ("Delete"), and tapping anywhere else
// puts it away.
export default function DraftGrid({list,onOpen,onRemove}){
  const [armed,setArmed]=useState(null),[confirming,setConfirming]=useState(false),root=useRef(null),hold=useRef({timer:0,fired:false});
  const disarm=()=>{setArmed(null);setConfirming(false);};
  useEffect(()=>{
    if(!armed)return;
    const away=event=>{if(!event.target.closest?.('.draft-delete'))disarm();};
    const escape=event=>{if(event.key==='Escape')disarm();};
    document.addEventListener('pointerdown',away,true);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',away,true);document.removeEventListener('keydown',escape);};
  },[armed]);
  const arm=draft=>{hapticImpact('medium');setConfirming(false);setArmed(draft.id);};
  const press=draft=>({
    onPointerDown:()=>{clearTimeout(hold.current.timer);hold.current.fired=false;hold.current.timer=setTimeout(()=>{hold.current.fired=true;arm(draft);},450);},
    onPointerUp:()=>clearTimeout(hold.current.timer),onPointerLeave:()=>clearTimeout(hold.current.timer),onPointerCancel:()=>clearTimeout(hold.current.timer),
    onContextMenu:event=>{event.preventDefault();clearTimeout(hold.current.timer);hold.current.fired=true;arm(draft);},
    onKeyDown:event=>{if(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10')){event.preventDefault();arm(draft);}},
    onClick:()=>{if(hold.current.fired){hold.current.fired=false;return;}if(!armed)onOpen(draft);},
  });
  return <div ref={root} className="page draft-gallery-grid files-grid" data-armed={armed?'':undefined} aria-label={t('Saved work')}>
    {list.map(draft=>{
      const video=(draft.items?.[draft.active??0]?.source??draft.source)?.kind==='video',isArmed=armed===draft.id;
      return <div key={draft.id} className="draft-tile-wrap" data-armed={isArmed?'':undefined}>
        <button type="button" className="draft-tile" aria-label={draft.title+'. '+t('Continue editing')} {...press(draft)}>
          {draft.preview?<img src={draft.preview} alt="" width="384" height="384" decoding="async" loading="lazy" draggable={false}/>:<span className="draft-tile-fallback"><Glyph/></span>}
          {video&&<span className="draft-video-badge" aria-hidden="true"><Glyph name="play"/></span>}
        </button>
        {isArmed&&onRemove&&<button type="button" className="draft-delete" data-confirm={confirming?'':undefined} autoFocus aria-label={t(confirming?'Delete draft':'Delete')+': '+draft.title}
          onClick={()=>{if(!confirming){hapticSelection();setConfirming(true);return;}hapticImpact('heavy');disarm();onRemove(draft);}}>
          <Glyph name="trash"/>{confirming&&<span>{t('Delete')}</span>}
        </button>}
      </div>;
    })}
  </div>;
}
