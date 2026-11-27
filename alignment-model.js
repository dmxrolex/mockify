// All distances here are canvas-local CSS pixels, independent of export size.
export function alignmentBounds(box) {
  const c=Math.abs(Math.cos(box.angle??0)),s=Math.abs(Math.sin(box.angle??0));
  const w=c*box.width+s*box.height,h=s*box.width+c*box.height;
  return {left:box.cx-w/2,right:box.cx+w/2,top:box.cy-h/2,bottom:box.cy+h/2};
}

export function snapAlignment(box,peers,width,height,previous={},tolerance=6) {
  const moving=alignmentBounds(box),guides=[],active={};let dx=0,dy=0;
  for(const axis of ['x','y']){
    const horizontal=axis==='x',lo=horizontal?'left':'top',hi=horizontal?'right':'bottom',otherLo=horizontal?'top':'left',otherHi=horizontal?'bottom':'right';
    const size=moving[hi]-moving[lo],points=[moving[lo],(moving[lo]+moving[hi])/2,moving[hi]],candidates=[];
    const add=(id,delta,reference,gaps)=>candidates.push({id,delta,reference,gaps});
    const targets=[{id:'page',bounds:{left:0,top:0,right:width,bottom:height}},...peers];
    for(const target of targets){
      const b=target.bounds;
      [b[lo],(b[lo]+b[hi])/2,b[hi]].forEach((value,j)=>points.forEach((point,i)=>add(`${axis}:${target.id}:${j}:${i}`,value-point,{value,bounds:b})));
    }
    // Adjacent peers on the same row/column offer equal gaps before, between,
    // or after them. Unrelated objects elsewhere on the page do not attract.
    const row=peers.filter(p=>Math.min(moving[otherHi],p.bounds[otherHi])-Math.max(moving[otherLo],p.bounds[otherLo])>0).sort((a,b)=>a.bounds[lo]-b.bounds[lo]);
    for(let i=1;i<row.length;i++){
      const a=row[i-1],b=row[i],gap=b.bounds[lo]-a.bounds[hi];
      const crossLo=Math.max(moving[otherLo],a.bounds[otherLo],b.bounds[otherLo]),crossHi=Math.min(moving[otherHi],a.bounds[otherHi],b.bounds[otherHi]);
      if(gap<0||crossHi<=crossLo)continue;
      const positions=[a.bounds[lo]-gap-size,(a.bounds[hi]+b.bounds[lo]-size)/2,b.bounds[hi]+gap];
      positions.forEach((start,k)=>{
        const end=start+size,intervals=k===0?[[end,a.bounds[lo]],[a.bounds[hi],b.bounds[lo]]]:k===1?[[a.bounds[hi],start],[end,b.bounds[lo]]]:[[a.bounds[hi],b.bounds[lo]],[b.bounds[hi],start]];
        if(intervals.some(([a,b])=>b-a<2))return;
        add(`${axis}:gap:${a.id}:${b.id}:${k}`,start-moving[lo],null,{intervals,cross:(crossLo+crossHi)/2});
      });
    }
    const retained=candidates.find(c=>c.id===previous[axis]&&Math.abs(c.delta)<=tolerance*1.6);
    const best=retained??candidates.filter(c=>Math.abs(c.delta)<=tolerance).sort((a,b)=>Math.abs(a.delta)-Math.abs(b.delta)||Number(!!a.gaps)-Number(!!b.gaps))[0];
    if(!best)continue;
    active[axis]=best.id;if(horizontal)dx=best.delta;else dy=best.delta;
    if(best.reference){const {value,bounds:b}=best.reference;guides.push({axis,value,from:Math.min(moving[otherLo],b[otherLo]),to:Math.max(moving[otherHi],b[otherHi])});}
    else for(const [from,to] of best.gaps.intervals)guides.push({axis:horizontal?'gap-x':'gap-y',value:best.gaps.cross,from,to});
  }
  return {dx,dy,guides,active};
}
