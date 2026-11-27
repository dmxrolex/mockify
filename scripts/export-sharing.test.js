import test from 'node:test';
import assert from 'node:assert/strict';
import {shareOptions,savedFile,deliveredFile} from '../export-sharing.js';
const env={TELEGRAM_BOT_TOKEN:'123:secret'};
const user={id:42};
const sentDocument={message_id:9,document:{file_id:'doc-id',file_size:1500,mime_type:'image/png',file_name:'My mockup.png'}};
function telegram(calls){
  return async(url,options)=>{calls.push({url:String(url),body:options?.body&&JSON.parse(options.body)});
    if(String(url).endsWith('/savePreparedInlineMessage'))return new Response(JSON.stringify({ok:true,result:{id:'prep-1',expiration_date:0}}));
    if(String(url).endsWith('/getFile'))return new Response(JSON.stringify({ok:true,result:{file_path:'documents/file_3.png',file_size:1500}}));
    return new Response('pngbytes');};
}
test('a delivered export gets a share message for any chat and a signed save link',async()=>{
  const calls=[],options=await shareOptions(env,user,sentDocument,'export-123','https://app.example',telegram(calls));
  assert.equal(options.shareId,'prep-1');
  const prepared=calls[0].body;
  assert.equal(prepared.user_id,42);assert.equal(prepared.result.type,'document');assert.equal(prepared.result.document_file_id,'doc-id');
  assert.ok(prepared.allow_user_chats&&prepared.allow_group_chats&&prepared.allow_channel_chats);
  const url=new URL(options.save.url);
  assert.equal(url.origin+url.pathname,'https://app.example/api/exports/save');
  assert.equal(options.save.name,'My mockup.png');
});
test('videos are shared as videos; files over 20 MB get no save link',async()=>{
  const calls=[],options=await shareOptions(env,user,{video:{file_id:'vid',file_size:30*1024*1024}},'e','https://app.example',telegram(calls));
  assert.equal(calls[0].body.result.type,'video');assert.equal(calls[0].body.result.video_file_id,'vid');
  assert.equal(options.save,undefined);
  assert.equal(deliveredFile({text:'x'}),null);
});
test('the save link serves the file with download headers, and rejects tampering and expiry',async()=>{
  const calls=[],options=await shareOptions(env,user,sentDocument,'e','https://app.example',telegram(calls));
  const token=new URL(options.save.url).searchParams.get('token');
  const response=await savedFile(token,env,telegram(calls));
  assert.equal(await response.text(),'pngbytes');
  assert.match(response.headers.get('Content-Disposition'),/^attachment; filename="My-mockup.png"/);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://web.telegram.org');
  assert.equal(await savedFile(token.slice(0,-2)+'zz',env,telegram(calls)),null);
  assert.equal(await savedFile(token,env,telegram(calls),Date.now()+31*60*1000),null);
  assert.equal(await savedFile('nonsense',env,telegram(calls)),null);
});
