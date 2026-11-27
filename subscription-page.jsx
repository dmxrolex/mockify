import React, { useEffect, useState } from 'react';
import PremiumEmblem from './premium-emblem.jsx';
import { subscriptionOffers, subscriptionInfo, subscriptionDate, monthUnit } from './subscription-model.js';
import { PurchasePage, PurchaseOptions, PlanIcon } from './purchase-ui.jsx';
import { exportCreditCost, FREE_DRAFT_LIMIT } from './credit-model.js';
import { t } from './i18n.js';
import './subscription-page.css';

const base=subscriptionOffers[0].stars/subscriptionOffers[0].months;
const options=subscriptionOffers.map(offer=>({...offer,id:'premium-'+offer.months,perMonth:offer.stars/offer.months,save:Math.round((1-offer.stars/offer.months/base)*100)}));
const number=(value,digits=0)=>value.toLocaleString(document.documentElement.lang,{maximumFractionDigits:digits});
const compare=[
  ['photo','Photo export',()=>number(exportCreditCost('photo'),1)+' ★'],
  ['video','Video export',()=>number(exportCreditCost('video'),1)+' ★'],
  ['quality','High quality',()=>'+'+number(exportCreditCost('photo','high')-exportCreditCost('photo'),1)+' ★'],
  ['drafts','Saved drafts',()=>String(FREE_DRAFT_LIMIT)],
];
const billing=[
  ['once','One-time payment','Paid with Telegram Stars'],
  ['renew','No auto-renewal','Nothing is charged later'],
  ['stack','Time adds up','Extending adds to your current plan'],
];
const billingIcons={
  once:<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>,
  renew:<><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.6M20 4v4.6h-4.6"/><path d="m4 20 16-16" opacity=".9"/></>,
  stack:<><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8m-4-4h8"/></>,
};

function useSubscription(subscription) {
  const [now,setNow] = useState(Date.now);
  useEffect(()=>{
    const timer = setInterval(()=>setNow(Date.now()),30000);
    return ()=>clearInterval(timer);
  },[]);
  return subscriptionInfo(subscription,now);
}

export function SubscriptionStatus({ subscription }) {
  const status = useSubscription(subscription);
  return <div className={'subscription-status'+(status.active?' is-active':'')} role="status">
    <i aria-hidden="true"/><span>{t(status.active?'Active':'Not active')}</span>
    {status.active&&<time dateTime={new Date(status.expiresAt).toISOString()}>
      {t('until')} {subscriptionDate(status.expiresAt,document.documentElement.lang)}
    </time>}
  </div>;
}

export default function SubscriptionPage({ subscription,payment,onSelection }) {
  const status = useSubscription(subscription);
  const [selected,setSelected] = useState(options[0].id);
  const offer = options.find(item=>item.id===selected);
  const lang=document.documentElement.lang;
  return <PurchasePage className="subscription-page" label="My subscription" payment={payment} product={offer}
    action={t(status.active?'Extend Premium':'Get Premium')+' · '+offer.months+' '+monthUnit(offer.months,lang)} note="By subscribing, you agree to our Terms of Service.">
    <div className="premium-hero">
      <span className="premium-hero-glow" aria-hidden="true"/>
      <span className="premium-sparkles" aria-hidden="true">{Array.from({length:7},(_,i)=><i key={i} style={{'--i':i}}/>)}</span>
      <div className="premium-hero-mark" aria-hidden="true"><PremiumEmblem/></div>
      <h1>{t('Mockify Premium')}</h1>
      <p>{t('Export without limits. No stars spent, ever.')}</p>
      <SubscriptionStatus subscription={subscription}/>
    </div>

    <PurchaseOptions title="Choose a duration" options={options} selected={selected}
      disabled={Boolean(payment?.pending)} onSelect={id=>{setSelected(id);onSelection?.();}}
      renderOption={item=><>
        <span className="purchase-option-amount">{item.months}</span>
        <span className="purchase-option-unit">{monthUnit(item.months,lang)}</span>
        {item.save>0&&<span className="premium-save"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .5c.5 3 2 4.5 5.5 5.5C8 7 6.5 8.5 6 11.5 5.5 8.5 4 7 .5 6 4 5 5.5 3.5 6 .5Z"/></svg>{t('Save {percent}%').replace('{percent}',item.save)}</span>}
      </>}/>

    <section aria-labelledby="premium-compare">
      <h2 id="premium-compare" className="account-section-label">{t('Free vs Premium')}</h2>
      <div className="premium-compare" role="table" aria-labelledby="premium-compare">
        <div className="premium-compare-head" role="row"><span role="columnheader"/><span role="columnheader">{t('Free')}</span><span role="columnheader" className="is-premium">{t('Premium')}</span></div>
        {compare.map(([icon,label,free])=><div key={icon} className="premium-compare-row" role="row">
          <span role="rowheader"><PlanIcon name={icon}/>{t(label)}</span>
          <span role="cell" className="premium-free">{free()}</span>
          <span role="cell" className="premium-plus">{icon==='quality'?<svg viewBox="0 0 24 24" aria-label={t('Included')}><path d="m5 12 5 5 9-10"/></svg>:<b aria-label={t('Unlimited')}>∞</b>}</span>
        </div>)}
      </div>
    </section>

    <ul className="premium-billing" aria-label={t('Billing')}>
      {billing.map(([icon,title,text])=><li key={icon}><span><svg viewBox="0 0 24 24" aria-hidden="true">{billingIcons[icon]}</svg></span><div><strong>{t(title)}</strong><small>{t(text)}</small></div></li>)}
    </ul>
  </PurchasePage>;
}
