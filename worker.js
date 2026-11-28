import { frameFile } from './chat-framing.js';
import { looksRequest } from './looks-api.js';
import {WELCOME_CREDITS,exportCreditCost,accountFromRow,premiumActive} from './credit-model.js';
import {handlePayments} from './payments.js';
const encoder = new TextEncoder();
const telegramPublicKey = 'e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d';

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

const maxAvatarBytes = 1024 * 1024;

function telegramAvatarUrl(value) {
  if(!value)return null;
  const url=URL.parse(value);
  if(!url||url.protocol!=='https:'||url.port||url.username||url.password)return null;
  if(url.hostname==='t.me'&&/^\/i\/userpic\/\d+\/[\w.-]+\.(svg|jpe?g|png)$/i.test(url.pathname))return url;
  if(/^(cdn[0-9]+\.telesco\.pe|cdn[0-9]+\.cdn-telegram\.org|t[0-9]+\.telesco\.pe)$/.test(url.hostname)&&/^\/file\/[\w.-]+$/.test(url.pathname))return url;
  return null;
}

async function avatarResponse(image,type) {
  if(!image.ok||!image.body)return null;
  if(Number(image.headers.get('Content-Length'))>maxAvatarBytes){await image.body.cancel();return null;}
  const contentType=type??image.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
  if(!['image/jpeg','image/png','image/webp','image/svg+xml'].includes(contentType)){await image.body.cancel();return null;}
  const reader=image.body.getReader(),chunks=[];
  let size=0;
  while(true){
    const {done,value}=await reader.read();
    if(done)break;
    size+=value.byteLength;
    if(size>maxAvatarBytes){await reader.cancel();return null;}
    chunks.push(value);
  }
  if(!size)return null;
  return new Response(new Blob(chunks),{headers:{
    'Content-Type':'application/octet-stream',
    'X-Avatar-Type':contentType,
    'Cache-Control':'no-store',
    'Content-Disposition':'attachment',
    'X-Content-Type-Options':'nosniff',
    'Content-Security-Policy':'sandbox'
  }});
}

async function signedProfileAvatar(photoUrl) {
  const signal=AbortSignal.timeout(3000);
  let target=telegramAvatarUrl(photoUrl);
  for(let redirects=0;target&&redirects<3;redirects++){
    const image=await fetch(target,{signal,redirect:'manual'});
    if(image.status>=300&&image.status<400){
      const location=image.headers.get('Location');
      await image.body?.cancel();
      target=location?telegramAvatarUrl(URL.parse(location,target)?.href):null;
      continue;
    }
    return avatarResponse(image);
  }
  return null;
}

export async function verifyTelegram(initData, botId, publicKey = telegramPublicKey) {
  if (!/^\d+$/.test(botId ?? '') || typeof initData !== 'string' || initData.length > 16384) throw new Error('Invalid launch data');
  const fields = new URLSearchParams(initData);
  const names = [...fields.keys()];
  if (new Set(names).size !== names.length) throw new Error('Duplicate launch fields');
  const signature = fields.get('signature');
  const authDate = Number(fields.get('auth_date'));
  const now = Math.floor(Date.now() / 1000);
  if (!signature || !Number.isSafeInteger(authDate) || authDate > now + 30 || now - authDate > 3600) throw new Error('Launch expired');
  fields.delete('signature');
  fields.delete('hash');
  fields.sort();
  const check = botId + ':WebAppData\n' + [...fields].map(([key, value]) => key + '=' + value).join('\n');
  const bytes = Uint8Array.from(atob(signature.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(signature.length / 4) * 4, '=')), char => char.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', Uint8Array.from(publicKey.match(/../g), hex => parseInt(hex, 16)), 'Ed25519', false, ['verify']);
  if (!await crypto.subtle.verify('Ed25519', key, bytes, encoder.encode(check))) throw new Error('Invalid signature');
  const user = JSON.parse(fields.get('user') ?? 'null');
  if (!user || !Number.isSafeInteger(user.id) || user.id <= 0 || typeof user.first_name !== 'string') throw new Error('Invalid user');
  return {
    id: String(user.id),
    firstName: user.first_name.slice(0, 128),
    lastName: typeof user.last_name === 'string' ? user.last_name.slice(0, 128) : '',
    username: typeof user.username === 'string' ? user.username.slice(0, 64) : '',
    photoUrl: typeof user.photo_url === 'string' && /^https:\/\//.test(user.photo_url) ? user.photo_url.slice(0, 2048) : '',
    premium: user.is_premium === true,
    language: typeof user.language_code === 'string' ? user.language_code.slice(0, 16) : 'en',
  };
}

