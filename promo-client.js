// Promo codes and the owner dashboard from the app. Outside Telegram (the dev server only) a
// few demo codes work locally so the sheet can be tried.
const demo={DEMO50:{kind:'stars',amount:50},DEMOPRO:{kind:'premium',amount:30},DEMO20:{kind:'discount',amount:20,scope:'all'}};

async function post(telegram,path,body){
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-Telegram-Init-Data':telegram.initData},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(data.error||'Something went wrong. Please retry.');error.reason=data.reason;error.status=response.status;throw error;}
  return data;
}

export async function redeemCode(telegram,code){
  if(telegram?.initData)return post(telegram,'/api/promo/redeem',{code});
  await new Promise(resolve=>setTimeout(resolve,700));
  const reward=demo[code.trim().toUpperCase()];
  if(!reward){const error=new Error('This code doesn’t exist.');error.reason='not_found';throw error;}
  return {reward,account:null};
}

export const adminCall=(telegram,body)=>post(telegram,'/api/admin',body);
