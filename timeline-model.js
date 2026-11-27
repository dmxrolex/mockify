import {editableVideoSegments,keptVideoSegments} from './video-edits.js';
import {cameraAt,gestureKind,sourceSignature} from './showcase-model.js';

export const timelineId=()=>crypto.randomUUID();
const span=clip=>Math.max(0,(clip.out??0)-(clip.in??0));
export const timelineDuration=timeline=>(timeline?.main??[]).reduce((sum,clip)=>sum+span(clip),0);
export function placedClips(timeline){let start=0;return (timeline?.main??[]).map(clip=>{const placed={...clip,start,end:start+span(clip)};start=placed.end;return placed;});}
export function timelineOwner(timeline,id){return placedClips(timeline).find(c=>c.id===id)??timeline.overlays.find(c=>c.id===id);}
export const effectTime=(timeline,effect)=>{const owner=timelineOwner(timeline,effect.clipId);return owner?owner.start+effect.time-owner.in:0;};
export function effectDuration(item,type){
  return type==='camera'?item.duration??1.9:item.gesture==='tap'?.65:item.duration??1;
}
export function effectTiming(owner,item,type,change){
  const point=type==='gesture'&&item.gesture==='tap';
  const duration=effectDuration(item,type);
  const length=Math.min(duration,Math.max(.001,owner.out-Math.max(owner.in,item.time)));
  if(change.duration!==undefined&&!point){
    const limit=Math.max(.001,owner.out-item.time);
    return {duration:Math.max(Math.min(type==='camera'?.1:.3,limit),Math.min(limit,change.duration,type==='camera'?Infinity:4))};
  }
  const time=Math.max(owner.in,Math.min(owner.out-(point?.001:length),change.time??item.time));
  return point?{time}:{time,...(length<duration?{duration:length}:{})};
}

// Lazy, deterministic migration never changes the stored draft until an edit.
export function timelineFor(settings,sources){
  const media=Array.isArray(sources)?sources:[sources],objects=settings.pageObjects??[];
  const videos=objects.filter(o=>media[o.index]?.kind==='video'&&!o.pose.hideDevice);
  if(settings.timeline?.version===2){
    const track=settings.timeline,ids=new Set([...objects.map(o=>o.id),...(settings.layers??[]).filter(l=>l.type==='text').map(l=>l.id)]);
    function valid(clip){const object=objects.find(o=>o.id===clip.objectId),source=media[object?.index],limit=source?.kind==='video'?source.element?.duration??source.duration:Infinity;const end=Math.min(limit,clip.out);return {...clip,in:Math.max(0,Math.min(clip.in,end-.001)),out:end};}
    const main=track.main.filter(c=>ids.has(c.objectId)).map(valid),overlays=track.overlays.filter(c=>ids.has(c.objectId)).map(valid);
    if(!main.length){const candidate=overlays.find(c=>videos.some(o=>o.id===c.objectId));if(candidate){main.push({...candidate,volume:candidate.volume??1});overlays.splice(overlays.indexOf(candidate),1);}else return videos.length?timelineFor({...settings,timeline:null},sources):null;}
    const known=new Set([...main,...overlays].map(c=>c.objectId)),duration=timelineDuration({main});
    for(const id of ids)if(!known.has(id)){
      const object=objects.find(o=>o.id===id),source=media[object?.index];
      overlays.push({id:'overlay:'+id,objectId:id,start:0,in:0,out:source?.kind==='video'?Math.min(duration,source.element.duration):duration,volume:0});
    }
    const clipIds=new Set([...main,...overlays].map(c=>c.id));
    return {...track,main,overlays,gestures:track.gestures.filter(e=>clipIds.has(e.clipId)),cameras:track.cameras.filter(e=>clipIds.has(e.clipId))};
  }
  if(!videos.length)return null;
  const primary=videos.find(o=>o.itemId===settings.primaryVideoItemId)??videos[0],source=media[primary.index];
  const segments=editableVideoSegments(primary.pose,keptVideoSegments(primary.pose,source.element?.duration??source.duration));
  const main=segments.map((s,i)=>({id:`clip:${primary.id}:${i}`,objectId:primary.id,in:s.start,out:s.end,volume:1/videos.length}));
  const duration=timelineDuration({main});
  const overlays=objects.filter(o=>o.id!==primary.id&&!o.pose.hideDevice).flatMap(o=>{
    const source=media[o.index];if(!source)return [];
    const spans=source.kind==='video'?keptVideoSegments(o.pose,source.element?.duration??source.duration):[{start:0,end:duration}];
    let start=0;return spans.map((s,i)=>{const clip={id:`overlay:${o.id}:${i}`,objectId:o.id,start,in:s.start,out:s.end,volume:source.kind==='video'?1/videos.length:0};start+=span(clip);return clip;});
  });
  const gestures=[],cameras=[],track=settings.showcase;
  if(track?.enabled!==false&&track?.signature===sourceSignature(source))for(const m of track.moments??[]){
    const owner=main.find(c=>m.time>=c.in&&m.time<c.out);if(!owner)continue;
    if(gestureKind(m)!=='none')gestures.push({...m,id:'gesture:'+m.id,clipId:owner.id,gesture:gestureKind(m),focus:false});
    if(m.focus){const start=Math.max(owner.in,m.time-.65);cameras.push({id:'camera:'+m.id,clipId:owner.id,time:start,duration:Math.min(owner.out,m.time+(m.hold??1.2)+.7)-start,legacy:true,legacyMoment:{...m}});}
  }
  for(const layer of settings.layers??[])if(layer.type==='text'&&layer.enabled!==false&&layer.text?.trim())overlays.push({id:'overlay:'+layer.id,objectId:layer.id,start:0,in:0,out:duration,volume:0});
  return {version:2,main,overlays,gestures,cameras};
}

