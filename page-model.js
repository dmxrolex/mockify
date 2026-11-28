import {assetFor,isAssetFrame,frameAspectFor} from './asset-library.js';
// Pages contain references to uploaded media; transforms never copy image data.
export const objectKeys = ['locked','autoLayout','imageCrop','imageCropBasis','imagePattern','assetKind','assetEmpty','brightness','contrast','saturation','warmth','device','finish','angle','scale','x','y','roll','zoom','cleanup','top','bottom','fit','shadow','shadowStyle','shadowAngle','statusTone','statusStyle','statusTime','statusBattery','imageEdges','imageFlip','hideDevice','motion','trimStart','trimEnd','videoCuts','videoCutPoints','borderStyle','borderWidth','frameAspect'];
const objectKeySet = new Set(objectKeys);

export const defaultImagePattern={size:22,spacing:35,opacity:38,stagger:true,angle:0};
const fullSlot = {x:0,y:0,width:1,height:1};
// Auto-arranged: framed phones that are still locked, and photos added to the page, until the
// user moves, resizes or rotates them once (autoLayout:false). Then they are left alone for good.
const autoPlaced = object => !object.pose.assetKind&&!object.pose.hideDevice&&object.pose.autoLayout!==false&&(object.pose.device==='flat'?object.pose.autoLayout===true:object.pose.locked===true);
const PHONE_ASPECT = 1350/2760;
const aspectOf = object => object.pose.device==='flat'?Math.max(.2,Math.min(5,Number(object.aspect)||1)):PHONE_ASPECT;
const ratios = {square:1,story:9/16,wide:16/9,portrait:4/5};
const uid = () => globalThis.crypto?.randomUUID?.() ?? 'object-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const identityKeys=['assetKind','assetEmpty','frameAspect','borderStyle','borderWidth','lookSlot','imageCrop','imageCropBasis','locked','hideDevice','imageFlip','motion','imagePattern'];
// One object's full settings: the scene settings, then that object's own pose, with identity keys
// never borrowed from whichever object the scene settings currently mirror.
export const objectSettings=(settings,pose)=>({...settings,...Object.fromEntries(identityKeys.map(key=>[key,pose[key]])),...pose,imagePattern:pose.imagePattern??null});
const poseFor = settings => Object.fromEntries(objectKeys.filter(key=>key in (settings??{})).map(key=>[key,settings[key]]));
const layerFor = object => ({id:object.id,locked:object.pose.locked,type:object.pose.device==='flat'?'image':'device'});
const clampIndex = (index,count) => Math.max(0,Math.min(count-1,Math.trunc(Number(index)||0)));

export function gridSlots(count,ratio='square') {
  if(count<=0)return [];
  const columns=count>1?Math.min(count,Math.max(2,Math.floor(Math.sqrt(count*(ratios[ratio]??1))))):1;
  const rows=Math.ceil(count/columns);
  return Array.from({length:count},(_,index)=>{
    const row=Math.floor(index/columns),remaining=Math.min(columns,count-row*columns);
    return {x:(index%columns+(columns-remaining)/2)/columns,y:row/rows,width:1/columns,height:1/rows};
  });
}

