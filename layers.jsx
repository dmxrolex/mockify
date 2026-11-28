import {captureCanvasGesture,releaseCanvasGesture} from './canvas-gesture.js';
import {assetFor,assetPreview} from './asset-library.js';
import { t } from './i18n.js';
import { hapticSelection } from './haptics.js';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { sceneLayers } from './text-model.js';

function Icon({name}) {
  const paths={lock:'M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z',unlock:'M7 11V8a5 5 0 0 1 9.6-1.9M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z',glass:'M3 5h18v14H3Zm3 3 4 4m4-5 4 4',box:'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z',arrow:'M3 12h18m-7-7 7 7-7 7',curve:'M4 20C1 9 9 3 20 8m-5-6 6 6-6 5',circle:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',back:'M15 5 8 12l7 7',grip:'M5 7h14M5 12h14M5 17h14',text:'M5 5h14M12 5v15',device:'M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 3h4',image:'M3 5h18v14H3ZM3 16l6-6 5 5 3-3 4 4',trash:'M4 7h16M9 4h6M6 7l1 13h10l1-13M10 10v7m4-7v7'};
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]}/></svg>;
}

export default function Layers({settings,update,onEdit,onDone,onLock,onSelectLayer}) {
  const layers=sceneLayers(settings),display=[...layers].reverse();
  const root=useRef(null),list=useRef(null),drag=useRef(null),frame=useRef(0),previous=useRef(null),focus=useRef(null);
  const [announcement,setAnnouncement]=useState('');
  useLayoutEffect(()=>{
    if(previous.current){
      const rects=previous.current;previous.current=null;
      const target=list.current.querySelector(`[data-id="${focus.current}"]`);if(!drag.current)target?.scrollIntoView({block:'nearest'});
      for(const row of list.current.children){if(drag.current?.id===row.dataset.id)continue;row.getAnimations().forEach(a=>a.cancel());const before=rects.get(row.dataset.id),after=row.getBoundingClientRect();if(before&&!matchMedia('(prefers-reduced-motion: reduce)').matches)row.animate([{translate:`${before.left-after.left}px ${before.top-after.top}px`},{translate:'0 0'}],{duration:180,easing:'cubic-bezier(.2,.8,.2,1)'});}
      if(!drag.current)target?.querySelector('.layer-grip')?.focus({preventScroll:true});
    }
  },[settings.layers]);
  useLayoutEffect(()=>()=>{cancelAnimationFrame(frame.current);releaseCanvasGesture(list.current);},[]);
  function saveOrder(next,id){
    previous.current=new Map([...list.current.children].map(row=>[row.dataset.id,row.getBoundingClientRect()]));focus.current=id;
    update({layers:[...next].reverse(),textOverlay:null,watermark:'none'});
    setAnnouncement('Layer moved to position '+(next.findIndex(layer=>layer.id===id)+1));
  }
  function locate(clientY){
    const state=drag.current;if(!state)return;
    const row=list.current.querySelector(`[data-id="${state.id}"]`),others=[...list.current.children].filter(item=>item!==row);
    const local=clientY-list.current.getBoundingClientRect().top;
    state.target=others.findIndex(item=>local<item.offsetTop+item.offsetHeight/2);if(state.target<0)state.target=others.length;
    const next=others[state.target],last=others.at(-1);
    list.current.style.setProperty('--drop-y',(next?next.offsetTop-3:last?last.offsetTop+last.offsetHeight+3:0)+'px');
    list.current.dataset.drop=String(state.target!==state.index);
    row.style.translate=`0 ${clientY-state.start+root.current.scrollTop-state.scroll+state.offset-row.offsetTop}px`;
    if(state.target!==state.order.findIndex(item=>item.id===state.id)){const next=state.order.filter(item=>item.id!==state.id),item=state.order.find(item=>item.id===state.id);next.splice(state.target,0,item);state.order=next;saveOrder(next,state.id);}
  }
  function autoScroll(time){
    const state=drag.current;if(!state)return;
    const bounds=root.current.getBoundingClientRect(),zone=Math.min(48,bounds.height/3),elapsed=Math.min(32,time-(state.time??time));state.time=time;
    const speed=state.y<bounds.top+zone?-Math.min(1.5,(bounds.top+zone-state.y)/zone):state.y>bounds.bottom-zone?Math.min(1.5,(state.y-bounds.bottom+zone)/zone):0;
    root.current.scrollTop+=speed*elapsed*.45;locate(state.y);frame.current=requestAnimationFrame(autoScroll);
  }
  function begin(event,id,index){
    if(event.button!==0||drag.current)return;event.preventDefault();captureCanvasGesture(list.current,event,{move:e=>{if(drag.current){drag.current.y=e.clientY;locate(e.clientY);}},end:e=>end(e,e.type==='pointercancel')});
    const row=event.currentTarget.closest('li');row.getAnimations().forEach(animation=>animation.finish());row.classList.add('is-dragging');
    drag.current={id,index,order:[...display],original:[...display],offset:row.offsetTop,target:index,pointer:event.pointerId,start:event.clientY,y:event.clientY,scroll:root.current.scrollTop};
    root.current.classList.add('is-reordering');frame.current=requestAnimationFrame(autoScroll);
  }
  function end(event,cancel=false){
    const state=drag.current;if(!state||(event.pointerId!==undefined&&event.pointerId!==state.pointer))return;
    cancelAnimationFrame(frame.current);const row=list.current.querySelector(`[data-id="${state.id}"]`);
    if(cancel)saveOrder(state.original,state.id);
    row.style.translate='';row.classList.remove('is-dragging');delete list.current.dataset.drop;root.current.classList.remove('is-reordering');drag.current=null;
    if(cancel)setAnnouncement('Layer move canceled');
  }
  function keyboard(event,id,index){
    if(event.key==='Escape'&&drag.current){event.preventDefault();end(event,true);return;}
    if(!event.altKey||!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();
    const target=Math.max(0,Math.min(display.length-1,index+(event.key==='ArrowUp'?-1:1)));
    if(target===index)return;const next=[...display],[item]=next.splice(index,1);next.splice(target,0,item);saveOrder(next,id);
  }
  function remove(layer){update({layers:layers.filter(item=>item.id!==layer.id),...(!settings.pageObjects&&layer.type==='device'?{hideDevice:true}:{}),textOverlay:null,watermark:'none'});}
  return <section className="layers-panel" ref={root} aria-label={t("Layers")}>
    <div className="layers-heading"><button type="button" className="ios-text-back" aria-label={t("Back to editor controls")} onClick={onDone}><Icon name="back"/></button><h2>{t("Layers")}</h2><button type="button" className="ios-text-done" onClick={onDone}>{t("Done")}</button></div>
    <ol className="layer-list" ref={list}>{display.map((layer,index)=>{
      const type=layer.type==='device'?((settings.pageObjects?layer.device:settings.device)==='flat'?'image':'device'):layer.type;
      const name=layer.type==='text'?layer.text||'Text':t(assetFor(layer.assetKind)?.name??(type==='image'?'Image':'Phone'));
      const object=settings.pageObjects?.find(item=>item.id===layer.id),locked=!!(object?object.pose.locked:layer.locked);
      return <li key={layer.id} data-id={layer.id} className={settings.selectedLayerId===layer.id?'is-selected':''} data-locked={locked||undefined}>
        <button type="button" className="layer-select" aria-label={layer.type==='text'?'Edit layer '+name:name+' layer'} onClick={()=>{hapticSelection();if(onSelectLayer&&settings.selectedLayerId!==layer.id){onSelectLayer(layer.id);return;}if(layer.type==='text'){update({layers,selectedLayerId:layer.id,textOverlay:null,watermark:'none'});onEdit('text');}else{update({selectedLayerId:layer.id});onEdit('image');}}}><span className={'layer-type '+type}>{layer.assetKind&&layer.assetKind!=='phone'?<img src={assetPreview(layer.assetKind)} alt=""/>:<Icon name={layer.assetKind==='phone'?'device':type==='text'?'text':type==='image'?'image':'device'}/>}</span><span>{name}</span></button>
        {onLock&&<button type="button" className="layer-lock" aria-label={t(locked?'Unlock':'Lock')+' '+name} aria-pressed={locked} onClick={()=>{hapticSelection();onLock(layer.id,!locked);}}><Icon name={locked?'lock':'unlock'}/></button>}
        <button type="button" className="layer-delete" aria-label={'Delete layer '+name} onClick={()=>remove(layer)}><Icon name="trash"/></button>
        <button type="button" className="layer-grip" aria-label={'Reorder '+name+'. Drag or use Alt and arrow keys.'} onKeyDown={event=>keyboard(event,layer.id,index)} onPointerDown={event=>begin(event,layer.id,index)} onPointerMove={event=>{if(drag.current?.pointer===event.pointerId){drag.current.y=event.clientY;locate(event.clientY);}}} onPointerUp={event=>end(event)} onPointerCancel={event=>end(event,true)}><Icon name="grip"/></button>
      </li>;
    })}</ol><span className="visually-hidden" role="status">{announcement}</span>
  </section>;
}
