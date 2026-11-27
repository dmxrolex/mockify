import {creditPacks} from './credit-model.js';
import {subscriptionOffers,extendMonths} from './subscription-model.js';
import {startReply} from './bot-messages.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export function productFor(id){const pack=creditPacks.find(pack=>pack.id===id);if(pack)return {id,kind:'credits',credits:pack.credits,months:0,stars:pack.stars,title:pack.credits+' Mockify Stars',description:pack.bonus?`${pack.credits-pack.bonus} stars + ${pack.bonus} bonus stars.`:`${pack.credits} stars for photo and video exports.`};const offer=subscriptionOffers.find(offer=>'premium-'+offer.months===id);return offer?{id,kind:'premium',credits:0,months:offer.months,stars:offer.stars,title:'Mockify Premium',description:`${offer.months} month${offer.months===1?'':'s'} of unlimited exports and drafts. One-time payment, no automatic renewal.`}:null;}
async function bot(env,method,body){const response=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(7000)}),data=await response.json();if(!response.ok||!data.ok)throw new Error('Telegram payment service unavailable. Please retry.');return data.result;}
export async function webhookSecret(env){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.TELEGRAM_BOT_TOKEN),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('pixova-stars-webhook-v1:'+env.PAYMENTS_BASE_URL)))].map(value=>value.toString(16).padStart(2,'0')).join('');}
function equal(a,b){if(typeof a!=='string'||a.length!==b.length)return false;let difference=0;for(let i=0;i<b.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);return difference===0;}
export async function setupPayments(env){
  if(!env.PAYMENTS_BASE_URL||!env.TELEGRAM_BOT_TOKEN)throw new Error('Payment configuration missing.');
  const expected=env.PAYMENTS_BASE_URL+'/api/telegram/webhook',info=await bot(env,'getWebhookInfo',{});
  if(info.url&&info.url!==expected)throw new Error('An existing webhook is configured for this bot. It must be reviewed before changing payment delivery.');
  await bot(env,'setWebhook',{url:expected,secret_token:await webhookSecret(env),allowed_updates:['message','pre_checkout_query'],drop_pending_updates:false});
  return {configured:true,url:expected};
}
async function orderFor(env,payload){if(typeof payload!=='string'||!payload.startsWith('pixova:'))return null;return env.DB.prepare('SELECT * FROM payment_orders WHERE id=?').bind(payload.slice(7)).first();}
function matches(order,user,payment){return order&&String(user)===order.user_id&&payment.currency==='XTR'&&payment.total_amount===order.stars;}
export async function applyPayment(env,order,chargeId,paidAt=Date.now()){
  // Each batch is one transaction. The expiry compare-and-swap makes simultaneous
  // Premium purchases additive while unique receipts prevent replayed grants.
  for(let attempt=0;attempt<5;attempt++){
    const existing=await env.DB.prepare('SELECT order_id,applied FROM payment_receipts WHERE charge_id=? OR order_id=?').bind(chargeId,order.id).first();if(existing)return existing.order_id===order.id&&existing.applied===1;
    const user=await env.DB.prepare('SELECT subscription_expires_at FROM users WHERE id=?').bind(order.user_id).first();if(!user)return false;
    const previous=Number(user.subscription_expires_at)||0,next=order.kind==='premium'?extendMonths(Math.max(previous,paidAt),order.months):previous;
    const statements=[
      env.DB.prepare("INSERT OR IGNORE INTO payment_receipts(charge_id,order_id,user_id,stars,paid_at) SELECT ?,?,?,?,? FROM users JOIN payment_orders ON payment_orders.user_id=users.id WHERE users.id=? AND payment_orders.id=? AND payment_orders.status IN ('pending','checkout') AND (?='credits' OR COALESCE(users.subscription_expires_at,0)=?)").bind(chargeId,order.id,order.user_id,order.stars,paidAt,order.user_id,order.id,order.kind,previous),
      env.DB.prepare("UPDATE users SET credits=credits+?,subscription_expires_at=CASE WHEN ?='premium' THEN ? ELSE subscription_expires_at END WHERE id=? AND EXISTS(SELECT 1 FROM payment_receipts WHERE charge_id=? AND order_id=? AND applied=0)").bind(order.credits,order.kind,next,order.user_id,chargeId,order.id),
      env.DB.prepare("UPDATE payment_orders SET status='paid',paid_at=? WHERE id=? AND EXISTS(SELECT 1 FROM payment_receipts WHERE charge_id=? AND order_id=? AND applied=0)").bind(paidAt,order.id,chargeId,order.id),
      env.DB.prepare('UPDATE payment_receipts SET applied=1 WHERE charge_id=? AND order_id=? AND applied=0').bind(chargeId,order.id)
    ];
    const result=await env.DB.batch(statements);if(result[0].meta.changes)return true;
  }
  throw new Error('Payment is awaiting account confirmation.');
}
async function support(env,message){const user=String(message.from.id),id='message-'+message.chat.id+'-'+message.message_id;await env.DB.prepare('INSERT OR IGNORE INTO payment_support(id,user_id,message,created_at) VALUES(?,?,?,?)').bind(id,user,String(message.text??'').slice(0,4096),Date.now()).run();}
async function webhook(request,env){
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(!env.TELEGRAM_BOT_TOKEN||!equal(request.headers.get('X-Telegram-Bot-Api-Secret-Token'),await webhookSecret(env)))return json({error:'Unauthorized'},401);
  if(Number(request.headers.get('Content-Length'))>131072)return json({error:'Too large'},413);
  let update;try{const text=await request.text();if(text.length>131072)return json({error:'Too large'},413);update=JSON.parse(text);}catch{return json({error:'Invalid update'},400);}
  try{
    if(update.pre_checkout_query){
      const query=update.pre_checkout_query,order=await orderFor(env,query.invoice_payload);
      if(order?.checkout_id===query.id&&order.checkout_answered)return json({ok:true});
      let valid=matches(order,query.from?.id,query)&&Date.now()-order.created_at<86400000;
      if(valid){const reserved=await env.DB.prepare("UPDATE payment_orders SET status='checkout',checkout_id=? WHERE id=? AND (status='pending' OR (status='checkout' AND checkout_id=?))").bind(query.id,order.id,query.id).run();valid=reserved.meta.changes>0;}
      await bot(env,'answerPreCheckoutQuery',{pre_checkout_query_id:query.id,ok:!!valid,...(!valid?{error_message:'This invoice is no longer available. Open Mockify and choose the offer again.'}:{})});
      if(valid)await env.DB.prepare('UPDATE payment_orders SET checkout_answered=1 WHERE id=? AND checkout_id=?').bind(order.id,query.id).run();
    }
    const message=update.message,payment=message?.successful_payment;
    if(payment){const order=await orderFor(env,payment.invoice_payload);if(!matches(order,message.from?.id,payment)||typeof payment.telegram_payment_charge_id!=='string'){await support(env,{...message,text:'Unmatched payment: '+JSON.stringify(payment)});return json({ok:true});}await applyPayment(env,order,payment.telegram_payment_charge_id);}
    else if(message?.from?.id&&message.chat?.type==='private'&&typeof message.text==='string'){
      const start=/^\/start(?:@([a-z0-9_]+))?(?:\s|$)/i.exec(message.text);
      if(start&&(!start[1]||start[1].toLowerCase()===env.TELEGRAM_BOT_USERNAME?.toLowerCase()))await bot(env,'sendMessage',startReply(message,env.PAYMENTS_BASE_URL));
      else if(/^\/paysupport(?:@\w+)?(?:\s|$)/.test(message.text)){await support(env,message);await bot(env,'sendMessage',{chat_id:message.chat.id,text:'Payment support request received. Reply here with your issue and payment receipt so the Mockify team can review it.'});}
      else {const ticket=await env.DB.prepare('SELECT id FROM payment_support WHERE user_id=? LIMIT 1').bind(String(message.from.id)).first();if(ticket)await support(env,message);}
    }
    return json({ok:true});
  }catch{return json({error:'Payment update could not be processed. Retry required.'},503);}
}
export async function handlePayments(request,env,{verifyTelegram,accountFor}){
  const url=new URL(request.url);
  if(url.pathname==='/api/telegram/webhook')return webhook(request,env);
  if(url.pathname==='/api/payments/setup'){
    if(request.method!=='POST'||!env.PAYMENTS_SETUP_KEY||!equal(request.headers.get('X-Payments-Setup-Key'),env.PAYMENTS_SETUP_KEY))return json({error:'Unauthorized'},401);
    try{return json(await setupPayments(env));}catch(error){return json({error:error.message},409);}
  }
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(request.headers.get('Origin')!==url.origin)return json({error:'Origin rejected'},403);
  let user;try{user=await verifyTelegram(request.headers.get('X-Telegram-Init-Data'),env.TELEGRAM_BOT_ID);}catch{return json({error:'Open Mockify in Telegram to purchase.'},401);}
  let body;try{const text=await request.text();if(text.length>4096)return json({error:'Too large'},413);body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Invalid request'},400);}catch{return json({error:'Invalid request'},400);}
  if(url.pathname==='/api/payments/status'){const order=await env.DB.prepare('SELECT status,product_id FROM payment_orders WHERE id=? AND user_id=?').bind(String(body.orderId),user.id).first();return order?json({status:order.status,productId:order.product_id,account:await accountFor(env,user.id)}):json({error:'Order not found'},404);}
  if(url.pathname!=='/api/payments/invoice')return json({error:'Not found'},404);
  const product=productFor(body.productId);if(!product||!/^[-a-zA-Z0-9]{16,80}$/.test(body.requestId??''))return json({error:'Invalid offer'},400);
  if(!env.TELEGRAM_BOT_TOKEN||!env.PAYMENTS_BASE_URL)return json({error:'Payments are temporarily unavailable.'},503);
  try{
    const existing=await env.DB.prepare('SELECT * FROM payment_orders WHERE id=?').bind(body.requestId).first();
    if(existing){if(existing.user_id!==user.id||existing.product_id!==product.id)return json({error:'Order mismatch'},409);if(existing.status==='paid')return json({orderId:existing.id,status:'paid',account:await accountFor(env,user.id)});if(existing.invoice_url)return json({orderId:existing.id,url:existing.invoice_url});}
    const info=await bot(env,'getWebhookInfo',{});if(info.url!==env.PAYMENTS_BASE_URL+'/api/telegram/webhook')return json({error:'Payment confirmation is not configured. Please try later.'},503);
    await env.DB.prepare('INSERT OR IGNORE INTO payment_orders(id,user_id,product_id,kind,stars,credits,months,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(body.requestId,user.id,product.id,product.kind,product.stars,product.credits,product.months,Date.now()).run();
    const link=await bot(env,'createInvoiceLink',{title:product.title,description:product.description,payload:'pixova:'+body.requestId,provider_token:'',currency:'XTR',prices:[{label:product.title,amount:product.stars}]});
    if(typeof link!=='string'||!/^https:\/\/t\.me\//.test(link))throw new Error('Invalid invoice response');
    await env.DB.prepare('UPDATE payment_orders SET invoice_url=? WHERE id=? AND user_id=?').bind(link,body.requestId,user.id).run();return json({orderId:body.requestId,url:link});
  }catch{return json({error:'Could not open payment. Please retry.'},503);}
}
