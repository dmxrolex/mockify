import React, { useEffect, useRef, useState } from 'react';
import { t, starCount } from './i18n.js';
import { telegramStar, SubscriptionIcon } from './brand-icons.jsx';
import { PlanIcon } from './purchase-ui.jsx';
import { exportCreditCost, FREE_DRAFT_LIMIT } from './credit-model.js';
import { subscriptionInfo, subscriptionDate } from './subscription-model.js';
import { switchPanel } from './ui-motion.js';
import { hapticSelection } from './haptics.js';
import TermsSheet from './terms-sheet.jsx';
import './settings-page.css';

const paths={
  language:'M3 5h12M9 3v2M5 5c0 5 4 9 9 11M13 5c0 5-4 9-9 11m10 5 4-10 4 10m-6.5-3h5',
  haptics:'M8 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM3 9v6M21 9v6',
  statusbar:'M4 4h16v16H4ZM4 9h16M7 6.5h3m6 0h1.5',
  look:'M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8ZM7.5 11.5h.01M10 7.5h.01M15 7.5h.01',
  support:'M4 14v-3a8 8 0 0 1 16 0v3M4 11H2v7h5v-7Zm16 0h2v7h-5v-7Zm0 7v1a2 2 0 0 1-2 2h-5',
  share:'M12 15V3m0 0L8 7m4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7',
  terms:'M6 3h9l4 4v14H5V3Zm8 0v5h5M8 12h8m-8 4h6',
  costs:'M12 3v18M17 7.5C17 5.6 14.8 4 12 4S7 5.6 7 7.5 9.2 11 12 11.5s5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5',
  next:'m9 5 7 7-7 7',back:'m15 5-7 7 7 7',check:'m5 12 5 5 9-10',person:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
};
function Glyph({name}){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]}/></svg>;}
const languages=[['en','English','English'],['ru','Русский','Russian']];

function Row({icon,label,value,onClick,href,disabled,children,className=''}){
  const content=<><span className={'ios-setting-icon setting-'+icon}><Glyph name={icon}/></span><span className="settings-row-label">{t(label)}</span>{value!=null&&<span className="ios-setting-value">{value}</span>}{children??((onClick||href)&&<span className="settings-chevron"><Glyph name="next"/></span>)}</>;
  if(href)return <a className={'ios-setting-row settings-row '+className} href={href} onClick={onClick} aria-disabled={disabled||undefined}>{content}</a>;
  return <button type="button" className={'ios-setting-row settings-row '+className} onClick={onClick} disabled={disabled}>{content}</button>;
}
function Toggle({icon,label,caption,checked,onChange,disabled=false}){
  return <label className="ios-setting-row settings-row settings-toggle" data-disabled={disabled||undefined}><span className={'ios-setting-icon setting-'+icon}><Glyph name={icon}/></span>
    <span className="settings-row-label">{t(label)}{caption&&<small>{t(caption)}</small>}</span>
    <input type="checkbox" switch="" role="switch" disabled={disabled} checked={checked} onChange={event=>{hapticSelection();onChange(event.target.checked);}}/></label>;
}

