import {useEffect,useRef,useState} from 'react';
import {creditPacks} from './credit-model.js';
import {subscriptionOffers} from './subscription-model.js';
import {accountRequest} from './account-client.js';
async function request(app,path,body,signal){const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-Telegram-Init-Data':app.initData},credentials:'same-origin',body:JSON.stringify(body),signal}),data=await response.json();if(!response.ok)throw new Error(data.error||'Payment could not be opened.');return data;}
export function useStarPayments(app,userId,onAccount){
  const [pending,setPending]=useState(null),[message,setMessage]=useState(''),[error,setError]=useState(false),busy=useRef(false),invoiceOpen=useRef(false),confirming=useRef(false),task=useRef(null),alive=useRef(true),latest=useRef(onAccount);latest.current=onAccount;
  const [success,setSuccess]=useState(null),celebrated=useRef(new Set());
  function received(orderId,productId,account){
    latest.current(account);remember(null);setMessage('Payment received');
    if(celebrated.current.has(orderId))return;
    celebrated.current.add(orderId);
    const pack=creditPacks.find(item=>item.id===productId);
    const offer=subscriptionOffers.find(item=>'premium-'+item.months===productId);
    if(pack)setSuccess({kind:'credits',amount:pack.credits});
    if(offer)setSuccess({kind:'premium',months:offer.months});
  }
  const key='pixova.payment.'+userId;
  const read=()=>{try{return localStorage.getItem(key);}catch{return null;}},remember=id=>{try{id?localStorage.setItem(key,id):localStorage.removeItem(key);}catch{}};
  async function confirm(orderId){
    if(confirming.current)return;confirming.current=true;busy.current=true;setPending('confirming');setMessage('Confirming payment…');setError(false);const controller=new AbortController();task.current=controller;
    try{for(let attempt=0;attempt<20;attempt++){const result=await request(app,'/api/payments/status',{orderId},controller.signal);if(!alive.current)return;if(result.status==='paid'){received(orderId,result.productId,result.account);return;}await new Promise(resolve=>setTimeout(resolve,750));}setMessage('Payment is processing. Your balance will update automatically.');}
    catch(failure){if(!controller.signal.aborted&&alive.current){setError(true);setMessage(failure.message);}}
    finally{confirming.current=false;busy.current=false;if(alive.current)setPending(null);}
  }
  useEffect(()=>{
    alive.current=true;if(!app||!userId)return()=>{alive.current=false;task.current?.abort();};
    const refresh=()=>{if(invoiceOpen.current)return;const id=read();if(id)void confirm(id);else accountRequest(app).then(account=>{if(alive.current)latest.current(account);}).catch(()=>{});};
    // Reconcile interrupted checkout after returning to Telegram or reopening the app.
    app.onEvent?.('activated',refresh);const visibility=()=>{if(!document.hidden)refresh();};document.addEventListener('visibilitychange',visibility);if(read())refresh();
    return()=>{alive.current=false;task.current?.abort();app.offEvent?.('activated',refresh);document.removeEventListener('visibilitychange',visibility);};
  },[app,userId]);
  async function buy(productId){
    if(busy.current)return;
    if(!app?.initData||typeof app.openInvoice!=='function'){setMessage('Open Pixova in Telegram to purchase.');setError(true);return;}
    busy.current=true;setPending(productId);setMessage('');setError(false);const controller=new AbortController();task.current=controller;
    try{
      const invoice=await request(app,'/api/payments/invoice',{productId,requestId:crypto.randomUUID()},controller.signal);if(!alive.current)return;
      if(invoice.status==='paid'){received(invoice.orderId,productId,invoice.account);return;}
      remember(invoice.orderId);invoiceOpen.current=true;setPending('telegram');
      const status=await new Promise((resolve,reject)=>{try{app.openInvoice(invoice.url,resolve);}catch(failure){reject(failure);}});invoiceOpen.current=false;
      if(!alive.current)return;
      if(status==='paid'||status==='pending')await confirm(invoice.orderId);
      else{remember(null);if(status==='failed'){setMessage('Payment was not completed. Please retry.');setError(true);}}
    }catch(failure){invoiceOpen.current=false;if(!controller.signal.aborted&&alive.current){setMessage(failure.message);setError(true);}}
    finally{busy.current=false;if(alive.current)setPending(null);}
  }
  const clear=()=>{if(!busy.current){setMessage('');setError(false);}};
  return {buy,pending,message,error,clear,success,dismissSuccess:()=>setSuccess(null)};
}
