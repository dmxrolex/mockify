// Looks storage: one JSON document per look, kept per Telegram user in D1.
import {premiumActive} from './credit-model.js';
import {lookLimit} from './templates.js';

const MAX_BYTES=400_000;
let ready=null;
// Creates the table on first use, so a deploy works even before the migration is applied.
const ensureTable=env=>ready??=env.DB.prepare('CREATE TABLE IF NOT EXISTS looks (user_id TEXT NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL, data TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (user_id, id))').run().catch(error=>{ready=null;throw error;});

export async function looksRequest(env,user,account,body){
  await ensureTable(env);
  const limit=lookLimit(premiumActive(account)),uid=String(user.id);
  const list=async()=>(await env.DB.prepare('SELECT data FROM looks WHERE user_id=? ORDER BY updated_at DESC').bind(uid).all()).results.flatMap(row=>{try{return [JSON.parse(row.data)];}catch{return [];}});
  if(body?.action==='delete'){
    if(typeof body.id!=='string')return {status:400,body:{error:'Invalid look'}};
    await env.DB.prepare('DELETE FROM looks WHERE user_id=? AND id=?').bind(uid,body.id).run();
    return {status:200,body:{looks:await list(),limit}};
  }
  if(body?.action==='save'){
    const look=body.look;
    if(!look||typeof look.id!=='string'||!/^look-[\w-]{4,80}$/.test(look.id)||!Array.isArray(look.objects))return {status:400,body:{error:'Invalid look'}};
    const data=JSON.stringify({...look,name:String(look.name??'My look').slice(0,40),updatedAt:Date.now()});
    if(data.length>MAX_BYTES)return {status:413,body:{error:'This look is too large. Use a smaller watermark image.'}};
    const exists=await env.DB.prepare('SELECT 1 FROM looks WHERE user_id=? AND id=?').bind(uid,look.id).first();
    if(!exists){const {count}=await env.DB.prepare('SELECT COUNT(*) AS count FROM looks WHERE user_id=?').bind(uid).first();
      if(count>=limit)return {status:403,body:{error:'look_limit',limit,premium:premiumActive(account)}};}
    await env.DB.prepare('INSERT INTO looks (user_id,id,name,data,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET name=excluded.name,data=excluded.data,updated_at=excluded.updated_at').bind(uid,look.id,String(look.name??'My look').slice(0,40),data,Date.now()).run();
    return {status:200,body:{looks:await list(),limit}};
  }
  return {status:200,body:{looks:await list(),limit}};
}