function selection(page) {
  return page.objects.find(object=>object.id===page.selectedObjectId)??page.objects[0]??null;
}
function syncSelection(project,index=project.pageIndex??0) {
  const pageIndex=clampIndex(index,project.pages.length),page=project.pages[pageIndex],object=page&&selection(page);
  const active=object?Math.max(0,project.items.findIndex(item=>item.id===object.itemId)):Math.max(0,Math.min(project.active??0,project.items.length-1));
  return {...project,pageIndex,active};
}
function updateCurrent(project,change) {
  const prior=ensurePages(project),index=clampIndex(prior.pageIndex,prior.pages.length),page=prior.pages[index];
  if(!page)return prior;
  const next=change(page,prior);if(next===page)return prior;
  return syncSelection({...prior,pages:prior.pages.with(index,next)},index);
}
// Smart layout: try every number of rows, fill rows in order with balanced counts, and keep the
// arrangement that gives the screens the most area. Each slot is centred in its row and padded,
// because the renderer fits a phone or photo inside ~80% of its slot.
export function smartSlots(aspects,ratio='square'){
  const n=aspects.length;if(!n)return [];
  const width=ratios[ratio]??1,margin=.07,gap=.035,pad=1/.8,availableWidth=width-2*margin;
  let best=null;
  for(let rows=1;rows<=n;rows++){
    const counts=Array.from({length:rows},(_,row)=>Math.floor(n/rows)+(row<n%rows?1:0));
    // Justified rows: each row is as tall as fills the width, then all rows shrink together to fit.
    let start=0;const groups=counts.map(count=>{const group=aspects.slice(start,start+count);start+=count;return group;});
    let heights=groups.map(group=>(availableWidth-(group.length-1)*gap)/group.reduce((sum,a)=>sum+a,0));
    const room=1-2*margin-(rows-1)*gap,total=heights.reduce((sum,h)=>sum+h,0);
    if(total>room)heights=heights.map(h=>h*room/total);
    // Keep one row from towering over the rest (a lone portrait phone stays phone-sized).
    const cap=room/Math.max(1,rows)*1.6;heights=heights.map(h=>Math.min(h,cap));
    const area=groups.reduce((sum,group,i)=>sum+heights[i]*heights[i]*group.reduce((s2,a)=>s2+a,0),0);
    if(!best||area>best.area*1.0001)best={area,heights,groups};
  }
  const {heights,groups}=best,slots=[];
  let y=(1-(heights.reduce((sum,h)=>sum+h,0)+(groups.length-1)*gap))/2;
  groups.forEach((group,row)=>{
    const height=heights[row],rowWidth=group.reduce((sum,a)=>sum+a*height,0)+(group.length-1)*gap;let x=(width-rowWidth)/2;
    for(const a of group){const w=a*height,cx=x+w/2,cy=y+height/2,sw=w*pad,sh=height*pad;
      slots.push({x:(cx-sw/2)/width,y:cy-sh/2,width:sw/width,height:sh});x+=w+gap;}
    y+=height+gap;
  });
  return slots;
}

function reflow(page) {
  const placed=page.objects.filter(autoPlaced);
  const slots=placed.length<=1?placed.map(()=>({...fullSlot})):smartSlots(placed.map(aspectOf),page.settings.ratio);let index=0;
  return {...page,objects:page.objects.map(object=>autoPlaced(object)?{...object,slot:slots[index++]}:object)};
}
function withObjects(page,objects,{reflowObjects=false}={}) {
  const byId=new Map(objects.map(object=>[object.id,object]));
  const layers=(page.settings.layers??[]).filter(layer=>layer.type==='text'||byId.has(layer.id));
  const existing=new Set(layers.map(layer=>layer.id));
  for(const object of objects)if(!existing.has(object.id))layers.push(layerFor(object));
  const selectedObjectId=objects.some(object=>object.id===page.selectedObjectId)?page.selectedObjectId:objects[0]?.id??null;
  const previous=page.settings.selectedLayerId;
  const selectedLayerId=layers.some(layer=>layer.id===previous)?previous:selectedObjectId;
  const blurEffects=Object.fromEntries(Object.entries(page.settings.blurEffects??{}).filter(([id])=>id==='background'||id==='design'||byId.has(id)));
  const next={...page,objects,selectedObjectId,settings:{...page.settings,layers,selectedLayerId,blurEffects}};
  return reflowObjects?reflow(next):next;
}

