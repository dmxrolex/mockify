import React,{useEffect,useState} from 'react';
import {connectTelegram,authenticateTelegram} from './telegram.js';
import {setDraftOwner} from './media.js';
import {t} from './i18n.js';
import './telegram-entry.css';

export default function TelegramEntry({children}){
  const [session,setSession]=useState(null),[attempt,setAttempt]=useState(0);
  const [pending,setPending]=useState(true),[error,setError]=useState('');
  const [username,setUsername]=useState('Mockify_app');
  useEffect(()=>{
    let active=true;
    fetch('/api/config').then(response=>response.ok?response.json():null).then(config=>{
      if(active&&/^[a-z0-9_]+$/i.test(config?.botUsername??''))setUsername(config.botUsername);
    }).catch(()=>{});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{
    let active=true;setPending(true);setError('');
    async function verify(){
      try{
        const app=await connectTelegram();
        if(!app)return;
        const user=await authenticateTelegram(app);
        if(active){setDraftOwner(user.id);setSession({initialTelegram:app,initialProfile:user});}
      }catch(failure){if(active)setError(failure.message);}
      finally{if(active)setPending(false);}
    }
    verify();
    return()=>{active=false;};
  },[attempt]);
  useEffect(()=>{
    if(!pending&&!session)window.Telegram?.WebApp?.ready?.();
  },[pending,session]);
  if(session)return children(session);
  if(pending)return <main className="telegram-entry" data-loading="true" aria-busy="true"><progress className="checkout-spinner" aria-label={t('Verifying your Telegram account…')}/></main>;
  return <main className="telegram-entry">
    <section className="telegram-entry-card" aria-labelledby="telegram-entry-title" aria-busy={pending}>
      <h1 id="telegram-entry-title">{t('Open Mockify in Telegram')}</h1>
      <p>{t('Sign in through Telegram to use Mockify.')}</p>
      <p className="telegram-entry-status" role={error?'alert':'status'}>{t(error)}</p>
      <a className="credit-primary" href={'https://t.me/'+username+'?startapp'}>{t('Open in Telegram')}</a>
      <button className="credit-secondary" type="button" onClick={()=>{setPending(true);setError('');setAttempt(value=>value+1);}}>{t('Retry sign-in')}</button>
    </section>
  </main>;
}
