import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {t} from './i18n.js';
export default function ToolScroller({children,position,suspended=false}){
  const root=useRef(null),[more,setMore]=useState({start:false,end:false});
  useLayoutEffect(()=>{
    if(!suspended)root.current.scrollTo({left:position.current,behavior:'instant'});
  },[position,suspended]);
  const remember=()=>{if(!suspended)position.current=root.current.scrollLeft;};
  useEffect(()=>{
    const element=root.current,first=element.firstElementChild,last=element.lastElementChild;
    if(!first||!last)return;
    const observer=new IntersectionObserver(entries=>{setMore(previous=>{const next={...previous};for(const entry of entries)next[entry.target===first?'start':'end']=entry.intersectionRatio<.999;return next.start===previous.start&&next.end===previous.end?previous:next;});},{root:element,threshold:1,rootMargin:'1px'});
    observer.observe(first);observer.observe(last);return()=>observer.disconnect();
  },[children.length]);
  const move=direction=>root.current.scrollBy({left:direction*root.current.clientWidth*.75,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  return <div className="tool-navigation"><div ref={root} onScroll={remember} onClickCapture={remember} className="toolstrip" role="group" aria-label={t('Editor controls')}>{children}</div><div className="toolstrip-hints" aria-label={t('More editing tools')}>
    <button type="button" aria-label={t('Previous tools')} disabled={!more.start} onClick={()=>move(-1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button>
    <button type="button" aria-label={t('More tools')} disabled={!more.end} onClick={()=>move(1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button>
  </div></div>;
}