function legacySettings(project,item) {
  if(project.layout==='individual')return {...project.settings,...item.settings};
  const settings={...item.settings,...project.settings};
  // Legacy Matching shared style, but a photo must not inherit a phone frame.
  if(item.settings?.device&&item.settings.device!==project.settings?.device)Object.assign(settings,poseFor(item.settings));
  return settings;
}
function migratePage(project,items,index) {
  const settings={...legacySettings(project,items[0])};
  if(project.layout==='collage')settings.ratio=project.collageRatio??settings.ratio;
  const objects=[],layers=[],usedIds=new Set();
  function unique(id){let next=id;while(usedIds.has(next))next+='-copy';usedIds.add(next);return next;}
  const legacyLayers=items.length===1&&Array.isArray(settings.layers)?settings.layers:null;
  for(const item of items){
    const effective=legacySettings(project,item),pose={...poseFor(effective),locked:effective.locked??effective.device!=='flat'};
    if(legacyLayers){
      for(const layer of legacyLayers){
        if(layer.type==='text'){layers.push({...layer});continue;}
        if(layer.type!=='device'&&layer.type!=='image')continue;
        if(layer.type==='device'&&effective.hideDevice)continue;
        const id=unique(layer.type==='device'?item.id:layer.id),object={id,itemId:item.id,pose:{...pose,...poseFor(layer),...(layer.type==='image'?{device:layer.device??'flat'}:{})},slot:{...fullSlot}};
        objects.push(object);layers.push(layerFor(object));
      }
    }else{
      if(!effective.hideDevice){const object={id:unique(item.id),itemId:item.id,aspect:item.source?.width&&item.source?.height?item.source.width/item.source.height:undefined,pose:pose.device==='flat'&&!pose.assetKind&&pose.autoLayout===undefined?{...pose,autoLayout:true}:pose,slot:{...fullSlot}};objects.push(object);layers.push(layerFor(object));}
    }
  }
  if(!legacyLayers){
    const text=settings.textOverlay;
    if(text?.text?.trim()&&text.enabled!==false)layers.push({...text,id:text.id??'text-legacy',type:'text'});
    else if(settings.watermark!=='none'&&settings.watermarkText?.trim())layers.push({id:'text-legacy',type:'text',text:settings.watermarkText,enabled:true,mode:settings.watermark==='tiled'?'tiled':'text',color:settings.watermarkColor??'#ffffff',opacity:settings.watermarkStrength??100,anchor:settings.watermarkCorner??'bottom-right'});
  }
  const selectedObjectId=objects.find(object=>object.id===settings.selectedLayerId)?.id??objects[0]?.id??null;
  const oldSelected=settings.selectedLayerId;
  settings.layers=layers;settings.selectedLayerId=layers.some(layer=>layer.id===oldSelected)?oldSelected:selectedObjectId;
  return reflow({id:'page-'+items[0].id,objects,settings,photo:project.layout==='individual'?items[0].photo??project.photo:project.photo,mode:'editor',selectedObjectId});
}

export function ensurePages(project) {
  if(Array.isArray(project.pages)){
    if(project.pages.every(page=>page.mode==='editor'&&page.objects.every(object=>typeof object.pose.locked==='boolean')))return project;
    return {...project,pages:project.pages.map(page=>({...page,mode:'editor',objects:page.objects.map(object=>({...object,pose:{...object.pose,locked:object.pose.locked??(page.mode!=='complex'&&object.pose.device!=='flat'&&!object.pose.assetKind)}}))}))};
  }
  const items=project.items??[];
  const pages=project.layout==='collage'&&items.length?[migratePage(project,items,0)]:items.map((item,index)=>migratePage(project,[item],index));
  return syncSelection({...project,pages,pageIndex:project.layout==='collage'?0:project.active??0});
}
export function pageFor(project,index) {
  const prior=ensurePages(project);return prior.pages[clampIndex(index??prior.pageIndex,prior.pages.length)];
}
export function pageCount(project){return ensurePages(project).pages.length;}
export function exportPageIndices(project){
  if(!project.pages){
    const indices=project.items.flatMap((item,index)=>{const settings=project.layout==='individual'?{...project.settings,...item.settings}:{...item.settings,...project.settings};return (!settings.hideDevice&&item.source)||(settings.layers??[]).some(layer=>layer.type==='image'||(layer.type==='text'&&layer.enabled!==false&&layer.text?.trim()))||settings.textOverlay?.text?.trim()?[index]:[];});
    return project.layout==='collage'&&indices.length?[0]:indices;
  }
  const available=new Set(project.items.map(item=>item.id));
  return project.pages.flatMap((page,index)=>page.objects.some(object=>available.has(object.itemId)&&!object.pose.hideDevice)||(page.settings.layers??[]).some(layer=>layer.type==='text'&&layer.enabled!==false&&layer.text?.trim()&&layer.opacity!==0)||(page.photo&&!page.keepEmpty)?[index]:[]);
}
export function deletePage(project,index=project.pageIndex??0){
  const prior=ensurePages(project);if(!prior.pages[index])return prior;
  if(prior.pages.length===1){const page=prior.pages[0];return {...prior,pageIndex:0,pages:[{...page,objects:[],photo:null,selectedObjectId:null,keepEmpty:true,settings:{...page.settings,background:'gradient',layers:[],textOverlay:null,watermark:'none',selectedLayerId:null,timeline:null,showcase:null}}]};}
  return syncSelection({...prior,pages:prior.pages.filter((_,i)=>i!==index)},Math.max(0,(prior.pageIndex??0)-(index<=(prior.pageIndex??0)?1:0)));
}
export function selectedObject(project){const page=pageFor(project);return page?selection(page):null;}
export function selectObject(project,id) {
  return updateCurrent(project,page=>page.objects.some(object=>object.id===id)?{...page,selectedObjectId:id,settings:{...page.settings,selectedLayerId:id}}:page);
}
export function selectPage(project,index){return syncSelection(ensurePages(project),index);}

