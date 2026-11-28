import test from 'node:test';
import assert from 'node:assert/strict';
import {d1} from './d1.js';
import {redeemPromo,adminRequest,isAdmin,recordBotUser} from '../promo-api.js';
import {accountFromRow} from '../credit-model.js';
import {promoDraft,discountFor,discountedStars} from '../promo-model.js';

const accountFor=async(env,id)=>accountFromRow(await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(id).first());
async function setup(){
  const env={DB:d1()};
  for(const id of ['1','2','3'])env.DB.raw.prepare('INSERT INTO users (id,profile,created_at,last_seen_at) VALUES (?,?,?,?)').run(id,JSON.stringify({firstName:'U'+id}),Date.now()-30*86400000,Date.now());
  return env;
}
const create=(env,promo)=>adminRequest(env,{action:'promo.create',promo});

test('stars, premium and discount codes reward once per user',async()=>{
  const env=await setup();
  await create(env,{code:'stars50',kind:'stars',amount:50});
  await create(env,{code:'PRO30',kind:'premium',amount:30});
  await create(env,{code:'half',kind:'discount',amount:50,scope:'premium'});
  let result=await redeemPromo(env,{id:'1'},' stars50 ',accountFor);
  assert.equal(result.status,200);assert.equal(result.body.account.credits,50);
  result=await redeemPromo(env,{id:'1'},'STARS50',accountFor);
  assert.equal(result.body.reason,'already');assert.equal((await accountFor(env,'1')).credits,50);
  result=await redeemPromo(env,{id:'1'},'pro30',accountFor);
  assert.ok(result.body.account.subscription.expiresAt>Date.now()+29*86400000);
  result=await redeemPromo(env,{id:'2'},'HALF',accountFor);
  const discount=discountFor(result.body.account,'premium');
  assert.equal(discount.percent,50);assert.equal(discountedStars(149,discount),75);
  assert.equal(discountFor(result.body.account,'credits'),null);
});

test('limits: max redemptions, expiry, new accounts only, unknown codes and retries',async()=>{
  const env=await setup();
  await create(env,{code:'ONE',kind:'stars',amount:5,maxUses:1});
  assert.equal((await redeemPromo(env,{id:'1'},'one',accountFor)).status,200);
  assert.equal((await redeemPromo(env,{id:'2'},'one',accountFor)).body.reason,'used_up');
  await create(env,{code:'OLD',kind:'stars',amount:5,validDays:1});
  env.DB.raw.prepare('UPDATE promo_codes SET expires_at=? WHERE code=?').run(Date.now()-1,'OLD');
  assert.equal((await redeemPromo(env,{id:'1'},'old',accountFor)).body.reason,'expired');
  await create(env,{code:'NEWBIE',kind:'stars',amount:5,newUsersOnly:true});
  assert.equal((await redeemPromo(env,{id:'1'},'newbie',accountFor)).body.reason,'not_eligible');
  assert.equal((await redeemPromo(env,{id:'1'},'nope',accountFor)).body.reason,'not_found');
  await adminRequest(env,{action:'promo.toggle',code:'one'});
  assert.equal((await redeemPromo(env,{id:'3'},'one',accountFor)).body.reason,'not_found');
  for(let i=0;i<7;i++)await redeemPromo(env,{id:'3'},'bad'+i,accountFor);
  assert.equal((await redeemPromo(env,{id:'3'},'NEWBIE',accountFor)).status,429);
});

test('owner overview counts app accounts, bot-only starts separately, and lists codes',async()=>{
  const env=await setup();
  await recordBotUser(env,{id:99,first_name:'Bot',username:'botuser'});
  await create(env,{code:'HELLO',kind:'stars',amount:10});
  const {body}=await adminRequest(env,{action:'overview'});
  // App accounts are the users; people who only pressed /start are counted on their own.
  assert.equal(body.totals.users,3);assert.equal(body.totals.bot,1);assert.equal(body.totals.week,0);
  assert.equal(body.daily.length,7);assert.equal(body.daily.at(-1).count,0);
  assert.ok(body.recentUsers.every(user=>user.source!=='bot'));
  assert.equal(body.promos[0].code,'HELLO');
  assert.equal((await adminRequest(env,{action:'users',query:'@botuser'})).body.users.length,1);
  assert.equal((await create(env,{code:'HELLO',kind:'stars',amount:10})).status,409);
});

test('owner check and code validation',()=>{
  assert.ok(isAdmin({},{id:'5',username:'dmx_rolex'}));
  assert.ok(!isAdmin({},{id:'5',username:'someone'}));
  assert.ok(!isAdmin({ADMIN_USER_IDS:'7'},{id:'5',username:'DMX_ROLEX'}));
  assert.ok(isAdmin({ADMIN_USER_IDS:'7, 8'},{id:'8'}));
  assert.ok(promoDraft({code:'a',kind:'stars',amount:1}).error);
  assert.ok(promoDraft({code:'OK1',kind:'discount',amount:95}).error);
  assert.equal(promoDraft({code:'ok-1',kind:'discount',amount:20,scope:'credits'}).code.scope,'credits');
});
