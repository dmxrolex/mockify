import React, { useState } from 'react';
import CoinMotion from './coin-motion.jsx';
import { SubscriptionIcon } from './brand-icons.jsx';
import { subscriptionOffers } from './subscription-model.js';
import { creditPacks, exportCreditCost } from './credit-model.js';
import { PurchasePage, PurchaseOptions, PlanIcon, StarPrice } from './purchase-ui.jsx';
import { t, starCount } from './i18n.js';
import './balance-page.css';

const creditUses = [
  ['photo','Photo export',exportCreditCost('photo')],
  ['video','Video export',exportCreditCost('video')],
  ['quality','High quality',exportCreditCost('photo','high')-exportCreditCost('photo'),'+'],
];

export default function BalancePage({ onSubscription, balance=0, premium=false, payment, onSelection }) {
  const [selected,setSelected] = useState(creditPacks[0].id);
  const pack = creditPacks.find(option => option.id === selected);
  const formattedBalance = balance.toLocaleString(document.documentElement.lang);
  return <PurchasePage className="balance-page" label="My balance" payment={payment} product={pack}
    action={t('Buy {amount} stars').replace('{amount}',pack.credits-(pack.bonus??0))} note="By purchasing, you agree to our Terms of Service.">
    <div className="purchase-hero balance-hero">
      <div className="purchase-hero-copy">
        <h1 className="balance-total"><strong>{formattedBalance}</strong> <span>{t('stars')}</span></h1>
      </div>
      <CoinMotion/>
    </div>

    <section aria-labelledby="credit-uses">
      <h2 id="credit-uses" className="account-section-label">{t('Export costs')}</h2>
      <ul className="balance-features account-rows ios-settings-group">
        {creditUses.map(([name,label,cost,prefix='']) => <li key={name} className="ios-setting-row">
          <PlanIcon name={name}/><span>{t(label)}</span>
          <span className="ios-setting-value">{premium?t('Included'):starCount(cost,prefix)}</span>
        </li>)}
      </ul>
    </section>

    <div className="credit-chooser">
      <PurchaseOptions title="Choose a star pack" options={creditPacks} selected={selected}
        disabled={Boolean(payment?.pending)} onSelect={id=>{setSelected(id);onSelection?.();}}
        renderOption={option=><>
          <span className="purchase-option-amount">{option.credits-(option.bonus??0)}</span>
          {option.bonus&&<span className="credit-bonus-ribbon">+{option.bonus}<span className="visually-hidden"> {t('bonus stars')}</span></span>}
          <span className="purchase-option-unit">{t('stars')}</span>
        </>}/>

    </div>

    <button type="button" className="unlimited-offer" onClick={onSubscription}>
      <span className="unlimited-icon"><SubscriptionIcon animated/></span>
      <span className="unlimited-copy"><strong>{t('Mockify Premium')}</strong><span>{t('1 month')} <StarPrice stars={subscriptionOffers[0].stars}/></span></span>
      <svg className="offer-next" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>
    </button>
  </PurchasePage>;
}
