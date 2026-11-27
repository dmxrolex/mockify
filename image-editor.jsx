import SelectionToolbar,{SelectionIcon} from './selection-toolbar.jsx';
import {captureCanvasGesture,releaseCanvasGesture} from './canvas-gesture.js';
import { t } from './i18n.js';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {flushSync} from 'react-dom';
import {useAlignmentGuides} from './alignment-guides.jsx';
import { imageGeometry, imageIntersectsCanvas, imageSettings, patchImage, duplicateImage, removeImage, edgeCropPatch, minEdgeCropSize } from './image-model.js';

const cropEdges=[
  ['top',0,-1,'Crop top edge. Use up and down arrow keys.'],
  ['right',1,0,'Crop right edge. Use left and right arrow keys.'],
  ['bottom',0,1,'Crop bottom edge. Use up and down arrow keys.'],
  ['left',-1,0,'Crop left edge. Use left and right arrow keys.'],
];

function Icon({name}) {
  const paths={edges:'M8 3H6a3 3 0 0 0-3 3v2m13-5h2a3 3 0 0 1 3 3v2M3 16v2a3 3 0 0 0 3 3h2m8 0h2a3 3 0 0 0 3-3v-2',duplicate:'M9 3h12v12H9ZM3 9h6m6 6v6H3V9',flip:'M12 3v18M8 6 2 18h6Zm8 0 6 12h-6Z',trash:'M4 7h16M9 4h6M6 7l1 13h10l1-13M10 10v7m4-7v7',rotate:'M5 8a8 8 0 1 1-1 8M5 3v5h5'};
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]}/></svg>;
}

