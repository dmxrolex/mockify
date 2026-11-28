import test from 'node:test';
import assert from 'node:assert/strict';
import {statusGap} from '../status-gap.js';
// A 120×40 sample: glyphs in rows 4–11, a quiet gap in rows 12–19, app content from row 20.
function sample(rows){const w=120,h=40,p=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,v=rows(y,x);p[i]=p[i+1]=p[i+2]=v;p[i+3]=255;}return {p,w,h};}
test('finds the quiet gap between the old status bar and app content',()=>{
  const {p,w,h}=sample((y,x)=>(y>=4&&y<12||y>=20)&&x%9<3?240:60+x/4);
  assert.deepEqual(statusGap(p,w,h),{start:12,end:20});
});
test('smooth gradients alone are not mistaken for glyphs',()=>{
  const {p,w,h}=sample((y,x)=>40+x*1.5);
  assert.equal(statusGap(p,w,h),null);
});