export function changePage(project,patch) {
  return updateCurrent(project,page=>{
    let objects=page.objects,selectedObjectId=page.selectedObjectId;
    if(patch._stack){const id=page.settings.selectedLayerId,layers=page.settings.layers??page.objects.map(layerFor),chosen=layers.find(layer=>layer.id===id);if(!chosen)return page;const rest=layers.filter(layer=>layer.id!==id),next=patch._stack==='front'?[...rest,chosen]:[chosen,...rest],order=new Map(next.map((layer,index)=>[layer.id,index]));return {...page,objects:[...objects].sort((a,b)=>order.get(a.id)-order.get(b.id)),settings:{...page.settings,layers:next}};}
    if(objects.some(object=>object.id===patch.selectedLayerId))selectedObjectId=patch.selectedLayerId;
    const objectPatch={},pagePatch={};
    for(const [key,value] of Object.entries(patch))(objectKeySet.has(key)?objectPatch:pagePatch)[key]=value;
    if(Object.keys(objectPatch).length&&selectedObjectId)objects=objects.map(object=>object.id===selectedObjectId?{...object,...(objectPatch.device==='flat'&&object.pose.device!=='flat'&&!object.framedPose?{framedPose:{...object.pose}}:{}),pose:{...object.pose,...objectPatch}}:object);
    if('imagePattern' in objectPatch){
      const before=page.objects.find(object=>object.id===selectedObjectId)?.pose.imagePattern;
      const after=objectPatch.imagePattern;
      const layers=page.settings.layers??page.objects.map(layerFor);
      const index=layers.findIndex(layer=>layer.id===selectedObjectId);
      if(index>=0&&Boolean(before)!==Boolean(after)){
        const ordered=[...layers], [layer]=ordered.splice(index,1);
        ordered.splice(after?0:Math.min(before.originalIndex??index,ordered.length),0,layer);
        pagePatch.layers=ordered;
        if(after)objects=objects.map(object=>object.id===selectedObjectId?{...object,pose:{...object.pose,imagePattern:{...after,originalIndex:index}}}:object);
      }
    }
    if(Array.isArray(patch.layers)){
      const order=new Map(patch.layers.map((layer,index)=>[layer.id,index]));
      objects=objects.filter(object=>order.has(object.id)).toSorted((a,b)=>order.get(a.id)-order.get(b.id));
      if(!objects.some(object=>object.id===selectedObjectId))selectedObjectId=objects[0]?.id??null;
    }
    const settings={...page.settings,...pagePatch};
    if(Array.isArray(patch.layers)&&settings.selectedLayerId&&!patch.layers.some(layer=>layer.id===settings.selectedLayerId))settings.selectedLayerId=selectedObjectId;
    const next={...page,objects,selectedObjectId,settings};
    return 'ratio' in pagePatch&&pagePatch.ratio!==page.settings.ratio?reflow(next):next;
  });
}
export function addPage(project) {
  const prior=ensurePages(project),current=pageFor(prior),settings={...(current?.settings??prior.settings),layers:[],textOverlay:null,watermark:'none',selectedLayerId:null,showcase:null,timeline:null};
  settings.blurEffects=Object.fromEntries(Object.entries(settings.blurEffects??{}).filter(([id])=>id==='background'||id==='design'));
  const page={id:uid(),objects:[],settings,photo:current?.photo??prior.photo,mode:'editor',selectedObjectId:null,keepEmpty:true};
  return syncSelection({...prior,pages:[...prior.pages,page]},prior.pages.length);
}

