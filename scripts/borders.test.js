import test from 'node:test';
import assert from 'node:assert/strict';
import {setObjectBorder,borderChoice,pageScene} from '../page-model.js';
import {frameAspectFor,innerBox} from '../asset-library.js';

const project={settings:{device:'flat'},items:[{id:'a',source:{kind:'image',width:1600,height:900}}],
  pages:[{id:'p',mode:'editor',objects:[{id:'o',itemId:'a',pose:{device:'flat',scale:80,x:5,y:-3,roll:4,locked:false}}],selectedObjectId:'o',settings:{device:'flat',selectedLayerId:'o',layers:[{id:'o',type:'image'}]}}],pageIndex:0};
const pose=p=>p.pages[0].objects[0].pose;

test('every frame keeps the photo uncropped: its inner area has the photo proportions',()=>{
  for(const kind of ['border','browser','polaroid','film','glass','box']){
    const fa=frameAspectFor(kind,16/9,{borderWidth:9}),box=innerBox(kind,{borderWidth:9},fa*1000,1000);
    assert.ok(Math.abs(box.width/box.height-16/9)<1e-3,kind);
  }
});

test('plain borders, frames, the iPhone and back to none',()=>{
  let next=setObjectBorder(project,'o','white',{width:10});
  assert.equal(pose(next).assetKind,'border');assert.equal(pose(next).borderStyle,'white');assert.equal(pose(next).borderWidth,10);
  assert.equal(borderChoice(pose(next)),'white');
  assert.equal(pose(next).x,5);assert.equal(pose(next).roll,4);
  next=setObjectBorder(next,'o','film');
  assert.equal(pose(next).assetKind,'film');assert.equal(pose(next).borderStyle,undefined);assert.equal(borderChoice(pose(next)),'film');
  next=setObjectBorder(next,'o','phone');
  assert.equal(pose(next).device,'iphone18');assert.equal(pose(next).assetKind,undefined);assert.equal(borderChoice(pose(next)),'phone');
  next=setObjectBorder(next,'o','none');
  assert.equal(pose(next).device,'flat');assert.equal(pose(next).assetKind,undefined);assert.equal(borderChoice(pose(next)),'none');
  assert.equal(pageScene(next,0).settings.pageObjects[0].pose.frameAspect,undefined);
});
