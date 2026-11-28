import React from 'react';
import {Range} from './text-editor.jsx';
import {VideoIcon} from './video-icons.jsx';
import {cameraFrames,timelineOwner} from './timeline-model.js';
import {t} from './i18n.js';
import {hapticSelection} from './haptics.js';
import './timeline-inspector.css';

const kinds=[['tap','Tap'],['hold','Hold'],['swipe','Swipe'],['zoom','Zoom']];
const hints={
  tap:'Drag the ring on the screen to place it. Slide it on the timeline to change when.',
  hold:'Drag the ring to place it. Drag the end of its bar to hold longer.',
  swipe:'Drag the two rings to set where the swipe starts and ends.',
  zoom:'Drag the point to where it zooms. Drag the end of its bar to zoom longer.',
};

export default function TimelineInspector({timeline,selection,onPatch,onDelete,onDone,onAdd,onKind,mediaKind,playing=false}){
  const type=selection?.type,key={clip:'main',overlay:'overlays',gesture:'gestures',camera:'cameras'}[type];
  const item=timeline[key]?.find(c=>c.id===selection.id),owner=item&&(type==='gesture'||type==='camera')?timelineOwner(timeline,item.clipId):null;
  const keys=type==='camera'?cameraFrames(item,owner):[];
  const patch=changes=>onPatch(type,item.id,changes);
  const kind=type==='gesture'?item?.gesture:type==='camera'?'zoom':null;
  const peak=Math.max(1,...keys.map(key=>key.zoom));
  // One level control scales the whole zoom envelope, keeping its easing and timing.
  function changeZoom(value){
    patch({legacy:false,composition:item.composition??item.legacy,keyframes:keys.map((key,index)=>{
      const strength=peak>1?(key.zoom-1)/(peak-1):index>0&&index<keys.length-1?1:0;
      return {...key,zoom:1+strength*(value-1)};
    })});
  }
  const volume=!kind&&mediaKind==='video'&&item;
  return <section className="text-inspector sequence-inspector" aria-label={t('Animation editor')} onKeyDown={e=>{if(e.key==='Escape')onDone();}}>
    <header className="sequence-inspector-heading">
      <button type="button" className="sequence-inspector-delete" aria-label={t('Delete animation')} title={t('Delete animation')} disabled={!kind} onClick={onDelete}><VideoIcon name="trash"/></button>
      <h2>{t(kind?kinds.find(([value])=>value===kind)[1]:'Animation')}</h2>
      <button type="button" className="ios-text-done controls-back" onClick={onDone}>{t('Done')}</button>
    </header>
    {/* What to do next for the selected item: everything else is direct manipulation. */}
    <p className="sequence-hint">{t(kind?hints[kind]:'Add Tap, Hold, Swipe or Zoom under the timeline')}</p>
    {type==='gesture'&&item?<div className="ios-segment sequence-ring" role="radiogroup" aria-label={t('Ring colour')} style={{'--segment':item.ring==='blue'?1:0}}>
      {[['clear','Clear'],['blue','Blue']].map(([ring,label])=><button key={ring} type="button" role="radio" aria-checked={(item.ring??'clear')===ring} onClick={()=>{if((item.ring??'clear')===ring)return;hapticSelection();patch({ring});}}>{t(label)}</button>)}
    </div>:null}
    {type==='camera'&&item?<Range label={t('Zoom')} min={110} max={280} value={Math.round(Math.max(1.1,peak)*100)} display={peak.toFixed(1)+'×'} onChange={v=>changeZoom(v/100)}/>
      :volume?<Range label={t('Volume')} min={0} max={100} value={Math.round((item.volume??(type==='clip'?1:0))*100)} display={Math.round((item.volume??(type==='clip'?1:0))*100)+'%'} onChange={v=>patch({volume:v/100})}/>:null}
  </section>;
}
