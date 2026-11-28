import React, { useEffect, useRef, useState } from 'react';

let playerModule;
const loadPlayer=()=>playerModule??=import('lottie-web/build/player/lottie_light.min.js');
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

// Ducks from the emoji pack, by place in the app (served by the Worker from Telegram). Each
// place may name a bundled animation to use when the pack can't be reached (dev, offline).
const fallbacks={download:()=>import('./assets/download-duck.json'),files:()=>import('./assets/files-duck.json')};
const loaded=new Map();
export function slotSticker(slot){
  if(!loaded.has(slot))loaded.set(slot,fetch('/api/sticker/'+slot,{credentials:'omit'})
    .then(response=>response.ok&&response.headers.get('Content-Type')?.includes('json')?response.json():Promise.reject(new Error('unavailable')))
    .then(data=>({default:data}))
    .catch(error=>{loaded.delete(slot);return fallbacks[slot]?fallbacks[slot]():Promise.reject(error);}));
  return loaded.get(slot);
}
export function preloadStickers(){return Promise.all([loadPlayer(),slotSticker('files'),slotSticker('download')]).catch(()=>{});}

export function MotionSticker({load,className}){
  const [motion,setMotion]=useState(()=>!reducedMotion());
  useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)'),sync=()=>setMotion(!query.matches);query.addEventListener('change',sync);return()=>query.removeEventListener('change',sync);},[]);
  return motion?<AnimatedSticker as="span" className={className} load={load}/>:null;
}

// Plays a Lottie sticker with the light SVG player. `slot` loads a pack duck; `load` a bundled
// one. Pauses off-screen and in background tabs, holds a still frame with reduced motion, and
// shows `fallback` if nothing can be loaded.
export default function AnimatedSticker({load,slot,fallback=null,className,loop=true,as:Tag='div'}) {
  const root=useRef(null),player=useRef(null);
  const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);
  useEffect(()=>{
    let disposed=false,visible=true,hidden=document.hidden;setReady(false);setFailed(false);
    const still=reducedMotion();
    const sync=()=>{const animation=player.current;if(!animation||still)return;if(visible&&!hidden){if(animation.isPaused&&!(animation.loop===false&&animation.currentFrame>=animation.totalFrames-1))animation.play();}else animation.pause();};
    const pose=()=>{const animation=player.current;if(!animation)return;if(still)animation.goToAndStop(Math.round(animation.totalFrames*.35),true);else{animation.goToAndPlay(0,true);sync();}requestAnimationFrame(()=>{if(!disposed)setReady(true);});};
    Promise.all([loadPlayer(),slot?slotSticker(slot):load()]).then(([module,data])=>{
      if(disposed)return;
      const animation=player.current=module.default.loadAnimation({container:root.current,renderer:'svg',loop,autoplay:false,animationData:structuredClone(data.default),rendererSettings:{preserveAspectRatio:'xMidYMid meet',progressiveLoad:true}});
      animation.addEventListener('DOMLoaded',pose);
    }).catch(()=>{if(!disposed)setFailed(true);});
    const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();}):null;
    if(root.current)observer?.observe(root.current);
    const visibility=()=>{hidden=document.hidden;sync();};
    document.addEventListener('visibilitychange',visibility);
    return()=>{disposed=true;observer?.disconnect();document.removeEventListener('visibilitychange',visibility);player.current?.destroy();player.current=null;};
  },[load,slot,loop]);
  if(failed&&fallback)return fallback;
  return <Tag className={className} ref={root} data-ready={ready} aria-hidden="true"/>;
}
