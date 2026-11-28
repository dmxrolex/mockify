import { t } from './i18n.js';
import React, { useState } from 'react';
import {LookThumb,useLookPress} from './looks-ui.jsx';
import AnimatedSticker from './animated-sticker.jsx';
import './home.css';

function CreateIcon({ type }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{type==='image'
    ? <><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="15.5" cy="8.5" r="1.5"/><path d="m4 17 5-5 4 4 3-3 5 5"/></>
    : type==='video' ? <><rect x="2" y="5" width="14" height="14" rx="4"/><path d="m16 10 6-4v12l-6-4"/></>
    : type==='plus' ? <path d="M12 5v14M5 12h14"/>
    : <><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6M9 12h6M9 16h3"/></>}
  </svg>;
}

const ratioLabel={square:'1:1',story:'9:16',wide:'16:9',portrait:'4:5'};
// Preview with its size badge, and the name in a small bar attached underneath.
function LookCard({look,name,...events}){
  return <button type="button" className="home-look-card" aria-label={name} {...events}>
    <span className="home-look-art"><LookThumb look={look}/><b className="home-look-ratio">{ratioLabel[look.settings?.ratio]??'1:1'}</b></span>
    <span className="home-look-label">{name}</span>
  </button>;
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

    {/* One grid, no section labels: a "Save a look" tile, then the user's Looks, then ready-made
        starters. Tap to start, long-press a Look for more. */}
    <section className="home-looks" aria-label={t('Looks')}>
      <div className="home-look-grid">
        <button type="button" className="home-save-tile" onClick={()=>onPick()} disabled={busy}>
          <AnimatedSticker as="span" slot="looks" className="home-look-duck" fallback={<span className="home-look-empty-art" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="7.5" y="3.5" width="12" height="15" rx="3"/><path d="M4.5 7.5v10a3 3 0 0 0 3 3h7.5"/><path d="M13.5 8v6m-3-3h6"/></svg></span>}/>
          <strong>{t('Save a look')}</strong>
          {looks&&<small>{looks.length}/{lookLimit}</small>}
        </button>
        {looks?.map(look=><LookCard key={look.id} look={look} name={look.name} {...press(look)}/>)}
        {starters.map(look=><LookCard key={look.id} look={look} name={t(look.name)} {...pressStarter(look)}/>)}
      </div>
    </section>
  </div>;
}