export function addLibraryAsset(project,item,kind,point={x:.5,y:.5}){
  const asset=assetFor(kind);if(!asset)return project;
  const object={id:uid(),itemId:item.id,pose:{...poseFor(item.settings),locked:kind==='phone',assetKind:kind,assetEmpty:asset.frame===true,device:kind==='phone'?'iphone18':'flat',cleanup:'off',fit:kind==='phone'?'cover':'contain',scale:kind==='phone'?46:36,x:(point.x-.5)*100,y:(point.y-.5)*100,roll:0,zoom:0,shadow:asset.frame?28:0,imageEdges:0},slot:{...fullSlot}};
  const prior=ensurePages(project),withMedia={...prior,items:[...prior.items,{...item,settings:{...item.settings,...object.pose}}]};
  return updateCurrent(withMedia,page=>{
    const next=withObjects(page,[...page.objects,object]);
    return {...next,selectedObjectId:object.id,settings:{...next.settings,selectedLayerId:object.id}};
  });
}

export function fillAssetFrame(project,frameId,itemId,consumedObjectId=null){
  const prior=ensurePages(project);if(!prior.items.some(item=>item.id===itemId))return prior;
  return updateCurrent(prior,page=>{
    const target=page.objects.find(object=>object.id===frameId);if(!target||!isAssetFrame(target.pose)||frameId===consumedObjectId)return page;
    const consumed=page.objects.find(object=>object.id===consumedObjectId),content=consumed?Object.fromEntries(['brightness','contrast','saturation','warmth','imageFlip','trimStart','trimEnd','videoCuts','videoCutPoints'].filter(key=>key in consumed.pose).map(key=>[key,consumed.pose[key]])):{};
    const phoneStatus=target.pose.assetKind==='phone'?{cleanup:'auto',fit:'cover'}:{};
    const objects=page.objects.filter(object=>object.id!==consumedObjectId).map(object=>object.id===frameId?{...object,itemId,pose:{...object.pose,...content,...phoneStatus,assetEmpty:false}}:object);
    const blurEffects={...page.settings.blurEffects};if(consumedObjectId&&blurEffects[consumedObjectId]){blurEffects[frameId]=blurEffects[consumedObjectId];delete blurEffects[consumedObjectId];}
    return {...withObjects(page,objects,{reflowObjects:true}),selectedObjectId:frameId,settings:{...page.settings,blurEffects,layers:(page.settings.layers??[]).filter(layer=>layer.id!==consumedObjectId),selectedLayerId:frameId}};
  });
}

