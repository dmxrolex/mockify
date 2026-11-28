// Refer & earn: a slim gold banner in Settings and the sheet it opens. Earnings run through
// Telegram's own affiliate program for the bot; Mockify only explains it and opens the bot's
// profile, where Telegram shows "Affiliate program" with the user's personal link.
import React,{useLayoutEffect,useRef} from 'react';
import {t} from './i18n.js';
import {dismissBackdrop} from './dialog-dismiss.js';
import AnimatedSticker from './animated-sticker.jsx';
import './refer-sheet.css';

export const REFERRAL_SHARE=25;
const loadStar=()=>import('./assets/telegram-star-animated.json');
const haptic=()=>{try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');}catch{}};
const pct=text=>t(text).replace('{percent}',REFERRAL_SHARE);

export function ReferBanner({onOpen}){
  return <button type="button" className="refer-banner" onClick={()=>{haptic();onOpen();}}>
    <span className="refer-sparkles" aria-hidden="true">{Array.from({length:6},(_,i)=><i key={i} style={{'--i':i}}/>)}</span>
    <AnimatedSticker as="span" load={loadStar} className="refer-star"/>
    <span className="refer-copy"><strong>{t('Refer & earn')}</strong><small>{pct('Get {percent}% of what friends spend')}</small></span>
    <svg className="refer-go" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>
  </button>;
}

export function ReferSheet({botUsername,onClose}){
  const ref=useRef(null);
  useLayoutEffect(()=>{const element=ref.current;element.showModal();return()=>{if(element.open)element.close();};},[]);
  const app=window.Telegram?.WebApp,bot=botUsername||'Mockify_app';
  const open=url=>{haptic();if(app?.openTelegramLink)app.openTelegramLink(url);else window.open(url,'_blank','noopener');};
  const steps=[['1','Join the program','Open Mockify’s profile in Telegram and tap Affiliate program.'],['2','Share your link','Telegram gives you a personal link to send to friends.'],['3',pct('Earn {percent}%'),'When friends buy stars or Premium, Telegram pays you in Stars.']];
  return <dialog ref={ref} className="refer-sheet" aria-labelledby="refer-title" onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>dismissBackdrop(event,onClose)}>
    <span className="refer-glow" aria-hidden="true"/>
    <span className="refer-grabber" aria-hidden="true"/>
    <button type="button" className="refer-close" aria-label={t('Close')} onClick={onClose}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    <AnimatedSticker as="span" load={loadStar} className="refer-hero"/>
    <h2 id="refer-title">{t('Invite friends, earn Stars')}</h2>
    <p className="refer-lead">{pct('You get {percent}% of every purchase your friends make in Mockify — paid by Telegram, in Stars.')}</p>
    <ol className="refer-steps">{steps.map(([n,title,text])=><li key={n}><span>{n}</span><div><strong>{t(title)}</strong><small>{t(text)}</small></div></li>)}</ol>
    <button type="button" className="refer-primary" onClick={()=>open('https://t.me/'+bot+'?profile')}>{t('Get my link')}</button>
  </dialog>;
}
