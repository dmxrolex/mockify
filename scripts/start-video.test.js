import test from 'node:test';
import assert from 'node:assert/strict';
import {sendStart} from '../payments.js';
import {startReply,packEmoji} from '../bot-messages.js';
const env={TELEGRAM_BOT_TOKEN:'1:x',PAYMENTS_BASE_URL:'https://app.example'};
const message={chat:{id:7},from:{id:7,language_code:'ru'}};
test('welcome is one silent video with the text as caption, or plain text',()=>{
  const video=startReply(message,env.PAYMENTS_BASE_URL,'abc');
  assert.equal(video.animation,'abc');assert.match(video.caption,/Mockify/);assert.ok(video.caption.length<=1024);
  assert.equal(video.reply_markup.inline_keyboard[0][0].web_app.url,'https://app.example');
  assert.equal(startReply(message,env.PAYMENTS_BASE_URL).text,video.caption);
});
test('the first /start sends the file URL, later ones reuse Telegram’s file_id',async()=>{
  const calls=[];
  globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);calls.push([String(url).split('/').pop(),body.animation??body.text?.slice(0,5)]);
    return new Response(JSON.stringify({ok:true,result:{animation:{file_id:'FILE123'}}}));};
  await sendStart(env,message);await sendStart(env,message);
  assert.deepEqual(calls.filter(([method])=>method!=='getStickerSet'),[['sendAnimation','https://app.example/bot/welcome-v1.mp4'],['sendAnimation','FILE123']]);
});
test('a failed video falls back to the text welcome',async()=>{
  const calls=[];
  globalThis.fetch=async(url,options)=>{const method=String(url).split('/').pop();calls.push(method);
    return new Response(JSON.stringify(method==='sendMessage'?{ok:true,result:{}}:{ok:false}),{status:method==='sendMessage'?200:400});};
  await sendStart(env,message);
  assert.equal(calls.at(-1),'sendMessage');
});
test('premium pack emoji fill the welcome, preferring matching emoji',()=>{
  const pack=packEmoji([{custom_emoji_id:'1',emoji:'😂'},{custom_emoji_id:'2',emoji:'👋'},{custom_emoji_id:'3',emoji:'🎨'},{custom_emoji_id:'4',emoji:'😎'},{custom_emoji_id:'5',emoji:'🚀'},{custom_emoji_id:'6',emoji:'🤔'}]);
  assert.equal(pack.hello.id,'2');assert.equal(pack.style.id,'3');assert.equal(pack.export.id,'5');
  assert.equal(new Set(Object.values(pack).map(entry=>entry.id)).size,5);
  const reply=startReply({chat:{id:1},from:{language_code:'en'}},'https://app.example','abc',pack);
  assert.match(reply.caption,/<tg-emoji emoji-id="2">👋<\/tg-emoji> <b>Welcome to Mockify<\/b>/);
  assert.doesNotMatch(startReply({chat:{id:1},from:{}},'https://app.example').text,/tg-emoji/);
});
test('rejected premium emoji fall back to the same welcome with plain emoji',async()=>{
  const {sendStart:fresh}=await import('../payments.js?retry');const sent=[];
  globalThis.fetch=async(url,options)=>{const method=String(url).split('/').pop(),body=JSON.parse(options.body);
    if(method==='getStickerSet')return Response.json({ok:true,result:{stickers:[{custom_emoji_id:'9',emoji:'👋'}]}});
    const text=body.caption??body.text;sent.push(text.includes('tg-emoji'));
    return Response.json(text.includes('tg-emoji')?{ok:false,description:'Bad Request'}:{ok:true,result:{}},{status:text.includes('tg-emoji')?400:200});};
  await fresh(env,message);
  assert.equal(sent[0],true);assert.equal(sent.at(-1),false);
});