export function cameraValue(block,time){
  if(block.legacy)return cameraAt([block.legacyMoment],time);
  const keys=[...(block.keyframes??[])].sort((a,b)=>a.time-b.time);
  if(!keys.length||time<keys[0].time||time>keys.at(-1).time)return null;
  const next=keys.findIndex(k=>k.time>=time),a=keys[Math.max(0,next-1)],b=keys[Math.max(0,next)];
  const f=b.time===a.time?1:Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time))),p=b.easing==='linear'?f:f*f*(3-2*f);
  return {x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p,zoom:a.zoom+(b.zoom-a.zoom)*p};
}

// Editing a legacy zoom promotes its complete envelope, never a single key.
export function cameraFrames(block,owner){
  if(block?.keyframes?.length)return block.keyframes;
  const m=block?.legacyMoment;if(!m||!owner)return [];
  const points=[[m.time-.65,1],[m.time,m.zoom??1.65],[m.time+(m.hold??1.2),m.zoom??1.65],[m.time+(m.hold??1.2)+.7,1]];
  return [...new Map(points.map(([time,zoom],i)=>{const value=Math.max(owner.in,Math.min(owner.out,time));return [value,{id:block.id+':key:'+i,time:value,x:m.x,y:m.y,zoom,easing:'smooth'}];})).values()];
}

export function evaluateTimeline(settings,sources,time){
  const timeline=timelineFor(settings,sources);if(!timeline)return {duration:0,entries:[],settings};
  const duration=timelineDuration(timeline),t=Math.max(0,Math.min(Math.max(0,duration-1e-7),Number(time)||0));
  const media=Array.isArray(sources)?sources:[sources],objects=settings.pageObjects??[],byId=new Map(objects.map(o=>[o.id,o]));
  const main=placedClips(timeline).find(c=>t>=c.start&&t<c.end);
  const visible=[...(main?[main]:[]),...timeline.overlays.filter(c=>t>=c.start&&t<c.start+span(c))];
  const entries=visible.flatMap(clip=>{const object=byId.get(clip.objectId),source=media[object?.index];return object&&source&&!object.pose.hideDevice?[{id:clip.id,objectId:object.id,index:object.index,sourceTime:clip.in+t-clip.start,volume:clip.volume??(clip.id===main?.id?1:0),source,clip}]:[];});
  const activeIds=new Set(visible.map(c=>c.objectId)),activeClips=new Map(entries.map(e=>[e.clip.id,e]));
  const gestures=timeline.gestures.flatMap(moment=>{const owner=activeClips.get(moment.clipId);return owner&&moment.time>=owner.clip.in&&moment.time<owner.clip.out?[{objectId:owner.objectId,moment,time:owner.sourceTime}]:[];});
  const cameras=[],legacy=[],cameraByObject=new Map();
  const legacyGroups=new Map();
  for(const block of timeline.cameras){const original=timelineOwner(timeline,block.clipId),owner=activeClips.get(block.clipId)??(block.legacy?entries.find(e=>e.objectId===original?.objectId):null);if(!owner)continue;if(block.legacy){const group=legacyGroups.get(owner.objectId)??{owner,moments:[]};group.moments.push(block.legacyMoment);legacyGroups.set(owner.objectId,group);continue;}const camera=cameraValue(block,owner.sourceTime);if(camera&&(!cameraByObject.has(owner.objectId)||block.time>=cameraByObject.get(owner.objectId).start))cameraByObject.set(owner.objectId,{objectId:owner.objectId,start:block.time,composition:block.composition,...camera});}
  for(const camera of cameraByObject.values()){
    if(camera.zoom>1.00001)(camera.composition?legacy:cameras).push(camera);
  }
  for(const {owner,moments} of legacyGroups.values()){const camera=cameraAt(moments,owner.sourceTime);if(camera.zoom>1.00001)legacy.push({objectId:owner.objectId,...camera});}
  const resolved={...settings,timeline:null,showcase:null,_timelineEvaluated:true,_timelineTime:t,_timelineCameras:cameras,_timelineLegacyCameras:legacy,_timelineGestures:gestures,
    pageObjects:objects.filter(o=>activeIds.has(o.id)).map(o=>{const entry=entries.find(e=>e.objectId===o.id);return entry?.clip.pose?{...o,pose:{...o.pose,...entry.clip.pose}}:o;}),
    layers:(settings.layers??[]).filter(l=>activeIds.has(l.id))};
  return {duration,main,entries,settings:resolved};
}

