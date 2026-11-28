import React, { useEffect, useRef, useState } from 'react';

let playerModule;
const loadPlayer=()=>playerModule??=import('lottie-web/build/player/lottie_light.min.js');
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

// Utya ducks by place in the app, bundled and loaded only when that place shows.
const ducks={
  choose:()=>import('./assets/ducks/phone.json'),download:()=>import('./assets/ducks/upload.json'),done:()=>import('./assets/ducks/party.json'),error:()=>import('./assets/ducks/cry.json'),
  files:()=>import('./assets/ducks/sleep.json'),looks:()=>import('./assets/ducks/painter.json'),
  promo:()=>import('./assets/ducks/gift.json'),stars:()=>import('./assets/ducks/money.json'),premium:()=>import('./assets/ducks/trophy.json'),discount:()=>import('./assets/ducks/shopping.json'),
};
export const slotSticker=slot=>ducks[slot]?ducks[slot]():Promise.reject(new Error('Unknown sticker'));
export function preloadStickers(){return Promise.all([loadPlayer(),slotSticker('files'),slotSticker('download')]).catch(()=>{});}

export function MotionSticker({load,className}){
  const [motion,setMotion]=useState(()=>!reducedMotion());
  useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)'),sync=()=>setMotion(!query.matches);query.addEventListener('change',sync);return()=>query.removeEventListener('change',sync);},[]);
  return motion?<AnimatedSticker as="span" className={className} load={load}/>:null;
}

// Plays a Lottie sticker with the light SVG player. `slot` names a duck above; `load` loads any
// other animation. Pauses off-screen and in background tabs, holds a still frame with reduced motion, and
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
