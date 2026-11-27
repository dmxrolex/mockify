import React from 'react';
import {Range} from './text-editor.jsx';
import {VideoIcon} from './video-icons.jsx';
import {cameraFrames,timelineOwner} from './timeline-model.js';
import {t} from './i18n.js';
import './timeline-inspector.css';

const kinds=[['tap','Tap'],['hold','Hold'],['swipe','Swipe'],['zoom','Zoom']];

export default function TimelineInspector({timeline,selection,onPatch,onDelete,onDone,onAdd,onKind,mediaKind,onRecord,recording=false,onAuto,autoState}){
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
    <div className="sequence-automation">
      <button type="button" className="sequence-record" aria-pressed={recording} onClick={onRecord} disabled={recording}><span className="sequence-record-dot" aria-hidden="true"/>{t('Record touches')}</button>
      <button type="button" className="sequence-auto" aria-busy={!!autoState} onClick={onAuto}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 13.6 8l4.4 1.6-4.4 1.6L12 15.7l-1.6-4.5L6 9.6 10.4 8ZM18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8ZM6 16l.6 1.4L8 18l-1.4.6L6 20l-.6-1.4L4 18l1.4-.6Z"/></svg>
        {autoState?t('Analysing… {percent}%').replace('{percent}',Math.round(autoState.progress*100)):t('Auto')}
      </button>
    </div>
    <div className="sequence-effect-choices" role="group" aria-label={t('Choose animation')}>{kinds.map(([value,label])=><button type="button" key={value} data-kind={value} aria-pressed={kind===value} onClick={()=>{if(kind!==value)(kind?onKind:onAdd)(value);}}><span className="sequence-choice-symbol"><VideoIcon name={value}/></span><span>{t(label)}</span></button>)}</div>
    {type==='camera'&&item?<Range label={t('Zoom')} min={110} max={280} value={Math.round(Math.max(1.1,peak)*100)} display={peak.toFixed(1)+'×'} onChange={v=>changeZoom(v/100)}/>
      :volume?<Range label={t('Volume')} min={0} max={100} value={Math.round((item.volume??(type==='clip'?1:0))*100)} display={Math.round((item.volume??(type==='clip'?1:0))*100)+'%'} onChange={v=>patch({volume:v/100})}/>:null}
  </section>;
}
