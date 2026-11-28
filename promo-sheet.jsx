import React,{useLayoutEffect,useRef,useState} from 'react';
import {t} from './i18n.js';
import {redeemCode} from './promo-client.js';
import {dismissBackdrop} from './dialog-dismiss.js';
import {subscriptionDate} from './subscription-model.js';
import {telegramStar} from './brand-icons.jsx';
import AnimatedSticker from './animated-sticker.jsx';
import './promo-sheet.css';

const haptic=type=>{try{window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.(type);}catch{}};
const icons={
  gift:<><rect x="3.5" y="8" width="17" height="4.5" rx="1.2"/><path d="M5 12.5v6.5a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5M12 8v12.5M12 8C10.7 5 6.5 4 6.5 6.4 6.5 8 9.6 8 12 8Zm0 0c1.3-3 5.5-4 5.5-1.6C17.5 8 14.4 8 12 8Z"/></>,
  check:<path d="m6 12.5 4 4 8-9"/>,
  close:<path d="M6 6l12 12M18 6 6 18"/>,
  premium:<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>,
  tag:<><path d="M3.5 12.6V5a1.5 1.5 0 0 1 1.5-1.5h7.6L20.5 11.4a1.5 1.5 0 0 1 0 2.1l-7 7a1.5 1.5 0 0 1-2.1 0Z"/><circle cx="8" cy="8" r="1.4"/></>,
};
const Icon=({name})=><svg viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>;

// What a reward means, in one headline and one detail line.
function describe(reward,account,lang){
  if(reward.kind==='stars')return {icon:'stars',title:t('+{count} stars').replace('{count}',reward.amount),detail:t('Added to your balance.')};
  if(reward.kind==='premium'){const until=account?.subscription?.expiresAt;return {icon:'premium',title:t('{count} days of Premium').replace('{count}',reward.amount),detail:until?t('Active until {date}.').replace('{date}',subscriptionDate(until,lang)):t('Premium is active.')};}
  const scope={premium:'Premium',credits:'star packs',all:'your next purchase'}[reward.scope]??'your next purchase';
  return {icon:'tag',title:t('{percent}% off').replace('{percent}',reward.amount),detail:t('Applies to {scope} at checkout.').replace('{scope}',t(scope))};
}

// Half-height sheet: type a code, redeem, then a clear success or an inline error.
export default function PromoSheet({telegram,onClose,onAccount,onUseDiscount}){
  const ref=useRef(null),input=useRef(null);
  const [code,setCode]=useState(''),[state,setState]=useState('idle'),[error,setError]=useState(''),[result,setResult]=useState(null),[shake,setShake]=useState(0);
  useLayoutEffect(()=>{const element=ref.current;element.showModal();input.current?.focus({preventScroll:true});return()=>{if(element.open)element.close();};},[]);
  const lang=document.documentElement.lang||'en',busy=state==='checking',ready=code.trim().length>=3&&!busy;
  async function submit(event){
    event?.preventDefault();if(!ready)return;
    setState('checking');setError('');input.current?.blur();
    try{const data=await redeemCode(telegram,code);if(data.account)onAccount?.(data.account);setResult(data);setState('done');haptic('success');}
    catch(failure){setError(t(failure.message));setState('idle');setShake(value=>value+1);haptic('error');requestAnimationFrame(()=>input.current?.focus({preventScroll:true}));}
  }
  const info=result&&describe(result.reward,result.account,lang);
  return <dialog ref={ref} className="promo-sheet" aria-labelledby="promo-title" onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>dismissBackdrop(event,onClose)}>
    <span className="promo-grabber" aria-hidden="true"/>
    <button type="button" className="promo-close" aria-label={t('Close')} onClick={onClose}><Icon name="close"/></button>
    {state==='done'?<div className="promo-success" role="status">
      <span className="promo-burst" aria-hidden="true">{Array.from({length:10},(_,i)=><i key={i} style={{'--i':i}}/>)}</span>
      <AnimatedSticker slot="success" className="promo-duck is-success" fallback={<span className={'promo-reward-icon is-'+info.icon}>{info.icon==='stars'?<img src={telegramStar} alt=""/>:<Icon name={info.icon}/>}</span>}/>
      <p className="promo-eyebrow"><Icon name="check"/>{t('Code applied')}</p>
      <h2 id="promo-title">{info.title}</h2>
      <p className="promo-detail">{info.detail}</p>
      <div className="promo-actions">
        {result.reward.kind==='discount'&&onUseDiscount&&<button type="button" className="promo-primary" onClick={()=>onUseDiscount(result.reward.scope)}>{t('Use it now')}</button>}
        <button type="button" className={result.reward.kind==='discount'&&onUseDiscount?'promo-secondary':'promo-primary'} onClick={onClose}>{t('Done')}</button>
      </div>
    </div>:<form className="promo-form" onSubmit={submit} noValidate>
      <AnimatedSticker slot="promo" className="promo-duck" fallback={<span className="promo-hero" aria-hidden="true"><Icon name="gift"/></span>}/>
      <h2 id="promo-title">{t('Promo code')}</h2>
      <p className="promo-detail">{t('Enter a code to get stars, Premium or a discount.')}</p>
      <div className="promo-field" data-error={error?'':undefined} data-shake={shake%2} key={shake}>
        <input ref={input} type="text" value={code} maxLength={32} autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false} enterKeyHint="go"
          aria-label={t('Promo code')} aria-invalid={!!error} aria-describedby="promo-error" placeholder={t('ENTER CODE')} disabled={busy}
          onChange={event=>{setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,''));if(error)setError('');}}/>
        {code&&!busy&&<button type="button" className="promo-clear" aria-label={t('Clear')} onClick={()=>{setCode('');setError('');input.current?.focus();}}><Icon name="close"/></button>}
      </div>
      <p id="promo-error" className="promo-error" role="alert">{error}</p>
      <button type="submit" className="promo-primary" disabled={!ready} aria-busy={busy}>{busy?<><span className="promo-spinner" aria-hidden="true"/>{t('Checking…')}</>:t('Redeem')}</button>
    </form>}
  </dialog>;
}
