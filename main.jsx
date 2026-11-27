import {useStarPayments} from './payments-client.js';
import {WelcomeCredits,DraftLimitSheet,PurchaseSuccessSheet} from './credits-ui.jsx';
import {FREE_DRAFT_LIMIT,premiumActive} from './credit-model.js';
import VideoTimeline from './video-timeline.jsx';
import { LooksRow, ToolTabs, GroupPanel, MorePanel, AddSheet } from './editor-tabs.jsx';
import { applyLook, captureLook, savedLooks, findLook } from './looks.js';
import {ShowcaseCanvas,TouchRecorder} from './showcase-editor.jsx';
import TimelineInspector from './timeline-inspector.jsx';
import {useSequencePlayback} from './use-sequence-playback.js';
import {timelineFor,timelineDuration,placedClips,timelineOwner,effectTime,cameraValue,cameraFrames,timelineId,updateTimeline,removeTimelineItem,splitTimelineClip} from './timeline-model.js';
import {recordingInScene} from './video-plan.js';
import {assetLibrary,assetFor,loadAsset} from './asset-library.js';
import React, { useEffect, useLayoutEffect, useId, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {flushSync} from 'react-dom';
import { backdrops, createRenderer, defaults, detectPhone, finishes, loadDeviceArt, loadWatermarkBadge, ratios, suggestDevice, templates } from './render.js';
import { drafts, fromFile, isMedia, loadMedia, releaseMedia, setDraftOwner } from './media.js';
import { authenticateTelegram, connectTelegram } from './telegram.js';
import {dismissBackdrop} from './dialog-dismiss.js';
import CropInspector from './crop-editor.jsx';
import {backgroundGeometry} from './image-model.js';
import {canvasGestureActive} from './canvas-gesture.js';
import TelegramEntry from './telegram-entry.jsx';
import DownloadSheet from './download-sheet.jsx';
import AnimatedSticker, { preloadStickers } from './animated-sticker.jsx';
import SettingsPage from './settings-page.jsx';
import BalancePage from './balance-page.jsx';
import SubscriptionPage from './subscription-page.jsx';
import { subscriptionInfo } from './subscription-model.js';
import { HeaderCoin } from './coin-motion.jsx';
import { sceneHasMotion, EFFECT_SECONDS } from './motion-effects.js';
import { setLanguage, t } from './i18n.js';
import { setHapticsEnabled } from './haptics.js';
import { changeScene, itemId, loadProject, newProject, ownedMedia, saveProject, sceneFor } from './project.js';
import { Picker, EffectsControls, EdgesControls, ImageControls, PreviewZoom, SizeControls, BackgroundControls, ShadowControls, StatusControls, TimeControls } from './editor-controls.jsx';
import HomeScreen from './home.jsx';
import DraftTile from './draft-tiles.jsx';
import ToolScroller from './tool-scroller.jsx';
import {useProjectHistory} from './use-project-history.js';
import {sameProjectContent} from './project-history.js';
import { TextInspector, TextHandles } from './text-editor.jsx';
import { addText, patchText, textModel } from './text-model.js';
import Layers from './layers.jsx';
import { switchPanel,jellyPress } from './ui-motion.js';
import { presentationFor, imageLayers, imageSettings, patchImage } from './image-model.js';
import ImageHandles from './image-editor.jsx';
import PageObjects,{toggleFrameAtCurrentSize} from './page-objects.jsx';
import {EditorContextRow,pageSwipeMargin,usePageSwipe,PagesSheet,ToolsSheet,AdjustInspector} from './page-controls.jsx';
import {objectKeys,defaultImagePattern,ensurePages,pageFor,pageCount,pageMediaChoices,selectPage,selectObject,changePage,appendItems,addLibraryAsset,fillAssetFrame,duplicateObject,removeObject} from './page-model.js';
import { BlurInspector, BlurCanvas } from './blur-editor.jsx';
import { blurEffect, blurTargets, patchBlur } from './blur-model.js';
import PatternInspector from './pattern-editor.jsx';
import {makeProfileBadge,loadBadgeAvatar} from './profile-badge.js';
import {markOf,loadMarkAssets} from './watermark.js';
import WatermarkSheet from './watermark-sheet.jsx';
import { loadTextFonts } from './text-fonts.js';
import './styles.css';
import './navigation.css';
import './text-editor.css';

const loadFilesSticker=()=>import('./assets/files-duck.json');
// New touches keep the ring style the user last chose.
const ringOf=gesture=>gesture?.ring?{ring:gesture.ring}:{};

const paths = {
  // Animation: the touch disc used across the timeline, with motion sparks.
  showcase:<><circle cx="11" cy="13" r="3" fill="currentColor" stroke="none"/><circle cx="11" cy="13" r="7"/><path d="M18.6 5.4 17.3 6.7M21 10h-1.8M15 3v1.8"/></>,
  adjust:<><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor"/></>,
  tools:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><circle cx="17.5" cy="6.5" r="3.5"/><path d="m3 21 4-8 4 8Z"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  person: <><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></>,
  coin: <><circle cx="12" cy="12" r="9.3"/><circle cx="12" cy="12" r="7.1"/><path d="m12 6.5 1.55 3.15 3.45.5-2.5 2.44.59 3.44L12 14.4l-3.09 1.63.59-3.44L7 10.15l3.45-.5Z"/><path d="M7 3.7 5.5 5M17 3.7 18.5 5M4 8l-.4 2M20 8l.4 2"/></>,
  files: <><path d="M7 3h9l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M15 3v5h5M3 7v12m6-6h8m-8 4h5"/></>,
  navhome: <><path d="M3.5 10.1 11 4.2a1.6 1.6 0 0 1 2 0l7.5 5.9v9.1a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5Z"/><path d="M9.2 20.7v-7.2h5.6v7.2M17.5 5.3V8"/></>,
  navsettings: <><path d="M12 3 14 6l3-.3.5 3.3L20 11l-1.5 3 1 3-3 1-2 3-3-1-3 1-2-3-3-1 1-3L3 11l2.5-2 .5-3.3 3 .3Z"/><circle cx="11.5" cy="12" r="3"/></>,
  mark: <><path d="M8 4H6a2 2 0 0 0-2 2v2m12-4h2a2 2 0 0 1 2 2v2M4 16v2a2 2 0 0 0 2 2h2m8 0h2a2 2 0 0 0 2-2v-2"/><path d="m8 14 3-4 2 3 2-2 2 3"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  home: <><path d="m3 10 9-7 9 7v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 20v-6h6v6"/></>,
  drafts: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>,
  settings: <><path d="M4 7h6m4 0h6M4 17h10m4 0h2"/><circle cx="12" cy="7" r="2"/><circle cx="16" cy="17" r="2"/></>,
  back: <path d="m14 5-7 7 7 7"/>,
  arrowback: <path d="M19 12H5m6-6-6 6 6 6"/>,
  next: <path d="m9 6 6 6-6 6"/>,
  save: <path d="M6 4h12a2 2 0 0 1 2 2v13l-8-5-8 5V6a2 2 0 0 1 2-2Z"/>,
  undo: <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>,
  redo: <path d="m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>,
  more: <>{[6,12,18].map(x=><circle key={x} cx={x} cy="12" r="1.6" fill="currentColor" stroke="none"/>)}</>,
  pages: <><rect x="7" y="3" width="13" height="16" rx="2.5"/><path d="M4 7v11.5A2.5 2.5 0 0 0 6.5 21H15"/></>,
  text: <path d="M5.5 7V5h13v2M12 5v14m-3.5 0h7"/>,
  mark: <><rect x="3" y="7" width="18" height="10" rx="5"/><circle cx="8.5" cy="12" r="2.2"/><path d="M13 12h4.5"/></>,
  export: <path d="M12 3v13m-5-5 5 5 5-5m-12 6v4h14v-4"/>,
  device: <><rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 6h2"/></>,
  background: <><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 16 16 4M7 20 20 7M13 20l7-7"/></>,
  screen: <><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 9h16m-12 6h3m3 0h2"/></>,
  motion: <><path d="m12 3 2.1 6.9L21 12l-6.9 2.1L12 21l-2.1-6.9L3 12l6.9-2.1ZM20 3v4m-2-2h4"/></>,
  video:<><rect x="3" y="5" width="12" height="14" rx="3"/><path d="m15 10 6-4v12l-6-4"/></>,
  play: <path d="m8 5 11 7-11 7Z"/>,
  pause: <path d="M9 5v14m6-14v14"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  trash: <path d="M5 7h14m-9-3h4m3 3-1 13H8L7 7m3 4v5m4-5v5"/>,
  swap: <path d="M5 8h13m-4-4 4 4-4 4m5 4H6m4-4-4 4 4 4"/>,
  size: <><rect x="4" y="4" width="16" height="16" rx="3"/><path d="m9 15 6-6m-4 0h4v4m-6-2v4h4"/></>,
  shadow: <><path d="M10 20h6a3 3 0 0 0 3-3V9"/><rect x="5" y="4" width="10" height="13" rx="2.5"/></>,
  watermark: <path d="M5.5 7V5h13v2M12 5v14m-3.5 0h7"/>,
  image: <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m3 15 5-5 5 5 3-3 5 5"/></>,
  edges: <path d="M8 3H6a3 3 0 0 0-3 3v2m13-5h2a3 3 0 0 1 3 3v2M3 16v2a3 3 0 0 0 3 3h2m8 0h2a3 3 0 0 0 3-3v-2"/>,
  layers: <><path d="m3 8 9-5 9 5-9 5ZM3 12l9 5 9-5M3 16l9 5 9-5"/></>,
  blur: <><circle cx="12" cy="12" r="8" strokeDasharray="1 3"/><circle cx="12" cy="12" r="4.5" strokeDasharray="1 2.5"/><circle cx="12" cy="12" r="1"/></>,
  collage: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M12 5v14"/></>,
  matching: <><rect x="3" y="5" width="7" height="14" rx="2"/><rect x="14" y="5" width="7" height="14" rx="2"/><path d="M8 12h8"/></>,
  individual: <><rect x="3" y="5" width="7" height="14" rx="2"/><rect x="14" y="5" width="7" height="14" rx="2"/></>,
  check: <path d="m5 12 5 5 9-10"/>,
  time: <><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></>,
};

function Icon({ name }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function IconButton({ name, label, onClick, disabled }) {
  return <button className="icon-button" type="button" aria-label={t(label)} title={label} onClick={onClick} disabled={disabled}><Icon name={name}/></button>;
}


const blank = { kind: 'image', width: 1179, height: 2556, blank: true };
const screenStyles = { auto: 'iOS status bar', off: 'Original status bar' };
const frameNames = { iphone18: 'iPhone 18 Pro', flat: 'Frameless' };
const backgroundStyles = { gradient: 'Gradient', solid: 'Solid', blur: 'Blur', photo: 'Photo', transparent: 'None' };
const sizes = { square: '1:1', portrait: '4:5', story: '9:16', wide: '16:9' };
const tabs = [['home', 'Home'], ['files', 'Files'], ['settings', 'Settings']];
const panels = [['adjust','Adjust'], ['size', 'Size'], ['background', 'Background'], ['device', 'Phone'], ['edges','Edges'], ['shadow', 'Shadow'], ['screen', 'Status bar'], ['blur','Blur'], ['watermark', 'Text'], ['layers', 'Layers'], ['motion', 'Effects'], ['tools','Assets']];

function readPage() {
  const route = location.hash.slice(1);
  return route === 'drafts' ? 'files' : ['files', 'settings', 'editor', 'profile','balance','subscription'].includes(route) ? route : 'home';
}

function restorePreferences() {
  let stored;try{stored=JSON.parse(localStorage.getItem('styleit.preferences'));}catch{}
  const result={haptics:true,...stored,cleanup:stored?.cleanup==='off'?'off':'auto',language:stored?.language==='ru'?'ru':'en'};
  setLanguage(result.language);setHapticsEnabled(result.haptics);return result;
}

function FrameCanvas({ settings, source = blank, photo, ready, thumbnail = false, time = 0, interactive=false, loop = 0 }) {
  const canvas = useRef(null);
  const render = useRef(null);
  const frame = useRef(0);
  const [width, height] = ratios[settings.ratio];
  const [scale, setScale] = useState(.08);
  const allSources=Array.isArray(source)?source:[source];
  const videos=allSources.filter((media,index)=>media?.kind==='video'&&(!settings._timelineEvaluated||settings.pageObjects?.some(o=>o.index===index)));
  const videoKey=JSON.stringify(videos.map(media=>media.url));
  const snapshot=useRef(null);
  snapshot.current={settings,source,photo,time,interactive,videos};
  // Effects preview: loop the effect on the canvas without re-rendering React every frame.
  useEffect(()=>{
    if(!loop)return;
    let id=0;const start=performance.now();
    const tick=now=>{snapshot.current={...snapshot.current,time:((now-start)/1000/loop)%1};paint();id=requestAnimationFrame(tick);};
    id=requestAnimationFrame(tick);
    return()=>{cancelAnimationFrame(id);snapshot.current={...snapshot.current,time};queuePaint();};
  },[loop]);
  useEffect(()=>()=>{render.current?.dispose();render.current=null;},[]);
  useEffect(() => {
    const element = canvas.current;
    let resolution;
    const measure = () => {
      const bounds = element.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const density = Math.max(videos.length&&!thumbnail?1.5:1,window.devicePixelRatio || 1);
      // Match the physical display pixels, with a bounded allocation on large monitors.
      const next = Math.min(
        Math.max(bounds.width / width, bounds.height / height) * density,
        4096 / Math.max(width, height), Math.sqrt(8000000 / (width * height)),
      );
      setScale(previous => Math.abs(previous - next) < .001 ? previous : next);
    };
    const watchDensity = () => {
      resolution?.removeEventListener('change', watchDensity);
      resolution = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      resolution.addEventListener('change', watchDensity);
      measure();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);
    watchDensity();
    return () => {
      observer.disconnect();
      resolution?.removeEventListener('change', watchDensity);
      window.removeEventListener('resize', measure);
    };
  }, [width, height, videoKey, thumbnail]);
  function paint() {
    const state=snapshot.current;
    if(state.settings._timelineWaiting||state.videos.some(({element})=>element.seeking||element.readyState<2))return;
    render.current??=createRenderer(canvas.current);
    render.current(state.settings,state.source,state.photo,state.time,state.interactive);
  }
  function queuePaint() {
    if(frame.current)return;
    frame.current=requestAnimationFrame(()=>{frame.current=0;paint();});
  }
  useLayoutEffect(()=>{
    const callbacks=new Map();
    const seeked=event=>{
      const video=event.currentTarget;
      queuePaint();
      if(!video.paused||!video.requestVideoFrameCallback)return;
      if(callbacks.has(video))video.cancelVideoFrameCallback?.(callbacks.get(video));
      callbacks.set(video,video.requestVideoFrameCallback(()=>{
        callbacks.delete(video);
        queuePaint();
      }));
    };
    const timeChanged=event=>{if(event.currentTarget.paused)queuePaint();};
    for(const {element} of videos){
      element.addEventListener('seeked',seeked);
      element.addEventListener('timeupdate',timeChanged);
      element.addEventListener('loadeddata',queuePaint);
    }
    return ()=>{
      cancelAnimationFrame(frame.current);
      frame.current=0;
      for(const [video,id] of callbacks)video.cancelVideoFrameCallback?.(id);
      for(const {element} of videos){
        element.removeEventListener('seeked',seeked);
        element.removeEventListener('timeupdate',timeChanged);
        element.removeEventListener('loadeddata',queuePaint);
      }
    };
  },[videoKey]);
  useLayoutEffect(queuePaint,[settings,source,photo,ready,time,scale,width,height,interactive]);
  useEffect(()=>{
    let alive=true;
    Promise.allSettled([loadWatermarkBadge(settings.watermarkBadge),loadMarkAssets(settings.mark),loadTextFonts(settings)]).then(()=>{if(alive)queuePaint();});
    return ()=>{alive=false;};
  },[settings]);
  return <canvas ref={canvas} width={Math.round(width * scale)} height={Math.round(height * scale)} aria-hidden={thumbnail ? true : undefined} role={thumbnail ? undefined : 'img'} aria-label={thumbnail ? undefined : 'Mockup preview'}/>;
}

function HeaderProfile({ profile, onOpen }) {
  const name=[profile?.firstName,profile?.lastName].filter(value=>typeof value==='string'&&value.trim()).map(value=>value.trim()).join(' ')||t('Guest');
  return <button type="button" className="profile-pill glass-pill" aria-label={t("Open settings")} onClick={onOpen}>
    <span className="profile-avatar">{profile?.photoUrl ? <img src={profile.photoUrl} alt="" referrerPolicy="no-referrer"/> : <Icon name="person"/>}</span>
    <strong>{name}</strong><Icon name="next"/>
  </button>;
}

function Pills({ label, options, value, onChange }) {
  return <fieldset className="field"><legend>{t(label)}</legend><div className="pills">
    {Object.entries(options).map(([key, text]) => <button type="button" key={key} aria-pressed={value === key} onClick={() => onChange(key)}>{t(text)}</button>)}
  </div></fieldset>;
}

function Select({ label, value, onChange, options }) {
  return <label className="control-row"><span>{t(label)}</span><select value={value} onChange={event => onChange(event.target.value)}>
    {Object.entries(options).map(([key, text]) => <option value={key} key={key}>{t(text)}</option>)}
  </select></label>;
}

function Slider({ label, value, min = 0, max = 100, step = 1, suffix = '%', onChange }) {
  const id = useId();
  return <label className="range-field" htmlFor={id}><span>{label}<output aria-hidden="true">{value}{suffix}</output></span>
    <input id={id} type="range" aria-valuetext={value + suffix} min={min} max={max} step={step} value={value} onChange={event => onChange(event.target.valueAsNumber)}/>
  </label>;
}

function Swatches({ label, options, value, onChange, children }) {
  return <fieldset className="field"><legend>{t(label)}</legend><div className="swatches">
    {Object.entries(options).map(([key, item]) => <button type="button" key={key} title={item.name} aria-label={item.name} aria-pressed={value === key} onClick={() => onChange(key)}>
      <span style={{ background: item.swatch ?? `linear-gradient(135deg, ${item.colors.join(',')})` }}/>
    </button>)}
    {children}
  </div></fieldset>;
}

function RoundChoice({label, selected, onClick, children, caption, className = ''}) {
  return <button type="button" className={'round-choice ' + className} aria-label={t(label)} aria-pressed={selected} onClick={onClick}>
    <span className="choice-disc">{children}</span>{caption && <small>{caption}</small>}
  </button>;
}

function EditorControls({ panel, settings, update, source, photo, pickPhoto, replaceSource, openTime, collage, shadowWheel, onShadowWheel, removeFrame }) {
  const change = key => value => update({ [key]: value });
  switch (panel) {
    case 'edges': return <EdgesControls settings={settings} update={update} source={source}/>;
    case 'image': return <ImageControls update={update} replaceSource={replaceSource} isVideo={source?.kind==='video'}/>;
    case 'size': return <SizeControls settings={settings} update={update} collage={collage}/>;
    case 'background': return <BackgroundControls settings={settings} update={update} pickPhoto={pickPhoto} photo={photo}/>;
    case 'device':
      return <>
        <div className="choice-row">
          <RoundChoice label={t("Frameless")} selected={settings.device==='flat'} onClick={()=>removeFrame?removeFrame():change('device')('flat')}><span className="none-symbol"/></RoundChoice>
          {Object.entries(finishes).map(([key,finish])=><RoundChoice key={key} label={finish.name} selected={settings.device!=='flat'&&settings.finish===key} onClick={()=>update({device:settings.device==='flat'?'iphone18':settings.device,finish:key})}><i className="color-disc" style={{background:finish.swatch}}/></RoundChoice>)}
        </div>
      </>;
    case 'shadow': return <ShadowControls settings={settings} update={update} wheel={shadowWheel} onWheelChange={onShadowWheel}/>;
    case 'screen': return <StatusControls settings={settings} update={update} openTime={openTime}/>;
    case 'motion':
      return <EffectsControls settings={settings} update={update} video={source?.kind==='video'}/>;
    default:return null;
  }
}

function ExitPrompt({ onChoice }) {
  const dialog=useRef(null),choice=useRef('stay'),labelId=useId();
  useLayoutEffect(()=>{dialog.current.showModal();dialog.current.querySelector('.exit-save')?.focus({preventScroll:true});},[]);
  const pick=value=>{choice.current=value;dialog.current.close();};
  return <dialog ref={dialog} className="exit-prompt" closedby="any" aria-labelledby={labelId} onClick={event=>dismissBackdrop(event,()=>dialog.current.close())} onClose={()=>onChoice(choice.current)}>
    <p id={labelId}>{t('Save changes before leaving?')}</p>
    <div className="exit-actions">
      <button type="button" className="exit-discard" onClick={()=>pick('discard')}>{t("Don't save")}</button>
      <button type="button" className="exit-save" onClick={()=>pick('save')}>{t('Save')}</button>
    </div>
  </dialog>;
}

function Sheet({ title, onClose, children, className = '', initialFocus }) {
  const dialog = useRef(null);
  const labelId = useId();
  useLayoutEffect(() => {
    dialog.current.showModal();
    if(initialFocus)dialog.current.querySelector(initialFocus)?.focus({preventScroll:true});
  }, [initialFocus]);
  return <dialog ref={dialog} className={'bottom-sheet ' + className} closedby="any" onClick={event=>dismissBackdrop(event,()=>dialog.current.close())} aria-labelledby={labelId} onClose={onClose}>
    <div className="dialog-header"><h2 id={labelId}>{title}</h2><IconButton name="close" label={'Close ' + title.toLowerCase()} onClick={() => dialog.current.close()}/></div>
    {children}
  </dialog>;
}

function TimeSheet({ settings, update, onClose }) {
  return <Sheet title={t("Status bar time")} onClose={onClose} className="time-sheet polished-time-sheet">
    <TimeControls value={settings.statusTime} onDone={statusTime=>{update({statusTime,cleanup:'replace'});onClose();}}/>
  </Sheet>;
}

function Artboard({ effectLoop=0, onEmptyAdd, touchRecorder, scene, ready, time, onAdd, busy, video, textEditing, updateText, onSelectText, textFocus, onSelectImage, onImageEdges, blurSession, setBlurSession, changeBlur, blurPreview, setBlurPreview, blurAdjusting, objectActions, showcaseEditor, showcaseEditing, showcasePlaying, onTextTyping, typingHost, onCrop, onBackgroundDuplicate, pickPhoto, mediaError, onRetryMedia }) {
  const { settings, source, photo } = scene;
  const [blurView,setBlurView]=useState({scale:1,x:0,y:0});
  useEffect(()=>{setBlurView({scale:1,x:0,y:0});},[!!blurSession,blurSession?.target]);
  return <div className={'artboard ' + settings.ratio + (settings.background === 'transparent' ? ' transparent' : '')}>
    <div className="artboard-frame">
      <div className="artboard-content" style={blurSession?{transform:`translate(${blurView.x}px,${blurView.y}px) scale(${blurView.scale})`}:undefined}>
      {!blurSession&&settings.background==='photo'&&photo&&settings.selectedLayerId==='background'&&<ImageHandles background settings={{...settings,imagePattern:null,scale:100,x:0,y:0,roll:0,imageEdges:0,imageFlip:false,...settings.backgroundPose,locked:settings.backgroundPose?.locked??false,selectedLayerId:'device'}} media={photo} geometryFor={backgroundGeometry} update={patch=>{const {selectedLayerId,...pose}=patch;updateText({backgroundPose:{...settings.backgroundPose,...pose},...('selectedLayerId' in patch?{selectedLayerId:selectedLayerId===null?null:'background'}:{})});}} onSelect={()=>{}} onEdges={()=>{}} onDuplicate={onBackgroundDuplicate} onRemove={()=>updateText({background:'gradient',selectedLayerId:null})} onMore={[{label:'Crop',icon:'crop',action:()=>onCrop('background')},{label:'Replace image',icon:'fill',action:pickPhoto}]}/>}
      <FrameCanvas settings={blurPreview&&blurSession?{...settings,...patchBlur(settings,blurSession.target,{regions:blurPreview})}:{...settings,_showcaseEditing:showcaseEditing}} source={source ?? blank} photo={photo} ready={ready} time={time} interactive={blurAdjusting||!!blurPreview} loop={effectLoop}/>
      {!blurSession&&!showcaseEditor&&!showcasePlaying&&!effectLoop&&settings.pageObjects&&objectActions&&<PageObjects settings={video?{...settings,renderProgress:time}:settings} sources={source} {...objectActions}/>}
      {!blurSession&&!showcaseEditor&&!showcasePlaying&&updateText&&source&&!Array.isArray(source)&&settings.device==='flat'&&imageLayers(settings).map(layer=><ImageHandles key={layer.id} id={layer.id} settings={settings} media={source} update={updateText} onSelect={onSelectImage} onEdges={onImageEdges} onMore={[{label:'Crop',icon:'crop',action:()=>onCrop(layer.id)}]}/>)}
      {!blurSession&&!showcaseEditor&&!showcasePlaying&&updateText&&<TextHandles settings={settings} update={updateText} onSelect={onSelectText} focusRequest={textFocus} menuOpen={textEditing} onTyping={onTextTyping} typingHost={typingHost}/>}
      {blurSession&&blurEffect(settings,blurSession.target).mode==='area'&&<BlurCanvas key={blurSession.target} settings={video?{...settings,renderProgress:time}:settings} source={source} session={blurSession} setSession={setBlurSession} change={changeBlur} onPreview={setBlurPreview} view={blurView} onView={setBlurView}/>}
      {showcaseEditor&&<ShowcaseCanvas settings={settings} {...showcaseEditor}/>}
      {touchRecorder&&<TouchRecorder settings={settings} {...touchRecorder}/>}
      {onEmptyAdd&&!video&&Array.isArray(settings.pageObjects)&&!settings.pageObjects.length&&!(settings.layers??[]).some(layer=>layer.type==='text')&&<button type="button" className="canvas-empty-add" onClick={onEmptyAdd}><span><Icon name="plus"/></span>{t('Add photo or video')}</button>}
      </div>
      {settings._timelineWaiting&&<div className="sequence-media-state" role="status">{mediaError?<><span>{t('Could not load clip')}</span><button type="button" onClick={onRetryMedia}>{t('Retry')}</button></>:<><span className="sequence-loading-dot"/>{t('Loading clip…')}</>}</div>}
      {blurSession&&blurView.scale>1.01&&<button type="button" className="round-action blur-fit-view" aria-label={t('Reset canvas view')} onClick={()=>setBlurView({scale:1,x:0,y:0})}><Icon name="size"/></button>}
      {onAdd && <button type="button" className="round-action add-media" aria-label={t('Add media')} disabled={busy} onPointerDown={jellyPress} onClick={onAdd}><Icon name="plus"/></button>}
    </div>
  </div>;
}

function Editor({ lookId, lookAuto=false, onLookSaved, project, profile, telegram, ready, exporting=false, backHandler, update:saveUpdate, chooseSource, replaceSource, replaceVideoSource, removeSource, pickPhoto, notify, busy, undo, canUndo, mutateProject }) {
  project=ensurePages(project);
  const [panel, setPanel] = useState(null);
  const [timelineSelection,setTimelineSelection]=useState(null),[keyframeId,setKeyframeId]=useState(null);
  const sequenceInput=useRef(null),sequenceImport=useRef(null);
  const [fillTarget,setFillTarget]=useState(null),[assetBusy,setAssetBusy]=useState(false);
  const fillInput=useRef(null),fillRequest=useRef(null),assetAlive=useRef(true);
  useEffect(()=>()=>{assetAlive.current=false;},[]);
  async function insertAsset(kind,point){
    if(assetBusy)return false;setAssetBusy(true);
    try{const source=await loadAsset(kind);if(!assetAlive.current){releaseMedia(source);return false;}const item={id:itemId(),source,settings:{...defaults,assetKind:kind}};mutateProject(prior=>addLibraryAsset(prior,item,kind,point));return true;}catch{notify('Could not add asset');return false;}finally{if(assetAlive.current)setAssetBusy(false);}
  }
  async function fillUpload(file){
    const target=fillRequest.current;fillRequest.current=null;if(!file||!target||!file.type.startsWith('image/'))return;
    try{const source=await loadMedia(fromFile(file));if(!assetAlive.current){releaseMedia(source);return;}mutateProject(prior=>{if(!prior.pages?.some(page=>page.objects.some(object=>object.id===target))){releaseMedia(source);return prior;}const item={id:itemId(),source,settings:{...defaults,...presentationFor(source)}};return fillAssetFrame({...prior,items:[...prior.items,item]},target,item.id);});}catch(error){notify(error.message||'Could not open media');}finally{if(assetAlive.current)setAssetBusy(false);}
  }
  const [blurSession,setBlurSession]=useState({target:'background',tool:'box',size:.12,erase:false,selected:null});
  const [blurPreview,setBlurPreview]=useState(null);
  const [blurAdjusting,setBlurAdjusting]=useState(false);
  const [shadowWheel,setShadowWheel] = useState(false);
  const [textFocus,setTextFocus] = useState(0);
  const [typing,setTyping]=useState(false);
  const typingHost=useRef(null);
  const toolPosition=useRef(0);
  const [sheet, setSheet] = useState(null);

  const controlStage = useRef(null);
  const scene = sceneFor(project);
  const baseSettings=scene.settings,photo=scene.photo;
  const sequence=useSequencePlayback(baseSettings,scene.source);
  const {timeline,current,playing}=sequence;
  useEffect(()=>{if(exporting)sequence.seek(current);},[exporting]);
  useEffect(()=>{setTimelineSelection(null);sequence.seek(0);},[project.pages?.[project.pageIndex??0]?.id]);
  const activeMain=placedClips(timeline).find(c=>current>=c.start&&current<c.end)??placedClips(timeline).at(-1);
  const selectedTimelineItem=timelineSelection&&({clip:timeline?.main,overlay:timeline?.overlays,gesture:timeline?.gestures,camera:timeline?.cameras}[timelineSelection.type]??[]).find(c=>c.id===timelineSelection.id);
  const timelineTarget=selectedTimelineItem&&timelineSelection.type!=='clip'?timelineSelection:activeMain?{type:'clip',id:activeMain.id}:null;
  const selectedEntry=timelineTarget&&({clip:timeline?.main,overlay:timeline?.overlays,gesture:timeline?.gestures,camera:timeline?.cameras}[timelineTarget.type]??[]).find(c=>c.id===timelineTarget.id);
  const owner=selectedEntry?timelineOwner(timeline,selectedEntry.clipId??selectedEntry.id):null;
  const targetObject=baseSettings.pageObjects?.find(o=>o.id===owner?.objectId);
  const settings=timeline&&targetObject?{...baseSettings,...targetObject.pose,...owner?.pose,selectedLayerId:baseSettings.layers?.some(l=>l.id===baseSettings.selectedLayerId&&l.type==='text')?baseSettings.selectedLayerId:targetObject.id}:baseSettings;
  function update(patch){
    if(timeline&&targetObject&&owner&&!Object.prototype.hasOwnProperty.call(patch,'selectedLayerId')&&Object.keys(patch).some(key=>objectKeys.includes(key))){
      const pose=Object.fromEntries(Object.entries(patch).filter(([key])=>objectKeys.includes(key))),pagePatch=Object.fromEntries(Object.entries(patch).filter(([key])=>!objectKeys.includes(key)));
      const kind=timeline.main.some(c=>c.id===owner.id)?'clip':'overlay';
      mutateProject(prior=>changePage(selectObject(prior,targetObject.id),{...pagePatch,timeline:updateTimeline(timeline,kind,owner.id,{pose:{...owner.pose,...pose}})}));
    }else saveUpdate(patch);
  }
  const source = targetObject?scene.source[targetObject.index]:project.items[project.active]?.source;
  const multiple = project.items.length > 1;
  const collage = project.pages?scene.source.length>1:multiple&&project.layout==='collage';
  const fillMediaIds=fillTarget?new Set(pageMediaChoices(project).map(choice=>choice.itemId)):null;
  const currentPage=project.pages?pageFor(project):null,pageIndex=project.pages?project.pageIndex??0:project.active,count=project.pages?pageCount(project):project.items.length;
  const objectActions={onPattern:(id,pattern)=>{
    mutateProject(prior=>{
      const object=pageFor(prior)?.objects.find(item=>item.id===id);
      return object?changePage(selectObject(prior,id),{imagePattern:pattern??object.pose.imagePattern??defaultImagePattern}):prior;
    });
    switchControls('pattern');
  },onFill:(id,button)=>setFillTarget({id,anchor:{current:button}}),onDropIntoFrame:(sourceId,frameId)=>mutateProject(prior=>{const page=pageFor(prior),object=page.objects.find(object=>object.id===sourceId);return object?fillAssetFrame(prior,frameId,object.itemId,sourceId):prior;}),onSelect:id=>{if(timeline){const main=placedClips(timeline).find(c=>c.objectId===id&&current>=c.start&&current<c.end),overlay=timeline.overlays.find(c=>c.objectId===id&&current>=c.start&&current<c.start+c.out-c.in);if(main||overlay)setTimelineSelection({type:main?'clip':'overlay',id:(main??overlay).id});}mutateProject(prior=>selectObject(prior,id));if(sheet==='text'||sheet==='layers')switchPanel(controlStage.current,()=>setSheet(null));},onDeselect:()=>update({selectedLayerId:null}),onCrop:id=>{mutateProject(prior=>selectObject(prior,id));switchControls('crop');},onUpdate:(id,patch)=>{
    const main=timeline&&placedClips(timeline).find(c=>c.objectId===id&&current>=c.start&&current<c.end),overlay=timeline?.overlays.find(c=>c.objectId===id&&current>=c.start&&current<c.start+c.out-c.in),entry=main??overlay;
    if(entry){const type=main?'clip':'overlay';if(timelineSelection?.id!==entry.id)setTimelineSelection({type,id:entry.id});mutateProject(prior=>changePage(selectObject(prior,id),Object.keys(patch).length?{timeline:updateTimeline(timeline,type,entry.id,{pose:{...entry.pose,...patch}})}:{}));}
    else mutateProject(prior=>changePage(selectObject(prior,id),patch));
  },onDuplicate:id=>mutateProject(prior=>duplicateObject(prior,id)),onRemove:id=>{if(timeline&&owner?.objectId===id)deleteTimeline(timeline.main.some(c=>c.id===owner.id)?'clip':'overlay',owner.id);else mutateProject(prior=>removeObject(prior,id));},onFrame:id=>mutateProject(prior=>toggleFrameAtCurrentSize(prior,id)),onEdges:id=>{mutateProject(prior=>selectObject(prior,id));switchControls('edges');}};
  const recording=recordingInScene(settings,scene.source),video=recording?.source.element??null;
  const videoSettings=settings;
  const duration=sequence.duration,progress=duration?current/duration:0;
  const hasSelectedObject=!!targetObject||!!settings.pageObjects?.some(item=>item.id===settings.selectedLayerId);
  const activePanel=panel;
  // While Effects is open on a still mockup, the canvas plays the effect as it will export.
  const [reduceMotion]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  function commitTimeline(next){mutateProject(prior=>changePage(ensurePages(prior),{timeline:next,showcase:null}));}
  function patchSequence(type,id,patch){commitTimeline(updateTimeline(timeline,type,id,patch));}
  function selectTimeline(type,id,{settings=false}={}){
    sequence.seek(current);setTimelineSelection({type,id});setKeyframeId(null);
    const entry=({clip:timeline.main,overlay:timeline.overlays,gesture:timeline.gestures,camera:timeline.cameras}[type]??[]).find(c=>c.id===id);
    const parent=type==='gesture'||type==='camera'?timelineOwner(timeline,entry?.clipId):timelineOwner(timeline,id);
    if(parent?.objectId)mutateProject(prior=>baseSettings.pageObjects.some(o=>o.id===parent.objectId)?selectObject(prior,parent.objectId):changePage(prior,{selectedLayerId:parent.objectId}));
    if(type==='gesture'||type==='camera'){sequence.seek(effectTime(timeline,entry));switchControls('showcase');}
    else {if(parent&&(current<parent.start||current>=parent.start+parent.out-parent.in))sequence.seek(parent.start);const text=baseSettings.layers.some(l=>l.id===parent?.objectId&&l.type==='text');
      // Selecting a clip keeps the open panel; only text or an explicit Clip settings request switches it.
      if(text)switchControls(null,'text');else if(settings)switchControls('showcase');}
  }
  function deleteTimeline(type=timelineTarget?.type,id=timelineTarget?.id){if(!id)return;const next=removeTimelineItem(timeline,type,id);if(next===timeline)return;mutateProject(prior=>{let p=changePage(ensurePages(prior),{timeline:next,showcase:null});const entry=({clip:timeline.main,overlay:timeline.overlays}[type]??[]).find(e=>e.id===id);if(entry&&![...next.main,...next.overlays].some(e=>e.objectId===entry.objectId)){const page=pageFor(p);p={...p,pages:p.pages.map(pg=>pg.id===page.id?{...pg,objects:pg.objects.filter(o=>o.id!==entry.objectId),settings:{...pg.settings,layers:pg.settings.layers.filter(l=>l.id!==entry.objectId)}}:pg)};}return p;});setTimelineSelection(null);setKeyframeId(null);}
  function splitVideo(){const clip=timelineTarget?.type==='overlay'?owner:activeMain;if(clip)commitTimeline(splitTimelineClip(timeline,clip.id,current));}
  function updateVideo(patch){update(patch);}
  const selectedMoment=timelineTarget?.type==='gesture'?selectedEntry:null;
  const selectedCamera=timelineTarget?.type==='camera'?selectedEntry:null;
  const cameraKeys=selectedCamera?cameraFrames(selectedCamera,owner):[];
  const selectedKeyframe=cameraKeys.find(k=>k.id===keyframeId)??cameraKeys.reduce((a,b)=>Math.abs(b.time-(owner.in+current-owner.start))<Math.abs(a.time-(owner.in+current-owner.start))?b:a,cameraKeys[0]);
  const placementMoment=selectedMoment??(selectedCamera?{
    ...selectedCamera,...(selectedKeyframe??selectedCamera.legacyMoment??{x:.5,y:.5,zoom:1.65}),
    ...(selectedCamera.preset?{zoom:Math.max(1,...cameraKeys.map(key=>key.zoom))}:{}),gesture:'none',focus:true
  }:null);
  function patchPlacement(patch){
    if(selectedMoment)patchSequence('gesture',selectedMoment.id,patch);
    else if(selectedCamera){
      const keys=cameraKeys.map(k=>selectedCamera.preset||k.id===selectedKeyframe?.id?{...k,...patch,id:k.id,time:k.time,zoom:k.zoom}:k);
      patchSequence('camera',selectedCamera.id,{legacy:false,composition:selectedCamera.composition??selectedCamera.legacy,keyframes:keys});
    }
  }
  function openShowcase(){sequence.seek(current);switchControls('showcase');}
  function addSequenceEffect(kind,point,replace=false){
    const previous=replace?(selectedMoment??selectedCamera):null;
    const parent=previous?owner:timelineTarget?.type==='overlay'&&owner&&targetObject&&current>=owner.start&&current<owner.start+owner.out-owner.in?owner:activeMain;
    if(!parent)return;
    const sourceTime=previous?.time??Math.max(parent.in,Math.min(parent.out-.001,parent.in+current-parent.start)),id=previous?.id??timelineId();
    const position=point??(previous?{x:placementMoment?.x??.5,y:placementMoment?.y??.5}:{x:.5,y:.5});
    const gestures=timeline.gestures.filter(item=>item.id!==id),cameras=timeline.cameras.filter(item=>item.id!==id);
    const savedDuration=previous&&previous.gesture!=='tap'?previous.duration:undefined;
    if(kind==='zoom'){
      const length=Math.min(savedDuration??1.9,parent.out-sourceTime),ramp=Math.min(.35,length/3),holdEnd=sourceTime+length-ramp;
      const key=(time,zoom)=>({id:timelineId(),time,...position,zoom,easing:'smooth'});
      const camera={id,clipId:parent.id,time:sourceTime,duration:length,preset:true,keyframes:[key(sourceTime,1),key(sourceTime+ramp,1.65),key(holdEnd,1.65),key(sourceTime+length,1)]};
      commitTimeline({...timeline,gestures,cameras:[...cameras,camera]});setTimelineSelection({type:'camera',id});setKeyframeId(null);
    }else{
      const gesture={id,clipId:parent.id,time:sourceTime,gesture:kind,duration:Math.min(kind==='tap'?.65:Math.min(4,Math.max(.3,savedDuration??1)),parent.out-sourceTime),...position,endX:previous?.endX??position.x,endY:previous?.endY??(position.y>.25?position.y-.25:position.y+.25),...ringOf(previous??gestures.at(-1))};
      commitTimeline({...timeline,cameras,gestures:[...gestures,gesture]});setTimelineSelection({type:'gesture',id});setKeyframeId(null);
    }
    sequence.seek(current);switchControls('showcase');return id;
  }
  function addTimeline(kind){
    if(assetBusy)return;
    if(kind==='clip'||kind==='overlay'){sequenceImport.current={kind,pageId:currentPage.id,start:current};sequenceInput.current.accept=kind==='clip'?'video/*':'image/*,video/*';sequenceInput.current.click();return;}
    if(kind==='text'){createText();return;}
    addSequenceEffect(kind);
  }
  async function importSequence(files){
    const request=sequenceImport.current;sequenceImport.current=null;if(!request||!files.length)return;
    let loaded=[];setAssetBusy(true);
    try{
      for(const file of files){if(!isMedia(file))throw Error('Choose an image or video');const source=await loadMedia(fromFile(file));loaded.push({id:itemId(),source,settings:{...defaults,...presentationFor(source)}});}
      if(!assetAlive.current){for(const item of loaded)releaseMedia(item.source);return;}
      mutateProject(prior=>{
        const prepared=ensurePages(prior);if(pageFor(prepared)?.id!==request.pageId){for(const item of loaded)releaseMedia(item.source);return prior;}
        const before=sceneFor(prepared),track=timelineFor(before.settings,before.source),oldIds=new Set(pageFor(prepared).objects.map(o=>o.id));
        let next=appendItems(prepared,loaded,{overlay:true}),page=pageFor(next);
        const added=page.objects.filter(o=>!oldIds.has(o.id)),main=[...track.main],overlays=[...track.overlays];
        for(const object of added){const media=next.items.find(i=>i.id===object.itemId).source,duration=media.kind==='video'?media.element.duration:Math.max(.1,timelineDuration(track)-request.start);
          const entry={id:timelineId(),objectId:object.id,in:0,out:duration,volume:request.kind==='clip'?1:0};
          if(request.kind==='clip')main.push(entry);else overlays.push({...entry,start:request.start});
        }
        next={...next,pages:next.pages.map(pg=>pg.id===page.id?{...pg,objects:pg.objects.map(object=>{if(!added.some(o=>o.id===object.id))return object;const original=loaded.find(i=>i.id===object.itemId);return {...object,slot:{x:0,y:0,width:1,height:1},pose:{...object.pose,...presentationFor(original.source),autoLayout:false,...(request.kind==='overlay'?{scale:46}:{} )}};})}:pg)};next=changePage(next,{timeline:{...track,main,overlays},showcase:null});return next;
      });
    }catch(error){for(const item of loaded)releaseMedia(item.source);notify(error.message||'Could not open media');}finally{if(assetAlive.current)setAssetBusy(false);}
  }
  function changeBlur(changes,remember=false){
    update(patchBlur(settings,blurSession.target,changes));
  }
  function openBlur(){sequence.seek(current);const targets=blurTargets(settings,scene.source);setBlurSession(s=>({...s,target:targets.some(item=>item.id===settings.selectedLayerId)?settings.selectedLayerId:'background',selected:null}));switchControls('blur');}


  async function switchControls(next, modal = null) {
    if(next===panel&&modal===sheet)return;
    const stage=controlStage.current,previous=panel;
    const changed=await switchPanel(stage,()=>{setPanel(next);setShadowWheel(false);if(modal||next==='pattern')setSheet(modal);});
    if(changed&&!modal)stage.querySelector(next?'.controls-back':`[data-tool="${previous}"]`)?.focus({preventScroll:true});
  }

  function openText() {
    const model=textModel(settings);
    if(model.enabled&&model.text.trim()&&!Array.isArray(settings.layers))update(patchText(settings,{}));
    sequence.seek(current);
    switchControls(null,'text');
  }
  function closeTools() {
    setSheet(null);
    controlStage.current?.querySelector('[data-tool="tools"]')?.focus({preventScroll:true});
  }
  function createText() {const patch=addText(baseSettings,'Text');if(timeline){const id=patch.selectedLayerId;patch.timeline={...timeline,overlays:[...timeline.overlays,{id:timelineId(),objectId:id,start:current,in:0,out:Math.max(.1,duration-current),volume:0}]};}update(patch);sequence.seek(current);setTextFocus(value=>value+1);switchControls(null,'text');}
  function selectText() {sequence.seek(current);if(sheet!=='text')switchControls(null,'text');}
  // Tapping the phone keeps tool groups open (and moves Background/More to Phone); other inspectors close.
  function selectImage(){if(settings.imagePattern&&!settings.locked){switchControls('pattern');return;}
    if(sheet){switchPanel(controlStage.current,()=>setSheet(null));return;}
    if(panel==='canvas'||panel==='more'){switchControls('phone');return;}
    if(panel&&panel!=='edges'&&panel!=='phone')switchPanel(controlStage.current,()=>{setPanel(null);setShadowWheel(false);});}
  function openImageEdges(id=settings.selectedLayerId??'device'){update({selectedLayerId:id});switchPanel(controlStage.current,()=>{setSheet(null);setPanel('edges');});}
  function dismissSelection(){
    if(settings.selectedLayerId!=null)update({selectedLayerId:null});
    document.activeElement?.blur();
    switchPanel(controlStage.current,()=>{setSheet(null);setPanel(null);setShadowWheel(false);});
  }
  function goToPage(index){
    sequence.seek(current);
    setBlurPreview(null);
    mutateProject(prior=>selectPage(prior,index));
  }
  const swipeEnabled=!typing&&!sheet&&activePanel!=='showcase'&&!busy&&count>1;
  const pageSwipe=usePageSwipe({index:pageIndex,count,onPage:goToPage,onTap:dismissSelection,disabled:!swipeEnabled});
  useEffect(()=>{
    const dismiss=event=>{
      if(canvasGestureActive()||!event.target.closest('.app-shell.is-editor')||event.target.closest('button,a,input,textarea,label,.control-sheet,.text-floating-toolbar,.selection-more-menu,.picker,.bottom-sheet'))return;
      const preview=event.target.closest('.preview');
      if(swipeEnabled&&preview&&pageSwipeMargin(preview,event))return;
      dismissSelection();
    };
    document.addEventListener('pointerdown',dismiss);return()=>document.removeEventListener('pointerdown',dismiss);
  },[panel,sheet,update,settings.selectedLayerId,swipeEnabled]);
  useLayoutEffect(()=>{
    if(!typing)return;
    const viewport=window.visualViewport;
    const editor=typingHost.current?.closest('.editor');
    const shell=editor?.closest('.app-shell');
    const resize=()=>shell?.style.setProperty('--typing-height',Math.floor(viewport?.height??innerHeight)+'px');
    resize();
    viewport?.addEventListener('resize',resize);
    window.addEventListener('resize',resize);
    return()=>{
      viewport?.removeEventListener('resize',resize);
      window.removeEventListener('resize',resize);
      shell?.style.removeProperty('--typing-height');
    };
  },[typing]);
  async function closeInspector() {
    document.activeElement?.blur();
    const changed=await switchPanel(controlStage.current,()=>setSheet(null));
    if(changed)controlStage.current?.querySelector(`[data-tool="${sheet==='layers'?'layers':sheet==='mark'?'mark':'watermark'}"]`)?.focus({preventScroll:true});
  }

  useLayoutEffect(()=>{
    if(!backHandler)return;
    const dismiss=()=>{
      const dialog=[...document.querySelectorAll('dialog[open]')].at(-1);
      if(dialog){dialog.dispatchEvent(new Event('cancel',{cancelable:true}));return true;}
      const menu=document.querySelector('.sequence-menu,.sequence-cluster-menu,.selection-more-menu');
      if(menu){menu.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));document.activeElement?.blur();return true;}
      if(typing){document.activeElement?.blur();setTyping(false);return true;}
      if(sheet){
        const inspector=controlStage.current?.querySelector('.text-inspector');
        if(inspector)inspector.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
        else closeInspector();
        return true;
      }
      if(panel){if(shadowWheel)setShadowWheel(false);else switchControls(null);return true;}
      if(fillTarget){setFillTarget(null);return true;}
      return false;
    };
    backHandler.current=dismiss;return()=>{if(backHandler.current===dismiss)backHandler.current=null;};
  });
  function togglePlayback(){sequence.toggle();}
  const visibleScene=timeline?{...scene,settings:{...sequence.settings,_timelineWaiting:!sequence.ready,_showcaseEditing:activePanel==='showcase'&&!playing},source:sequence.sources}:scene;
  const effectLoop=!video&&activePanel==='motion'&&!reduceMotion&&sceneHasMotion(visibleScene.settings)?EFFECT_SECONDS:0;
  const [groupTool,setGroupTool]=useState({phone:'device',canvas:'background'}),[addOpen,setAddOpen]=useState(false);
  // Animation panel open + video playing: tap, hold or slide on the screen where the finger went.
  // Touches are kept while the video plays and added together when it pauses or the panel closes.
  const [recordedCount,setRecordedCount]=useState(0),recorded=useRef([]),currentRef=useRef(current);
  currentRef.current=current;
  const liveTouches=activePanel==='showcase'&&playing&&!!targetObject;
  function gestureFrom(track,touch){
    const parent=placedClips(track).find(c=>touch.time>=c.start&&touch.time<c.end);if(!parent)return null;
    const time=parent.in+touch.time-parent.start,room=Math.max(.001,parent.out-time);
    return {id:timelineId(),clipId:parent.id,time,gesture:touch.kind,x:touch.x,y:touch.y,endX:touch.endX??touch.x,endY:touch.endY??touch.y,duration:touch.kind==='tap'?Math.min(.65,room):Math.min(room,4,Math.max(.3,touch.duration??1)),...ringOf(track.gestures.at(-1)),...(touch.auto?{auto:true}:{})};
  }
  function commitRecorded(){
    const touches=recorded.current;recorded.current=[];setRecordedCount(0);if(!touches.length)return;
    mutateProject(prior=>{const ready=ensurePages(prior),current=sceneFor(ready),track=timelineFor(current.settings,current.source);if(!track)return prior;
      const gestures=touches.map(touch=>gestureFrom(track,touch)).filter(Boolean);
      return changePage(ready,{timeline:{...track,gestures:[...track.gestures,...gestures]},showcase:null});});
    notify(t('{count} touches added').replace('{count}',touches.length));
  }
  useEffect(()=>{if(!liveTouches&&recorded.current.length)commitRecorded();},[liveTouches]);
  const framed=settings.device!=='flat',selectedText=!!baseSettings.layers?.some(l=>l.id===baseSettings.selectedLayerId&&l.type==='text');
  const tabContext=sheet==='mark'?'mark':sheet==='text'||selectedText?'watermark':activePanel==='motion'?'motion':hasSelectedObject?'phone':null;
  const phoneChips=[{key:framed?'device':'image',label:framed?'Phone':source?.kind==='video'?'Video':'Image'},{key:'edges',label:'Corners',disabled:framed},{key:'shadow',label:'Shadow'},{key:'screen',label:'Status bar',disabled:!framed}];
  const canvasChips=[{key:'background',label:'Background'},{key:'size',label:'Format'}];
  const firstPhoneTool=phoneChips[0].key,phoneTool=phoneChips.find(chip=>chip.key===groupTool.phone&&!chip.disabled)?.key??(groupTool.phone==='device'||groupTool.phone==='image'?firstPhoneTool:firstPhoneTool),canvasTool=groupTool.canvas;
  const tabs=[{key:'phone',label:framed?'Phone':source?.kind==='video'?'Video':'Image',icon:<Icon name={framed?'device':source?.kind==='video'?'video':'image'}/>,disabled:!settings.pageObjects?.length},{key:'canvas',label:'Background',icon:<Icon name="background"/>},{key:'watermark',label:'Text',icon:<Icon name="text"/>},{key:'mark',label:'Watermark',icon:<Icon name="mark"/>},{key:'motion',label:'Effects',icon:<Icon name="motion"/>,disabled:!settings.pageObjects?.length},{key:'more',label:'More',icon:<Icon name="more"/>}];
  const moreItems=[
    {key:'adjust',label:'Adjust',icon:<Icon name="adjust"/>,disabled:!hasSelectedObject,action:()=>{mutateProject(prior=>ensurePages(prior));switchControls('adjust');}},
    {key:'blur',label:'Blur',icon:<Icon name="blur"/>,action:openBlur},
    {key:'layers',label:'Layers',icon:<Icon name="layers"/>,action:()=>switchControls(null,'layers')},
    {key:'pages',label:'Pages',icon:<Icon name="pages"/>,action:()=>setSheet('merge')},
    {key:'tools',label:'Assets',icon:<Icon name="tools"/>,action:()=>setSheet('tools')},
  ];
  const addItems=[
    {key:'media',label:'Photo or video',caption:video?'On top of the video':'From your gallery',icon:<Icon name="image"/>,action:()=>timeline?addTimeline('overlay'):chooseSource()},
    {key:'text',label:'Text',caption:'Title or caption',icon:<Icon name="text"/>,action:createText},
    {key:'asset',label:'Sticker',caption:'Shapes and art',icon:<Icon name="tools"/>,action:()=>setSheet('tools')},
    ...(timeline?[{key:'clip',label:'Video clip',caption:'Adds to the end',icon:<Icon name="video"/>,action:()=>addTimeline('clip')}]:[]),
  ];
  // The Telegram profile is ready before the Watermark sheet opens: one tap uses it.
  const [profileMark,setProfileMark]=useState(null);
  useEffect(()=>{
    if(!profile)return;let alive=true;
    makeProfileBadge(profile,telegram).then(async({text,badge})=>{if(badge.avatar)await loadBadgeAvatar(badge.avatar);if(alive)setProfileMark({name:[profile.firstName,profile.lastName].filter(Boolean).join(' ')||text,handle:text,avatar:badge.avatar??'',initials:badge.initials??''});}).catch(()=>{});
    return()=>{alive=false;};
  },[profile?.id]);
  function openGroup(key){
    if(key==='showcase')return openShowcase();
    if(key==='watermark')return openText();
    if(key==='mark'){sequence.seek(current);return switchControls(null,'mark');}
    if((key==='phone'||key==='motion')&&!hasSelectedObject){const first=currentPage?.objects.find(object=>!object.pose.hideDevice&&!object.pose.assetKind);if(first)mutateProject(prior=>selectObject(prior,first.id));}
    if(panel===key)return;
    switchControls(key);
  }
  function applyChosenLook(look){if(timeline&&targetObject)update(look.settings);else mutateProject(prior=>applyLook(ensurePages(prior),look));}
  function saveLook(){const count=savedLooks().length+1,look={id:'look-'+Date.now().toString(36),name:t('My look')+(count>1?' '+count:''),settings:captureLook(settings)};onLookSaved?.(look);notify(t('Look saved'));return look;}
  function controlsFor(key){
    const flat=!settings.pageObjects&&settings.device==='flat'&&['edges','image','shadow'].includes(key),locked=!hasSelectedObject&&['motion','device','image','edges','shadow','screen'].includes(key);
    return <fieldset className="control-fields" disabled={locked} {...(locked?{inert:''}:{})}><EditorControls panel={key} settings={flat?imageSettings(settings):settings} update={patch=>update(flat&&imageLayers(settings).some(layer=>layer.id===settings.selectedLayerId)?patchImage(settings,settings.selectedLayerId,patch):patch)} source={source} photo={photo} pickPhoto={pickPhoto} replaceSource={source?.kind==='video'?replaceVideoSource:replaceSource}
      removeSource={removeSource} openTime={() => setSheet('time')} collage={collage} removeFrame={project.pages&&settings.device!=='flat'?()=>mutateProject(prior=>toggleFrameAtCurrentSize(prior,pageFor(prior).selectedObjectId)):undefined} shadowWheel={shadowWheel} onShadowWheel={setShadowWheel}/></fieldset>;
  }
  return <div className="editor page" data-typing={typing?'true':undefined} data-video={video?'true':undefined} data-sheet={sheet ?? undefined} data-panel={activePanel ?? undefined} data-free={settings.device==='flat'?'true':undefined} data-shadow-wheel={activePanel==='shadow'&&shadowWheel?'true':undefined}>
    <div className="preview" style={{'--canvas-ratio':{portrait:.8,story:.5625,wide:16/9}[visibleScene.settings.ratio]??1,'--canvas-cap':'100dvh'}} data-page-swipe={swipeEnabled?true:undefined} {...pageSwipe}>
      <Artboard key={currentPage?.id??'single'} effectLoop={effectLoop} onEmptyAdd={()=>chooseSource()} touchRecorder={liveTouches?{source:scene.source[targetObject.index],index:visibleScene.settings.pageObjects.findIndex(o=>o.id===targetObject.id),now:()=>currentRef.current,count:recordedCount,onTouch:touch=>{recorded.current.push(touch);setRecordedCount(recorded.current.length);}}:null} scene={visibleScene} mediaError={sequence.error} onRetryMedia={sequence.retry} ready={ready} time={video ? progress : 0} onAdd={()=>setAddOpen(true)} busy={busy||assetBusy} video={video} textEditing={sheet==='text'} onTextTyping={setTyping} typingHost={typingHost} onCrop={()=>switchControls('crop')} pickPhoto={pickPhoto} onBackgroundDuplicate={()=>{if(photo)mutateProject(prior=>appendItems(ensurePages(prior),[{id:itemId(),source:photo,settings:{...defaults,device:'flat',fit:'contain',cleanup:'off'}}],{overlay:true}));}} updateText={update} onSelectText={selectText} textFocus={textFocus} onSelectImage={selectImage} onImageEdges={openImageEdges} blurSession={activePanel==='blur'?blurSession:null} setBlurSession={setBlurSession} changeBlur={changeBlur} blurPreview={blurPreview} setBlurPreview={setBlurPreview} blurAdjusting={blurAdjusting} objectActions={objectActions} showcaseEditing={!!video&&!playing&&activePanel==='showcase'} showcasePlaying={!!video&&playing} showcaseEditor={timeline&&activePanel==='showcase'&&!playing&&placementMoment&&targetObject?{source:scene.source[targetObject.index],media:visibleScene.source,index:visibleScene.settings.pageObjects.findIndex(o=>o.id===targetObject.id),moment:placementMoment,onAdd:point=>addSequenceEffect('tap',point),onPatch:patchPlacement,disabled:false}:null}/>
      {!settings.imagePattern&&(!video||activePanel==='phone')&&(video?videoSettings:settings).device!=='flat'&&settings.pageObjects?.length>0&&<PreviewZoom settings={video?videoSettings:settings} update={video?updateVideo:update}/>}
      {count>1&&<EditorContextRow disabled={busy||!project.items.length} index={pageIndex} count={count} onPage={goToPage} onManage={()=>setSheet('merge')}/>}
      {timeline&&<VideoTimeline timeline={timeline} objects={baseSettings.pageObjects} sources={scene.source} current={current} duration={duration} playing={playing} selection={timelineTarget} editingEffects={activePanel==='showcase'}
        onPlay={togglePlayback} onSeek={sequence.seek} onSelect={selectTimeline} onPatch={patchSequence} onSplit={splitVideo} onDelete={deleteTimeline} onAdd={addTimeline}
        onReorder={(id,index)=>{const main=[...timeline.main],from=main.findIndex(c=>c.id===id);if(from<0)return;const [clip]=main.splice(from,1);main.splice(index,0,clip);commitTimeline({...timeline,main});}}/>}
    </div>
    <div className="control-sheet">
      <div className="text-typing-host" ref={typingHost}/>
      <div className="control-stage" ref={controlStage}>
      {activePanel==='pattern'&&settings.imagePattern&&hasSelectedObject?<PatternInspector pattern={settings.imagePattern} onChange={imagePattern=>update({imagePattern})} onDone={()=>switchControls(null)}/>:activePanel==='crop'?<CropInspector edges={settings.selectedLayerId==='background'?settings.backgroundPose?.imageEdges:settings.imageEdges} onEdges={imageEdges=>update(settings.selectedLayerId==='background'?{backgroundPose:{...settings.backgroundPose,imageEdges}}:{imageEdges})} value={settings.selectedLayerId==='background'?settings.backgroundPose?.imageCrop:settings.imageCrop} onChange={imageCrop=>update(settings.selectedLayerId==='background'?{backgroundPose:{...settings.backgroundPose,imageCrop}}:{imageCrop})} onDone={()=>switchControls(null)}/>:activePanel==='showcase'&&timeline?<TimelineInspector playing={playing} timeline={timeline} selection={timelineTarget} current={current} mediaKind={targetObject?scene.source[targetObject.index]?.kind:undefined} keyframeId={keyframeId} onKeyframe={setKeyframeId} onSeek={sequence.seek} onAdd={kind=>addSequenceEffect(kind)} onKind={kind=>addSequenceEffect(kind,undefined,true)} onPatch={patchSequence} onDelete={deleteTimeline} onDone={()=>switchControls(null)}/>:activePanel==='adjust'?<AdjustInspector settings={settings} disabled={!!settings.pageObjects&&!settings.pageObjects.some(item=>item.id===settings.selectedLayerId)} update={update} onDone={()=>switchControls(null)}/>:sheet==='mark'?<WatermarkSheet ratio={settings.ratio} mark={markOf(settings)} profile={profileMark} onChange={patch=>update({mark:{...markOf(settings),...patch}})} onDone={closeInspector}/>:sheet==='layers'?<Layers settings={settings} update={update} onEdit={kind=>kind==='image'?selectImage():switchControls(null,'text')} onDone={closeInspector}/>:sheet==='text' ? <TextInspector settings={settings} update={update} onAdd={createText} onProfile={null} profile={profile} onDone={closeInspector}/> : activePanel==='blur'?<BlurInspector settings={settings} source={scene.source} session={blurSession} setSession={setBlurSession} change={changeBlur} undo={undo} canUndo={canUndo} onDone={()=>switchControls(null)} onAdjusting={setBlurAdjusting}/>: activePanel==='phone'||activePanel==='canvas'?<GroupPanel label={activePanel==='phone'?'Phone':'Background'} chips={activePanel==='phone'?phoneChips:canvasChips} active={activePanel==='phone'?phoneTool:canvasTool} onChip={key=>setGroupTool(prior=>({...prior,[activePanel]:key}))} onBack={()=>shadowWheel?setShadowWheel(false):switchControls(null)}><div className="control-options">{controlsFor(activePanel==='phone'?phoneTool:canvasTool)}</div></GroupPanel>:activePanel==='more'?<MorePanel items={moreItems} onBack={()=>switchControls(null)}/>: activePanel ? <>
        
        <div className="controls" key={activePanel + ':' + project.active}>
          <button type="button" className="round-action controls-back" aria-label={shadowWheel?'Back to shadow options':'Back to editor controls'} onPointerDown={jellyPress} onClick={()=>shadowWheel?setShadowWheel(false):switchControls(null)}><Icon name="arrowback"/></button>
          <div className="control-options"><fieldset className="control-fields" disabled={!hasSelectedObject&&['motion','device','image','edges','shadow','screen'].includes(activePanel)} {...(!hasSelectedObject&&['motion','device','image','edges','shadow','screen'].includes(activePanel)?{inert:''}:{})}>
          <EditorControls panel={activePanel} settings={!settings.pageObjects&&settings.device==='flat'&&['edges','image','shadow'].includes(activePanel)?imageSettings(settings):settings} update={patch=>update(!settings.pageObjects&&settings.device==='flat'&&['edges','image','shadow'].includes(activePanel)&&imageLayers(settings).some(layer=>layer.id===settings.selectedLayerId)?patchImage(settings,settings.selectedLayerId,patch):patch)} source={source} photo={photo} pickPhoto={pickPhoto} replaceSource={source?.kind==='video'?replaceVideoSource:replaceSource}
            removeSource={removeSource} openTime={() => setSheet('time')} collage={collage} removeFrame={project.pages&&settings.device!=='flat'?()=>mutateProject(prior=>toggleFrameAtCurrentSize(prior,pageFor(prior).selectedObjectId)):undefined} shadowWheel={shadowWheel} onShadowWheel={setShadowWheel}/>
          </fieldset></div>
        </div>
      </> : <div className="editor-root">
        <LooksRow settings={settings} onApply={applyChosenLook} onSave={saveLook} autoId={lookAuto?lookId:null}/>
        <ToolTabs tabs={tabs} context={tabContext} onOpen={openGroup}/>
      </div>}
      </div>
    </div>
    {addOpen&&<AddSheet items={addItems} onClose={()=>setAddOpen(false)}/>}
    {sheet==='tools'&&<ToolsSheet onClose={closeTools} onInsert={insertAsset} getCanvasRect={()=>controlStage.current?.closest('.editor')?.querySelector('.artboard-frame')?.getBoundingClientRect()}/>}
    <input ref={sequenceInput} type="file" accept="video/*" multiple hidden onChange={event=>{const files=[...event.target.files];event.target.value='';importSequence(files);}}/>
    <input ref={fillInput} type="file" accept="image/*" hidden onChange={event=>{const file=event.target.files[0];event.target.value='';fillUpload(file);}}/>
    {fillTarget&&<Picker anchor={fillTarget.anchor} label={t('Fill image')} className="asset-fill-picker" onClose={()=>setFillTarget(null)}><div className="asset-fill-grid">{project.items.filter(item=>!item.settings?.assetKind&&item.source.kind==='image'&&fillMediaIds.has(item.id)).map((item,index)=><button type="button" key={item.id} aria-label={t('Image')+' '+(index+1)} onClick={()=>{mutateProject(prior=>fillAssetFrame(prior,fillTarget.id,item.id));setFillTarget(null);}}><img src={item.source.url} alt="" draggable={false}/></button>)}</div><button type="button" className="asset-fill-upload" onClick={()=>{fillRequest.current=fillTarget.id;setFillTarget(null);fillInput.current.click();}}>{t('Upload image')}</button></Picker>}
    {sheet==='merge'&&<PagesSheet project={project} onApply={next=>mutateProject(prior=>({...next,id:prior.id}))} onClose={()=>setSheet(null)} renderPreview={(draft,index)=>{const preview=sceneFor(draft,index);return <FrameCanvas settings={preview.settings} source={preview.source} photo={preview.photo} ready={ready} thumbnail/>;}}/>}
    {sheet === 'time' && <TimeSheet settings={settings} update={update} onClose={() => setSheet(null)}/>}
  </div>;
}

