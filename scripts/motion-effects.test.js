import test from 'node:test';
import assert from 'node:assert/strict';
import {motionAt,movedPose,sceneHasMotion,effectOf,motionEffects,turnedDirection} from '../motion-effects.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} ≈ ${b}`);
test('looping effects start and end on the same frame',()=>{
  for(const id of ['spin','float','sway']){
    const a=motionAt({motion:id},0),b=motionAt({motion:id},1);
    close(a.scale,b.scale);close(a.x,b.x);close(a.y,b.y);close(a.turn,b.turn);close(((a.roll%360)+360)%360,((b.roll%360)+360)%360);
  }
});
test('spin makes one full turn; zoom grows 16%; none changes nothing',()=>{
  close(motionAt({motion:'spin'},1).roll,360);
  close(motionAt({motion:'push'},1).scale,1.16);
  assert.deepEqual(motionAt({motion:'still'},.4),{scale:1,roll:0,x:0,y:0,turn:0});
  assert.equal(effectOf({motion:'unknown'}),'still');
  assert.deepEqual(motionEffects.map(e=>e.id),['still','spin','float','sway','push']);
});
test('poses move without mutating, and scenes report motion from any object',()=>{
  const pose={motion:'float',scale:80,roll:5,x:1,y:2,angle:'left'};
  const {pose:moved,turn}=movedPose(pose,.25);
  assert.equal(pose.y,2);close(moved.y,2-2.4);assert.equal(turn,0);
  assert.equal(turnedDirection('left',-.55),-1);
  assert.equal(sceneHasMotion({pageObjects:[{pose:{}},{pose:{motion:'spin'}}]}),true);
  assert.equal(sceneHasMotion({pageObjects:[{pose:{motion:'still'}}]}),false);
});
