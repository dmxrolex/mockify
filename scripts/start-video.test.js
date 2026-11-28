import test from 'node:test';
import assert from 'node:assert/strict';
import {sendStart} from '../payments.js';
import {startReply} from '../bot-messages.js';
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
  assert.deepEqual(calls,[['sendAnimation','https://app.example/bot/welcome-v1.mp4'],['sendAnimation','FILE123']]);
});
test('a failed video falls back to the text welcome',async()=>{
  const calls=[];
  globalThis.fetch=async(url,options)=>{const method=String(url).split('/').pop();calls.push(method);
    return new Response(JSON.stringify(method==='sendMessage'?{ok:true,result:{}}:{ok:false}),{status:method==='sendMessage'?200:400});};
  await sendStart(env,message);
  assert.equal(calls.at(-1),'sendMessage');
});