function DraftPage({ list, onOpen, onRemove }) {
  if (!list) return <section className="page files-empty" aria-label={t("Loading saved work")} aria-busy="true"/>;
  if (!list.length) return <section className="page files-empty" aria-label={t("Saved work")}><AnimatedSticker load={loadFilesSticker} className="files-animation"/><p>{t("Your saved work will appear here.")}</p></section>;
  return <div className="page draft-gallery-grid files-grid" aria-label={t("Saved work")}>{Array.from({length:Math.max(9,list.length)},(_,index)=><DraftTile key={list[index]?.id??'empty-'+index} draft={list[index]} onOpen={onOpen} onRemove={onRemove}/>)}</div>;
}

function ProfilePage({profile,authStatus,telegram,config,onRetry}) {
  return <div className="page preferences">
    <section className="profile-card" aria-label={t("Profile")}>
      {profile ? <>
        {profile.photoUrl ? <img src={profile.photoUrl} alt="" referrerPolicy="no-referrer"/> : <span className="profile-initial">{profile.firstName.slice(0, 1)}</span>}
        <div><strong>{profile.firstName} {profile.lastName}</strong><p>{profile.username ? '@' + profile.username : 'Telegram user'}</p><small>{t("Verified Telegram profile")}</small></div>
      </> : <div><strong>{telegram ? 'Telegram profile' : 'Guest'}</strong><p>{authStatus || 'Open this app from its Telegram bot to sign in.'}</p>
        {telegram && <button type="button" className="secondary action-pill" onClick={onRetry}>{t("Retry sign-in")}</button>}
        {!telegram && config?.botUsername && <a className="primary action-pill" href={'https://t.me/' + config.botUsername}>{t("Open in Telegram")}</a>}
      </div>}
    </section>
  </div>;
}