async function accountFor(env,id){return accountFromRow(await env.DB.prepare('SELECT credits, welcome_claimed_at, subscription_expires_at FROM users WHERE id=?').bind(id).first());}
async function refundExport(env,id,userId){await env.DB.prepare("DELETE FROM export_charges WHERE id=? AND user_id=? AND status='held'").bind(id,userId).run();}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if(url.pathname.startsWith('/api/payments/')||url.pathname==='/api/telegram/webhook')return handlePayments(request,env,{verifyTelegram,accountFor});
    if (url.pathname === '/api/config' && request.method === 'GET') {
      return json({ telegramReady: Boolean(env.TELEGRAM_BOT_ID), botUsername: env.TELEGRAM_BOT_USERNAME || '' });
    }
    if (url.pathname === '/api/auth/telegram') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
      if (request.headers.get('Origin') !== url.origin) return json({ error: 'Origin rejected' }, 403);
      if (!env.TELEGRAM_BOT_ID) return json({ error: 'Telegram sign-in is awaiting bot configuration.' }, 503);
      if (Number(request.headers.get('Content-Length')) > 20000) return json({ error: 'Request too large' }, 413);
      let user;
      try {
        const raw = await request.text();
        if (raw.length > 20000) return json({ error: 'Request too large' }, 413);
        user = await verifyTelegram(JSON.parse(raw).initData, env.TELEGRAM_BOT_ID);
      } catch { return json({ error: 'Telegram sign-in expired or could not be verified. Reopen the app from the bot.' }, 401); }
      try {
        await env.DB.prepare(
          'INSERT INTO users (id, profile, created_at, last_seen_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET profile=excluded.profile, last_seen_at=excluded.last_seen_at'
        ).bind(user.id, JSON.stringify(user), Date.now(), Date.now()).run();
        return json({ user:{...user,...await accountFor(env,user.id)} });
      } catch { return json({ error: 'Profile service unavailable. Try again.' }, 503); }
    }
    if(url.pathname==='/api/profile-avatar'){
      if(request.method!=='POST')return json({error:'Method not allowed'},405);
      if(request.headers.get('Origin')!==url.origin)return json({error:'Origin rejected'},403);
      let user;
      try{user=await verifyTelegram(request.headers.get('X-Telegram-Init-Data'),env.TELEGRAM_BOT_ID);}
      catch{return json({error:'Reopen the app in Telegram to continue.'},401);}
      if(user.photoUrl){
        try{
          const image=await signedProfileAvatar(user.photoUrl);
          if(image)return image;
        }catch{ /* Try the Bot API if Telegram's signed image is unavailable. */ }
      }
      if(!env.TELEGRAM_BOT_TOKEN)return new Response(null,{status:204});
      try{
        const signal=AbortSignal.timeout(5000);
        const bot='https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN;
        async function telegram(method,params){
          const response=await fetch(bot+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(params),signal,redirect:'error'});
          if(!response.ok)throw Error('Avatar unavailable');
          return (await response.json()).result;
        }
        const photos=await telegram('getUserProfilePhotos',{user_id:Number(user.id),limit:1});
        const photo=photos?.photos?.[0]?.find(size=>size.width>=128)??photos?.photos?.[0]?.[0];
        if(!photo)return new Response(null,{status:204});
        const file=await telegram('getFile',{file_id:photo.file_id});
        if(!/^photos\/[\w.-]+\.(jpg|jpeg|png)$/i.test(file?.file_path??'')||file.file_size>maxAvatarBytes)return new Response(null,{status:204});
        const image=await fetch('https://api.telegram.org/file/bot'+env.TELEGRAM_BOT_TOKEN+'/'+file.file_path,{signal,redirect:'error'});
        return await avatarResponse(image,/\.png$/i.test(file.file_path)?'image/png':'image/jpeg')??new Response(null,{status:204});
      }catch{return new Response(null,{status:204});}
    }
    if(url.pathname==='/api/frame-file'){
      if(request.method!=='POST')return json({error:'Method not allowed'},405);
      if(request.headers.get('Origin')!==url.origin)return json({error:'Origin rejected'},403);
      if(!env.TELEGRAM_BOT_TOKEN)return json({error:'Chat framing is unavailable.'},503);
      let user;try{user=await verifyTelegram(request.headers.get('X-Telegram-Init-Data'),env.TELEGRAM_BOT_ID);}catch{return json({error:'Reopen the app in Telegram to continue.'},401);}
      let body;try{body=await request.json();}catch{return json({error:'Invalid request'},400);}
      try{const file=await frameFile(body?.token,user,env);return file??json({error:'This file is no longer available. Send it to the bot again.'},404);}
      catch{return json({error:'Could not load the file from Telegram. Try again.'},502);}
    }
    if(['/api/account','/api/welcome/claim'].includes(url.pathname)){
      if(request.method!=='POST')return json({error:'Method not allowed'},405);
      if(request.headers.get('Origin')!==url.origin)return json({error:'Origin rejected'},403);
      let user;try{user=await verifyTelegram(request.headers.get('X-Telegram-Init-Data'),env.TELEGRAM_BOT_ID);}catch{return json({error:'Reopen the app in Telegram to continue.'},401);}
      try{
        if(url.pathname==='/api/welcome/claim')await env.DB.prepare('UPDATE users SET credits=credits+?, welcome_claimed_at=? WHERE id=? AND welcome_claimed_at IS NULL').bind(WELCOME_CREDITS,Date.now(),user.id).run();
        return json({account:await accountFor(env,user.id)});
      }catch{return json({error:'Account service unavailable. Please retry.'},503);}
    }
    if(url.pathname==='/api/looks'){
      if(request.method!=='POST')return json({error:'Method not allowed'},405);
      if(request.headers.get('Origin')!==url.origin)return json({error:'Origin rejected'},403);
      if(Number(request.headers.get('Content-Length'))>450000)return json({error:'This look is too large.'},413);
      let user;try{user=await verifyTelegram(request.headers.get('X-Telegram-Init-Data'),env.TELEGRAM_BOT_ID);}catch{return json({error:'Reopen the app in Telegram to continue.'},401);}
      let body={};try{const raw=await request.text();if(raw.length>450000)return json({error:'This look is too large.'},413);body=raw?JSON.parse(raw):{};}catch{return json({error:'Invalid request'},400);}
      try{const result=await looksRequest(env,user,await accountFor(env,user.id),body);return json(result.body,result.status);}
      catch{return json({error:'Looks are unavailable right now. Please retry.'},503);}
    }
    if (url.pathname === '/api/exports/telegram') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
      if (request.headers.get('Origin') !== url.origin) return json({ error: 'Origin rejected' }, 403);
      if (!env.TELEGRAM_BOT_TOKEN) return json({ error: 'Download delivery is unavailable.' }, 503);
      let user;
      try { user = await verifyTelegram(request.headers.get('X-Telegram-Init-Data'), env.TELEGRAM_BOT_ID); }
      catch { return json({ error: 'Reopen the app in Telegram to download.' }, 401); }
      const quality=request.headers.get('X-Export-Quality')??'high';
      if(!['standard','high'].includes(quality))return json({error:'Invalid quality'},400);
      const id = request.headers.get('X-Export-ID');
      if (!/^[a-zA-Z0-9-]{16,80}$/.test(id ?? '')) return json({ error: 'Invalid export identifier' }, 400);
      const maxBytes = 49 * 1024 * 1024;
      if (Number(request.headers.get('Content-Length')) > maxBytes + 16384) return json({ error: 'This file is too large. Choose the smaller size.' }, 413);
      let file;
      try {
        const form = await request.formData();file = form.get('file');
        if (!(file instanceof File) || !file.size || file.size > maxBytes) return json({ error: 'This file is too large. Choose the smaller size.' }, 413);
        if (!['image/png','image/jpeg','image/webp','video/mp4','video/webm','application/zip'].includes(file.type)) return json({ error: 'Unsupported export format' }, 400);
      } catch { return json({ error: 'Invalid file upload' }, 400); }
      const reservation = await env.DB.prepare('INSERT OR IGNORE INTO exports (id, user_id, status, created_at) VALUES (?, ?, ?, ?)').bind(id, user.id, 'sending', Date.now()).run();
      if (!reservation.meta.changes) {
        const existing = await env.DB.prepare('SELECT status, message_id FROM exports WHERE id = ? AND user_id = ?').bind(id, user.id).first();
        if (existing?.status === 'sent') return json({ delivered: true, messageId: existing.message_id,account:await accountFor(env,user.id) });
        const retry=existing?.status==='failed'&&await env.DB.prepare('UPDATE exports SET status=? WHERE id=? AND user_id=? AND status=?').bind('sending',id,user.id,'failed').run();
        if(!retry?.meta?.changes)return json({error:'This delivery is already processing. Check your bot chat before retrying.'},409);
      }
      const account=await accountFor(env,user.id),amount=exportCreditCost(file.type.startsWith('video/')?'video':'image',quality,premiumActive(account));
      try{await env.DB.prepare("INSERT INTO export_charges (id,user_id,amount,status,created_at) VALUES (?,?,?,'held',?)").bind(id,user.id,amount,Date.now()).run();}
      catch(error){await env.DB.prepare('UPDATE exports SET status = ? WHERE id = ? AND user_id = ?').bind('failed',id,user.id).run();return json({error:String(error.message).includes('insufficient_credits')?'Not enough stars.': 'Could not reserve stars. Please retry.',account:await accountFor(env,user.id)},String(error.message).includes('insufficient_credits')?402:503);}
      if(request.signal.aborted){await refundExport(env,id,user.id);await env.DB.prepare('UPDATE exports SET status = ? WHERE id = ? AND user_id = ?').bind('failed',id,user.id).run();return json({error:'Export canceled.'},409);}
      const video=file.type==='video/mp4';
      const form = new FormData();form.set('chat_id', user.id);form.set(video?'video':'document', file, file.name.replace(/[^\p{L}\p{N}._-]/gu, '-').slice(0,150));
      if(video)form.set('supports_streaming','true');else form.set('disable_content_type_detection','true');
      let delivered;
      try {
        const response = await fetch('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + (video?'/sendVideo':'/sendDocument'), { method:'POST', body:form });delivered = await response.json();
      } catch {await refundExport(env,id,user.id);return json({error:'Delivery could not be confirmed. Check your bot chat before trying again.',account:await accountFor(env,user.id)},502);}
      if(!delivered.ok){await refundExport(env,id,user.id);await env.DB.prepare('UPDATE exports SET status = ? WHERE id = ? AND user_id = ?').bind('failed',id,user.id).run();return json({error:delivered.error_code===403?'Open the bot chat and allow messages, then try again.':'The file could not be delivered. Please retry.'},502);}
      await env.DB.prepare('UPDATE exports SET status = ?, message_id = ? WHERE id = ? AND user_id = ?').bind('sent',String(delivered.result.message_id),id,user.id).run();
      await env.DB.prepare("UPDATE export_charges SET status='complete' WHERE id=? AND user_id=?").bind(id,user.id).run();
      return json({delivered:true,messageId:delivered.result.message_id,account:await accountFor(env,user.id)});
    }
    if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Content-Security-Policy', "object-src 'none'; base-uri 'none'; frame-ancestors 'self' https://web.telegram.org https://*.telegram.org");
    return new Response(response.body, { status: response.status, headers });
  },
};
