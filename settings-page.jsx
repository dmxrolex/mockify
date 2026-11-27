import React, { useEffect } from 'react';
import { t } from './i18n.js';
import { telegramStar, SubscriptionIcon } from './brand-icons.jsx';
import { PlanIcon } from './purchase-ui.jsx';
import { exportCreditCost, FREE_DRAFT_LIMIT } from './credit-model.js';
import './settings-page.css';

function Glyph({name}) {
  const paths={balance:'M4 7h15a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13v3M21 11h-6v4h6',subscription:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z',language:'M3 5h12M9 3v2M5 5c0 5 4 9 9 11M13 5c0 5-4 9-9 11m10 5 4-10 4 10m-6.5-3h5',sound:'M10 5 5 9H2v6h3l5 4ZM14 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',support:'M4 14v-3a8 8 0 0 1 16 0v3M4 11H2v7h5v-7Zm16 0h2v7h-5v-7Zm0 7v1a2 2 0 0 1-2 2h-5',terms:'M6 3h9l4 4v14H5V3Zm8 0v5h5M8 12h8m-8 4h6'};
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]}/></svg>;
}

export default function SettingsPage({preferences,update,onBalance,onSubscription,subscriptionActive=false,balance=0,draftCount=0}) {
  useEffect(()=>{if(!('switch' in HTMLInputElement.prototype))import('input-switch-polyfill').catch(()=>{});},[]);
  function openSupport(event) {
    const app = window.Telegram?.WebApp;
    if (app?.initData && typeof app.openTelegramLink === 'function') {
      event.preventDefault();
      app.openTelegramLink(event.currentTarget.href);
    }
  }
  const plan = [
    ['photo','Photo export',exportCreditCost('photo')+' stars'],
    ['video','Video export',exportCreditCost('video')+' stars'],
    ['quality','High quality','+'+(exportCreditCost('photo','high')-exportCreditCost('photo'))+' stars'],
    ['drafts','Saved drafts',draftCount+' / '+FREE_DRAFT_LIMIT],
  ];
  const item=(icon,label,value)=><button type="button" onClick={icon==='balance'?onBalance:onSubscription} className="ios-setting-row account-setting"><span className={'ios-setting-icon setting-'+icon}>{icon==='balance'?<img src={telegramStar} width="33" height="33" alt=""/>:icon==='subscription'?<SubscriptionIcon/>:<Glyph name={icon}/>}</span><span>{t(label)}</span>{value&&<span className="ios-setting-value">{value}</span>}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>;
  return <section className="page app-settings" aria-label={t('Settings')}>
    <h1 className="settings-title">{t('Settings')}</h1>
    <div className="account-rows ios-settings-group" role="group" aria-label={t('Account')}>
      {item('balance','My balance',balance.toLocaleString(document.documentElement.lang)+' '+t('stars'))}
      {item('subscription','My subscription',t(subscriptionActive?'Active':'Free'))}
    </div>
    <div className="account-rows ios-settings-group" role="group" aria-label={t('Preferences')}>
      <div className="ios-setting-row language-setting"><span className="ios-setting-icon setting-language"><Glyph name="language"/></span><span id="settings-language">{t('Language')}</span><div className="language-options" style={{'--language-index':preferences.language==='ru'?1:0}} role="radiogroup" aria-labelledby="settings-language">{[['en','English'],['ru','Русский']].map(([value,label])=><label key={value}><input type="radio" name="app-language" value={value} checked={preferences.language===value} onPointerDown={e=>e.currentTarget.dataset.pointerFocus='true'} onKeyDown={e=>{delete e.currentTarget.dataset.pointerFocus;}} onBlur={e=>{delete e.currentTarget.dataset.pointerFocus;}} onChange={()=>update({language:value})}/><span lang={value}>{label}</span></label>)}</div></div>
      <label className="ios-setting-row sound-setting"><span className="ios-setting-icon setting-sound"><Glyph name="sound"/></span><span>{t('Sound')}</span><input type="checkbox" switch="" role="switch" checked={preferences.sound} onChange={event=>update({sound:event.target.checked})}/></label>
      <a className="ios-setting-row support-setting" href="https://t.me/DMX_ROLEX" onClick={openSupport}><span className="ios-setting-icon setting-support"><Glyph name="support"/></span><span>{t('Support')}</span><svg className="support-next" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></a>
    </div>
    <section className="settings-plan" aria-labelledby="settings-plan">
      <h2 id="settings-plan" className="account-section-label">{t('Your plan')}</h2>
      <div className="account-rows ios-settings-group">
        {plan.map(([icon,label,value])=><div key={icon} className="ios-setting-row">
          <PlanIcon name={icon}/><span>{t(label)}</span>
          <span className="ios-setting-value">{t(subscriptionActive?(icon==='drafts'?'Unlimited':'Included'):value)}</span>
        </div>)}
      </div>
    </section>
    <div className="account-rows ios-settings-group"><button type="button" className="ios-setting-row placeholder-setting" aria-disabled="true"><span className="ios-setting-icon setting-terms"><Glyph name="terms"/></span><span>{t('Terms of Service')}</span></button></div>
  </section>;
}
