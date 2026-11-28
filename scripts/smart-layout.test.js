import test from 'node:test';
import assert from 'node:assert/strict';
import {smartSlots} from '../page-model.js';
const phone=1350/2760;
const inside=s=>s.x+s.width/2>0&&s.x+s.width/2<1&&s.y+s.height/2>0&&s.y+s.height/2<1;
test('phones line up in one centred row on a square canvas',()=>{
  const slots=smartSlots([phone,phone,phone],'square');
  assert.equal(new Set(slots.map(s=>s.y.toFixed(4))).size,1);
  assert.ok(slots.every(inside));
  const centre=(slots[0].x+slots.at(-1).x+slots.at(-1).width)/2;assert.ok(Math.abs(centre-.5)<1e-9);
});
test('a landscape photo gets its own wider row; nothing overlaps within a row',()=>{
  const slots=smartSlots([phone,phone,16/9,phone],'square');
  assert.ok(slots.every(inside));
  const rows=Map.groupBy(slots,s=>s.y.toFixed(4));assert.ok(rows.size>=2);
  for(const row of rows.values()){const sorted=row.toSorted((a,b)=>a.x-b.x);for(let i=1;i<sorted.length;i++)assert.ok(sorted[i].x+sorted[i].width*.1>=sorted[i-1].x+sorted[i-1].width*.9);}
});
test('wide canvases keep phones in one row; tall ones stack rows',()=>{
  assert.equal(new Set(smartSlots(Array(4).fill(phone),'wide').map(s=>s.y.toFixed(4))).size,1);
  assert.ok(new Set(smartSlots(Array(4).fill(16/9),'story').map(s=>s.y.toFixed(4))).size>=3);
});