export default function SettingsPage({preferences,update,onBalance,onSubscription,profile,botUsername,draftCount=0}) {
  const [view,setView]=useState('main'),[terms,setTerms]=useState(false),[costs,setCosts]=useState(false),root=useRef(null);
  useEffect(()=>{if(!('switch' in HTMLInputElement.prototype))import('input-switch-polyfill').catch(()=>{});},[]);
  const status=subscriptionInfo(profile?.subscription),premium=status.active,balance=profile?.credits??0;
  const name=[profile?.firstName,profile?.lastName].filter(value=>typeof value==='string'&&value.trim()).join(' ')||t('Guest');
  const lang=document.documentElement.lang||'en';
  const app=window.Telegram?.WebApp;
  function go(next){switchPanel(root.current,()=>setView(next)).then(()=>root.current?.querySelector(next==='main'?'.settings-language-link':'.settings-subpage-back')?.focus({preventScroll:true}));}
  function openTelegram(event,href){if(app?.initData&&typeof app.openTelegramLink==='function'){event.preventDefault();app.openTelegramLink(href);}}
  const shareHref=botUsername?'https://t.me/share/url?url='+encodeURIComponent('https://t.me/'+botUsername)+'&text='+encodeURIComponent(t('Turn screenshots into beautiful mockups right in Telegram.')):undefined;
  const drafts=premium?null:Math.min(draftCount,FREE_DRAFT_LIMIT);
  const costRows=[['photo','Photo export',starCount(exportCreditCost('photo'))],['video','Video export',starCount(exportCreditCost('video'))],['quality','High quality',starCount(exportCreditCost('photo','high')-exportCreditCost('photo'),'+')]];
  return <section ref={root} className="page app-settings" aria-label={t('Settings')}>
    {view==='language'?<div className="settings-subpage">
      <header className="settings-subpage-heading">
        <button type="button" className="round-action settings-subpage-back" aria-label={t('Back to Settings')} onClick={()=>go('main')}><Glyph name="back"/></button>
        <h1>{t('Language')}</h1>
      </header>
      <div className="ios-settings-group settings-group" role="radiogroup" aria-label={t('Language')}>
        {languages.map(([value,native,english])=><button key={value} type="button" role="radio" aria-checked={preferences.language===value} className="ios-setting-row settings-row settings-language-option" lang={value} onClick={()=>{hapticSelection();update({language:value});}}>
          <span className="settings-row-label">{native}{native!==english&&<small lang="en">{english}</small>}</span>
          <span className="settings-check"><Glyph name="check"/></span>
        </button>)}
      </div>
      <p className="settings-footnote">{t('The app, prices and Terms switch language instantly. Your designs are not changed.')}</p>
    </div>:<>
      <div className="settings-profile">
        <span className="settings-avatar">{profile?.photoUrl?<img src={profile.photoUrl} alt="" referrerPolicy="no-referrer"/>:<Glyph name="person"/>}</span>
        <div className="settings-identity"><strong>{name}</strong><span>{profile?.username?'@'+profile.username:t('Telegram account')}</span></div>
        <span className={'settings-plan-badge'+(premium?' is-premium':'')}>{t(premium?'Premium':'Free')}</span>
      </div>
      <div className="settings-cards">
        <button type="button" className="settings-card settings-card-stars" onClick={onBalance}>
          <img src={telegramStar} width="30" height="30" alt=""/>
          <strong>{balance.toLocaleString(lang)}</strong>
          <span>{t('Stars balance')}</span>
          <em>{t('Top up')}</em>
        </button>
        <button type="button" className={'settings-card settings-card-premium'+(premium?' is-active':'')} onClick={onSubscription}>
          <span className="settings-card-emblem"><SubscriptionIcon/></span>
          <strong>{t(premium?'Premium':'Go Premium')}</strong>
          <span>{premium?t('Until {date}').replace('{date}',subscriptionDate(status.expiresAt,lang)):t('Unlimited exports')}</span>
          <em>{t(premium?'Extend':'See plans')}</em>
        </button>
      </div>

      <h2 className="account-section-label">{t('Preferences')}</h2>
      <div className="ios-settings-group settings-group">
        <Row icon="language" className="settings-language-link" label="Language" value={languages.find(([value])=>value===preferences.language)?.[1]} onClick={()=>go('language')}/>
        <Toggle icon="haptics" label="Haptic feedback" caption="Subtle taps on dials, wheels and choices" checked={preferences.haptics!==false} onChange={haptics=>update({haptics})}/>
        <Toggle icon="statusbar" label="Clean status bar" caption="New screenshots get a tidy iOS status bar" checked={preferences.cleanup!=='off'} onChange={on=>update({cleanup:on?'auto':'off'})}/>
      </div>

      <h2 className="account-section-label">{t('Usage')}</h2>
      <div className="ios-settings-group settings-group">
        <div className="ios-setting-row settings-row settings-usage">
          <PlanIcon name="drafts"/>
          <span className="settings-row-label">{t('Saved drafts')}<small>{premium?t('Unlimited with Premium'):t('{used} of {limit} on the free plan').replace('{used}',drafts).replace('{limit}',FREE_DRAFT_LIMIT)}</small></span>
          {!premium&&<span className="settings-meter" role="meter" aria-label={t('Saved drafts')} aria-valuemin={0} aria-valuemax={FREE_DRAFT_LIMIT} aria-valuenow={drafts}><i style={{inlineSize:drafts/FREE_DRAFT_LIMIT*100+'%'}}/></span>}
        </div>
        <button type="button" className="ios-setting-row settings-row" aria-expanded={costs} onClick={()=>setCosts(!costs)}>
          <span className="ios-setting-icon setting-costs"><Glyph name="costs"/></span><span className="settings-row-label">{t('Export costs')}<small>{premium?t('Free with your Premium'):t('Paid per export in stars')}</small></span>
          <span className="ios-setting-value">{premium?t('No charge'):t('From {price}').replace('{price}',starCount(exportCreditCost('photo')))}</span><span className="settings-chevron settings-disclosure"><Glyph name="next"/></span>
        </button>
        <div className="settings-costs" data-open={costs} inert={costs?undefined:''}><div>
          {costRows.map(([icon,label,value])=><div key={icon} className="ios-setting-row settings-row settings-cost"><PlanIcon name={icon}/><span className="settings-row-label">{t(label)}</span><span className="ios-setting-value">{premium?<><s className="settings-cost-was">{value}</s> <b className="settings-cost-free">{t('No charge')}</b></>:value}</span></div>)}
        </div></div>
      </div>

      <h2 className="account-section-label">{t('Help')}</h2>
      <div className="ios-settings-group settings-group">
        <Row icon="support" label="Contact support" href="https://t.me/DMX_ROLEX" onClick={event=>openTelegram(event,'https://t.me/DMX_ROLEX')}/>
        <Row icon="share" label="Share Mockify" href={shareHref} disabled={!shareHref} onClick={event=>{if(!shareHref){event.preventDefault();return;}openTelegram(event,shareHref);}}/>
        <Row icon="terms" label="Terms & Privacy" onClick={()=>setTerms(true)}/>
      </div>
    </>}
    <TermsSheet open={terms} onClose={()=>setTerms(false)}/>
  </section>;
}
