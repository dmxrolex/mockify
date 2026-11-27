import React, { useEffect, useRef, useState } from 'react';

let playerModule;
const loadPlayer=()=>playerModule??=import('lottie-web/build/player/lottie_light.min.js');
export function preloadStickers(){return Promise.all([loadPlayer(),import('./assets/files-duck.json'),import('./assets/download-duck.json')]);}

export function MotionSticker({load,className}){
  const [motion,setMotion]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)'),sync=()=>setMotion(!query.matches);query.addEventListener('change',sync);return()=>query.removeEventListener('change',sync);},[]);
  return motion?<AnimatedSticker as="span" className={className} load={load}/>:null;
}

export default function AnimatedSticker({load,className,loop=true,as:Tag='div'}) {
  const root=useRef(null),player=useRef(null);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    let disposed=false;

    const pose=()=>{const animation=player.current;if(!animation)return;animation.goToAndPlay(0,true);requestAnimationFrame(()=>{if(!disposed)setReady(true);});};
    Promise.all([loadPlayer(),load()]).then(([module,data])=>{
      if(disposed)return;
      const animation=player.current=module.default.loadAnimation({container:root.current,renderer:'svg',loop,autoplay:false,animationData:structuredClone(data.default),rendererSettings:{preserveAspectRatio:'xMidYMid meet',progressiveLoad:true}});
      animation.addEventListener('DOMLoaded',pose);
    }).catch(()=>{});
    let resume=false;
    const visibility=()=>{const animation=player.current;if(!animation)return;if(document.hidden){resume=!animation.isPaused;animation.pause();}else if(resume)animation.play();};
    document.addEventListener('visibilitychange',visibility);
    return()=>{disposed=true;document.removeEventListener('visibilitychange',visibility);player.current?.destroy();player.current=null;};
  },[load,loop]);
  return <Tag className={className} ref={root} data-ready={ready} aria-hidden="true"/>;
}

