import React,{useId,useLayoutEffect,useRef,useState} from 'react';
import CoinMotion from './coin-motion.jsx';
import PremiumEmblem from './premium-emblem.jsx';
import {monthUnit} from './subscription-model.js';
import {telegramStar} from './brand-icons.jsx';
import {accountRequest} from './account-client.js';
import {t} from './i18n.js';
import './credits-ui.css';
// With Premium, exports cost nothing: say so plainly instead of a star price.
export function CreditAmount({value,included=false,freeLabel='No charge'}){return <span className="credit-cost">{included?<span className="credit-free">{t(freeLabel)}</span>:<><img src={telegramStar} alt="" width="21" height="21"/><strong>{value}</strong><span className="visually-hidden">{t('stars')}</span></>}</span>;}
function CreditSheet({children,title,onClose,locked=false,className=''}){
  const ref=useRef(null),id=useId();
  useLayoutEffect(()=>{const element=ref.current;element.showModal();return()=>{if(element.open)element.close();};},[]);
  return <dialog ref={ref} className={'credits-sheet '+className} aria-labelledby={id} closedby={locked?'none':'closerequest'} onCancel={event=>{if(locked){event.preventDefault();return;}onClose?.();}} onClose={()=>{if(!locked)onClose?.();}}><span className="credit-sheet-grabber" aria-hidden="true"/>{children(id)}</dialog>;
}
export function WelcomeCredits({telegram,onClaim}){
  const [pending,setPending]=useState(false),[error,setError]=useState('');
  async function claim(){if(pending)return;setPending(true);setError('');try{const account=await accountRequest(telegram,'/api/welcome/claim');if(!account.welcomeClaimed)throw new Error('Reopen the app from Telegram to claim your stars.');onClaim(account);}catch(error){setError(error.message);}finally{setPending(false);}}
  return <CreditSheet locked className="welcome-credits">{id=><><div className="welcome-art" aria-hidden="true" inert=""><CoinMotion/></div><h1 id={id}>{t('30 stars, on us')}</h1><button type="button" className="credit-primary" autoFocus disabled={pending} aria-busy={pending} onClick={claim}>{pending?t('Claiming…'):t('Claim 30 stars')}</button>{error&&<p role="alert" className="credit-error">{error}</p>}</>}</CreditSheet>;
}
export function DraftLimitSheet({onClose,onPremium,onManage}){
  return <CreditSheet onClose={onClose} className="draft-limit-sheet">{id=><><div className="draft-limit-art" aria-hidden="true"><svg viewBox="0 0 120 100"><rect x="24" y="12" width="76" height="67" rx="13" fill="#8473dd" transform="rotate(9 62 45)"/><rect x="14" y="19" width="78" height="64" rx="12" fill="#4b9ded" transform="rotate(-6 52 50)"/><path d="M11 38a11 11 0 0 1 11-11h21l9 9h46v48a11 11 0 0 1-11 11H22A11 11 0 0 1 11 84Z" fill="#efd078"/><path d="M45 56h24v21H45Z" fill="#d2a94a" opacity=".5"/><path d="m52 61 12 6-12 6Z" fill="#fff4cf"/></svg></div><h1 id={id}>{t('Draft limit reached')}</h1><p>{t('Your free plan includes 5 saved drafts.')}</p><button type="button" className="credit-primary" onClick={onPremium}>{t('Get Premium')}</button><button type="button" className="credit-secondary" onClick={onManage}>{t('Manage files')}</button><button type="button" className="credit-dismiss" autoFocus onClick={onClose}>{t('Keep editing')}</button></>}</CreditSheet>;
}

export function PurchaseSuccessSheet({purchase,onClose}) {
  const credits=purchase.kind==='credits';
  return <CreditSheet onClose={onClose} className="purchase-success-sheet">{id=><>
    <div className="purchase-success-art" aria-hidden="true">
      {credits?<CoinMotion/>:<div className="success-premium"><PremiumEmblem/></div>}
      <span className="purchase-confetti">{Array.from({length:8},(_,i)=><i key={i} style={{'--piece':i}}/>)}</span>
    </div>
    <h1 id={id}>{credits?'+'+purchase.amount:t('Premium activated')}</h1>
    <p>{credits?t('stars added to your balance'):purchase.months+' '+monthUnit(purchase.months,document.documentElement.lang)}</p>
    <button type="button" className="credit-primary" autoFocus onClick={onClose}>{t('Go back')}</button>
  </>}</CreditSheet>;
}
