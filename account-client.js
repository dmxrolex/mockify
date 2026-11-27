export async function accountRequest(app,path='/api/account'){
  const response=await fetch(path,{method:'POST',headers:{'X-Telegram-Init-Data':app.initData},credentials:'same-origin'}),data=await response.json();
  if(!response.ok){const error=new Error(data.error||'Account service unavailable.');error.account=data.account;throw error;}
  return data.account;
}
