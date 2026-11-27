import {base64url,fromBase64url,signature as sign,same} from './signed-token.js';
// Framing from the chat: a screenshot or recording sent to the bot gets a "Frame it" button
// that opens Mockify with that file loaded. Nothing is stored: the button carries a signed
// reference, and the file is fetched from Telegram only when its owner opens it.
const MAX_BYTES=20*1024*1024;
const mimes={jpg:'image/jpeg',png:'image/png',webp:'image/webp',mp4:'video/mp4',mov:'video/quicktime'};
const codes=Object.fromEntries(Object.entries(mimes).map(([code,mime])=>[mime,code]));
const copy={
  en:{text:'Tap Frame it to open this in Mockify with your look.',button:'✨ Frame it',large:'This file is over 20 MB. Send a shorter recording or a screenshot.'},
  ru:{text:'Нажмите «Оформить», чтобы открыть это в Mockify в вашем стиле.',button:'✨ Оформить',large:'Файл больше 20 МБ. Отправьте запись короче или скриншот.'},
};
const encoder=new TextEncoder();
const signature=(env,payload)=>sign(env,'frame',payload);

// The media worth framing in a private message, or null.
export function frameableMedia(message){
  if(Array.isArray(message.photo)&&message.photo.length){const photo=[...message.photo].reverse().find(size=>(size.file_size??0)<=MAX_BYTES)??message.photo.at(-1);return {fileId:photo.file_id,mime:'image/jpeg',size:photo.file_size??0};}
  if(message.video)return {fileId:message.video.file_id,mime:codes[message.video.mime_type]?message.video.mime_type:'video/mp4',size:message.video.file_size??0};
  const document=message.document;
  if(document&&codes[document.mime_type])return {fileId:document.file_id,mime:document.mime_type,size:document.file_size??0};
  return null;
}

export async function frameReply(message,env){
  const media=frameableMedia(message);if(!media)return null;
  const text=copy[message.from?.language_code?.toLowerCase().split('-')[0]]??copy.en;
  if(media.size>MAX_BYTES)return {chat_id:message.chat.id,text:text.large,reply_parameters:{message_id:message.message_id,allow_sending_without_reply:true}};
  const payload=[message.from.id,codes[media.mime],media.fileId].join('.');
  const token=base64url(encoder.encode(payload))+'.'+await signature(env,payload);
  const url=new URL(env.PAYMENTS_BASE_URL);url.searchParams.set('frame',token);
  return {chat_id:message.chat.id,text:text.text,reply_parameters:{message_id:message.message_id,allow_sending_without_reply:true},reply_markup:{inline_keyboard:[[{text:text.button,web_app:{url:url.href}}]]}};
}

// Only the user the button was sent to can open its file.
export async function frameFile(token,user,env){
  if(typeof token!=='string'||token.length>1024)return null;
  const [encoded,sig]=token.split('.');if(!encoded||!sig)return null;
  let payload;try{payload=fromBase64url(encoded);}catch{return null;}
  if(!same(sig,await signature(env,payload)))return null;
  const [owner,code,...rest]=payload.split('.'),fileId=rest.join('.');
  if(owner!==String(user.id)||!mimes[code]||!fileId)return null;
  const signal=AbortSignal.timeout(20000),api='https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN;
  const info=await fetch(api+'/getFile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({file_id:fileId}),signal,redirect:'error'});
  const file=info.ok?(await info.json()).result:null;
  if(!file?.file_path||(file.file_size??0)>MAX_BYTES||!/^[\w./-]+$/.test(file.file_path))return null;
  const response=await fetch('https://api.telegram.org/file/bot'+env.TELEGRAM_BOT_TOKEN+'/'+file.file_path,{signal,redirect:'error'});
  if(!response.ok||!response.body)return null;
  return new Response(response.body,{headers:{'Content-Type':mimes[code],'Cache-Control':'no-store','X-Frame-Name':'telegram.'+code}});
}
