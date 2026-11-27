import { t } from './i18n.js';
import React, { useState } from 'react';
import DraftTile from './draft-tiles.jsx';
import './home.css';

function CreateIcon({ type }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{type==='image'
    ? <><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="15.5" cy="8.5" r="1.5"/><path d="m4 17 5-5 4 4 3-3 5 5"/></>
    : type==='video' ? <><rect x="2" y="5" width="14" height="14" rx="4"/><path d="m16 10 6-4v12l-6-4"/></>
    : type==='plus' ? <path d="M12 5v14M5 12h14"/>
    : <><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6M9 12h6M9 16h3"/></>}
  </svg>;
}

export default function HomeScreen({ busy, onPick, onDrop, recent, onOpen, onFiles }) {
  const [dragging,setDragging] = useState(false);
  const drafts=recent?.slice(0,9) ?? [];
  return <div className="home-screen">
    <section className={'create-dock'+(dragging?' is-dragging':'')} aria-label={t("Create a mockup")}
      onDragOver={event=>{event.preventDefault();setDragging(true);}}
      onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget))setDragging(false);}}
      onDrop={event=>{event.preventDefault();setDragging(false);if(!busy)onDrop([...event.dataTransfer.files]);}}>
      <button type="button" className="create-shortcut" aria-label={t("Select images")} disabled={busy} onClick={()=>onPick('image')}><CreateIcon type="image"/></button>
      <button type="button" className="create-main" aria-label={t(busy?'Opening media':'Select an image or video')} disabled={busy} onClick={()=>onPick()}>
        <span className="create-plus"><CreateIcon type="plus"/></span>
        <span className="create-ribbon" aria-hidden="true">{t(busy?'Opening…':'Image or video')}</span>
      </button>
      <button type="button" className="create-shortcut" aria-label={t("Select a video")} disabled={busy} onClick={()=>onPick('video')}><CreateIcon type="video"/></button>
    </section>
    <section className="draft-gallery" aria-labelledby="home-drafts-heading" aria-busy={!recent}>
      <button className="draft-gallery-heading" type="button" onClick={onFiles} aria-label={t("View all files")}><h2 id="home-drafts-heading">{t("Recent drafts")}</h2></button>
      <div className="draft-gallery-grid">
        {Array.from({length:9},(_,index)=>{
          const draft=drafts[index];
          return <DraftTile key={draft?.id??'empty-'+index} draft={draft} onOpen={onOpen}/>;
        })}
      </div>
      {!drafts.length&&<span className="visually-hidden">{t(recent?'No drafts yet. Save your work in the editor to continue later.':'Loading drafts')}</span>}
    </section>
  </div>;
}
