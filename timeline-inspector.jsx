import React from 'react';
import {Range,Switch} from './text-editor.jsx';
import {VideoIcon} from './video-icons.jsx';
import {videoTime} from './video-timeline.jsx';
import {cameraValue,cameraFrames,timelineOwner,timelineId} from './timeline-model.js';
import {t} from './i18n.js';
import './timeline-inspector.css';

const kinds=[['tap','tap','Tap'],['hold','hold','Hold'],['swipe','swipe','Swipe'],['zoom','zoom-in','Zoom']];

export default function TimelineInspector({timeline,selection,current,keyframeId,onKeyframe,onSeek,onPatch,onDelete,onDone,onAdd,onKind,mediaKind}){
  const type=selection?.type,key={clip:'main',overlay:'overlays',gesture:'gestures',camera:'cameras'}[type];
  const item=timeline[key]?.find(c=>c.id===selection.id),owner=item&&(type==='gesture'||type==='camera')?timelineOwner(timeline,item.clipId):item?timelineOwner(timeline,item.id):null;
  const time=owner?Math.max(owner.in,Math.min(owner.out,owner.in+current-owner.start)):0;
  const keys=type==='camera'?cameraFrames(item,owner):[],selected=keys.find(k=>k.id===keyframeId)??keys.reduce((a,b)=>Math.abs(b.time-time)<Math.abs(a.time-time)?b:a,keys[0]);
  const patch=changes=>onPatch(type,item.id,changes);
  const kind=type==='gesture'?item?.gesture:type==='camera'?'zoom':null;
  const title=kind?'Animation':type==='overlay'?'Overlay':'Animation';
  const peak=Math.max(1,...keys.map(key=>key.zoom));
  const zoom=item?.preset||!keyframeId?peak:selected?.zoom??1;
  const cameraPatch=keyframes=>patch({legacy:false,composition:item.composition??item.legacy,keyframes});
  function addKey(){
    if(!owner||time<=keys[0]?.time||time>=keys.at(-1)?.time)return;
    const value=cameraValue(item,time)??{x:.5,y:.5,zoom:1},near=keys.find(k=>Math.abs(k.time-time)<.01);
    if(near){onKeyframe(near.id);return;}
    const next={id:timelineId(),time,...value,easing:'smooth'};
    patch({legacy:false,composition:item.composition??item.legacy,preset:false,keyframes:[...keys,next].sort((a,b)=>a.time-b.time)});onKeyframe(next.id);
  }
  function changeZoom(value){
    if(keyframeId&&!item.preset&&selected){cameraPatch(keys.map(k=>k.id===selected.id?{...k,zoom:value}:k));return;}
    cameraPatch(keys.map((key,index)=>{
      const strength=peak>1?(key.zoom-1)/(peak-1):index>0&&index<keys.length-1?1:0;
      return {...key,zoom:1+strength*(value-1)};
    }));
  }
  return <section className="text-inspector sequence-inspector" aria-label={t('Animation editor')} onKeyDown={e=>{if(e.key==='Escape')onDone();}}>
    <header className="text-inspector-heading"><h2>{t(title)}</h2>{kind&&<button type="button" className="sequence-inspector-delete" aria-label={t('Delete animation')} onClick={onDelete}><VideoIcon name="trash"/></button>}<button type="button" className="ios-text-done controls-back" onClick={onDone}>{t('Done')}</button></header>
    <div className="sequence-effect-fields">
      <div className="sequence-effect-choices">{kinds.map(([value,icon,label])=><button type="button" key={value} data-kind={value} aria-pressed={kind===value} onClick={()=>{if(kind!==value)(kind?onKind:onAdd)(value);}}><span className="sequence-choice-symbol"><VideoIcon name={icon}/></span><span>{t(label)}</span></button>)}</div>
      {!kind&&mediaKind==='video'&&item&&<Range label={t('Volume')} min={0} max={100} value={Math.round((item.volume??(type==='clip'?1:0))*100)} display={Math.round((item.volume??(type==='clip'?1:0))*100)+'%'} onChange={v=>patch({volume:v/100})}/>}
      {type==='camera'&&item&&<>
        <Range label={t('Zoom')} min={100} max={280} value={Math.round(zoom*100)} display={zoom.toFixed(2)+'×'} onChange={v=>changeZoom(v/100)}/>
        <details className="sequence-keyframe-details"><summary>{t('Camera keyframes')}</summary>
        <div className="sequence-keyframe-tools">
          <button type="button" aria-label={t('Previous keyframe')} disabled={!keys.some(k=>k.time<time-.01)} onClick={()=>{const k=keys.filter(k=>k.time<time-.01).at(-1);onKeyframe(k.id);onSeek(owner.start+k.time-owner.in);}}><VideoIcon name="left"/></button>
          <output>{videoTime(current)}</output>
          <button type="button" aria-label={t('Add keyframe')} disabled={time<=keys[0]?.time||time>=keys.at(-1)?.time} onClick={addKey}><VideoIcon name="add-keyframe"/></button>
          <button type="button" aria-label={t('Next keyframe')} disabled={!keys.some(k=>k.time>time+.01)} onClick={()=>{const k=keys.find(k=>k.time>time+.01);onKeyframe(k.id);onSeek(owner.start+k.time-owner.in);}}><VideoIcon name="right"/></button>
          <button type="button" aria-label={t('Delete keyframe')} disabled={!selected||selected===keys[0]||selected===keys.at(-1)} onClick={()=>{cameraPatch(keys.filter(k=>k.id!==selected.id));onKeyframe(null);}}><VideoIcon name="trash"/></button>
        </div>
        <Switch label={t('Smooth motion')} checked={selected?.easing!=='linear'} onChange={smooth=>{if(selected)cameraPatch(keys.map(k=>k.id===selected.id?{...k,easing:smooth?'smooth':'linear'}:k));}}/>
        </details>
      </>}
    </div>
  </section>;
}
