// After an export reaches the bot chat, Telegram's own Mini App tools take it further:
// shareMessage sends it to any chat, group or channel (Bot API 8.0 PreparedInlineMessage),
// and downloadFile saves it to the device. The save link is signed, short-lived and only
// names a file this user just received, because Telegram fetches it without initData.
import {encodeText,decodeText,signature,same} from './signed-token.js';

const SAVE_LIMIT=20*1024*1024;            // Bot API getFile serves files up to 20 MB
const SAVE_TTL=30*60*1000;
const api=env=>'https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN;

export function deliveredFile(message){
  const media=message?.video??message?.document;
  if(!media?.file_id)return null;
  return {video:!!message.video,fileId:media.file_id,size:media.file_size??0,mime:media.mime_type||(message.video?'video/mp4':'application/octet-stream'),name:media.file_name||'mockify'};
}

export async function shareOptions(env,user,message,exportId,origin,fetcher=fetch){
  const file=deliveredFile(message);if(!file)return {};
  const options={};
  try{
    const result=file.video?{type:'video',id:exportId.slice(0,64),video_file_id:file.fileId,title:'Mockify'}:{type:'document',id:exportId.slice(0,64),document_file_id:file.fileId,title:file.name};
    const response=await fetcher(api(env)+'/savePreparedInlineMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:user.id,result,allow_user_chats:true,allow_bot_chats:true,allow_group_chats:true,allow_channel_chats:true}),signal:AbortSignal.timeout(8000)});
    const prepared=await response.json();
    if(prepared.ok&&prepared.result?.id)options.shareId=prepared.result.id;
  }catch{}
  if(file.size&&file.size<=SAVE_LIMIT){
    const payload=encodeText(JSON.stringify({u:String(user.id),e:Date.now()+SAVE_TTL,f:file.fileId,m:file.mime,n:file.name}));
    const url=new URL('/api/exports/save',origin);url.searchParams.set('token',payload+'.'+await signature(env,'save',payload));
    options.save={url:url.href,name:file.name};
  }
  return options;
}

function attachmentName(name){
  const safe=String(name).replace(/[^\p{L}\p{N}._-]/gu,'-').slice(0,150)||'mockify';
  return `attachment; filename="${safe.replace(/[^\x20-\x7e]/g,'_')}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

export async function savedFile(token,env,fetcher=fetch,now=Date.now()){
  if(typeof token!=='string'||token.length>2048)return null;
  const [payload,sig]=token.split('.');if(!payload||!sig)return null;
  if(!same(sig,await signature(env,'save',payload)))return null;
  let data;try{data=JSON.parse(decodeText(payload));}catch{return null;}
  if(!(data.e>now)||!data.f)return null;
  const signal=AbortSignal.timeout(20000);
  const info=await fetcher(api(env)+'/getFile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({file_id:data.f}),signal,redirect:'error'});
  const file=info.ok?(await info.json()).result:null;
  if(!file?.file_path||(file.file_size??0)>SAVE_LIMIT||!/^[\w./-]+$/.test(file.file_path))return null;
  const response=await fetcher('https://api.telegram.org/file/bot'+env.TELEGRAM_BOT_TOKEN+'/'+file.file_path,{signal,redirect:'error'});
  if(!response.ok||!response.body)return null;
  // Headers Telegram's DownloadFileParams asks for, so the native download works on every client.
  return new Response(response.body,{headers:{'Content-Type':data.m||'application/octet-stream','Content-Disposition':attachmentName(data.n),'Access-Control-Allow-Origin':'https://web.telegram.org','Cache-Control':'private, no-store',...(file.file_size?{'Content-Length':String(file.file_size)}:{})}});
}
