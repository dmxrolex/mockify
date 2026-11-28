// Promo codes and the owner dashboard. Tables and columns are created on first use, so a
// deploy works before migrations/0006 is applied (re-running it is harmless).
import {normalizeCode,validCode,promoDraft} from './promo-model.js';

const DAY=86400000;
const schema=[
  'CREATE TABLE IF NOT EXISTS promo_codes (code TEXT PRIMARY KEY, kind TEXT NOT NULL, amount INTEGER NOT NULL, scope TEXT NOT NULL DEFAULT \'all\', max_uses INTEGER, uses INTEGER NOT NULL DEFAULT 0, expires_at INTEGER, new_users_only INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, note TEXT NOT NULL DEFAULT \'\', created_at INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS promo_redemptions (code TEXT NOT NULL, user_id TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (code, user_id))',
  'CREATE TABLE IF NOT EXISTS promo_attempts (user_id TEXT NOT NULL, created_at INTEGER NOT NULL)',
  'CREATE INDEX IF NOT EXISTS promo_attempts_user ON promo_attempts(user_id, created_at)',
  'CREATE INDEX IF NOT EXISTS users_created ON users(created_at)',
  'ALTER TABLE users ADD COLUMN source TEXT',
  'ALTER TABLE users ADD COLUMN discount_percent INTEGER',
  'ALTER TABLE users ADD COLUMN discount_scope TEXT',
  'ALTER TABLE users ADD COLUMN discount_until INTEGER',
  'ALTER TABLE users ADD COLUMN discount_code TEXT',
  'ALTER TABLE payment_orders ADD COLUMN promo_code TEXT',
];
const ready=new WeakMap();
// Once per database binding. Each statement on its own: an ALTER for a column that already
// exists just fails quietly.
export function ensureSchema(env){
  let pending=ready.get(env.DB);
  if(!pending){pending=(async()=>{for(const sql of schema){try{await env.DB.prepare(sql).run();}catch(error){if(!/duplicate column|already exists/i.test(String(error?.message)))throw error;}}})().catch(error=>{ready.delete(env.DB);throw error;});ready.set(env.DB,pending);}
  return pending;
}

export function isAdmin(env,user){
  const ids=String(env.ADMIN_USER_IDS??'').split(',').map(value=>value.trim()).filter(Boolean);
  if(ids.length)return ids.includes(String(user?.id));
  const names=String(env.ADMIN_USERNAMES??'DMX_ROLEX').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
  return !!user?.username&&names.includes(user.username.toLowerCase());
}

// A user seen only through /start gets a row too, so the dashboard counts them.
export async function recordBotUser(env,from){
  if(!Number.isSafeInteger(from?.id)||from.is_bot)return;
  await ensureSchema(env);
  const profile={id:String(from.id),firstName:String(from.first_name??'').slice(0,128),lastName:String(from.last_name??'').slice(0,128),username:String(from.username??'').slice(0,64),photoUrl:'',premium:from.is_premium===true,language:String(from.language_code??'en').slice(0,16)};
  await env.DB.prepare("INSERT INTO users (id, profile, created_at, last_seen_at, source) VALUES (?, ?, ?, ?, 'bot') ON CONFLICT(id) DO UPDATE SET last_seen_at=excluded.last_seen_at").bind(profile.id,JSON.stringify(profile),Date.now(),Date.now()).run();
}

const reasons={
  not_found:'This code doesn’t exist.',expired:'This code has expired.',used_up:'This code has been fully redeemed.',
  already:'You’ve already used this code.',not_eligible:'This code is for new accounts only.',too_many:'Too many tries. Wait a few minutes and try again.',
};
const fail=(status,reason)=>({status,body:{error:reasons[reason],reason}});

