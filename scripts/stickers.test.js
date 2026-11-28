import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {d1} from './d1.js';
import {stickerRequest,stickerAdmin,autoPick} from '../sticker-api.js';

const items=[{custom_emoji_id:'11111',file_id:'f1',emoji:'😂',is_animated:true},{custom_emoji_id:'22222',file_id:'f2',emoji:'🎉',is_animated:true},{custom_emoji_id:'33333',file_id:'f3',emoji:'💻',is_animated:true},{custom_emoji_id:'44444',file_id:'f4',emoji:'🎁',is_animated:false}];
const lottie=id=>({v:'5.5.2',w:100,h:100,layers:[{nm:id}]});
globalThis.fetch=async(url,options)=>{
  const method=String(url).split('/').pop(),body=options?.body?JSON.parse(options.body):{};
  if(method==='getStickerSet')return Response.json({ok:true,result:{stickers:items}});
  if(method==='getFile')return Response.json({ok:true,result:{file_path:'stickers/'+body.file_id+'.tgs'}});
  if(String(url).includes('/file/bot'))return new Response(gzipSync(JSON.stringify(lottie(method.replace('.tgs','')))));
  return new Response('',{status:404});
};
const env={TELEGRAM_BOT_TOKEN:'1:x',DB:d1()};
const get=path=>stickerRequest(new Request('https://app/api/sticker/'+path),env,path);

test('each place gets the duck whose emoji fits, as plain Lottie JSON',async()=>{
  const done=await get('done');assert.equal(done.status,200);assert.equal((await done.json()).layers[0].nm,'f2');
  assert.equal((await (await get('download')).json()).layers[0].nm,'f3');
  assert.match((await get('done')).headers.get('Cache-Control'),/max-age=3600/);
  assert.equal((await get('nope')).status,404);
  assert.equal((await get('item/44444')).status,404,'still stickers are not in the list');
  assert.equal((await get('item/99999')).status,404,'only items from the pack');
});

test('the owner can choose a duck for a place and go back to automatic',async()=>{
  let result=await stickerAdmin(env,{action:'stickers.assign',slot:'done',id:'11111'});
  assert.equal(result.body.slots.find(slot=>slot.slot==='done').custom,true);
  assert.equal((await (await get('done')).json()).layers[0].nm,'f1');
  assert.equal((await stickerAdmin(env,{action:'stickers.assign',slot:'done',id:'99999'})).status,400);
  result=await stickerAdmin(env,{action:'stickers.assign',slot:'done',id:null});
  assert.equal(result.body.slots.find(slot=>slot.slot==='done').id,'22222');
  assert.equal(result.body.items.length,3);
});

test('without a matching emoji a place still gets a duck',()=>{
  assert.equal(autoPick([{id:'1',emoji:'🐸'}],'promo').id,'1');
  assert.equal(autoPick([],'promo'),null);
});
