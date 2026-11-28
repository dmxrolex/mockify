import React, { useEffect, useId, useRef } from 'react';
import { terms, termsUpdated } from './terms-content.js';
import { dismissBackdrop } from './dialog-dismiss.js';
import './terms-sheet.css';

const CloseIcon=()=><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>;

// A plain document: numbered sections with headings, read top to bottom.
export default function TermsSheet({ open, onClose }) {
  const dialog=useRef(null),labelId=useId();
  const lang=document.documentElement.lang==='ru'?'ru':'en',copy=terms[lang];
  useEffect(()=>{const element=dialog.current;if(!element)return;if(open&&!element.open)element.showModal();else if(!open&&element.open)element.close();},[open]);
  const date=new Intl.DateTimeFormat(lang==='ru'?'ru-RU':'en-GB',{day:'numeric',month:'long',year:'numeric'}).format(new Date(termsUpdated));
  return <dialog ref={dialog} className="terms-sheet" closedby="any" aria-labelledby={labelId} onClose={onClose} onClick={event=>dismissBackdrop(event,()=>dialog.current.close())}>
    <span className="terms-grabber" aria-hidden="true"/>
    <header className="terms-heading">
      <div><h2 id={labelId}>{copy.title}</h2><p>{copy.updated} {date}</p></div>
      <button type="button" className="terms-close" aria-label={copy.close} onClick={()=>dialog.current.close()}><CloseIcon/></button>
    </header>
    <article className="terms-scroll">
      {copy.sections.map(([title,paragraphs],index)=><section key={title} className="terms-section">
        <h3><span className="terms-index">{index+1}.</span>{title}</h3>
        {paragraphs.map(text=><p key={text.slice(0,24)}>{text}</p>)}
      </section>)}
    </article>
  </dialog>;
}