export async function redeemPromo(env,user,input,accountFor,now=Date.now()){
  await ensureSchema(env);
  const uid=String(user.id),code=normalizeCode(input);
  const {count}=await env.DB.prepare('SELECT COUNT(*) AS count FROM promo_attempts WHERE user_id=? AND created_at>?').bind(uid,now-10*60000).first();
  if(count>=8)return fail(429,'too_many');
  const why=async()=>{
    const promo=validCode(code)?await env.DB.prepare('SELECT * FROM promo_codes WHERE code=?').bind(code).first():null;
    if(!promo||!promo.active)return 'not_found';
    if(await env.DB.prepare('SELECT 1 FROM promo_redemptions WHERE code=? AND user_id=?').bind(code,uid).first())return 'already';
    if(promo.expires_at&&promo.expires_at<=now)return 'expired';
    if(promo.max_uses!=null&&promo.uses>=promo.max_uses)return 'used_up';
    if(promo.new_users_only){const row=await env.DB.prepare('SELECT created_at FROM users WHERE id=?').bind(uid).first();if(!row||row.created_at<now-7*DAY)return 'not_eligible';}
    return {promo};
  };
  const check=await why();
  if(typeof check==='string'){await env.DB.batch([env.DB.prepare('DELETE FROM promo_attempts WHERE created_at<?').bind(now-DAY),env.DB.prepare('INSERT INTO promo_attempts (user_id, created_at) VALUES (?, ?)').bind(uid,now)]);return fail(check==='not_found'?404:409,check);}
  const promo=check.promo,claimed='EXISTS(SELECT 1 FROM promo_redemptions WHERE code=? AND user_id=? AND created_at=?)';
  const reward={
    stars:env.DB.prepare(`UPDATE users SET credits=credits+? WHERE id=? AND ${claimed}`).bind(promo.amount,uid,code,uid,now),
    premium:env.DB.prepare(`UPDATE users SET subscription_expires_at=MAX(COALESCE(subscription_expires_at,0),?)+? WHERE id=? AND ${claimed}`).bind(now,promo.amount*DAY,uid,code,uid,now),
    discount:env.DB.prepare(`UPDATE users SET discount_percent=?,discount_scope=?,discount_until=?,discount_code=? WHERE id=? AND ${claimed}`).bind(promo.amount,promo.scope,promo.expires_at,code,uid,code,uid,now),
  }[promo.kind];
  if(!reward)return fail(404,'not_found');
  // One transaction: the claim only lands while the code is still open, and the reward and
  // use count follow only that claim.
  const result=await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO promo_redemptions (code, user_id, created_at) SELECT ?, ?, ? FROM promo_codes WHERE code=? AND active=1 AND (expires_at IS NULL OR expires_at>?) AND (max_uses IS NULL OR uses<max_uses)').bind(code,uid,now,code,now),
    env.DB.prepare(`UPDATE promo_codes SET uses=uses+1 WHERE code=? AND ${claimed}`).bind(code,code,uid,now),
    reward,
  ]);
  if(!result[0].meta.changes){const again=await why();return fail(409,typeof again==='string'?again:'used_up');}
  return {status:200,body:{reward:{kind:promo.kind,amount:promo.amount,scope:promo.scope,expiresAt:promo.expires_at},account:await accountFor(env,uid)}};
}

