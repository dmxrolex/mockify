import React,{useRef,useState} from 'react';
import {alignmentBounds,snapAlignment} from './alignment-model.js';
import './alignment-guides.css';

export function useAlignmentGuides(root) {
  const snapshot=useRef(null),[guides,setGuides]=useState([]);
  function clear(){snapshot.current=null;setGuides([]);}
  function start(){
    clear();const element=root.current;if(!element)return;
    const canvas=element.closest('.artboard-content');if(!canvas)return;
    const rect=element.getBoundingClientRect(),width=element.clientWidth,height=element.clientHeight;
    if(!rect.width||!width||!height)return;
    const scale=rect.width/width;
    const peers=[...canvas.querySelectorAll('[data-alignment-object]')].filter(node=>!element.contains(node)||node.classList.contains('text-other-handle')).map((node,index)=>{
      const b=node.getBoundingClientRect(),geometry=node.dataset.alignmentGeometry;
      return {id:node.dataset.alignmentObject||String(index),bounds:geometry?alignmentBounds(JSON.parse(geometry)):{left:(b.left-rect.left)/scale,right:(b.right-rect.left)/scale,top:(b.top-rect.top)/scale,bottom:(b.bottom-rect.top)/scale}};
    }).filter(({bounds:b})=>b.right>0&&b.bottom>0&&b.left<width&&b.top<height&&b.right>b.left&&b.bottom>b.top);
    snapshot.current={peers,width,height,scale,active:{}};
  }
  function snap(box,disabled=false){
    if(disabled){setGuides([]);if(snapshot.current)snapshot.current.active={};return {dx:0,dy:0};}
    if(!snapshot.current)start();const state=snapshot.current;if(!state)return {dx:0,dy:0};
    const result=snapAlignment(box,state.peers,state.width,state.height,state.active,6/state.scale);
    state.active=result.active;setGuides(result.guides);return result;
  }
  return {start,clear,snap,overlay:guides.length>0?<svg className="alignment-guides" aria-hidden="true">{guides.map((g,i)=>{
    const x=g.axis==='x',gap=g.axis.startsWith('gap'),horizontal=gap?g.axis==='gap-x':!x;
    const points=horizontal?{x1:g.from,x2:g.to,y1:g.value,y2:g.value}:{x1:g.value,x2:g.value,y1:g.from,y2:g.to};
    return <g key={i}><line {...points}/>{gap&&[g.from,g.to].map((p,j)=><line key={j} {...(horizontal?{x1:p,x2:p,y1:g.value-3,y2:g.value+3}:{x1:g.value-3,x2:g.value+3,y1:p,y2:p})}/>)}</g>;
  })}</svg>:null};
}
