import React, { useRef, useState } from 'react';
import { Picker } from './editor-controls.jsx';
import { t } from './i18n.js';
import './draft-tiles.css';

function Glyph({name='image'}) {
  const paths={image:<><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="15.5" cy="8.5" r="1.5"/><path d="m4 17 5-5 4 4 3-3 5 5"/></>,more:<>{[5,12,19].map(x=><circle key={x} cx={x} cy="12" r="1.3" fill="currentColor" stroke="none"/>)}</>,edit:<><path d="m5 15 10-10 4 4L9 19l-5 1Z"/><path d="m13 7 4 4"/></>,trash:<path d="M5 7h14m-9-3h4M7 7l1 13h8l1-13m-7 4v5m4-5v5"/>,play:<path d="m9 6 9 6-9 6Z"/>};
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}
export default function DraftTile({draft,onOpen,onRemove}) {
  const anchor=useRef(null),[open,setOpen]=useState(false),[confirm,setConfirm]=useState(false);
  if(!draft)return <span className="draft-tile draft-tile-empty" aria-hidden="true"><Glyph/></span>;
  const video=(draft.items?.[draft.active??0]?.source??draft.source)?.kind==='video';
  return <div className="draft-tile-wrap"><button type="button" className="draft-tile" aria-label={draft.title+'. '+t('Continue editing')} onClick={()=>onOpen(draft)}>
    {draft.preview?<img src={draft.preview} alt="" width="384" height="384" decoding="async" loading="lazy"/>:<span className="draft-tile-fallback"><Glyph/></span>}
    {video&&<span className="draft-video-badge" aria-hidden="true"><Glyph name="play"/></span>}
  </button>
    {onRemove&&<button ref={anchor} type="button" className="draft-tile-options" aria-label={t('Draft options')+': '+draft.title} aria-expanded={open} onClick={()=>{setConfirm(false);setOpen(value=>!value);}}><span><Glyph name="more"/></span></button>}
    {open&&<Picker anchor={anchor} label={t('Draft options')} className="draft-options-picker" onClose={()=>{setOpen(false);setConfirm(false);}}>
      {!confirm&&<button key="edit" type="button" onClick={()=>{setOpen(false);onOpen(draft);}}><Glyph name="edit"/><span>{t('Continue editing')}</span></button>}
      <button key="delete" type="button" className="draft-delete-choice" onClick={()=>{if(!confirm){setConfirm(true);return;}onRemove(draft);setOpen(false);}}><Glyph name="trash"/><span>{t(confirm?'Delete draft':'Delete')}</span></button>
      {confirm&&<button key="cancel" type="button" onClick={()=>{anchor.current?.focus({preventScroll:true});setOpen(false);setConfirm(false);}}>{t('Cancel')}</button>}
    </Picker>}
  </div>;
}
