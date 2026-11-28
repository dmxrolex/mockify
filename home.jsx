import { t } from './i18n.js';
import React, { useState } from 'react';
import {LookThumb,useLookPress} from './looks-ui.jsx';
import './home.css';

function CreateIcon({ type }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{type==='image'
    ? <><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="15.5" cy="8.5" r="1.5"/><path d="m4 17 5-5 4 4 3-3 5 5"/></>
    : type==='video' ? <><rect x="2" y="5" width="14" height="14" rx="4"/><path d="m16 10 6-4v12l-6-4"/></>
    : type==='plus' ? <path d="M12 5v14M5 12h14"/>
    : <><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6M9 12h6M9 16h3"/></>}
  </svg>;
}

export default function HomeScreen({ busy, onPick, onDrop, recent, onOpen, looks, lookLimit, starters, onUseLook, onManageLook }) {
  const [dragging,setDragging] = useState(false);
  const last=recent?.[0],press=useLookPress(onUseLook,onManageLook),pressStarter=useLookPress(onUseLook);
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

    {last&&<button type="button" className="home-continue" onClick={()=>onOpen(last)}>
      <span className="home-continue-art">{last.preview?<img src={last.preview} alt="" decoding="async"/>:<CreateIcon type="image"/>}</span>
      <span className="home-continue-text"><small>{t('Continue editing')}</small><strong>{last.title||t('Untitled')}</strong></span>
      <span className="home-continue-go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></span>
    </button>}

    {/* Your Looks: saved designs to reuse. Tap to start, long-press for more. */}
    <section className="home-looks" aria-labelledby="home-looks-heading">
      <header><h2 id="home-looks-heading">{t('Your looks')}</h2>{looks&&<small>{looks.length}/{lookLimit}</small>}</header>
      <div className="home-look-row">
        {(looks??[]).map(look=><button key={look.id} type="button" className="home-look" aria-label={look.name} {...press(look)}><LookThumb look={look}/><span>{look.name}</span></button>)}
        {(!looks||looks.length===0)&&<div className="home-look-empty"><strong>{t('Save a design as a look')}</strong><span>{t('In the editor, tap + in the looks row. Next time just drop in new screenshots.')}</span></div>}
      </div>
    </section>

    <section className="home-looks" aria-labelledby="home-starters-heading">
      <header><h2 id="home-starters-heading">{t('Starter looks')}</h2></header>
      <div className="home-look-row">
        {starters.map(look=><button key={look.id} type="button" className="home-look" aria-label={t(look.name)} {...pressStarter(look)}><LookThumb look={look}/><span>{t(look.name)}</span></button>)}
      </div>
    </section>
  </div>;
}
