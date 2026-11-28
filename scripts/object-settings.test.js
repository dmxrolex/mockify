import test from 'node:test';
import assert from 'node:assert/strict';
import {pageScene,objectSettings} from '../page-model.js';

// A free photo and a film-strip frame on one page, with the frame selected.
const photo={id:'photo',itemId:'a',pose:{device:'flat',scale:80,x:0,y:0,imageEdges:4}};
const frame={id:'frame',itemId:'b',pose:{device:'flat',scale:36,x:10,y:10,assetKind:'film',assetEmpty:true,locked:true,imageEdges:0}};
const project={settings:{device:'flat'},items:[{id:'a',source:{kind:'image'}},{id:'b',source:{kind:'image'}}],
  pages:[{id:'p',mode:'editor',objects:[photo,frame],selectedObjectId:'frame',settings:{device:'flat',scale:100,selectedLayerId:'frame',layers:[{id:'photo',type:'image'},{id:'frame',type:'image'}]}}],pageIndex:0};

test('a selected frame never turns the photo beside it into a frame',()=>{
  const {settings}=pageScene(project,0);
  assert.equal(settings.assetKind,'film','scene settings mirror the selected frame');
  const placed=settings.pageObjects.find(object=>object.id==='photo');
  const merged=objectSettings(settings,placed.pose);
  assert.equal(merged.assetKind,undefined);assert.equal(merged.assetEmpty,undefined);assert.ok(!merged.locked,'the frame lock stays on the frame');
  assert.equal(merged.scale,80,'the photo keeps its own size');
  assert.equal(merged.imageEdges,4);
});
test('missing settings come from the page, not from the selected object',()=>{
  const bare={...project,pages:[{...project.pages[0],objects:[{...photo,pose:{device:'flat'}},frame]}]};
  const placed=pageScene(bare,0).settings.pageObjects.find(object=>object.id==='photo');
  assert.equal(placed.pose.scale,100);
});
