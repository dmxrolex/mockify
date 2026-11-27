import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {loadMedia,mediaInfo,releaseMedia} from './media.js';
import {evaluateTimeline,timelineDuration,timelineFor} from './timeline-model.js';

export function useSequencePlayback(settings,sources){
  const timeline=timelineFor(settings,sources),duration=timelineDuration(timeline);
  const [current,setCurrent]=useState(0),[playing,setPlaying]=useState(false),[revision,refresh]=useState(0),[attempt,retryLoad]=useState(0);
  const runtime=useRef(new Map()),pending=useRef(new Map()),state=useRef(null),clock=useRef(null),error=useRef(null);
  const origins=useRef(new Map()),listeners=useRef(new Map()),failures=useRef(new Map()),playRequests=useRef(new Map());
  const media=Array.isArray(sources)?sources:[sources];
  const clips=timeline?[...timeline.main,...timeline.overlays]:[];
  const objects=new Map((settings.pageObjects??[]).map(o=>[o.id,o]));
  const key=clips.map(c=>`${c.id}:${media[objects.get(c.objectId)?.index]?.url}`).join('|');
  state.current={settings,sources,timeline,duration,current,playing};
  function projectTime(){const s=state.current;return Math.max(0,Math.min(s.duration,s.playing&&clock.current?clock.current.time+(performance.now()-clock.current.at)/1000:s.current));}
  function dispose(id){
    const value=runtime.current.get(id);if(!value)return;
    value.element.removeEventListener('seeked',listeners.current.get(id));listeners.current.delete(id);
    pending.current.delete(value.element);playRequests.current.delete(value.element);origins.current.delete(id);runtime.current.delete(id);releaseMedia(value);
  }
  useEffect(()=>{
    let alive=true;const timers=new Set(),wanted=new Map(clips.map(c=>[c.id,media[objects.get(c.objectId)?.index]]));
    failures.current.clear();error.current=null;
    for(const [id] of runtime.current)if(!wanted.has(id)||origins.current.get(id)!==wanted.get(id))dispose(id);
    function load(clip,source,retried=false){
      loadMedia(mediaInfo(source)).then(value=>{
        if(!alive){releaseMedia(value);return;}
        runtime.current.set(clip.id,value);origins.current.set(clip.id,source);failures.current.delete(clip.id);
        const seeked=()=>{
          // A seek may finish several frames after it started. Re-evaluate the
          // latest clock instead of seeking back to an obsolete queued target.
          pending.current.delete(value.element);
          sync(projectTime(),state.current.playing);refresh(r=>r+1);
        };
        listeners.current.set(clip.id,seeked);value.element.addEventListener('seeked',seeked);
        sync(projectTime(),state.current.playing);refresh(r=>r+1);
      }).catch(e=>{
        if(!alive)return;
        if(!retried){const timer=setTimeout(()=>{timers.delete(timer);if(alive)load(clip,source,true);},400);timers.add(timer);return;}
        failures.current.set(clip.id,e);error.current=e;refresh(r=>r+1);
      });
    }
    for(const clip of clips){const source=wanted.get(clip.id);if(source?.kind==='video'&&!runtime.current.has(clip.id))load(clip,source);}
    return()=>{alive=false;for(const timer of timers)clearTimeout(timer);};
  },[key,attempt]);
  useEffect(()=>()=>{for(const [id] of [...runtime.current])dispose(id);pending.current.clear();},[]);
  function sync(time,play=false){
    const s=state.current,result=evaluateTimeline(s.settings,s.sources,time),active=new Set();
    for(const entry of result.entries){
      const value=runtime.current.get(entry.id);if(!value)continue;const video=value.element;active.add(entry.id);
      const target=Math.max(0,Math.min(Math.max(0,video.duration-.001),entry.sourceTime));
      const volume=Math.max(0,Math.min(1,Number(entry.volume)||0));video.volume=volume;video.muted=volume<=0;
      if(video.seeking)pending.current.set(video,target);
      else{
        pending.current.delete(video);
        if(Math.abs(video.currentTime-target)>(play?.12:.002))video.currentTime=target;
      }
      if(play&&video.paused&&!playRequests.current.has(video)){
        const request=video.play();
        if(request?.then){
          playRequests.current.set(video,request);
          request.catch(e=>{
            if(e.name==='AbortError'||!state.current.playing||runtime.current.get(entry.id)!==value)return;
            error.current=e;state.current.playing=false;setPlaying(false);refresh(r=>r+1);
          }).finally(()=>{if(playRequests.current.get(video)===request)playRequests.current.delete(video);});
        }
      }else if(!play&&!video.paused)video.pause();
    }
    for(const [id,value] of runtime.current)if(!active.has(id)){pending.current.delete(value.element);value.element.pause();}
  }
  useLayoutEffect(()=>{if(timeline)sync(current,playing);},[current,playing,revision,key,settings]);
  useEffect(()=>{
    if(!playing)return;clock.current={time:state.current.current,at:performance.now()};let frame;
    function tick(now){
      const s=state.current,time=clock.current.time+(now-clock.current.at)/1000;
      if(!s.playing)return;
      if(time>=s.duration){state.current.playing=false;setCurrent(Math.max(0,s.duration-1e-5));setPlaying(false);return;}
      const active=evaluateTimeline(s.settings,s.sources,time).entries.filter(e=>e.source.kind==='video');
      if(active.some(e=>!runtime.current.has(e.id))){
        if(active.some(e=>failures.current.has(e.id))){state.current.playing=false;setPlaying(false);sync(s.current,false);return;}
        // Pause the project clock while a newly entered clip is still loading.
        clock.current={time:s.current,at:now};sync(s.current,false);frame=requestAnimationFrame(tick);return;
      }
      sync(time,true);state.current.current=time;setCurrent(time);frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(frame);clock.current=null;for(const value of runtime.current.values())value.element.pause();};
  },[playing,key]);
  useEffect(()=>{setCurrent(t=>Math.min(t,Math.max(0,duration-.00001)));},[duration]);
  useEffect(()=>{
    const hidden=()=>{if(document.hidden){const time=projectTime();state.current.current=time;state.current.playing=false;setCurrent(time);setPlaying(false);sync(time,false);}};
    document.addEventListener('visibilitychange',hidden);return()=>document.removeEventListener('visibilitychange',hidden);
  },[]);
  function seek(time){const next=Math.max(0,Math.min(duration,Number(time)||0));state.current.current=next;state.current.playing=false;setPlaying(false);setCurrent(next);sync(next,false);}
  function retry(){failures.current.clear();error.current=null;retryLoad(n=>n+1);}
  function toggle(){
    if(state.current.playing){const time=projectTime();state.current.current=time;state.current.playing=false;setCurrent(time);setPlaying(false);sync(time,false);return;}
    if(failures.current.size)retry();
    if(current>=duration-.02){state.current.current=0;setCurrent(0);}
    state.current.playing=true;setPlaying(true);
  }
  const evaluated=timeline?evaluateTimeline(settings,sources,current):null;
  const resolvedSources=[...media];
  const resolvedSettings=evaluated?{...evaluated.settings,pageObjects:evaluated.settings.pageObjects.map(object=>{
    const entry=evaluated.entries.find(e=>e.objectId===object.id),value=runtime.current.get(entry?.id);
    if(!value)return object;
    const index=resolvedSources.length;resolvedSources.push(value);return {...object,index};
  })}:settings;
  const ready=!evaluated||evaluated.entries.filter(e=>e.source.kind==='video').every(e=>runtime.current.has(e.id));
  return {timeline,duration,current,playing,seek,toggle,retry,ready,error:error.current,settings:resolvedSettings,sources:resolvedSources};
}
