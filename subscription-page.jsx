import React, { useEffect, useState } from 'react';
import PremiumEmblem from './premium-emblem.jsx';
import { subscriptionOffers, subscriptionInfo, subscriptionDate, monthUnit } from './subscription-model.js';
import { PurchasePage, PurchaseOptions, PlanIcon } from './purchase-ui.jsx';
import { t } from './i18n.js';
import './subscription-page.css';

const options = subscriptionOffers.map(offer=>({...offer,id:'premium-'+offer.months}));
const features = [
  ['photo','Unlimited photos'],
  ['video','Unlimited videos'],
  ['quality','Higher quality exports'],
  ['drafts','Unlimited drafts'],
];

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
      {subscriptionDate(status.expiresAt,document.documentElement.lang)}
    </time>}
  </div>;
}

export default function SubscriptionPage({ subscription,payment,onSelection }) {
  const status = useSubscription(subscription);
  const [selected,setSelected] = useState(options[0].id);
  const offer = options.find(item=>item.id===selected);
  return <PurchasePage className="subscription-page" label="My subscription" payment={payment} product={offer}
    action={t(status.active?'Extend Premium':'Get Premium')+' \u00b7 '+offer.months+' '+monthUnit(offer.months,document.documentElement.lang)} note="By subscribing, you agree to our Terms of Service.">
    <div className="purchase-hero subscription-hero">
      <div className="purchase-hero-copy">
        <h1>{t('Mockify Premium')}</h1>
      </div>
      <div className="premium-hero-details"><div className="premium-hero-mark" aria-hidden="true"><PremiumEmblem/></div><SubscriptionStatus subscription={subscription}/></div>
    </div>

    <PurchaseOptions title="Choose a duration" options={options} selected={selected}
      disabled={Boolean(payment?.pending)} onSelect={id=>{setSelected(id);onSelection?.();}}
      renderOption={item=><>
        <span className="purchase-option-amount">{item.months}</span>
        <span className="purchase-option-unit">{monthUnit(item.months,document.documentElement.lang)}</span>
      </>}/>

    <section aria-labelledby="premium-includes">
      <h2 id="premium-includes" className="account-section-label">{t('Included with Premium')}</h2>
      <div className="account-rows ios-settings-group subscription-features">
        {features.map(([icon,label])=><div key={icon} className="ios-setting-row">
          <PlanIcon name={icon}/><span>{t(label)}</span>
        </div>)}
      </div>
    </section>
  </PurchasePage>;
}
