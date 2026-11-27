import test from 'node:test';
import assert from 'node:assert/strict';
import {timelineFor,timelineDuration,placedClips,evaluateTimeline,splitTimelineClip,removeTimelineItem,updateTimeline,cameraValue} from '../timeline-model.js';
const media=(name,duration=8)=>({name,kind:'video',width:600,height:400,element:{duration},blob:{size:100}});
const sources=[media('a'),media('b')],objects=[{id:'a',itemId:'a',index:0,pose:{}},{id:'b',itemId:'b',index:1,pose:{}}];
const timeline={version:2,main:[{id:'c1',objectId:'a',in:1,out:4,volume:1},{id:'c2',objectId:'b',in:3,out:5,volume:1}],overlays:[{id:'o',objectId:'b',start:.5,in:0,out:1,volume:0}],gestures:[],cameras:[]};
const settings={pageObjects:objects,layers:objects.map(o=>({id:o.id,type:'image'})),timeline};
test('one clock maps sources across a cut and hides ended overlays',()=>{
  assert.equal(timelineDuration(timeline),5);
  assert.equal(evaluateTimeline(settings,sources,.75).entries.find(e=>e.id==='o').sourceTime,.25);
  assert.equal(evaluateTimeline(settings,sources,2).entries.length,1);
  assert.equal(evaluateTimeline(settings,sources,3).main.id,'c2');
  assert.equal(evaluateTimeline(settings,sources,3).entries[0].sourceTime,3);
});
test('split and reorder retain effects with their source time and ownership',()=>{
  const t={...timeline,gestures:[{id:'g',clipId:'c1',time:3,gesture:'hold',duration:.5}]};
  const split=splitTimelineClip(t,'c1',1.5);
  assert.equal(split.main.length,3);assert.equal(timelineDuration(split),5);
  assert.equal(split.gestures[0].clipId,split.main[1].id);
  const reordered={...split,main:[split.main[2],split.main[0],split.main[1]]};
  assert.equal(placedClips(reordered)[2].start,3.5);
  assert.equal(removeTimelineItem(split,'clip',split.main[1].id).gestures.length,0);
});
test('split through camera retains continuous pose and resizes keys with block',()=>{
  const camera={id:'z',clipId:'c1',time:1,duration:3,keyframes:[{id:'k1',time:1,x:.5,y:.5,zoom:1},{id:'k2',time:4,x:.2,y:.3,zoom:2}]};
  const split=splitTimelineClip({...timeline,cameras:[camera]},'c1',1.5);
  assert.equal(split.cameras.length,2);
  assert.deepEqual(cameraValue(split.cameras[0],2.5),cameraValue(split.cameras[1],2.5));
  const changed=updateTimeline({...timeline,cameras:[camera]},'camera','z',{duration:1.5});
  assert.equal(changed.cameras[0].keyframes.at(-1).time,2.5);
});
test('moving an effect preserves its duration and resizing keeps its start fixed',()=>{
  const original={
    ...timeline,
    gestures:[{id:'g',clipId:'c1',time:1.5,gesture:'hold',duration:1}],
    cameras:[{id:'z',clipId:'c1',time:1.5,duration:1,keyframes:[
      {time:1.5,x:.5,y:.5,zoom:1},{time:2,x:.5,y:.5,zoom:1.6},{time:2.5,x:.5,y:.5,zoom:1},
    ]}],
  };
  for(const [type,field,id] of [['gesture','gestures','g'],['camera','cameras','z']]){
    const moved=updateTimeline(original,type,id,{time:5});
    assert.equal(moved[field][0].time,3);
    assert.equal(moved[field][0].duration,1);
    const resized=updateTimeline(moved,type,id,{duration:.5});
    assert.equal(resized[field][0].time,3);
    assert.equal(resized[field][0].duration,.5);
    if(type==='camera')assert.deepEqual(resized.cameras[0].keyframes.map(key=>key.time),[3,3.25,3.5]);
  }
});
test('legacy migration is deterministic, non-destructive and retains independent effects',()=>{
  const legacy={pageObjects:[objects[0]],layers:[{id:'a',type:'image'}],showcase:{signature:'a:100:600:400',moments:[{id:'m',time:2,x:.5,y:.5,hold:1,focus:true,tap:true}]}};
  const first=timelineFor(legacy,sources),again=timelineFor(legacy,sources);
  assert.deepEqual(first,again);assert.equal(legacy.timeline,undefined);assert.equal(first.gestures.length,1);assert.equal(first.cameras.length,1);assert.equal(first.cameras[0].legacy,true);
});
test('deleted media cannot reappear, shorter replacements clamp source bounds',()=>{
  const deleted=timelineFor({...settings,pageObjects:[objects[0]],layers:[{id:'a',type:'image'}]},sources);
  assert.equal(deleted.main.length,1);assert.equal(deleted.overlays.length,0);
  const shorter=timelineFor(settings,[media('new',2),sources[1]]);assert.equal(shorter.main[0].out,2);
  assert.equal(removeTimelineItem({...timeline,main:[timeline.main[0]]},'clip','c1').main.length,1);
});
