import React, { useId, useState } from 'react';
import TermsSheet from './terms-sheet.jsx';
import { TelegramStar } from './brand-icons.jsx';
import { t } from './i18n.js';
import './purchase-ui.css';

export function StarPrice({ stars }) {
  return <span className="star-price">
    <TelegramStar/><strong>{stars}</strong><span className="visually-hidden">{t('Telegram Stars')}</span>
  </span>;
}

export function PurchaseOptions({ title, options, selected, onSelect, disabled, renderOption }) {
  const name = useId();
  return <fieldset className="purchase-options" disabled={disabled}>
    <legend className="account-section-label">{t(title)}</legend>
    <div className="purchase-option-grid">
      {options.map(option => <label key={option.id} className="purchase-option">
        <input type="radio" className="visually-hidden" name={name}
          value={option.id} checked={selected === option.id} onChange={() => onSelect(option.id)}/>
        <span className="purchase-option-face">
          <span className="purchase-check" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m4 8 2.5 2.5L12 5"/></svg></span>
          {renderOption(option)}
          <StarPrice stars={option.stars}/>
        </span>
      </label>)}
    </div>
  </fieldset>;
}

export function PurchasePage({ className, label, children, payment, product, action, note }) {
  const pending = Boolean(payment?.pending);
  const activity = t(payment?.pending === 'confirming' ? 'Confirming payment…'
    : payment?.pending === 'telegram' ? 'Continue in Telegram…' : 'Opening Telegram…');
  const activityLabel = t(payment?.pending === 'confirming' ? 'Confirming…'
    : payment?.pending === 'telegram' ? 'In Telegram…' : 'Opening…');
  const message = pending ? '' : payment?.message;
  const [terms,setTerms] = useState(false);
  // "Terms of Service" inside the note opens the in-app Terms overlay.
  const link = document.documentElement.lang==='ru' ? 'Условиями использования' : 'Terms of Service';
  const [before,after=''] = t(note).split(link);
  return <section className={'page purchase-page '+className} aria-label={t(label)}>
    <div className="purchase-scroll"><div className="purchase-body">{children}</div></div>
    <footer className="purchase-footer">
      <div className="purchase-footer-inner">
        <div className="purchase-notice" role="status" aria-atomic="true" data-error={payment?.error||undefined}>{message && t(message)}</div>
        <div className="purchase-action-row" data-pending={pending}>
          <button type="button" className="purchase-submit" disabled={pending} aria-busy={pending}
            onClick={() => payment?.buy(product.id)}>
            <span>{pending ? activityLabel : action}</span><StarPrice stars={product.stars}/>
          </button>
          {pending&&<progress className="checkout-spinner" aria-label={activity}/>}
        </div>
        <button type="button" className="purchase-terms" onClick={()=>setTerms(true)}>{before}<u>{link}</u>{after}</button>
        <TermsSheet open={terms} onClose={()=>setTerms(false)}/>
      </div>
    </footer>
  </section>;
}

const icons = {
  photo: <><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="16" cy="8" r="1.5"/><path d="m3 15 5-5 7 7 3-3 3 3"/></>,
  video: <><rect x="3" y="5" width="12" height="14" rx="3"/><path d="m15 10 6-4v12l-6-4"/></>,
  quality: <><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9v6m4-6v6m-4-3h4m4-3v6h2a3 3 0 0 0 0-6Z"/></>,
  drafts: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>,
};

export function PlanIcon({ name }) {
  return <span className={'ios-setting-icon plan-icon plan-icon-'+name}><svg viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg></span>;
}