const profileOf=row=>{try{return JSON.parse(row.profile);}catch{return {};}};
const userRow=row=>{const p=profileOf(row);return {id:row.id,name:[p.firstName,p.lastName].filter(Boolean).join(' ')||'User '+row.id,username:p.username||'',photo:/^https:\/\//.test(p.photoUrl??'')?p.photoUrl:'',source:row.source||'app',joinedAt:row.created_at,seenAt:row.last_seen_at,credits:Number(row.credits)||0,premiumUntil:Number(row.subscription_expires_at)||null,telegramPremium:!!p.premium};};
const promoRow=row=>({code:row.code,kind:row.kind,amount:row.amount,scope:row.scope,maxUses:row.max_uses,uses:row.uses,expiresAt:row.expires_at,newUsersOnly:!!row.new_users_only,active:!!row.active,note:row.note,createdAt:row.created_at});
const userColumns='id,profile,source,created_at,last_seen_at,credits,subscription_expires_at';

export async function adminRequest(env,body,now=Date.now()){
  await ensureSchema(env);
  const action=body?.action;
  if(action==='overview'){
    const today=new Date(now);today.setUTCHours(0,0,0,0);const start=today.getTime()-6*DAY;
    const [totals,daily,recent,payments,revenue,exportsWeek,premium,promos]=await env.DB.batch([
      env.DB.prepare("SELECT COUNT(*) AS users, COALESCE(SUM(created_at>?),0) AS day, COALESCE(SUM(created_at>?),0) AS week, COALESCE(SUM(last_seen_at>?),0) AS active, COALESCE(SUM(subscription_expires_at>?),0) AS premium, COALESCE(SUM(source='bot'),0) AS bot FROM users").bind(now-DAY,now-7*DAY,now-7*DAY,now),
      env.DB.prepare('SELECT CAST((created_at-?)/86400000 AS INTEGER) AS day, COUNT(*) AS count FROM users WHERE created_at>=? GROUP BY day').bind(start,start),
      env.DB.prepare(`SELECT ${userColumns} FROM users ORDER BY created_at DESC LIMIT 25`),
      env.DB.prepare("SELECT o.user_id,o.kind,o.stars,o.months,o.credits,o.paid_at,o.promo_code,u.profile FROM payment_orders o LEFT JOIN users u ON u.id=o.user_id WHERE o.status='paid' ORDER BY o.paid_at DESC LIMIT 20"),
      env.DB.prepare("SELECT COALESCE(SUM(stars),0) AS total, COALESCE(SUM(CASE WHEN paid_at>? THEN stars END),0) AS week, COUNT(*) AS orders FROM payment_orders WHERE status='paid'").bind(now-7*DAY),
      env.DB.prepare('SELECT COUNT(*) AS count FROM exports WHERE created_at>?').bind(now-7*DAY),
      env.DB.prepare(`SELECT ${userColumns} FROM users WHERE subscription_expires_at>? ORDER BY subscription_expires_at DESC LIMIT 25`).bind(now),
      env.DB.prepare('SELECT * FROM promo_codes ORDER BY created_at DESC LIMIT 50'),
    ]);
    const counts=Array(7).fill(0);for(const row of daily.results)if(row.day>=0&&row.day<7)counts[row.day]=row.count;
    return {status:200,body:{
      totals:{...totals.results[0],exports:exportsWeek.results[0].count,revenue:revenue.results[0].total,revenueWeek:revenue.results[0].week,orders:revenue.results[0].orders},
      daily:counts.map((count,index)=>({day:start+index*DAY,count})),
      recentUsers:recent.results.map(userRow),premiumUsers:premium.results.map(userRow),
      payments:payments.results.map(row=>{const p=profileOf(row);return {userId:row.user_id,name:[p.firstName,p.lastName].filter(Boolean).join(' ')||'User '+row.user_id,username:p.username||'',photo:/^https:\/\//.test(p.photoUrl??'')?p.photoUrl:'',kind:row.kind,stars:row.stars,months:row.months,credits:row.credits,paidAt:row.paid_at,promo:row.promo_code||''};}),
      promos:promos.results.map(promoRow),
    }};
  }
  if(action==='users'){
    const query=String(body.query??'').trim().slice(0,64),offset=Math.max(0,Math.min(100000,Number(body.offset)||0)),filter=body.filter;
    const where=[],binds=[];
    if(query){where.push('(id=? OR profile LIKE ?)');binds.push(query.replace(/^@/,''),'%'+query.replace(/^@/,'').replace(/[%_]/g,'')+'%');}
    if(filter==='premium'){where.push('subscription_expires_at>?');binds.push(now);}
    if(filter==='bot')where.push("source='bot'");
    const rows=await env.DB.prepare(`SELECT ${userColumns} FROM users ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY created_at DESC LIMIT 31 OFFSET ?`).bind(...binds,offset).all();
    return {status:200,body:{users:rows.results.slice(0,30).map(userRow),more:rows.results.length>30}};
  }
  if(action==='promo.create'){
    const draft=promoDraft(body.promo,now);if(draft.error)return {status:400,body:{error:draft.error}};
    const p=draft.code;
    const result=await env.DB.prepare('INSERT OR IGNORE INTO promo_codes (code,kind,amount,scope,max_uses,expires_at,new_users_only,note,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(p.code,p.kind,p.amount,p.scope,p.maxUses,p.expiresAt,p.newUsersOnly?1:0,p.note,now).run();
    if(!result.meta.changes)return {status:409,body:{error:'A code with this name already exists.'}};
  }
  else if(action==='promo.toggle'||action==='promo.delete'){
    const code=normalizeCode(body.code);if(!validCode(code))return {status:400,body:{error:'Invalid code'}};
    if(action==='promo.toggle')await env.DB.prepare('UPDATE promo_codes SET active=1-active WHERE code=?').bind(code).run();
    else await env.DB.prepare('DELETE FROM promo_codes WHERE code=?').bind(code).run();
  }
  else return {status:400,body:{error:'Unknown action'}};
  const promos=await env.DB.prepare('SELECT * FROM promo_codes ORDER BY created_at DESC LIMIT 50').all();
  return {status:200,body:{promos:promos.results.map(promoRow)}};
}