export function assignItem(project,pageId,itemId,include=true) {
  let prior=ensurePages(project),targetIndex=prior.pages.findIndex(page=>page.id===pageId),item=prior.items.find(item=>item.id===itemId);
  if(targetIndex<0||!item)return prior;
  const target=prior.pages[targetIndex],current=target.objects.find(object=>object.itemId===itemId);
  if(!include){
    if(!current)return prior;
    const moved=target.objects.filter(object=>object.itemId===itemId),remaining=target.objects.filter(object=>object.itemId!==itemId);
    const detached=reflow({id:uid(),objects:moved,settings:{...target.settings,layers:moved.map(layerFor),textOverlay:null,watermark:'none',selectedLayerId:current.id},photo:target.photo,mode:target.mode,selectedObjectId:current.id});
    const pages=prior.pages.with(targetIndex,withObjects(target,remaining,{reflowObjects:true})).toSpliced(targetIndex+1,0,detached);
    return syncSelection({...prior,pages},targetIndex);
  }
  if(current)return prior;
  const existing=prior.pages.flatMap(page=>page.objects).filter(object=>object.itemId===itemId);
  const chosen=existing.length?existing.map(object=>({...object,pose:{...object.pose}})):[{id:uid(),itemId,pose:poseFor(item.settings??prior.settings),slot:{...fullSlot}}];
  const effects={...target.settings.blurEffects};
  for(const object of chosen){const owner=prior.pages.find(page=>page.objects.some(entry=>entry.id===object.id)),effect=owner?.settings.blurEffects?.[object.id];if(effect)effects[object.id]=structuredClone(effect);}
  const pages=prior.pages.map((page,index)=>index===targetIndex?withObjects({...page,settings:{...page.settings,blurEffects:effects}},[...page.objects,...chosen],{reflowObjects:true}):page.objects.some(object=>object.itemId===itemId)?withObjects(page,page.objects.filter(object=>object.itemId!==itemId),{reflowObjects:true}):page);
  return syncSelection({...prior,pages},targetIndex);
}

// Only live canvas occurrences belong in Pages. Multiple copies may share a source.
export function pageMediaChoices(project) {
  const prior=ensurePages(project),items=new Map(prior.items.map(item=>[item.id,item.source]));
  return prior.pages.flatMap((page,pageIndex)=>page.objects.flatMap(object=>{
    const source=items.get(object.itemId);
    return source?[{id:object.id,itemId:object.itemId,pageIndex,source}]:[];
  }));
}

export function assignObject(project,pageId,objectId,include=true) {
  const prior=ensurePages(project),targetIndex=prior.pages.findIndex(page=>page.id===pageId);
  if(targetIndex<0)return prior;
  const target=prior.pages[targetIndex];
  const current=target.objects.find(object=>object.id===objectId);
  if(!include){
    if(!current)return prior;
    const remaining=target.objects.filter(object=>object.id!==current.id);
    const detached={id:uid(),objects:[current],settings:{...target.settings,layers:[layerFor(current)],textOverlay:null,watermark:'none',selectedLayerId:current.id},photo:target.photo,mode:target.mode,selectedObjectId:current.id};
    const page=reflow(detached);
    const pages=prior.pages.with(targetIndex,withObjects(target,remaining,{reflowObjects:true})).toSpliced(targetIndex+1,0,page);
    return syncSelection({...prior,pages},targetIndex);
  }
  if(current)return prior;
  const owner=prior.pages.find(page=>page.objects.some(object=>object.id===objectId));
  const chosen=owner?.objects.find(object=>object.id===objectId);
  if(!chosen||!prior.items.some(item=>item.id===chosen.itemId))return prior;
  const effect=owner.settings.blurEffects?.[chosen.id];
  const destination=effect?{...target,settings:{...target.settings,blurEffects:{...target.settings.blurEffects,[chosen.id]:structuredClone(effect)}}}:target;
  const pages=prior.pages.map((page,index)=>index===targetIndex?withObjects(destination,[...page.objects,chosen],{reflowObjects:true}):page.objects.some(object=>object.id===chosen.id)?withObjects(page,page.objects.filter(object=>object.id!==chosen.id),{reflowObjects:true}):page);
  return selectObject(syncSelection({...prior,pages},targetIndex),chosen.id);
}

export function finishPages(project) {
  const prior=ensurePages(project),activeId=pageFor(prior)?.id;
  const nonempty=prior.pages.filter(page=>page.keepEmpty||page.objects.length||(page.photo&&!page.keepEmpty)||(page.settings.layers??[]).some(layer=>layer.type==='text'));
  const pages=nonempty.length?nonempty:prior.pages.slice(0,1);
  return syncSelection({...prior,pages},Math.max(0,pages.findIndex(page=>page.id===activeId)));
}