export default function ImageHandles({settings:scene,media,update:save,onSelect,onEdges,id='device',objectId=id,geometryFor=imageGeometry,onDuplicate,onRemove,onSelectFrame,frameSelected=false,onFill,onDragOver,onDrop,background=false,hideOutline=false,onMore=[]}) {
  const settings=imageSettings(scene,id),sceneRef=useRef(scene);sceneRef.current=scene;
  function update(changes){const {selectedLayerId,...pose}=changes;save({...patchImage(sceneRef.current,id,pose),...('selectedLayerId' in changes?{selectedLayerId}:{})});}
  const root=useRef(null),latest=useRef(settings);latest.current=settings;
  const alignment=useAlignmentGuides(root);
  const gesture=useRef(null),pointers=useRef(new Map()),frame=useRef(0),pending=useRef(null),moved=useRef(false);
  const [bounds,setBounds]=useState({width:0,height:0}),[dragging,setDragging]=useState(false),[announcement,setAnnouncement]=useState('');
  const selected=scene.selectedLayerId===id,box=geometryFor(settings,media,bounds.width,bounds.height);
  useLayoutEffect(()=>{const parent=root.current.parentElement,observer=new ResizeObserver(()=>{const b=parent.getBoundingClientRect();setBounds({width:b.width,height:b.height});});observer.observe(parent);return()=>observer.disconnect();},[]);
  useLayoutEffect(()=>{
    const owner=root.current;
    return ()=>{cancelAnimationFrame(frame.current);releaseCanvasGesture(owner);};
  },[]);
  useEffect(()=>{const surface=root.current.closest('.preview')??root.current.parentElement;const deselect=event=>{if(sceneRef.current.selectedLayerId===id&&!event.target.closest('.image-selection,.text-selection,.text-floating-toolbar,.text-other-handle,button,input,label'))save({selectedLayerId:null});};surface.addEventListener('pointerdown',deselect);return()=>surface.removeEventListener('pointerdown',deselect);},[id,save]);
  function flush(){cancelAnimationFrame(frame.current);frame.current=0;if(pending.current){const next=pending.current;pending.current=null;latest.current={...latest.current,...next};flushSync(()=>update(next));}}
  function begin(event,type,edge){
    if(pointers.current.size&&(edge||gesture.current?.edge))return;
    if(event.button!==0)return;event.stopPropagation();if(settings.locked||settings.imagePattern){save({selectedLayerId:id});onSelect();return;}if(!captureCanvasGesture(root.current,event,{move,end}))return;moved.current=false;setDragging(true);
    alignment.start();pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});update({selectedLayerId:id});
    const rect=root.current.getBoundingClientRect(),current=latest.current,geometry=geometryFor(current,media,rect.width,rect.height),points=[...pointers.current.values()];
    const center={x:rect.left+geometry.cx,y:rect.top+geometry.cy};
    gesture.current={type:points.length>1?'pinch':type,edge,geometry,settings:current,rect,center,start:{x:event.clientX,y:event.clientY},distance:Math.hypot(event.clientX-center.x,event.clientY-center.y),angle:Math.atan2(event.clientY-center.y,event.clientX-center.x)};
    if(points.length>1){gesture.current.distance=Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y);gesture.current.angle=Math.atan2(points[1].y-points[0].y,points[1].x-points[0].x);gesture.current.start={x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2};}
  }
  function move(event){
    if(!gesture.current||!pointers.current.has(event.pointerId))return;event.stopPropagation();pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const g=gesture.current,points=[...pointers.current.values()],next={selectedLayerId:id};
    if(Math.hypot(event.clientX-g.start.x,event.clientY-g.start.y)>4)moved.current=true;setDragging(true);
    if(g.edge){
      if(!moved.current)return;
      Object.assign(next,edgeCropPatch(g.settings,media,g.geometry,g.rect,g.edge,event.clientX-g.start.x,event.clientY-g.start.y));
    }
    if(g.type==='drag'){
      next.x=g.settings.x+(event.clientX-g.start.x)/g.rect.width*100;next.y=g.settings.y+(event.clientY-g.start.y)/g.rect.height*100;
      if(!background&&moved.current){const delta=alignment.snap(geometryFor({...g.settings,...next},media,g.rect.width,g.rect.height),event.altKey);next.x+=delta.dx/g.rect.width*100;next.y+=delta.dy/g.rect.height*100;}
    }
    if(g.type==='resize')next.scale=Math.max(10,Math.min(300,g.settings.scale*Math.hypot(event.clientX-g.center.x,event.clientY-g.center.y)/Math.max(1,g.distance)));
    if(g.type==='rotate')next.roll=g.settings.roll+(Math.atan2(event.clientY-g.center.y,event.clientX-g.center.x)-g.angle)*180/Math.PI;
    if(g.type==='pinch'&&points.length>1){next.scale=Math.max(10,Math.min(300,g.settings.scale*Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y)/Math.max(1,g.distance)));next.roll=g.settings.roll+(Math.atan2(points[1].y-points[0].y,points[1].x-points[0].x)-g.angle)*180/Math.PI;next.x=g.settings.x+((points[0].x+points[1].x)/2-g.start.x)/g.rect.width*100;next.y=g.settings.y+((points[0].y+points[1].y)/2-g.start.y)/g.rect.height*100;}
    pending.current=next;if(!frame.current)frame.current=requestAnimationFrame(flush);
    if(g.type==='drag')onDragOver?.({x:event.clientX,y:event.clientY});
  }
  function end(event){const drop=moved.current&&gesture.current?.type==='drag'&&event.type!=='pointercancel';flush();alignment.clear();pointers.current.delete(event.pointerId);gesture.current=null;setDragging(pointers.current.size>0);setAnnouncement('Image adjusted');onDragOver?.(null);if(drop)onDrop?.({x:event.clientX,y:event.clientY});if(pointers.current.size){const point=[...pointers.current.values()][0];gesture.current={type:'drag',settings:latest.current,rect:root.current.getBoundingClientRect(),start:point};}}
  function keyboard(event,type,edge){
    if(event.key==='Escape'){event.preventDefault();save({selectedLayerId:null});return;}
    if(settings.locked||settings.imagePattern)return;
    if(edge){
      const horizontal=edge==='left'||edge==='right';
      const keys=horizontal?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown'];
      if(!keys.includes(event.key))return;
      event.preventDefault();event.stopPropagation();
      const step=(event.shiftKey?10:2)*(event.key===keys[0]?-1:1);
      const cos=Math.cos(box.angle),sin=Math.sin(box.angle);
      update(edgeCropPatch(settings,media,box,bounds,edge,horizontal?step*cos:-step*sin,horizontal?step*sin:step*cos));
      setAnnouncement(t('Crop adjusted'));
      return;
    }
    if(event.key==='Enter'){event.preventDefault();save({selectedLayerId:id});onEdges(id);return;}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();event.stopPropagation();const step=event.shiftKey?10:2;
    if(type==='resize')update({scale:Math.max(10,Math.min(300,settings.scale+(['ArrowRight','ArrowUp'].includes(event.key)?step:-step)))});
    else if(type==='rotate')update({roll:settings.roll+(['ArrowRight','ArrowUp'].includes(event.key)?step:-step)});
    else update({x:settings.x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0)/bounds.width*100,y:settings.y+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)/bounds.height*100});
    setAnnouncement('Image adjusted');
  }
  const events=(type,edge)=>({onPointerDown:event=>begin(event,type,edge),onPointerMove:move,onPointerUp:end,onPointerCancel:end,onLostPointerCapture:event=>{if(pointers.current.has(event.pointerId))end(event);},onKeyDown:event=>keyboard(event,type,edge)});
  const extentY=(Math.abs(Math.sin(box.angle))*box.width+Math.abs(Math.cos(box.angle))*box.height)/2;
  const visible=imageIntersectsCanvas(box,bounds.width,bounds.height);
  const cropAvailable=!settings.imagePattern&&!background&&settings.device==='flat'&&!settings.assetKind&&
    Math.min(box.width,box.height)>=minEdgeCropSize-.01;
  const imageTop=box.cy-extentY;
  let toolbarTop=imageTop+(imageTop>=52?-52:8),toolbarX=Math.max(98,Math.min(bounds.width-98,box.cx));
  // Keep the floating actions clear of the canvas's top-right Add button,
  // while retaining an image-relative position as the image leaves the canvas.
  if(box.cx>bounds.width-126&&toolbarTop<56&&toolbarTop+44>0){
    if(imageTop>=52)toolbarTop=imageTop+8;else toolbarX-=72;
  }
  const cornerPoint=(x,y)=>({x:box.cx+x*Math.cos(box.angle)-y*Math.sin(box.angle),y:box.cy+x*Math.sin(box.angle)+y*Math.cos(box.angle)});
  const corners=[['nw',-1,-1],['ne',1,-1],['sw',-1,1],['se',1,1]].map(([name,x,y])=>({name,...cornerPoint(x*box.width/2,y*box.height/2)}));
  const edgePoints=cropEdges.map(([edge,x,y,label])=>({edge,label,...cornerPoint(x*box.width/2,y*box.height/2)}));
  if(cropAvailable&&edgePoints.some(point=>Math.abs(point.x-toolbarX)<104&&point.y>=toolbarTop-22&&point.y<=toolbarTop+70)){
    const below=box.cy+extentY+18;
    if(below+48<=bounds.height)toolbarTop=below;
    else if(imageTop>=66)toolbarTop=imageTop-66;
    else toolbarTop=Math.max(0,Math.min(bounds.height-48,imageTop+24));
  }
  const rotatePoint=cornerPoint(-box.width/2-32,box.height/2+32);
  if(!bounds.width)return <div className="image-handle-layer" ref={root}/>;
  return <div className="image-handle-layer" ref={root} data-image-id={objectId} data-frame-selected={frameSelected?'true':undefined}>
    <div data-alignment-object={!background&&!settings.imagePattern&&visible?objectId:undefined} data-alignment-geometry={JSON.stringify(box)} className={'image-selection text-selection'+(selected&&!hideOutline&&!settings.imagePattern?' selected':'')} style={{zIndex:background?1:selected?100:2+Math.max(0,(scene.layers??[]).findIndex(layer=>layer.id===id))*2+(scene.hitOrder??0),left:box.cx,top:box.cy,width:box.width,height:box.height,transform:`translate(-50%,-50%) rotate(${box.angle}rad)`}}>
      <button type="button" className="text-move-handle" aria-label={t("Move image. Use arrow keys; Enter for edges.")} {...events('drag')} onClick={()=>{if(!moved.current){save({selectedLayerId:id});onSelect();}}}/>
    </div>
    {selected&&visible&&!frameSelected&&!settings.locked&&!settings.imagePattern&&<>{corners.map(corner=><button key={corner.name} type="button" className="image-transform-control is-resize" style={{left:corner.x,top:corner.y,zIndex:2000}} aria-label={'Resize image '+corner.name+'. Use arrow keys.'} {...events('resize')}><span/></button>)}<button type="button" className="image-transform-control is-rotate" style={{left:rotatePoint.x,top:rotatePoint.y,zIndex:2000}} aria-label={t('Rotate image. Use arrow keys.')} {...events('rotate')}><Icon name="rotate"/></button></>}
    {selected&&visible&&!frameSelected&&!settings.locked&&(cropAvailable||gesture.current?.edge)&&edgePoints.map(point=>(
      <button key={point.edge} type="button" className="image-transform-control is-crop" data-edge={point.edge}
        style={{left:point.x,top:point.y,rotate:box.angle+'rad'}}
        aria-label={t(point.label)} {...events('crop',point.edge)}><span/></button>
    ))}
    {visible&&onSelectFrame&&<button type="button" className="mockup-frame-target" aria-label={t('Select mockup frame')} aria-pressed={frameSelected} style={{left:box.cx,top:box.cy,width:box.width,height:box.height,transform:`translate(-50%,-50%) rotate(${box.angle}rad)`}} onPointerDown={event=>event.stopPropagation()} onClick={event=>{event.stopPropagation();onSelectFrame();}}><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect className="mockup-frame-hit" x="1.5" y=".75" width="97" height="98.5" rx="15" ry={15*box.width/Math.max(1,box.height)}/><rect className="mockup-frame-outline" x="1.5" y=".75" width="97" height="98.5" rx="15" ry={15*box.width/Math.max(1,box.height)}/></svg></button>}
    {selected&&visible&&!dragging&&<SelectionToolbar label="Selected image" locked={!!settings.locked} onLock={()=>update({locked:!settings.locked,...(settings.locked?{autoLayout:false}:{})})} style={{left:toolbarX,top:toolbarTop}} items={[
      {label:'Flip image',icon:'flip',disabled:frameSelected||settings.locked,action:()=>update({imageFlip:!settings.imageFlip})},
      ...(onFill?[{label:'Fill image',icon:'fill',action:()=>onFill({currentTarget:root.current})}]:[]),
      ...(onSelectFrame?[{label:settings.device==='flat'?'Add frame':'Remove frame',icon:settings.device==='flat'?'frame':'frameoff',action:()=>onSelectFrame('toggle')}]:[]),...onMore]}>
      <button type="button" aria-label={t('Duplicate image')} disabled={frameSelected} onClick={()=>onDuplicate?onDuplicate():save(duplicateImage(sceneRef.current,id))}><SelectionIcon name="duplicate"/></button>
      <button type="button" aria-label={t(frameSelected?'Delete mockup frame':'Delete image')} className="text-delete-action" onClick={()=>onRemove?onRemove():save(removeImage(sceneRef.current,id))}><SelectionIcon name="trash"/></button>
    </SelectionToolbar>}
    {alignment.overlay}<span className="visually-hidden" role="status">{announcement}</span>
  </div>;
}
