import React, { useRef, useState } from 'react';
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
  const [tab,setTab]=useState('content');
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
  const hasContent=markVisible({...mark,on:true});
  function clearMark(){hapticImpact('light');onChange(mark.kind==='image'?{image:'',on:false}:{text:'',photo:false,on:false});}
  function removeProfile(){hapticSelection();onChange(mark.kind==='image'?{image:''}:{text:'',photo:false,badge:'',initials:''});}
  const photoShown=mark.photo&&!!(mark.badge||mark.initials);
  return <section className="mark-sheet" aria-label={t('Watermark')}>
    <span className="mark-grabber" aria-hidden="true"/>
    <header className="mark-header">
      {/* Adding text or an image turns the watermark on; Clear takes it off. */}
      <button type="button" className="mark-clear" disabled={!hasContent} aria-label={t('Remove watermark')} title={t('Remove watermark')} onClick={clearMark}><Svg><path d="M4.5 6.5h15M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5m-8 0 .8 12.1A2 2 0 0 0 9.3 20.5h5.4a2 2 0 0 0 2-1.9l.8-12.1"/></Svg></button>
      <h2>{t('Watermark')}</h2>
      <button type="button" className="ios-text-done mark-done" onClick={onDone}>{t('Done')}</button>
    </header>
    <div className="mark-top">
      <div className="ios-segment" role="radiogroup" aria-label={t('Watermark type')} style={{'--segment':mark.kind==='image'?1:0}}>
        {[['text','Text'],['image','Image']].map(([kind,label])=><button key={kind} type="button" role="radio" aria-checked={mark.kind===kind} onClick={()=>{if(mark.kind!==kind){hapticSelection();onChange({kind});}}}>{t(label)}</button>)}
      </div>
      <div className="ios-segment mark-tabs" role="tablist" aria-label={t('Watermark settings')} style={{'--count':3,'--segment':['content','position','look'].indexOf(tab)}}>
        {[['content','Content'],['position','Position'],['look','Look']].map(([key,label])=><button key={key} type="button" role="tab" aria-selected={tab===key} aria-checked={tab===key} onClick={()=>{if(tab!==key){hapticSelection();setTab(key);}}}>{t(label)}</button>)}
      </div>
    </div>
    <div className="mark-scroll" key={tab+mark.kind}>
      {tab==='content'&&<>
        {/* Telegram profile: one tap to use it, one tap on the cross to take it off. */}
        <div className="mark-profile" data-active={usingProfile||undefined}>
          <span className="mark-avatar">{profile?.avatar?<img src={profile.avatar} alt=""/>:<b>{profile?.initials??'?'}</b>}</span>
          <span className="mark-profile-text"><strong>{profile?.name||t('Your Telegram')}</strong><small>{profile?(mark.kind==='image'?t('Profile photo'):profile.handle):t('Open Mockify in Telegram to use your profile')}</small></span>
          {mark.kind==='text'&&<button type="button" className="mark-icon-toggle" aria-pressed={photoShown} disabled={!mark.badge&&!profile} aria-label={t(photoShown?'Hide photo':'Show photo')} title={t(photoShown?'Hide photo':'Show photo')} onClick={()=>{hapticSelection();set(photoShown?{photo:false}:{photo:true,badge:mark.badge||profile?.avatar||'',initials:mark.initials||profile?.initials||''});}}><Svg><circle cx="12" cy="9" r="3.2"/><path d="M5.5 19.5a7 7 0 0 1 13 0"/>{!photoShown&&<path d="M4 4l16 16"/>}</Svg></button>}
          {usingProfile
            ?<button type="button" className="mark-use is-on" aria-label={t('Stop using my profile')} onClick={removeProfile}><Svg><path d="m6 6 12 12M18 6 6 18"/></Svg></button>
            :<button type="button" className="mark-use" disabled={!profile||(mark.kind==='image'&&!profile.avatar)} onClick={useProfile}>{t('Use')}</button>}
        </div>
        {mark.kind==='text'
          ?<input className="mark-input" type="text" maxLength={40} enterKeyHint="done" placeholder={t('@yourchannel or any text')} aria-label={t('Watermark text')} value={mark.text} onChange={event=>set({text:event.target.value})} onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}}/>
          :<div className="mark-upload">
            <button type="button" className="mark-upload-main" aria-busy={busy} onClick={()=>file.current.click()}>
              <span className="mark-thumb" data-shape={mark.shape}>{mark.image?<img src={mark.image} alt=""/>:<Svg><path d="M12 5v14M5 12h14"/></Svg>}</span>
              <span><strong>{t(mark.image?'Change image':'Choose image')}</strong><small>{t('A logo with a transparent background works best')}</small></span>
            </button>
            <button type="button" className="mark-icon-toggle" disabled={!mark.image} aria-label={t(mark.shape==='circle'?'Circle':'Original')} title={t(mark.shape==='circle'?'Circle':'Original')} onClick={()=>{hapticSelection();set({shape:mark.shape==='circle'?'original':'circle'});}}><Svg>{mark.shape==='circle'?<circle cx="12" cy="12" r="7.5"/>:<rect x="4.5" y="4.5" width="15" height="15" rx="3.5"/>}</Svg></button>
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={upload}/>
          </div>}
      </>}
      {tab==='position'&&<>
        <div className="mark-place-row">
          <div className="mark-pad" role="radiogroup" aria-label={t('Placement')} data-tiled={mark.placement==='tiled'||undefined} style={{'--pad-ratio':{story:.5625,portrait:.8,wide:16/9}[ratio]??1}}>
            {['top-left','top-right','center','bottom-left','bottom-right'].map(key=><button key={key} type="button" className="mark-spot" data-spot={key} role="radio" aria-checked={mark.placement===key} aria-label={t(placeLabel[key])} onClick={()=>{hapticSelection();set({placement:key});}}><i/></button>)}
          </div>
          <div className="mark-place-options">
            <button type="button" className="mark-pill-option" aria-pressed={mark.placement==='tiled'} onClick={()=>{hapticSelection();set({placement:mark.placement==='tiled'?'bottom-right':'tiled'});}}><Svg>{place.tiled}</Svg>{t('Tiled')}</button>
            <div className="ios-segment mark-layer" role="radiogroup" aria-label={t('Layer')} style={{'--segment':mark.layer==='behind'?1:0}}>
              {[['front','In front'],['behind','Behind']].map(([key,label])=><button key={key} type="button" role="radio" aria-checked={(mark.layer??'front')===key} onClick={()=>{hapticSelection();set({layer:key});}}>{t(label)}</button>)}
            </div>
            <p className="mark-place-caption">{t(mark.layer==='behind'?'Behind your phones and images':'On top of everything')}</p>
          </div>
        </div>
      </>}
      {tab==='look'&&<div className="mark-ranges">
        <Range label={t('Size')} min={40} max={220} value={mark.size} display={mark.size+'%'} onChange={size=>set({size})}/>
        <Range label={t('Opacity')} min={10} max={100} value={mark.opacity} display={mark.opacity+'%'} onChange={opacity=>set({opacity})}/>
        <div className="mark-density" data-disabled={mark.placement!=='tiled'||undefined} inert={mark.placement!=='tiled'?'':undefined}><Range label={t('Density')} min={1} max={5} value={mark.density} display={t(['','Airy','Light','Balanced','Dense','Packed'][mark.density]??'')} onChange={density=>set({density})}/></div>
      </div>}
      {!hasContent&&tab==='content'&&<p className="mark-hint">{t(mark.kind==='image'?'Choose an image or use your profile photo.':'Type something or use your Telegram profile.')}</p>}
    </div>
  </section>;
}