function projectSettings(preferences, template) {
  // "Apply my look automatically": new screenshots open with the saved look.
  const look=!template&&preferences.autoLook?findLook(preferences.lookId):null;
  return { ...defaults, ...templates[template]?.settings, ...look?.settings, cleanup: preferences.cleanup };
}

function App({initialTelegram=null,initialProfile=null}) {
  const [page, setPage] = useState(readPage);
  const balanceReturn=useRef('settings');
  const subscriptionReturn=useRef('settings');
  const [ready, setReady] = useState(false);
  const [preferences, setPreferences] = useState(restorePreferences);
  const {project,setProject,undo,redo,canUndo,canRedo,past}=useProjectHistory(newProject,page==='editor');
  const [draftList, setDraftList] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedRevision,setSavedRevision] = useState(null);
  const [exitPrompt,setExitPrompt] = useState(null);
  const exitPending=useRef(false);
  const routeState=useRef(null);
  const unsaved=project.items.length>0&&!sameProjectContent(project,savedRevision);
  const [saveBurst,setSaveBurst] = useState(0);
  const latestProject = useRef(project);
  latestProject.current = project;
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [telegram, setTelegram] = useState(initialTelegram);
  const [profile,setProfile]=useState(initialProfile);
  const [draftLimitOpen,setDraftLimitOpen]=useState(false);
  const updateAccount=account=>{if(account)setProfile(prior=>prior?{...prior,...account}:prior);};
  const payment=useStarPayments(telegram,profile?.id,updateAccount);
  useEffect(()=>payment.clear(),[page]);
  const [authStatus,setAuthStatus]=useState('');
  const [config,setConfig]=useState(null);
  const input = useRef(null);
  const uploadIntent = useRef('new');
  const photoInput = useRef(null);
  const feedTimer = useRef(null);
  const request = useRef(0);
  const photoRequest = useRef(0);
  const main = useRef(null);
  const mediaInUse = useRef(new Set());

  function notify(text) {
    setMessage(text);
    clearTimeout(feedTimer.current);
    feedTimer.current = setTimeout(() => setMessage(''), 3000);
  }

  function abandonExport(){
    ++request.current;++photoRequest.current;clearTimeout(feedTimer.current);
    flushSync(()=>{setExporting(false);setBusy(false);setSaving(false);setMessage('');setSavedRevision(null);
      setProject(newProject(),{reset:true});setPage('home');});
    history.replaceState(null,'',location.pathname+location.search+'#home');
  }

  // Opened from the bot's "Frame it" button: load that chat file with the saved look.
  const frameRequest=useRef(new URLSearchParams(location.search).get('frame')),chatLook=useRef(false);
  async function openFramedFile(app){
    const token=frameRequest.current;if(!token||!app?.initData)return;frameRequest.current=null;
    try{const url=new URL(location.href);url.searchParams.delete('frame');history.replaceState(history.state,'',url.pathname+url.search+url.hash);}catch{}
    notify(t('Opening your file…'));
    try{
      const response=await fetch('/api/frame-file',{method:'POST',headers:{'Content-Type':'application/json','X-Telegram-Init-Data':app.initData},body:JSON.stringify({token}),credentials:'same-origin'});
      if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'Could not open the file');}
      const blob=await response.blob(),name=response.headers.get('X-Frame-Name')||'telegram.jpg';
      chatLook.current=true;await importSource([new File([blob],name,{type:blob.type})],'new');
    }catch(error){notify(t(error.message));}
    finally{chatLook.current=false;}
  }
  async function signIn(app) {
    setAuthStatus('Signing in...');
    try {
      const user=await authenticateTelegram(app);
      setDraftOwner(user.id);
      setProfile(user);
      setAuthStatus('');
      setDraftList(null);
      openFramedFile(app);
    }catch(error){setAuthStatus(error.message);}
  }

  function refreshDrafts() {
    return drafts.list().then(list => setDraftList(list.sort((a, b) => b.updated - a.updated))).catch(() => {
      setDraftList([]);
      notify('Draft storage unavailable');
    });
  }

  function purchaseSelection(){if(preferences.haptics)telegram?.HapticFeedback?.selectionChanged();}

  function openBalance(){balanceReturn.current=page==='balance'?'settings':page;switchPanel(main.current,()=>navigate('balance'));}
  function closeBalance(){switchPanel(main.current,()=>navigate(balanceReturn.current));}
  function openSubscription(){subscriptionReturn.current=page==='subscription'?'settings':page;switchPanel(main.current,()=>navigate('subscription'));}
  function closeSubscription(){switchPanel(main.current,()=>navigate(subscriptionReturn.current));}

  function navigate(next) {
    routeState.current.page=next;
    setPage(next);
    if (location.hash !== '#' + next) location.hash = next;
  }

  const editorBack=useRef(null);
  function requestEditorExit(next='home',returnUrl=null) {
    if(editorBack.current?.())return;
    if(exitPending.current||busy||saving)return;
    function leave() {
      ++request.current;++photoRequest.current;
      setSavedRevision(null);
      setProject(newProject(),{reset:true});
      if(returnUrl){
        history.replaceState(null,'',returnUrl);
        setPage(next);
      }else navigate(next);
    }
    if(!unsaved){leave();return;}

    exitPending.current=true;
    let answered=false;
    async function resolve(choice) {
      if(answered)return;
      answered=true;
      setExitPrompt(null);
      try {
        if(choice==='discard')leave();
        if(choice==='save'&&await saveDraft()&&sameProjectContent(latestProject.current,project))leave();
      } finally {exitPending.current=false;}
    }
    // One compact in-app prompt on every platform; dismissing it keeps editing.
    setExitPrompt(()=>resolve);
  }

  routeState.current={page,requestEditorExit,exporting};

  useEffect(() => {
    initialTelegram?.ready();
    preloadStickers().catch(()=>{});
    loadDeviceArt().then(() => setReady(true)).catch(()=>notify('Device artwork could not load'));
    if(!initialTelegram)connectTelegram().then(app=>{
      if(!app)return;
      app.ready();
      setTelegram(app);
      signIn(app);
    }).catch(error=>setAuthStatus(error.message));
    fetch('/api/config').then(response=>response.ok?response.json():null).then(setConfig).catch(()=>{});

    const route = () => {
      const next=readPage(),current=routeState.current;
      if(current.page==='editor'&&next!=='editor'){
        const returnUrl=location.href;
        history.replaceState(null,'',location.pathname+location.search+'#editor');
        if(current.exporting)setExporting(false);
        else current.requestEditorExit(next,returnUrl);
      }else setPage(next);
    };
    window.addEventListener('hashchange', route);
    return () => window.removeEventListener('hashchange', route);
  }, []);
  useEffect(() => {
    main.current?.scrollTo(0, 0);
    if (page === 'files' || page === 'home') refreshDrafts();
    if (!telegram?.BackButton) return;
    const goHome = () => exporting?setExporting(false):page==='balance'?closeBalance():page==='subscription'?closeSubscription():page==='editor'?routeState.current.requestEditorExit():navigate('home');
    if (page === 'editor' || page === 'profile'||page==='balance'||page==='subscription') telegram.BackButton.show();
    else telegram.BackButton.hide();
    telegram.BackButton.onClick(goHome);
    return () => telegram.BackButton.offClick(goHome);
  }, [page, telegram, profile, exporting]);
  useEffect(()=>{
    if(!telegram?.isVersionAtLeast('6.2'))return;
    if(page==='editor'&&(unsaved||exporting||saving))telegram.enableClosingConfirmation?.();
    else telegram.disableClosingConfirmation?.();
  },[page,telegram,unsaved,exporting,saving]);
  useEffect(() => {
    const next = new Set([project,...past].flatMap(item=>[...ownedMedia(item)]));
    for (const media of mediaInUse.current) if (!next.has(media)) releaseMedia(media);
    mediaInUse.current = next;
  }, [project,past]);
  useEffect(()=>{if(page==='editor'&&!project.items.length&&!busy){setPage('home');history.replaceState(null,'',location.pathname+location.search+'#home');}},[page,project.items.length,busy]);
  useEffect(() => () => { for (const media of mediaInUse.current) releaseMedia(media); }, []);

  function pickSource(intent, kind = 'any') {
    uploadIntent.current = intent;
    input.current.multiple = intent !== 'replace' && kind !== 'video';
    input.current.accept = kind === 'image' ? 'image/*' : kind === 'video' ? 'video/*' : 'image/*,video/*';
    input.current.click();
  }

  async function importSource(files, intent) {
    if (!files.length) return;
    if (!files.every(isMedia)) { notify('Choose a screenshot or video'); return; }
    let entries;
    try { entries = files.map(fromFile); }
    catch (error) { notify(error.message); return; }
    if (entries.some(entry=>entry.kind==='video') && entries.length>1) { notify('Open one recording at a time'); return; }
    const token=++request.current;
    ++photoRequest.current;
    setBusy(true);
    try {
      const loaded=await Promise.allSettled(entries.map(loadMedia));
      if(token!==request.current || loaded.some(result=>result.status==='rejected')) {
        for(const result of loaded) if(result.status==='fulfilled') releaseMedia(result.value);
        if(token===request.current) notify('Could not open media');
        return;
      }
      const imported=loaded.map(result=>({id:itemId(),source:result.value,settings:{...projectSettings(chatLook.current?{...preferences,autoLook:true}:preferences),...presentationFor(result.value,preferences.cleanup)}}));
      const source=imported[0].source;
      setProject(prior=>{
        if(intent==='new'){const next={...newProject(source.name.replace(/\.[^.]+$/,''),imported[0].settings),items:imported,layout:imported.length>1&&imported.some(item=>item.settings.device==='flat')?'individual':'matching'};return ensurePages(next);}
        if(intent==='replace-video'){const target=prior.items[prior.active]?.source.kind==='video'?prior.items[prior.active]:prior.items.find(item=>item.source.kind==='video');if(!target)return prior;const pose={trimStart:0,trimEnd:null,videoCuts:[],videoCutPoints:[]};return {...prior,settings:prior.pages?prior.settings:{...prior.settings,...pose},items:prior.items.map(item=>item.id===target.id?{...item,source,settings:{...item.settings,...pose}}:item),...(prior.pages?{pages:prior.pages.map(page=>({...page,objects:page.objects.map(object=>object.itemId===target.id?{...object,pose:{...object.pose,...pose}}:object)}))}:{})};}
        if(intent==='add')return appendItems(ensurePages(prior),imported);
        if(prior.pages&&intent==='replace'){const current=pageFor(prior),chosen=current.objects.find(object=>object.id===current.selectedObjectId);if(!chosen)return appendItems(prior,imported,{overlay:true});return {...prior,items:prior.items.map(item=>item.id===chosen.itemId?{...item,source,settings:imported[0].settings}:item),pages:prior.pages.map(page=>({...page,objects:page.objects.map(object=>object.itemId===chosen.itemId?{...object,pose:{...object.pose,...presentationFor(source,preferences.cleanup),trimStart:0,trimEnd:null,videoCuts:[],videoCutPoints:[]}}:object)}))};}
        if(intent==='replace'&&prior.items.length){
          const settings={...sceneFor(prior).settings,...presentationFor(source,preferences.cleanup)};
          if(Array.isArray(settings.layers)&&!settings.layers.some(layer=>layer.type==='device'))settings.layers=[{id:'device',type:'device'},...settings.layers];
          return {...prior,...(prior.layout!=='individual'?{settings}:{}),items:prior.items.map((item,index)=>index===prior.active?{...item,source,settings}:item)};
        }
        const individual=prior.layout==='individual'||sceneFor(prior).settings.device==='flat'||imported.some(item=>item.settings.device==='flat');
        const items=individual?prior.items.map((item,index)=>({...item,settings:{...sceneFor(prior,index).settings}})):prior.items;
        return ensurePages({...prior,items:[...items,...imported],active:prior.items.length,layout:individual?'individual':prior.layout});
      },{reset:intent==='new'});
      navigate('editor');
    }catch(error){notify(error.message);}
    finally{if(token===request.current)setBusy(false);}
  }

  async function importPhoto(file) {
    if (!file) return;
    const token = ++photoRequest.current;
    const target=project.items[project.active]?.id;
    const layout=project.layout,pageId=project.pages?pageFor(project)?.id:null;
    try {
      const photo = await loadMedia({ ...fromFile(file), kind: 'image' });
      if (token !== photoRequest.current) { releaseMedia(photo); return; }
      setProject(prior => {
        if(pageId&&prior.pages)return {...prior,pages:prior.pages.map(page=>page.id===pageId?{...page,photo,keepEmpty:false,settings:{...page.settings,background:'photo'}}:page)};
        if (layout === 'individual') {
          return { ...prior, items: prior.items.map(item => item.id === target
            ? { ...item, photo, settings: { ...prior.settings, ...item.settings, background: 'photo' } }
            : item) };
        }
        return { ...prior, photo, settings: { ...prior.settings, background: 'photo' } };
      });
    } catch (error) {
      if (token === photoRequest.current) notify(error.message);
    }
  }

  async function saveDraft() {
    if (saving) return;
    setSaving(true);
    const id = project.id ?? itemId();
    const token = request.current;
    try {
      const scene=sceneFor(project);
      await Promise.all([loadTextFonts(scene.settings),loadWatermarkBadge(scene.settings.watermarkBadge),loadMarkAssets(scene.settings.mark)]);
      const thumbnail=document.createElement('canvas');
      const [w,h]=ratios[scene.settings.ratio];
      thumbnail.width=384;thumbnail.height=Math.round(384*h/w);
      createRenderer(thumbnail)(scene.settings,scene.source,scene.photo);
      const preview=thumbnail.toDataURL('image/webp',.7);
      await drafts.save(await saveProject({ ...project, preview, title: project.title.trim() || 'Untitled', id, updated: Date.now() }),{limit:premiumActive(profile)?Infinity:FREE_DRAFT_LIMIT});
      refreshDrafts();
      if (token === request.current) {
        if (latestProject.current === project) {
          const saved = { ...project, id };
          setProject(saved);
          setSavedRevision(saved);
          setSaveBurst(value=>value+1);
        } else setProject(prior => ({ ...prior, id }));
      }
      return true;
    } catch(error) { if(error.code==='DRAFT_LIMIT')setDraftLimitOpen(true);else notify('Could not save the draft');return false; }
    finally { setSaving(false); }
  }

  async function toggleDraft() {
    if(saving)return;
    if(savedRevision!==project||!project.id)return saveDraft();
    setSaving(true);
    try {
      await drafts.remove(project.id);
      if(latestProject.current===project){setProject({...project,id:null});setSavedRevision(null);}
      refreshDrafts();
    } catch {notify('Could not remove the draft');}
    finally {setSaving(false);}
  }

  async function openDraft(draft) {
    const token = ++request.current;
    try {
      const opened = await loadProject(draft);
      if (token !== request.current) {
        for (const media of ownedMedia(opened)) releaseMedia(media);
        return;
      }
      const restored=ensurePages(opened);
      // Commit the restored media before WebKit dispatches the editor hash change.
      flushSync(()=>{setProject(restored,{reset:true});setSavedRevision(restored);setPage('editor');});
      if(location.hash!=='#editor')location.hash='editor';
    } catch (error) {
      if (token === request.current) notify(error.message);
    }
  }

  function updatePreferences(patch) {
    const result = { ...preferences, ...patch };
    setLanguage(result.language);setHapticsEnabled(result.haptics);
    setPreferences(result);
    try { localStorage.setItem('styleit.preferences', JSON.stringify(result)); }
    catch { notify('Could not store settings'); }
  }

  const editing = page === 'editor';
  const balancePage=page==='balance';
  const subscriptionPage=page==='subscription';
  const activeSource = project.items[project.active]?.source;
  useEffect(()=>{
    if(!telegram)return;
    const app=telegram;
    const openSettings=()=>navigate('settings');
    app.SettingsButton?.show();
    app.SettingsButton?.onClick(openSettings);
    app.MainButton.hide();
    app.SecondaryButton?.hide();
    return ()=>{
      app.SettingsButton?.offClick(openSettings);
      app.MainButton.hide();
      app.SecondaryButton?.hide();
    };
  },[telegram,editing]);

  const welcomeOpen=Boolean(telegram&&profile&&profile.welcomeClaimed===false);
  return <div data-welcome={welcomeOpen?'true':undefined} onContextMenu={event=>{if(!event.target.closest('input,textarea,[contenteditable="true"]'))event.preventDefault();}} onCopy={event=>{if(!event.target.closest('input,textarea,[contenteditable="true"]'))event.preventDefault();}} className={'app-shell' + (editing ? ' is-editor' : '') + (balancePage?' is-balance':'') + (subscriptionPage?' is-subscription':'') + (telegram ? ' in-telegram' : '')}>
    <header className="header">
      {subscriptionPage||balancePage?<><button type="button" className="balance-back" aria-label={t('Back')} onClick={subscriptionPage?closeSubscription:closeBalance}><Icon name="arrowback"/></button>{subscriptionPage&&<><span className="store-title">{t('My subscription')}</span></>}</>:editing ? <>
        <button className="round-action editor-back" type="button" aria-label={t("Back to Home")} onPointerDown={jellyPress} onClick={() => requestEditorExit()}><Icon name="arrowback"/></button>
        <span className="editor-title" aria-hidden="true"/>
        <span className="history-pill"><button className="editor-undo" type="button" aria-label={t('Undo')} disabled={!canUndo} onPointerDown={jellyPress} onClick={undo}><Icon name="undo"/></button><button className="editor-redo" type="button" aria-label={t('Redo')} disabled={!canRedo} onPointerDown={jellyPress} onClick={redo}><Icon name="redo"/></button></span>
        <button className={'round-action draft-action'+(savedRevision===project?' is-saved':'')} type="button" aria-label={t("Save draft")} aria-pressed={savedRevision===project} title={savedRevision===project?'Remove saved draft':'Save draft'} aria-busy={saving} onPointerDown={jellyPress} disabled={saving || !project.items.length} onClick={toggleDraft}>
          <Icon name="save"/>
          {savedRevision===project&&saveBurst>0&&<span key={saveBurst} className="draft-sparkles" aria-hidden="true">{Array.from({length:6},(_,i)=><svg key={i} style={{'--spark':i}} viewBox="0 0 20 20"><path d="M10 0c1.2 7.1 2.9 8.8 10 10-7.1 1.2-8.8 2.9-10 10C8.8 12.9 7.1 11.2 0 10 7.1 8.8 8.8 7.1 10 0Z"/></svg>)}</span>}
        </button>
        <span className="visually-hidden" role="status">{savedRevision===project?'Draft saved':''}</span>
        <button className="round-action export-action" type="button" aria-label={t("Export")} onPointerDown={jellyPress} onClick={() => { activeSource?.element?.pause?.(); setExporting(true); }} disabled={!activeSource || busy}><Icon name="export"/></button>
      </> : <>
        {/* Settings already shows the profile card, so its header carries the page title instead. */}
        {page==='settings'?<h1 className="header-page-title">{t('Settings')}</h1>:<HeaderProfile profile={profile} onOpen={()=>switchPanel(main.current,()=>navigate('settings'))}/>}
        <button className="balance-pill" type="button" aria-label={t("My balance")} onClick={openBalance}>
          <HeaderCoin/><strong>{(profile?.credits??0).toLocaleString(document.documentElement.lang)}</strong><span className="balance-pill-plus"><Icon name="plus"/></span>
        </button>
      </>}
    </header>
    <main ref={main} className="content">
      {page === 'home' && <HomeScreen busy={busy} onPick={kind => pickSource('new',kind)} onDrop={files => importSource(files, 'new')} recent={draftList} onOpen={openDraft} onFiles={()=>navigate('files')}/>}
      {page === 'files' && <DraftPage list={draftList} onOpen={openDraft} onRemove={draft => drafts.remove(draft.id).then(refreshDrafts).catch(() => notify('Could not delete the draft'))}/>}
      {page === 'settings' && <SettingsPage preferences={preferences} update={updatePreferences} onBalance={openBalance} onSubscription={openSubscription} profile={profile} botUsername={config?.botUsername} draftCount={draftList?.length??0}/>}
      {balancePage&&<BalancePage onSubscription={openSubscription} balance={profile?.credits??0} premium={premiumActive(profile)} payment={payment} onSelection={purchaseSelection}/>}
      {subscriptionPage&&<SubscriptionPage subscription={profile?.subscription} payment={payment} onSelection={purchaseSelection}/>}
      {page === 'profile' && <ProfilePage profile={profile} authStatus={authStatus} telegram={telegram} config={config} onRetry={()=>signIn(telegram)}/>}
      {editing && <Editor lookId={preferences.lookId} lookAuto={!!preferences.autoLook} onLookSaved={look=>updatePreferences({lookId:look.id})} backHandler={editorBack} exporting={exporting} project={project} profile={profile} telegram={telegram} mutateProject={setProject} ready={ready} notify={notify} busy={busy} undo={undo} canUndo={canUndo}
        update={patch => setProject(prior => changeScene(prior, patch))}
        removeSource={() => {
          ++photoRequest.current;
          setProject(prior => {
            const items = prior.items.filter((_, index) => index !== prior.active);
            const active = Math.max(0, Math.min(prior.active, items.length - 1));
            return { ...prior, items, active };
          });
        }}
        chooseSource={kind => pickSource('add',kind??'any')} replaceSource={() => pickSource('replace')} replaceVideoSource={() => pickSource('replace-video','video')} pickPhoto={() => photoInput.current.click()}/>}
    </main>
    {!editing && !balancePage && !subscriptionPage && <nav aria-label={t("Main")} className="dock" style={{'--active-tab':Math.max(0,tabs.findIndex(([id])=>id===page))}}>{tabs.map(([id, label]) => <a key={id} href={'#' + id} aria-label={t(label)} aria-current={page === id ? 'page' : undefined} onClick={() => { if (preferences.haptics) telegram?.HapticFeedback?.selectionChanged(); }}><Icon name={id==='home'?'navhome':id==='settings'?'navsettings':id}/></a>)}</nav>}
    <input ref={input} type="file" hidden accept="image/*,video/*" multiple onChange={event => { const files = [...event.target.files]; event.target.value = ''; importSource(files, uploadIntent.current); }}/>
    <input ref={photoInput} type="file" hidden accept="image/*" onChange={event => { const file = event.target.files[0]; event.target.value = ''; importPhoto(file); }}/>
    <div className="toast" role="status">{message}</div>
    {welcomeOpen&&<WelcomeCredits telegram={telegram} onClaim={updateAccount}/>}
    {payment.success&&<PurchaseSuccessSheet purchase={payment.success} onClose={payment.dismissSuccess}/>}
    {draftLimitOpen&&<DraftLimitSheet onClose={()=>setDraftLimitOpen(false)} onPremium={()=>{setDraftLimitOpen(false);openSubscription();}} onManage={()=>{setDraftLimitOpen(false);navigate('files');}}/>}
    {exitPrompt&&<ExitPrompt onChoice={exitPrompt}/>}
    {exporting && activeSource && <DownloadSheet project={project} telegram={telegram} account={profile} onAccount={updateAccount} onPremium={()=>{setExporting(false);openSubscription();}} onAbandon={abandonExport} onClose={choice=>{setExporting(false);if(choice==='home')requestEditorExit();}}/>}
  </div>;
}

restorePreferences();
createRoot(document.getElementById('root')).render(import.meta.env.PROD?<TelegramEntry>{session=><App {...session}/>}</TelegramEntry>:<App/>);
