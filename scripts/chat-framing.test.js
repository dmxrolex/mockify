import test from 'node:test';
import assert from 'node:assert/strict';
import {frameReply,frameFile,frameableMedia} from '../chat-framing.js';
const env={TELEGRAM_BOT_TOKEN:'123:secret',PAYMENTS_BASE_URL:'https://app.example'};
const message={message_id:7,chat:{id:42},from:{id:42,language_code:'en'},photo:[{file_id:'small',file_size:100},{file_id:'big.file-id',file_size:2000}]};
test('photos get a Make mockup button carrying a signed reference to the largest size',async()=>{
  const reply=await frameReply(message,env);
  const url=new URL(reply.reply_markup.inline_keyboard[0][0].web_app.url);
  assert.equal(url.origin,'https://app.example');
  assert.ok(url.searchParams.get('frame'));
  assert.equal(frameableMedia({text:'hi'}),null);
  assert.equal(frameableMedia({document:{file_id:'x',mime_type:'application/pdf'}}),null);
});
test('only the owner can open the file, and tampering is rejected',async()=>{
  const token=new URL((await frameReply(message,env)).reply_markup.inline_keyboard[0][0].web_app.url).searchParams.get('frame');
  const calls=[];globalThis.fetch=async(url,options)=>{calls.push(url);if(String(url).endsWith('/getFile'))return new Response(JSON.stringify({result:{file_path:'photos/file_1.jpg',file_size:2000}}));return new Response('jpegbytes');};
  assert.equal(await frameFile(token,{id:99},env),null);
  assert.equal(await frameFile(token.slice(0,-2)+'xx',{id:42},env),null);
  assert.equal(calls.length,0);
  const response=await frameFile(token,{id:42},env);
  assert.equal(response.headers.get('Content-Type'),'image/jpeg');
  assert.equal(await response.text(),'jpegbytes');
  assert.match(JSON.parse(calls.length?'{}':'{}')&&String(calls[0]),/getFile$/);
});
test('files over 20 MB get a friendly message instead of a button',async()=>{
  const reply=await frameReply({...message,photo:undefined,video:{file_id:'v',file_size:30*1024*1024,mime_type:'video/mp4'}},env);
  assert.equal(reply.reply_markup,undefined);
  assert.match(reply.text,/20 MB/);
});
