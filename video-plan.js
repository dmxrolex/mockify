import {keptVideoSegments,playableVideoSeconds,sourceTimeForElapsed} from './video-edits.js';
import {timelineFor,timelineDuration} from './timeline-model.js';
const dimensions={square:[1080,1080],story:[1080,1920],wide:[1920,1080],portrait:[1080,1350]};
export const videoPresets={standard:{shortEdge:720,videoBitsPerSecond:4_000_000},high:{shortEdge:1080,videoBitsPerSecond:8_000_000}};
export const MAX_VIDEO_BYTES=48_000_000;
export function timelineMediaSchedule(settings,source){
  const timeline=settings.timeline;if(timeline?.version!==2)return [];
  const sources=Array.isArray(source)?source:[source],objects=new Map((settings.pageObjects??[]).map(object=>[object.id,object]));
  let elapsed=0;const schedule=[];
  function add(clip,start,overlay=false){
    const object=objects.get(clip.objectId),index=object?.index,media=object?sources[index]:null;
    const from=Math.max(0,Number(clip.in)||0),to=Math.max(from,Number(clip.out)||0),duration=to-from;
    if(media&&duration>0)schedule.push({id:clip.id,clip,object,index,source:media,start,end:start+duration,in:from,out:to,volume:Math.max(0,Math.min(2,Number(clip.volume??(overlay?0:1))||0))});
    return duration;
  }
  for(const clip of timeline.main??[])elapsed+=add(clip,elapsed);
  for(const clip of timeline.overlays??[])add(clip,Math.max(0,Number(clip.start)||0),true);
  return schedule.map(clip=>({...clip,end:Math.min(elapsed,clip.end)})).filter(clip=>clip.end>clip.start);
}
export function videoPlan(settings,source,quality='high',sources=source){
  const preset=videoPresets[quality]??videoPresets.high,[width,height]=dimensions[settings.ratio]??dimensions.square,scale=preset.shortEdge/Math.min(width,height);
  const timeline=timelineFor(settings,sources),duration=source?.element?.duration??source?.duration??0,seconds=timeline?timelineDuration(timeline):playableVideoSeconds(keptVideoSegments(settings,duration));
  return {width:Math.round(width*scale/2)*2,height:Math.round(height*scale/2)*2,fps:source?.frameRate??null,videoBitsPerSecond:preset.videoBitsPerSecond,audioBitsPerSecond:128_000,seconds,estimatedBytes:Math.ceil(seconds*(preset.videoBitsPerSecond+128_000)/8*1.08)};
}
export function recordingsInScene(settings,source){const sources=Array.isArray(source)?source:[source],seen=new Set();return sources.flatMap((item,index)=>{if(item?.kind!=='video'||seen.has(item))return [];seen.add(item);const object=settings.pageObjects?.find(object=>object.index===index);return [{source:item,index,settings:object?{...settings,...object.pose}:settings,object}];});}
export function recordingInScene(settings,source){const clips=recordingsInScene(settings,source),first=settings.timeline?.version===2?settings.timeline.main?.find(item=>clips.some(clip=>clip.object?.id===item.objectId)):null;return (first?clips.find(clip=>clip.object?.id===first.objectId):null)??clips.find(clip=>clip.object?.itemId===settings.primaryVideoItemId)??clips[0]??null;}
export function clipTime(clip,elapsed,segments=keptVideoSegments(clip.settings,clip.source.element.duration)){
  const last=segments.at(-1);
  return last?Math.min(sourceTimeForElapsed(segments,elapsed),Math.max(last.start,last.end-.001)):0;
}
export function syncSecondaryClips(clips,primary,elapsed,playing,force=false){
  for(const clip of clips){
    if(clip.source===primary.source)continue;
    const video=clip.source.element,segments=keptVideoSegments(clip.settings,video.duration);
    const time=clipTime(clip,elapsed,segments),duration=playableVideoSeconds(segments);
    if((force||!video.seeking)&&Math.abs(video.currentTime-time)>(force?.005:.12))video.currentTime=time;
    if(playing&&elapsed<duration-.02){if(video.paused)video.play().catch(()=>{});}
    else video.pause();
  }
}
