// Short signed references for links Telegram opens on its own (buttons, native downloads),
// where no initData can be attached. The bot token is the HMAC key; each purpose is separate.
const encoder=new TextEncoder();
export const base64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export const fromBase64url=text=>atob(text.replace(/-/g,'+').replace(/_/g,'/'));
export const encodeText=text=>base64url(encoder.encode(text));
export const decodeText=text=>new TextDecoder().decode(Uint8Array.from(fromBase64url(text),c=>c.charCodeAt(0)));

export async function signature(env,purpose,payload){
  const key=await crypto.subtle.importKey('raw',encoder.encode(env.TELEGRAM_BOT_TOKEN),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(purpose+':'+payload)))).slice(0,32);
}
export function same(a,b){if(a.length!==b.length)return false;let difference=0;for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);return difference===0;}
