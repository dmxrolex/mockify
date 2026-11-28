// Looks: a whole page saved as a reusable design. The background, canvas size, watermark,
// texts, stickers and every phone or photo's placement and style are kept; the screenshots
// themselves become empty spots ("lookSlot") that the user fills on the canvas.
import {pageFor,ensurePages,fillAssetFrame,appendItems} from './page-model.js';

export const LOOK_LIMITS={free:1,premium:10};
export const lookLimit=premium=>premium?LOOK_LIMITS.premium:LOOK_LIMITS.free;
const pageKeys=['background','palette','color','ratio','mark','halo','caption'];
// Per-screenshot data that must not travel into other screenshots.
const mediaKeys=['imageCrop','imageCropBasis','imagePattern','trimStart','trimEnd','videoCuts','videoCutPoints','assetEmpty','hideDevice','autoLayout'];
const uid=()=>globalThis.crypto?.randomUUID?.()??'id-'+Date.now().toString(36)+Math.random().toString(36).slice(2);
const omit=(object,keys)=>Object.fromEntries(Object.entries(object??{}).filter(([key])=>!keys.includes(key)));

function kindOf(object){
  const asset=object.pose.assetKind;
  if(asset==='phone'||(object.pose.lookSlot&&asset!=='photo'))return 'phone';
  if(asset==='photo')return 'photo';
  if(asset)return 'asset';
  return object.pose.device==='flat'?'photo':'phone';
}

// Text layers listed in `ask` are flagged so the editor highlights them when the Look is used.
export function captureTemplate(project,{name,ask=[],thumb=''}){
  const prior=ensurePages(project),page=pageFor(prior),settings=page.settings;
  const picked=Object.fromEntries(pageKeys.filter(key=>settings[key]!==undefined).map(key=>[key,settings[key]]));
  if(picked.background==='photo'||picked.background==='blur')picked.background='gradient';
  const objects=page.objects.filter(object=>!object.pose.hideDevice).map(object=>{
    const kind=kindOf(object),media=prior.items.find(item=>item.id===object.itemId)?.source;
    const aspect=object.pose.frameAspect??(media?.width&&media?.height?media.width/media.height:undefined);
    return {id:object.id,kind,...(kind==='asset'?{assetKind:object.pose.assetKind}:{}),aspect,slot:object.slot,pose:omit(object.pose,mediaKeys)};
  });
  const known=new Set(objects.map(object=>object.id));
  const layers=(settings.layers??[]).filter(layer=>layer.type==='text'||known.has(layer.id)).map(layer=>layer.type==='text'?{...layer,ask:ask.includes(layer.id)}:{id:layer.id,type:layer.type});
  return {id:'look-'+uid(),name:name?.trim()||'My look',createdAt:Date.now(),thumb,settings:picked,objects,layers,version:1};
}

export const lookSpots=look=>look.objects.filter(object=>object.kind!=='asset').length;
export const askedTexts=look=>(look.layers??[]).filter(layer=>layer.type==='text'&&layer.ask);

// Rebuild a page from a Look. `media(kind)` loads a placeholder or sticker image for an asset kind.
export async function pageFromTemplate(look,{media,defaults}){
  const items=[],objects=[],ids=new Map();
  for(const saved of look.objects){
    const kind=saved.kind,assetKind=kind==='asset'?saved.assetKind:kind==='photo'?'photo':'phone';
    const source=await media(assetKind);if(!source)continue;
    const id=uid(),itemId=uid();ids.set(saved.id,id);
    const pose={...saved.pose,assetKind,...(kind==='asset'?{}:{lookSlot:true,assetEmpty:true,autoLayout:false}),...(kind==='phone'?{device:'iphone18',locked:true}:{}),...(kind==='photo'?{device:'flat',frameAspect:saved.aspect??1}:{})};
    items.push({id:itemId,source,settings:{...defaults,...pose}});
    objects.push({id,itemId,pose,slot:saved.slot??{x:0,y:0,width:1,height:1},...(saved.aspect?{aspect:saved.aspect}:{})});
  }
  const layers=(look.layers??[]).flatMap(layer=>layer.type==='text'?[{...layer,id:uid()}]:ids.has(layer.id)?[{id:ids.get(layer.id),type:layer.type}]:[]);
  for(const object of objects)if(!layers.some(layer=>layer.id===object.id))layers.push({id:object.id,type:object.pose.device==='flat'?'image':'device'});
  const settings={...defaults,...look.settings,layers,selectedLayerId:null,textOverlay:null,watermark:'none',lookId:look.id};
  return {items,page:{id:'page-'+uid(),objects,settings,photo:null,mode:'editor',selectedObjectId:null,keepEmpty:true}};
}

export function projectFromPage(built,title,defaults){
  return {title,settings:{...defaults,...built.page.settings},items:built.items,active:0,layout:'individual',collageRatio:'wide',photo:null,id:null,pages:[built.page],pageIndex:0};
}

export const emptySpots=project=>(pageFor(ensurePages(project))?.objects??[]).filter(object=>object.pose.lookSlot&&object.pose.assetEmpty);

// Fill empty spots in order (starting with `first`), adding the new items to the project;
// screenshots beyond the spots join the page with the normal smart layout.
export function fillSpots(project,imported,first){
  let next=ensurePages(project);
  const order=[...emptySpots(next)].sort((a,b)=>(b.id===first)-(a.id===first)),queue=[...imported];
  for(const spot of order){const item=queue.shift();if(!item)break;const known=next.items.some(entry=>entry.id===item.id);next=fillAssetFrame(known?next:{...next,items:[...next.items,item]},spot.id,item.id);}
  // Leftovers already in the project are copied under new ids so they join this page too.
  return queue.length?appendItems(next,queue.map(item=>next.items.some(entry=>entry.id===item.id)?{...item,id:'item-'+uid()}:item)):next;
}

// Use a Look on the current page: its design replaces the page and the page's screenshots
// move into the Look's spots in order.
export function applyTemplateToPage(project,built){
  const prior=ensurePages(project),index=prior.pageIndex??0,page=prior.pages[index];
  const screenshots=(page?.objects??[]).filter(object=>!object.pose.assetKind&&!object.pose.hideDevice).map(object=>prior.items.find(item=>item.id===object.itemId)).filter(Boolean);
  const next={...prior,items:[...prior.items,...built.items],pages:prior.pages.with(index,{...built.page,id:page?.id??built.page.id})};
  return fillSpots(next,screenshots);
}
