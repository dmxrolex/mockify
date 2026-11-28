// Owner dashboard (loaded only for the owner): users, Premium, purchases and promo codes.
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {adminCall} from './promo-client.js';
import {PROMO_LIMITS} from './promo-model.js';
import {telegramStar} from './brand-icons.jsx';
import './admin-page.css';

const icons={
  back:'m15 5-7 7 7 7',refresh:'M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5',plus:'M12 5v14M5 12h14',search:'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4',
  copy:'M9 9h10v11H9ZM5 15V4h10',pause:'M8 5v14m8-14v14',play:'M7 5v14l12-7Z',trash:'M4.5 6.5h15M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5m-8 0 .8 12.1A2 2 0 0 0 9.3 20.5h5.4a2 2 0 0 0 2-1.9l.8-12.1',
  dice:'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm3.5 4.5h.01m7 0h.01M12 12h.01m-3.5 3.5h.01m7 0h.01',close:'M6 6l12 12M18 6 6 18',
};
const Icon=({name})=><svg viewBox="0 0 24 24" aria-hidden="true"><path d={icons[name]}/></svg>;
const haptic=()=>{try{window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();}catch{}};
const ago=time=>{if(!time)return '—';const s=(Date.now()-time)/1000,f=new Intl.RelativeTimeFormat('en',{numeric:'auto',style:'short'});
  return s<60?'now':s<3600?f.format(-Math.round(s/60),'minute'):s<86400?f.format(-Math.round(s/3600),'hour'):s<86400*30?f.format(-Math.round(s/86400),'day'):new Date(time).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'});};
const date=time=>new Date(time).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const num=value=>Number(value||0).toLocaleString('en');
const stars=value=><span className="admin-stars"><img src={telegramStar} alt=""/>{num(value)}</span>;
const reward=p=>p.kind==='stars'?`+${p.amount} stars`:p.kind==='premium'?`${p.amount} days Premium`:`${p.amount}% off ${p.scope==='all'?'any purchase':p.scope==='premium'?'Premium':'star packs'}`;
function promoStatus(p){if(!p.active)return ['Paused','is-paused'];if(p.expiresAt&&p.expiresAt<=Date.now())return ['Expired','is-ended'];if(p.maxUses!=null&&p.uses>=p.maxUses)return ['Used up','is-ended'];return ['Active','is-live'];}

function Avatar({user}){
  const [failed,setFailed]=useState(false),initials=(user.name||'?').split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase();
  const hue=[...String(user.id??user.userId)].reduce((sum,char)=>sum+char.charCodeAt(0),0)%360;
  return <span className="admin-avatar" style={{'--hue':hue}}>{user.photo&&!failed?<img src={user.photo} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:initials}</span>;
}
function openProfile(user){if(!user.username)return;const url='https://t.me/'+user.username,app=window.Telegram?.WebApp;if(app?.openTelegramLink)app.openTelegramLink(url);else window.open(url,'_blank','noopener');}
function UserRow({user}){
  const premium=user.premiumUntil&&user.premiumUntil>Date.now();
  return <li><button type="button" className="admin-row" onClick={()=>openProfile(user)} disabled={!user.username}>
    <Avatar user={user}/>
    <span className="admin-row-main"><strong>{user.name}{user.telegramPremium&&<i className="admin-tg-premium" title="Telegram Premium">★</i>}</strong><small>{user.username?'@'+user.username:'id '+user.id} · {user.source==='bot'?'via bot':'via app'}</small></span>
    <span className="admin-row-side">{premium?<b className="admin-pill is-premium">Premium · {date(user.premiumUntil)}</b>:<b className="admin-pill">{num(user.credits)} ★</b>}<small>{ago(user.joinedAt)}</small></span>
  </button></li>;
}

function Overview({data}){
  const t=data.totals,max=Math.max(1,...data.daily.map(day=>day.count));
  const [showAll,setShowAll]=useState(false);
  const tiles=[['Users',num(t.users),`+${num(t.day)} today`],['New · 7 days',num(t.week),`${num(t.bot)} via bot overall`],['Active · 7 days',num(t.active),`${t.users?Math.round(t.active/t.users*100):0}% of users`],['Premium',num(t.premium),'active now'],['Revenue · 7 days',stars(t.revenueWeek),<>{num(t.revenue)} ★ all time</>],['Exports · 7 days',num(t.exports),`${num(t.orders)} paid orders`]];
  return <>
    <div className="admin-tiles">{tiles.map(([label,value,note])=><div key={label} className="admin-tile"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}</div>
    <section className="admin-card"><h3>New users <small>last 7 days</small></h3>
      <div className="admin-chart" role="img" aria-label={'New users per day: '+data.daily.map(day=>day.count).join(', ')}>
        {data.daily.map((day,index)=><div key={day.day} className="admin-bar" data-today={index===6||undefined}><b>{day.count||''}</b><i style={{'--h':day.count/max}}/><span>{new Date(day.day).toLocaleDateString('en-GB',{weekday:'narrow'})}</span></div>)}
      </div>
    </section>
    <section className="admin-card"><h3>Recent purchases <small>{data.payments.length?'latest '+data.payments.length:''}</small></h3>
      {data.payments.length?<ul className="admin-list">{data.payments.map((p,index)=><li key={index}><button type="button" className="admin-row" onClick={()=>openProfile(p)} disabled={!p.username}><Avatar user={p}/>
        <span className="admin-row-main"><strong>{p.name}</strong><small>{p.kind==='premium'?`${p.months} month${p.months>1?'s':''} Premium`:`${num(p.credits)} stars`}{p.promo?' · '+p.promo:''}</small></span>
        <span className="admin-row-side">{stars(p.stars)}<small>{ago(p.paidAt)}</small></span></button></li>)}</ul>:<p className="admin-empty">No purchases yet.</p>}
    </section>
    <section className="admin-card"><h3>Active Premium <small>{num(t.premium)}</small></h3>
      {data.premiumUsers.length?<ul className="admin-list">{(showAll?data.premiumUsers:data.premiumUsers.slice(0,5)).map(user=><UserRow key={user.id} user={user}/>)}</ul>:<p className="admin-empty">No active Premium yet.</p>}
      {!showAll&&data.premiumUsers.length>5&&<button type="button" className="admin-more" onClick={()=>setShowAll(true)}>Show all</button>}
    </section>
    <section className="admin-card"><h3>Newest users</h3><ul className="admin-list">{data.recentUsers.map(user=><UserRow key={user.id} user={user}/>)}</ul></section>
  </>;
}

function Users({telegram}){
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[list,setList]=useState(null),[more,setMore]=useState(false),[error,setError]=useState('');
  const load=useCallback(async(offset=0)=>{setError('');try{const data=await adminCall(telegram,{action:'users',query,filter,offset});setList(prior=>offset?[...(prior??[]),...data.users]:data.users);setMore(data.more);}catch(failure){setError(failure.message);}},[telegram,query,filter]);
  useEffect(()=>{const timer=setTimeout(()=>load(0),query?300:0);return()=>clearTimeout(timer);},[load,query]);
  return <>
    <label className="admin-search"><Icon name="search"/><input type="search" placeholder="Name, @username or ID" value={query} onChange={event=>setQuery(event.target.value)} enterKeyHint="search"/></label>
    <div className="admin-chips" role="radiogroup" aria-label="Filter">{[['all','All'],['premium','Premium'],['bot','Via bot']].map(([key,label])=><button key={key} type="button" role="radio" aria-checked={filter===key} onClick={()=>{haptic();setFilter(key);}}>{label}</button>)}</div>
    {error&&<p className="admin-error" role="alert">{error}</p>}
    {list==null?<div className="admin-skeleton" aria-hidden="true"/>:list.length?<section className="admin-card"><ul className="admin-list">{list.map(user=><UserRow key={user.id} user={user}/>)}</ul>{more&&<button type="button" className="admin-more" onClick={()=>load(list.length)}>Load more</button>}</section>:<p className="admin-empty">No users match.</p>}
  </>;
}

const blank={code:'',kind:'stars',amount:'50',scope:'all',maxUses:'',validDays:'',newUsersOnly:false,note:''};
const unit={stars:'stars',premium:'days',discount:'% off'};
function PromoForm({onCreate,onClose,busy,error}){
  const ref=useRef(null),[form,setForm]=useState(blank),set=patch=>setForm(prior=>({...prior,...patch}));
  useEffect(()=>{const element=ref.current;element.showModal();return()=>{if(element.open)element.close();};},[]);
  const random=()=>set({code:'MOCK-'+Array.from(crypto.getRandomValues(new Uint8Array(5)),byte=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[byte%32]).join('')});
  const [min,max]=PROMO_LIMITS[form.kind];
  return <dialog ref={ref} className="admin-sheet" aria-labelledby="promo-new" onCancel={event=>{event.preventDefault();onClose();}}>
    <header><button type="button" onClick={onClose}>Cancel</button><h2 id="promo-new">New promo code</h2><button type="button" className="is-primary" disabled={busy||form.code.length<3} onClick={()=>onCreate({...form,amount:Number(form.amount)})}>{busy?'Saving…':'Create'}</button></header>
    <div className="admin-form">
      <div className="admin-field admin-code-field"><input aria-label="Code" placeholder="CODE" maxLength={32} autoCapitalize="characters" spellCheck={false} value={form.code} onChange={event=>set({code:event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,'')})}/><button type="button" aria-label="Random code" title="Random code" onClick={random}><Icon name="dice"/></button></div>
      <div className="admin-segment" role="radiogroup" aria-label="Reward">{[['stars','Stars'],['premium','Premium'],['discount','Discount']].map(([key,label])=><button key={key} type="button" role="radio" aria-checked={form.kind===key} onClick={()=>set({kind:key,amount:{stars:'50',premium:'30',discount:'20'}[key]})}>{label}</button>)}</div>
      <div className="admin-group">
        <label className="admin-line"><span>Amount</span><input type="number" inputMode="numeric" min={min} max={max} value={form.amount} onChange={event=>set({amount:event.target.value})}/><em>{unit[form.kind]}</em></label>
        {form.kind==='discount'&&<div className="admin-line"><span>Applies to</span><div className="admin-mini-segment">{[['all','All'],['premium','Premium'],['credits','Stars']].map(([key,label])=><button key={key} type="button" aria-pressed={form.scope===key} onClick={()=>set({scope:key})}>{label}</button>)}</div></div>}
        <label className="admin-line"><span>Max redemptions</span><input type="number" inputMode="numeric" min="1" placeholder="Unlimited" value={form.maxUses} onChange={event=>set({maxUses:event.target.value})}/></label>
        <label className="admin-line"><span>Valid for</span><input type="number" inputMode="numeric" min="1" placeholder="Forever" value={form.validDays} onChange={event=>set({validDays:event.target.value})}/>{form.validDays&&<em>days</em>}</label>
        <label className="admin-line"><span>New accounts only</span><input type="checkbox" role="switch" className="admin-switch" checked={form.newUsersOnly} onChange={event=>set({newUsersOnly:event.target.checked})}/></label>
        <label className="admin-line"><span>Note</span><input placeholder="Optional" maxLength={80} value={form.note} onChange={event=>set({note:event.target.value})}/></label>
      </div>
      <p className="admin-hint">Each account can redeem a code once. {form.kind==='discount'?'The discount is used on the next matching purchase.':form.kind==='premium'?'Days are added after any current Premium.':'Stars are added to the balance right away.'}{form.newUsersOnly?' New accounts: joined in the last 7 days.':''}</p>
      {error&&<p className="admin-error" role="alert">{error}</p>}
    </div>
  </dialog>;
}

function Promos({telegram,initial}){
  const [promos,setPromos]=useState(initial),[creating,setCreating]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(''),[copied,setCopied]=useState('');
  useEffect(()=>setPromos(initial),[initial]);
  async function act(body){setBusy(true);setError('');try{const data=await adminCall(telegram,body);setPromos(data.promos);return true;}catch(failure){setError(failure.message);return false;}finally{setBusy(false);}}
  const copy=code=>{navigator.clipboard?.writeText(code).then(()=>{setCopied(code);setTimeout(()=>setCopied(''),1400);}).catch(()=>{});};
  return <>
    <button type="button" className="admin-new" onClick={()=>{setError('');setCreating(true);}}><Icon name="plus"/>New promo code</button>
    {!creating&&error&&<p className="admin-error" role="alert">{error}</p>}
    {promos.length?<ul className="admin-promos">{promos.map(p=>{const [label,tone]=promoStatus(p);return <li key={p.code} className="admin-promo">
      <div className="admin-promo-top"><button type="button" className="admin-code" onClick={()=>copy(p.code)} aria-label={'Copy '+p.code}>{p.code}<Icon name="copy"/></button><b className={'admin-pill '+tone}>{copied===p.code?'Copied':label}</b></div>
      <p className="admin-promo-reward">{reward(p)}{p.newUsersOnly?' · new accounts':''}</p>
      <div className="admin-progress" aria-label={`${p.uses} of ${p.maxUses??'unlimited'} redeemed`}><i style={{'--p':p.maxUses?Math.min(1,p.uses/p.maxUses):0}}/></div>
      <div className="admin-promo-meta"><span>{num(p.uses)}{p.maxUses!=null?' / '+num(p.maxUses):''} redeemed</span><span>{p.expiresAt?(p.expiresAt>Date.now()?'Until ':'Ended ')+date(p.expiresAt):'No expiry'}</span></div>
      {p.note&&<p className="admin-promo-note">{p.note}</p>}
      <div className="admin-promo-actions">
        <button type="button" disabled={busy} onClick={()=>act({action:'promo.toggle',code:p.code})}><Icon name={p.active?'pause':'play'}/>{p.active?'Pause':'Resume'}</button>
        <button type="button" className="is-danger" disabled={busy} onClick={()=>{if(confirm===p.code){setConfirm('');act({action:'promo.delete',code:p.code});}else setConfirm(p.code);}}><Icon name="trash"/>{confirm===p.code?'Tap to delete':'Delete'}</button>
      </div>
    </li>;})}</ul>:<p className="admin-empty">No promo codes yet. Create one to give stars, Premium or a discount.</p>}
    {creating&&<PromoForm busy={busy} error={error} onClose={()=>setCreating(false)} onCreate={async promo=>{if(await act({action:'promo.create',promo}))setCreating(false);}}/>}
  </>;
}

export default function AdminPage({telegram,onBack}){
  const [tab,setTab]=useState('overview'),[data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  const load=useCallback(async()=>{setLoading(true);setError('');try{setData(await adminCall(telegram,{action:'overview'}));}catch(failure){setError(failure.message);}finally{setLoading(false);}},[telegram]);
  useEffect(()=>{load();},[load]);
  return <div className="admin-page">
    <header className="settings-subpage-heading admin-heading">
      {onBack&&<button type="button" className="round-action settings-subpage-back" aria-label="Back to Settings" onClick={onBack}><Icon name="back"/></button>}
      <h1>Dashboard</h1>
      <button type="button" className="round-action admin-refresh" aria-label="Refresh" data-loading={loading||undefined} onClick={()=>{haptic();load();}}><Icon name="refresh"/></button>
    </header>
    <div className="admin-tabs" role="tablist">{[['overview','Overview'],['users','Users'],['promos','Promos']].map(([key,label])=><button key={key} type="button" role="tab" aria-selected={tab===key} onClick={()=>{haptic();setTab(key);}}>{label}</button>)}</div>
    {error&&<div className="admin-card admin-failed"><p>{error}</p><button type="button" onClick={load}>Try again</button></div>}
    {!data&&!error&&<><div className="admin-tiles">{Array.from({length:6},(_,i)=><div key={i} className="admin-tile admin-skeleton"/>)}</div><div className="admin-skeleton admin-skeleton-tall"/></>}
    {data&&tab==='overview'&&<Overview data={data}/>}
    {data&&tab==='users'&&<Users telegram={telegram}/>}
    {data&&tab==='promos'&&<Promos telegram={telegram} initial={data.promos}/>}
  </div>;
}