export function duplicateObject(project,id) {
  return updateCurrent(project,page=>{
    const index=page.objects.findIndex(object=>object.id===id);if(index<0)return page;
    const source=page.objects[index],copy={...source,id:uid(),pose:{...source.pose,locked:false,x:(source.pose.x??0)+5,y:(source.pose.y??0)+5},slot:{...source.slot},...(source.framedPose?{framedPose:{...source.framedPose}}:{})};
    const objects=page.objects.toSpliced(index+1,0,copy),layers=page.settings.layers??page.objects.map(layerFor),layerIndex=layers.findIndex(layer=>layer.id===id);
    const effect=page.settings.blurEffects?.[source.id];
    return {...page,objects,selectedObjectId:copy.id,settings:{...page.settings,layers:layers.toSpliced(layerIndex+1,0,layerFor(copy)),selectedLayerId:copy.id,...(effect?{blurEffects:{...page.settings.blurEffects,[copy.id]:structuredClone(effect)}}:{})}};
  });
}
// Lock or unlock one object without changing the selection, its position, size or rotation.
export function setObjectLock(project,id,locked){
  return updateCurrent(project,page=>page.objects.some(object=>object.id===id)?{...page,objects:page.objects.map(object=>object.id===id?{...object,pose:{...object.pose,locked,...(locked?{}:{autoLayout:false})}}:object)}:page);
}
export function removeObject(project,id) {
  return updateCurrent(project,page=>page.objects.some(object=>object.id===id)?withObjects(page,page.objects.filter(object=>object.id!==id),{reflowObjects:true}):page);
}
export function toggleObjectFrame(project,id) {
  return updateCurrent(project,page=>{
    const objects=page.objects.map(object=>{
      if(object.id!==id)return object;
      if(object.pose.device!=='flat')return {...object,framedPose:{...object.pose},pose:{...object.pose,device:'flat',cleanup:'off',...(object.pose.assetKind==='phone'?{assetKind:null,assetEmpty:false}:{})}};
      if(!object.framedPose)return object;
      const {framedPose,...rest}=object;
      const transforms=Object.fromEntries(['locked','x','y','roll','scale','imageFlip'].filter(key=>key in object.pose).map(key=>[key,object.pose[key]]));
      return {...rest,pose:{...framedPose,...transforms}};
    });
    const byId=new Map(objects.map(object=>[object.id,object]));
    return {...page,objects,settings:{...page.settings,layers:(page.settings.layers??[]).map(layer=>byId.has(layer.id)?layerFor(byId.get(layer.id)):layer)}};
  });
}

export function appendItems(project,imported,{overlay}={}) {
  if(!imported.length)return ensurePages(project);
  let prior=ensurePages(project);
  overlay??=false;
  const known=new Set(prior.items.map(item=>item.id)),added=imported.filter(item=>!known.has(item.id)).map(item=>({...item,settings:{...item.settings,...(overlay?{device:'flat',locked:false,cleanup:'off',fit:'contain',imageEdges:4,shadow:38}:{}),locked:overlay?false:item.settings?.locked??item.settings?.device!=='flat'}}));
  if(!added.length)return prior;
  prior={...prior,items:[...prior.items,...added]};
  if(prior.pages.length){
    return updateCurrent(prior,page=>{
      const objects=[...page.objects,...added.map(item=>({id:uid(),itemId:item.id,aspect:item.source?.width&&item.source?.height?item.source.width/item.source.height:undefined,pose:{...poseFor(item.settings??prior.settings),...(!item.settings.locked?{scale:overlay?60:100,x:0,y:0,...(overlay?{}:{autoLayout:true})}:{})},slot:{...fullSlot}}))];
      const next=withObjects(page,objects,{reflowObjects:true}),selectedObjectId=objects.at(-1).id;
      return {...next,selectedObjectId,settings:{...next.settings,selectedLayerId:selectedObjectId}};
    });
  }
  const pages=added.map((item,index)=>migratePage({...prior,layout:'individual'},[item],index));
  return syncSelection({...prior,pages:[...prior.pages,...pages]},prior.pages.length);
}

