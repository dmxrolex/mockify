import {isAssetFrame} from './asset-library.js';
import React,{useLayoutEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import {t} from './i18n.js';
import {pageObjectGeometry,ratios} from './render.js';
import {pageScene,selectObject,changePage,toggleObjectFrame} from './page-model.js';
import ImageHandles from './image-editor.jsx';
export function toggleFrameAtCurrentSize(project,id){
  const before=pageScene(project),object=before.settings.pageObjects.find(item=>item.id===id);if(!object)return project;
  const media=before.source[object.index],[width,height]=ratios[before.settings.ratio],old=pageObjectGeometry(before.settings,media,width,height,object);
  let next=toggleObjectFrame(project,id),after=pageScene(next),target=after.settings.pageObjects.find(item=>item.id===id),box=pageObjectGeometry(after.settings,media,width,height,target);
  next=changePage(selectObject(next,id),{scale:Math.max(10,Math.min(300,target.pose.scale*old.height/Math.max(1,box.height)))});
  after=pageScene(next);target=after.settings.pageObjects.find(item=>item.id===id);box=pageObjectGeometry(after.settings,media,width,height,target);
  return changePage(next,{x:target.pose.x+(old.cx-box.cx)/width*100,y:target.pose.y+(old.cy-box.cy)/height*100});
}
export default function PageObjects({settings,sources,onSelect,onDeselect,onUpdate,onDuplicate,onRemove,onFrame,onEdges,onShadow,onFill,onDropIntoFrame,onCrop,onPattern}){
  const root=useRef(null),[bounds,setBounds]=useState({width:0,height:0}),[frameId,setFrameId]=useState(null),[dropId,setDropId]=useState(null);
  useLayoutEffect(()=>{const element=root.current,observer=new ResizeObserver(()=>flushSync(()=>setBounds({width:element.clientWidth,height:element.clientHeight})));observer.observe(element);return()=>observer.disconnect();},[]);
  const objects=settings.pageObjects??[];
  function targetAt(point,sourceId){
    if(!point)return null;const rect=root.current.getBoundingClientRect();
    return [...objects].reverse().find(object=>{if(object.id===sourceId||!isAssetFrame(object.pose))return false;const box=pageObjectGeometry(settings,sources[object.index],bounds.width,bounds.height,object),dx=point.x-rect.left-box.cx,dy=point.y-rect.top-box.cy,x=dx*Math.cos(box.angle)+dy*Math.sin(box.angle),y=-dx*Math.sin(box.angle)+dy*Math.cos(box.angle);return Math.abs(x)<box.width/2&&Math.abs(y)<box.height/2;});
  }
  const showSelection=objects.filter(object=>!object.pose.hideDevice).length+(settings.layers??[]).filter(layer=>layer.type==='text'&&layer.enabled!==false&&layer.text?.trim()).length>1;
  return <div ref={root} className="page-object-targets">{objects.map((object,index)=>{
    const media=sources[object.index];if(!media||object.pose.hideDevice)return null;
    const selected=settings.selectedLayerId===object.id;
    return <ImageHandles key={object.id} objectId={object.id} settings={{...settings,...object.pose,imagePattern:object.pose.imagePattern??null,hitOrder:2+(settings.layers??[]).findIndex(layer=>layer.id===object.id)*2,locked:object.pose.locked??false,layers:undefined,selectedLayerId:selected?'device':null}} media={media} onFill={isAssetFrame(object.pose)?event=>onFill(object.id,event.currentTarget):undefined} onDragOver={!object.pose.assetKind?point=>setDropId(targetAt(point,object.id)?.id??null):undefined} onDrop={!object.pose.assetKind?point=>{const target=targetAt(point,object.id);if(target)onDropIntoFrame(object.id,target.id);}:undefined} frameSelected={selected&&frameId===object.id} hideOutline={!showSelection&&!object.pose.assetKind&&object.pose.locked===true} onMore={[...(!object.pose.assetKind&&media.kind==='image'?[{label:object.pose.imagePattern?'Image pattern':'Repeat image',icon:'pattern',disabled:object.pose.locked,action:()=>onPattern(object.id)}]:[]),...(!object.pose.imagePattern&&!object.pose.assetKind&&object.pose.device==='flat'?[{label:'Crop',icon:'crop',action:()=>onCrop(object.id)}]:[]),...(object.pose.device==='flat'&&!isAssetFrame(object.pose)?[{label:'Corners',icon:'corners',action:()=>onEdges(object.id)}]:[]),{label:'Shadow',icon:'shadow',action:()=>onShadow?.(object.id)},{label:'Bring to front',icon:'front',action:()=>onUpdate(object.id,{_stack:'front'})},{label:'Send to back',icon:'back',action:()=>onUpdate(object.id,{_stack:'back'})}]} onSelectFrame={!object.pose.imagePattern&&(object.pose.device!=='flat'||object.framedPose)?kind=>{if(kind==='toggle'){onFrame(object.id);return;}setFrameId(object.id);onSelect(object.id);}:undefined} onSelect={()=>{setFrameId(null);if(object.pose.imagePattern&&!object.pose.locked)onPattern(object.id);else onSelect(object.id);}} onEdges={()=>onEdges(object.id)} update={patch=>{const {selectedLayerId,...pose}=patch;setFrameId(null);if(selectedLayerId===null){onDeselect();return;}onUpdate(object.id,pose);}} geometryFor={(pose,source,width,height)=>pageObjectGeometry(settings,source,width,height,{...object,pose})} onDuplicate={()=>onDuplicate(object.id)} onRemove={()=>{if(frameId===object.id){setFrameId(null);onFrame(object.id);}else onRemove(object.id);}}/>;
  })}{dropId&&(()=>{const object=objects.find(item=>item.id===dropId);if(!object)return null;const box=pageObjectGeometry(settings,sources[object.index],bounds.width,bounds.height,object);return <div className="asset-drop-target" style={{left:box.cx,top:box.cy,width:box.width,height:box.height,transform:`translate(-50%,-50%) rotate(${box.angle}rad)`}}/>;})()}</div>;
}
