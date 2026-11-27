import React, { useEffect, useId, useRef, useState } from 'react';
import { terms, termsUpdated } from './terms-content.js';
import { dismissBackdrop } from './dialog-dismiss.js';
import './terms-sheet.css';

const icons={
  star:<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>,
  refund:<><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6"/><path d="M4 4v4.6h4.6M12 8v4l2.5 2"/></>,
  lock:<><rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/></>,
  close:<path d="M6 6l12 12M18 6 6 18"/>,
  chevron:<path d="m9 5 7 7-7 7"/>,
};
const Icon=({name})=><svg viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>;

// A compact overlay sheet; the first section starts open, the rest expand on tap.
export default function TermsSheet({ open, onClose }) {
  const dialog=useRef(null),labelId=useId(),[expanded,setExpanded]=useState(0);
  const lang=document.documentElement.lang==='ru'?'ru':'en',copy=terms[lang];
  useEffect(()=>{const element=dialog.current;if(!element)return;if(open&&!element.open){setExpanded(0);element.showModal();}else if(!open&&element.open)element.close();},[open]);
  const date=new Intl.DateTimeFormat(lang==='ru'?'ru-RU':'en-GB',{day:'numeric',month:'long',year:'numeric'}).format(new Date(termsUpdated));
  function openTelegramTerms(event){const app=window.Telegram?.WebApp;if(app?.initData&&typeof app.openLink==='function'){event.preventDefault();app.openLink(event.currentTarget.href);}}
  return <dialog ref={dialog} className="terms-sheet" closedby="any" aria-labelledby={labelId} onClose={onClose} onClick={event=>dismissBackdrop(event,()=>dialog.current.close())}>
    <span className="terms-grabber" aria-hidden="true"/>
    <header className="terms-heading">
      <div><h2 id={labelId}>{copy.title}</h2><p>{copy.updated} {date}</p></div>
      <button type="button" className="terms-close" aria-label={copy.close} onClick={()=>dialog.current.close()}><Icon name="close"/></button>
    </header>
    <div className="terms-scroll">
      <ul className="terms-summary">{copy.summary.map(([icon,title,text])=><li key={icon}><span><Icon name={icon}/></span><strong>{title}</strong><small>{text}</small></li>)}</ul>
      <div className="terms-sections">{copy.sections.map(([title,paragraphs],index)=>{const isOpen=expanded===index,id=labelId+'-'+index;return <section key={title} className="terms-section" data-open={isOpen}>
        <h3><button type="button" aria-expanded={isOpen} aria-controls={id} onClick={()=>setExpanded(isOpen?-1:index)}><span className="terms-index">{index+1}</span>{title}<Icon name="chevron"/></button></h3>
        <div id={id} className="terms-body" inert={isOpen?undefined:''}><div>{paragraphs.map(text=><p key={text.slice(0,24)}>{text}</p>)}</div></div>
      </section>;})}</div>
      <a className="terms-telegram" href="https://telegram.org/tos" target="_blank" rel="noreferrer" onClick={openTelegramTerms}>{copy.telegramTerms}<Icon name="chevron"/></a>
    </div>
  </dialog>;
}