export function pageScene(project,index) {
  const prior=ensurePages(project),page=pageFor(prior,index);
  if(!page)return {settings:{...prior.settings,editorMode:'editor',pageObjects:[],layers:[]},source:[],photo:prior.photo,page:null};
  const items=new Map(prior.items.map(item=>[item.id,item])),byId=new Map(page.objects.map(object=>[object.id,object]));
  const layers=page.settings.layers??page.objects.map(layerFor),ordered=layers.filter(layer=>byId.has(layer.id)).map(layer=>byId.get(layer.id)).filter(object=>items.has(object.itemId));
  const selected=selection(page),source=ordered.map(object=>items.get(object.itemId).source);
  const decorated=layers.map(layer=>byId.has(layer.id)?{...layer,...byId.get(layer.id).pose,...layerFor(byId.get(layer.id))}:layer);
  // Settings an object doesn't store itself come from the page, never from the selected object's
  // pose that the scene settings mirror below. Identity keys (frame kind, lock, crop...) never fill in.
  const pageDefaults=Object.fromEntries(Object.entries(poseFor(page.settings)).filter(([key])=>!identityKeys.includes(key)));
  const pageObjects=ordered.map((object,index)=>({...object,pose:{...pageDefaults,...object.pose},index}));
  return {settings:{...page.settings,...selected?.pose,primaryVideoItemId:prior.items.find(item=>item.source.kind==='video'&&page.objects.some(object=>object.itemId===item.id))?.id,selectedLayerId:page.settings.selectedLayerId,editorMode:page.mode,pageObjects,layers:decorated},source,photo:page.photo??prior.photo,page};
}

// Borders tool: dress one photo in a plain border, a frame (browser, instant photo, film...) or
// the iPhone, or remove whatever it has. Frames take the photo's own proportions, so nothing is
// cropped; the photo keeps its place, size, rotation and lock.
const borderKeys=['assetKind','assetEmpty','frameAspect','borderStyle','borderWidth'];
export function setObjectBorder(project,id,choice,{width}={}){
  const prior=ensurePages(project);
  return updateCurrent(prior,page=>{
    const objects=page.objects.map(object=>{
      if(object.id!==id)return object;
      const source=prior.items.find(item=>item.id===object.itemId)?.source,aspect=source?.width&&source?.height?source.width/source.height:1;
      let {framedPose,...base}=object,pose=Object.fromEntries(Object.entries(object.pose).filter(([key])=>!borderKeys.includes(key)||(key==='assetKind'&&object.pose.assetKind==='phone')));
      if(pose.assetKind==='phone'){delete pose.assetKind;}
      const flat={...pose,device:'flat',cleanup:'off'};
      if(choice==='phone'){
        if(object.pose.device!=='flat')return object;
        return {...base,pose:framedPose?{...framedPose,...Object.fromEntries(['locked','x','y','roll','scale','imageFlip'].filter(key=>key in pose).map(key=>[key,pose[key]]))}:{...pose,device:'iphone18',cleanup:'auto',fit:'cover'}};
      }
      const keep=object.pose.device!=='flat'?{framedPose:{...object.pose}}:framedPose?{framedPose}:{};
      if(choice==='none')return {...base,...keep,pose:flat};
      const style=['white','black','cream','line'].includes(choice)?choice:null,kind=style?'border':choice;
      const next={...flat,assetKind:kind,assetEmpty:false,...(style?{borderStyle:style,borderWidth:width??object.pose.borderWidth??1.5}:{})};
      return {...base,...keep,pose:{...next,frameAspect:frameAspectFor(kind,aspect,next)}};
    });
    const byId=new Map(objects.map(object=>[object.id,object]));
    return {...page,objects,settings:{...page.settings,layers:(page.settings.layers??[]).map(layer=>byId.has(layer.id)?layerFor(byId.get(layer.id)):layer)}};
  });
}
export function borderChoice(pose){
  if(!pose)return 'none';
  if(pose.device&&pose.device!=='flat')return 'phone';
  if(pose.assetKind==='border')return pose.borderStyle??'white';
  return pose.assetKind&&pose.assetKind!=='photo'&&pose.assetKind!=='phone'?pose.assetKind:'none';
}
