import test from 'node:test';
import assert from 'node:assert/strict';
import {looksRequest} from '../looks-api.js';
import {captureTemplate,lookSpots,askedTexts} from '../templates.js';
function fakeDB(){const rows=new Map();return {prepare(sql){let args=[];const st={bind(...a){args=a;return st;},
  async run(){if(sql.startsWith('INSERT')){const [u,id,name,data,at]=args;rows.set(u+'|'+id,{u,id,data,at});}if(sql.startsWith('DELETE'))rows.delete(args[0]+'|'+args[1]);return {};},
  async first(){if(sql.includes('COUNT'))return {count:[...rows.values()].filter(r=>r.u===args[0]).length};return rows.get(args[0]+'|'+args[1])?{1:1}:null;},
  async all(){return {results:[...rows.values()].filter(r=>r.u===args[0]).sort((a,b)=>b.at-a.at).map(r=>({data:r.data}))};}};return st;}};}
const look=n=>({id:'look-test'+n,name:'L'+n,objects:[],layers:[]});
test('free accounts keep one look, premium ten; updating an existing look is always allowed',async()=>{
  const env={DB:fakeDB()},user={id:7},free={subscription:{expiresAt:null}},premium={subscription:{expiresAt:Date.now()+1e9}};
  assert.equal((await looksRequest(env,user,free,{action:'save',look:look(1)})).status,200);
  const second=await looksRequest(env,user,free,{action:'save',look:look(2)});
  assert.equal(second.status,403);assert.equal(second.body.error,'look_limit');assert.equal(second.body.limit,1);
  assert.equal((await looksRequest(env,user,free,{action:'save',look:{...look(1),name:'Renamed'}})).status,200);
  for(let i=2;i<=10;i++)assert.equal((await looksRequest(env,user,premium,{action:'save',look:look(i)})).status,200);
  assert.equal((await looksRequest(env,user,premium,{action:'save',look:look(11)})).status,403);
  const listed=await looksRequest(env,user,premium,{action:'delete',id:'look-test3'});
  assert.equal(listed.body.looks.length,9);assert.equal(listed.body.limit,10);
  assert.equal((await looksRequest(env,user,free,{action:'save',look:{id:'bad id',objects:[]}})).status,400);
});
test('a captured look keeps placements and styles but no screenshots',()=>{
  const project={items:[{id:'i1',source:{width:1179,height:2556}},{id:'i2',source:{width:1600,height:900}},{id:'i3',source:{}}],pageIndex:0,active:0,
    pages:[{id:'p',mode:'editor',selectedObjectId:'a',settings:{background:'photo',palette:'tide',ratio:'wide',mark:{kind:'text',text:'@me'},layers:[{id:'a',type:'device'},{id:'b',type:'image'},{id:'s',type:'image'},{id:'t',type:'text',text:'Title'}]},
      objects:[{id:'a',itemId:'i1',slot:{x:0,y:0,width:.5,height:1},pose:{locked:true,device:'iphone18',finish:'rose',imageCrop:{x:1}}},
               {id:'b',itemId:'i2',slot:{x:.5,y:0,width:.5,height:1},pose:{locked:false,device:'flat',scale:80}},
               {id:'s',itemId:'i3',slot:{x:0,y:0,width:1,height:1},pose:{locked:false,device:'flat',assetKind:'heart'}}]}]};
  const saved=captureTemplate(project,{name:'Launch',ask:['t']});
  assert.equal(saved.settings.background,'gradient');assert.equal(saved.settings.ratio,'wide');assert.equal(saved.settings.mark.text,'@me');
  assert.deepEqual(saved.objects.map(o=>o.kind),['phone','photo','asset']);
  assert.equal(saved.objects[0].pose.finish,'rose');assert.equal(saved.objects[0].pose.imageCrop,undefined);
  assert.ok(Math.abs(saved.objects[1].aspect-16/9)<1e-9);
  assert.equal(lookSpots(saved),2);assert.deepEqual(askedTexts(saved).map(l=>l.text),['Title']);
});