export function updateTimeline(timeline,type,id,changes){
  const key={clip:'main',overlay:'overlays',gesture:'gestures',camera:'cameras'}[type];if(!key)return timeline;
  return {...timeline,[key]:timeline[key].map(item=>{
    if(item.id!==id)return item;
    let patch=changes;
    const owner=type==='gesture'||type==='camera'?timelineOwner(timeline,item.clipId):null;
    if(owner&&!patch.keyframes&&(patch.time!==undefined||patch.duration!==undefined))patch={...patch,...effectTiming(owner,item,type,patch.time!==undefined?{time:patch.time}:{duration:patch.duration})};
    const next={...item,...patch};
    if(type==='camera'&&patch.time!==undefined&&!patch.keyframes){const delta=patch.time-item.time;next.keyframes=item.keyframes?.map(k=>({...k,time:k.time+delta}));if(item.legacyMoment)next.legacyMoment={...item.legacyMoment,time:item.legacyMoment.time+delta};}
    if(type==='camera'&&item.legacy&&patch.duration!==undefined){
      const envelope=cameraFrames(item,owner);
      if(envelope.length>1){
        const start=envelope[0].time,end=envelope.at(-1).time;
        next.legacy=false;next.composition=true;
        next.keyframes=envelope.map(key=>({...key,time:next.time+(key.time-start)*next.duration/(end-start)}));
      }
    }
    if(type==='camera'&&next.keyframes?.length){
      if(!item.legacy&&patch.duration!==undefined&&item.duration>0&&!patch.keyframes)next.keyframes=next.keyframes.map(k=>({...k,time:next.time+(k.time-next.time)*next.duration/item.duration}));
      next.keyframes=next.keyframes.map(k=>({...k,time:Math.max(owner.in,Math.min(owner.out,k.time))})).sort((a,b)=>a.time-b.time);
      next.time=next.keyframes[0].time;next.duration=next.keyframes.at(-1).time-next.time;
    }
    if(type==='gesture'&&owner){next.time=Math.max(owner.in,Math.min(owner.out-.001,next.time));next.duration=Math.max(.001,Math.min(next.duration??.65,owner.out-next.time));}
    return next;
  })};
}
export function removeTimelineItem(timeline,type,id){
  const key={clip:'main',overlay:'overlays',gesture:'gestures',camera:'cameras'}[type];if(!key||type==='clip'&&timeline.main.length<=1)return timeline;
  return {...timeline,[key]:timeline[key].filter(item=>item.id!==id),...(['clip','overlay'].includes(type)?{gestures:timeline.gestures.filter(e=>e.clipId!==id),cameras:timeline.cameras.filter(e=>e.clipId!==id)}:{})};
}
export function splitTimelineClip(timeline,id,projectTime){
  const clip=timelineOwner(timeline,id);if(!clip)return timeline;
  const time=clip.in+projectTime-clip.start;if(time-clip.in<.1||clip.out-time<.1)return timeline;
  const right={...clip,id:timelineId(),in:time,...(timeline.overlays.some(c=>c.id===id)?{start:projectTime}:{})};
  delete right.end;if(timeline.main.some(c=>c.id===id))delete right.start;
  const key=timeline.main.some(c=>c.id===id)?'main':'overlays';
  const result={...timeline,[key]:timeline[key].flatMap(c=>c.id===id?[{...c,out:time},right]:[c])};
  for(const field of ['gestures','cameras'])result[field]=timeline[field].flatMap(e=>{
    if(e.clipId!==id)return [e];
    if(e.time>=time)return [{...e,clipId:right.id}];
    if(field==='cameras'&&!e.legacy&&e.keyframes?.at(-1)?.time>time){
      const value=cameraValue(e,time),keyframe={id:timelineId(),time,...value,easing:'smooth'};
      return [{...e,duration:time-e.time,keyframes:[...e.keyframes.filter(k=>k.time<time),keyframe]}, {...e,id:timelineId(),clipId:right.id,time,duration:e.keyframes.at(-1).time-time,keyframes:[{...keyframe,id:timelineId()},...e.keyframes.filter(k=>k.time>time)]}];
    }
    return [e];
  });
  return result;
}
