// Animated ducks from a Telegram custom-emoji pack (TgDuckX by default), served as Lottie JSON.
// The Worker reads the pack with the bot token, downloads each .tgs once, unzips it and keeps it in
// the edge cache, so the app never bundles them and Telegram is asked rarely. Each place in the
// app ("slot") prefers certain emoji; the owner can pick a different duck in the dashboard.
import {ensureSchema} from './promo-api.js';

export const STICKER_PACK='TgDuckX';
export const stickerSlots={
  download:{label:'Preparing a download',emoji:['💻','⏳','⌛','🫡','📥','👨‍💻','🧑‍💻']},
  done:{label:'Download finished',emoji:['🎉','🥳','👍','😎','✅','🔥']},
  error:{label:'Something went wrong',emoji:['😢','😭','😔','😱','🤯','😕']},
  files:{label:'No saved work yet',emoji:['🤷','🙈','😴','📂','🗂','👀']},
  promo:{label:'Promo code',emoji:['🎁','🤑','💰','🙏','😍']},
  success:{label:'Promo code applied',emoji:['🥳','🎉','😍','🤩','💪','👍']},
};
const plain=emoji=>String(emoji??'').replace(/️/g,'');
const MAX_JSON=1_500_000;
let pack=null,packAt=0;

async function telegram(env,method,body){
  const response=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
  const data=await response.json();if(!data.ok)throw new Error(data.description||'Telegram request failed');return data.result;
}
// The pack's animated items, refreshed every 6 hours per Worker instance.
export async function packItems(env){
  if(pack&&Date.now()-packAt<6*3600000)return pack;
  const set=await telegram(env,'getStickerSet',{name:env.STICKER_PACK||STICKER_PACK});
  pack=(set?.stickers??[]).filter(item=>item.is_animated&&item.custom_emoji_id).map(item=>({id:item.custom_emoji_id,fileId:item.file_id,emoji:item.emoji??''}));packAt=Date.now();
  return pack;
}
// Automatic choice: the first matching emoji in preference order, else a distinct pack item.
export function autoPick(items,slot){
  const wanted=stickerSlots[slot]?.emoji.map(plain)??[];
  for(const want of wanted){const match=items.find(item=>plain(item.emoji)===want);if(match)return match;}
  const index=Object.keys(stickerSlots).indexOf(slot);return items[index%Math.max(1,items.length)]??null;
}
async function assigned(env){
  await ensureSchema(env);
  try{await env.DB.prepare('CREATE TABLE IF NOT EXISTS sticker_slots (slot TEXT PRIMARY KEY, sticker_id TEXT NOT NULL, updated_at INTEGER NOT NULL)').run();}catch{}
  const rows=await env.DB.prepare('SELECT slot, sticker_id FROM sticker_slots').all();
  return Object.fromEntries(rows.results.map(row=>[row.slot,row.sticker_id]));
}
async function itemFor(env,slot){
  const items=await packItems(env),chosen=(await assigned(env))[slot];
  return items.find(item=>item.id===chosen)??autoPick(items,slot);
}

// One pack item as Lottie JSON, kept in the edge cache by its id (content never changes).
async function itemJson(env,item){
  const cache=globalThis.caches?.default,key=new Request('https://stickers.mockify.internal/'+item.id+'.json');
  const hit=await cache?.match(key);if(hit)return hit.text();
  const file=await telegram(env,'getFile',{file_id:item.fileId});
  if(!/^[\w/.-]+\.tgs$/i.test(file?.file_path??''))throw new Error('Not an animation');
  const download=await fetch('https://api.telegram.org/file/bot'+env.TELEGRAM_BOT_TOKEN+'/'+file.file_path,{signal:AbortSignal.timeout(8000)});
  if(!download.ok||!download.body)throw new Error('Download failed');
  const text=await new Response(download.body.pipeThrough(new DecompressionStream('gzip'))).text();
  if(text.length>MAX_JSON)throw new Error('Too large');
  const data=JSON.parse(text);if(!Array.isArray(data.layers))throw new Error('Not Lottie');
  await cache?.put(key,new Response(text,{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=2592000'}}));
  return text;
}
const lottie=(text,maxAge)=>new Response(text,{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':`public, max-age=${maxAge}`,'X-Content-Type-Options':'nosniff'}});
const missing=()=>Response.json({error:'Unavailable'},{status:404,headers:{'Cache-Control':'public, max-age=300'}});

// GET /api/sticker/<slot>  and  GET /api/sticker/item/<custom emoji id>
export async function stickerRequest(request,env,path){
  if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405});
  if(!env.TELEGRAM_BOT_TOKEN)return missing();
  try{
    const byId=/^item\/(\d{5,25})$/.exec(path);
    if(byId){const item=(await packItems(env)).find(entry=>entry.id===byId[1]);return item?lottie(await itemJson(env,item),2592000):missing();}
    if(!Object.hasOwn(stickerSlots,path))return missing();
    const item=await itemFor(env,path);
    // Short browser cache so a duck chosen in the dashboard shows up within the hour.
    return item?lottie(await itemJson(env,item),3600):missing();
  }catch{return missing();}
}

// Owner dashboard: the whole pack, the current choice for each slot, and changing it.
export async function stickerAdmin(env,body){
  const items=await packItems(env),chosen=await assigned(env);
  if(body.action==='stickers.assign'){
    if(!Object.hasOwn(stickerSlots,body.slot))return {status:400,body:{error:'Unknown place'}};
    if(body.id==null)await env.DB.prepare('DELETE FROM sticker_slots WHERE slot=?').bind(body.slot).run();
    else if(items.some(item=>item.id===String(body.id)))await env.DB.prepare('INSERT INTO sticker_slots (slot, sticker_id, updated_at) VALUES (?, ?, ?) ON CONFLICT(slot) DO UPDATE SET sticker_id=excluded.sticker_id, updated_at=excluded.updated_at').bind(body.slot,String(body.id),Date.now()).run();
    else return {status:400,body:{error:'That duck is not in the pack'}};
    chosen[body.slot]=body.id==null?undefined:String(body.id);
  }
  return {status:200,body:{pack:env.STICKER_PACK||STICKER_PACK,items:items.map(({id,emoji})=>({id,emoji})),
    slots:Object.entries(stickerSlots).map(([slot,{label}])=>({slot,label,id:chosen[slot]??autoPick(items,slot)?.id??null,custom:!!chosen[slot]}))}};
}
