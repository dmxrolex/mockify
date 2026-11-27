import React, { useEffect, useRef, useState } from 'react';
import { t } from './i18n.js';
import { Range } from './text-editor.jsx';
import { hapticSelection, hapticImpact } from './haptics.js';
import { markVisible, prepareMarkImage } from './watermark.js';
import './watermark-sheet.css';

const place={
  'top-left':<path d="M7 15V7h8"/>,'top-right':<path d="M9 7h8v8"/>,center:<><rect x="8" y="9" width="8" height="6" rx="2"/><path d="M4 12h2m12 0h2"/></>,
  'bottom-left':<path d="M7 9v8h8"/>,'bottom-right':<path d="M17 9v8H9"/>,tiled:<path d="M5 9l4-4M5 15 15 5M5 20 20 5M10 20l10-10M16 20l4-4"/>,
};
const placeLabel={'top-left':'Top left','top-right':'Top right',center:'Centre','bottom-left':'Bottom left','bottom-right':'Bottom right',tiled:'Tiled'};
const Svg=({children})=><svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;

// Half-screen watermark editor. The canvas stays visible above it and updates live.
export default function WatermarkSheet({mark,onChange,onDone,profile,ratio='square'}){
  const file=useRef(null),[busy,setBusy]=useState(false);
  useEffect(()=>{if(!('switch' in HTMLInputElement.prototype))import('input-switch-polyfill').catch(()=>{});},[]);
  const set=patch=>onChange({...patch,on:patch.on??true});
  const usingProfile=mark.kind==='image'?Boolean(profile?.avatar)&&mark.image===profile.avatar:Boolean(profile)&&mark.photo&&mark.text===profile.handle;
  function useProfile(){
    if(!profile)return;hapticImpact('medium');
    if(mark.kind==='image')set({image:profile.avatar,shape:'circle'});
    else set({text:profile.handle,photo:true,badge:profile.avatar,initials:profile.initials});
  }
  async function upload(event){
    const chosen=event.target.files?.[0];event.target.value='';if(!chosen)return;
    setBusy(true);try{set({kind:'image',image:await prepareMarkImage(chosen),shape:'original'});}finally{setBusy(false);}
  }
  return <section className="mark-sheet" aria-label={t('Watermark')}>
    <span className="mark-grabber" aria-hidden="true"/>
    <header className="mark-header">
      <label className="mark-switch"><input type="checkbox" switch="" role="switch" checked={mark.on} onChange={event=>{hapticSelection();onChange({on:event.target.checked});}}/><span>{t(mark.on?'On':'Off')}</span></label>
      <h2>{t('Watermark')}</h2>
      <button type="button" className="ios-text-done mark-done" onClick={onDone}>{t('Done')}</button>
    </header>
    <div className="mark-scroll">
      <div className="ios-segment" role="radiogroup" aria-label={t('Watermark type')} style={{'--segment':mark.kind==='image'?1:0}}>
        {[['text','Text'],['image','Image']].map(([kind,label])=><button key={kind} type="button" role="radio" aria-checked={mark.kind===kind} onClick={()=>{hapticSelection();set({kind});}}>{t(label)}</button>)}
      </div>

      <button type="button" className="mark-profile" aria-pressed={usingProfile} disabled={!profile||(mark.kind==='image'&&!profile.avatar)} onClick={useProfile}>
        <span className="mark-avatar">{profile?.avatar?<img src={profile.avatar} alt=""/>:<b>{profile?.initials??'?'}</b>}</span>
        <span className="mark-profile-text"><strong>{profile?.name||t('Your Telegram')}</strong><small>{profile?(mark.kind==='image'?t('Use my profile photo'):profile.handle):t('Open Mockify in Telegram to use your profile')}</small></span>
        <span className="mark-use">{usingProfile?<Svg><path d="m5 12 5 5 9-10"/></Svg>:t('Use')}</span>
      </button>

      {mark.kind==='text'?<div className="mark-group">
        <input className="mark-input" type="text" maxLength={40} enterKeyHint="done" placeholder={t('@yourchannel or any text')} aria-label={t('Watermark text')} value={mark.text} onChange={event=>set({text:event.target.value})} onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}}/>
        <div className="mark-chips">
          <button type="button" aria-pressed={mark.style==='pill'} onClick={()=>{hapticSelection();set({style:'pill'});}}>{t('Pill')}</button>
          <button type="button" aria-pressed={mark.style==='plain'} onClick={()=>{hapticSelection();set({style:'plain'});}}>{t('Plain')}</button>
          <button type="button" aria-pressed={mark.photo} disabled={!mark.badge&&!profile} onClick={()=>{hapticSelection();set(mark.photo?{photo:false}:{photo:true,badge:mark.badge||profile?.avatar||'',initials:mark.initials||profile?.initials||''});}}>{t('Photo')}</button>
        </div>
      </div>:<div className="mark-group">
        <div className="mark-image-row">
          <button type="button" className="mark-upload" aria-busy={busy} onClick={()=>file.current.click()}>
            <span className="mark-thumb" data-shape={mark.shape}>{mark.image?<img src={mark.image} alt=""/>:<Svg><path d="M12 5v14M5 12h14"/></Svg>}</span>
            <span><strong>{t(mark.image?'Change image':'Choose image')}</strong><small>{t('A logo with a transparent background works best')}</small></span>
          </button>
        </div>
        <div className="mark-chips">
          <button type="button" aria-pressed={mark.shape==='original'} onClick={()=>{hapticSelection();set({shape:'original'});}}>{t('Original')}</button>
          <button type="button" aria-pressed={mark.shape==='circle'} onClick={()=>{hapticSelection();set({shape:'circle'});}}>{t('Circle')}</button>
        </div>
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={upload}/>
      </div>}

      <h3 className="mark-label">{t('Placement')}</h3>
      {/* A small canvas: tap where the watermark goes, or tile it across the design. */}
      <div className="mark-place-row">
        <div className="mark-pad" role="radiogroup" aria-label={t('Placement')} data-tiled={mark.placement==='tiled'||undefined} style={{'--pad-ratio':{story:.5625,portrait:.8,wide:16/9}[ratio]??1}}>
          {['top-left','top-right','center','bottom-left','bottom-right'].map(key=><button key={key} type="button" className="mark-spot" data-spot={key} role="radio" aria-checked={mark.placement===key} aria-label={t(placeLabel[key])} onClick={()=>{hapticSelection();set({placement:key});}}><i/></button>)}
        </div>
        <button type="button" className="mark-tiled" aria-pressed={mark.placement==='tiled'} onClick={()=>{hapticSelection();set({placement:mark.placement==='tiled'?'bottom-right':'tiled'});}}>
          <Svg>{place.tiled}</Svg><span><strong>{t('Tiled')}</strong><small>{t('Repeat across the design')}</small></span>
        </button>
      </div>

      <div className="mark-ranges">
        <Range label={t('Size')} min={40} max={220} value={mark.size} display={mark.size+'%'} onChange={size=>set({size})}/>
        <Range label={t('Opacity')} min={10} max={100} value={mark.opacity} display={mark.opacity+'%'} onChange={opacity=>set({opacity})}/>
        {mark.placement==='tiled'&&<Range label={t('Density')} min={1} max={5} value={mark.density} display={['','Airy','Light','Balanced','Dense','Packed'][mark.density]&&t(['','Airy','Light','Balanced','Dense','Packed'][mark.density])} onChange={density=>set({density})}/>}
      </div>
      {!markVisible(mark)&&mark.on&&<p className="mark-hint">{t(mark.kind==='image'?'Choose an image or use your profile photo.':'Type something or use your Telegram profile.')}</p>}
    </div>
  </section>;
}
