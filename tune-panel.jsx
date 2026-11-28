import React,{useState} from 'react';
import {t} from './i18n.js';
import {hapticSelection} from './haptics.js';
import './tune-panel.css';

// One compact panel for numeric looks (Adjust, Shadow): round chips across the top, each with
// a ring showing its value, and a single large slider for the chosen one, as in iOS Photos.
// Nothing scrolls; double-tap a chip to reset it.
export default function TunePanel({title,items,active,onActive,onReset,onDone,onBack,changed=false,children}){
  const [local,setLocal]=useState(items.find(item=>!item.disabled)?.key);
  const key=active??local,select=onActive??setLocal,item=items.find(entry=>entry.key===key)??items[0];
  const span=item.max-item.min,fill=item.min<0?{from:(Math.min(0,item.value)-item.min)/span,to:(Math.max(0,item.value)-item.min)/span}:{from:0,to:(item.value-item.min)/span};
  return <section className="tune-panel" aria-label={t(title)}>
    <header className="tune-heading">
      <button type="button" className="tune-round" aria-label={t('Back to editor controls')} onClick={onBack??onDone}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>
      <h2>{t(title)}</h2>
      {onReset&&<button type="button" className="tune-text" disabled={!changed&&!items.some(entry=>entry.value!==entry.initial)} onClick={onReset}>{t('Reset')}</button>}
      <button type="button" className="tune-text tune-done" onClick={onDone}>{t('Done')}</button>
    </header>
    {children}
    <div className="tune-chips" role="radiogroup" aria-label={t(title)}>
      {items.map(entry=>{const amount=Math.abs(entry.value-entry.initial)/Math.max(Math.abs(entry.max-entry.initial),Math.abs(entry.min-entry.initial));
        return <button key={entry.key} type="button" role="radio" aria-checked={entry.key===item.key} disabled={entry.disabled} className="tune-chip" style={{'--amount':amount,'--tint':entry.tint??'#f5f5f7'}}
          onClick={()=>{if(entry.key!==item.key){hapticSelection();select(entry.key);}}} onDoubleClick={()=>{hapticSelection();entry.onChange(entry.initial);}}>
          <span className="tune-dial"><svg viewBox="0 0 24 24" aria-hidden="true">{entry.icon}</svg></span><small>{entry.display??(entry.value===entry.initial?t(entry.label):(entry.value>0&&entry.min<0?'+':'')+entry.value)}</small>
        </button>;})}
    </div>
    <label className="tune-slider" style={{'--from':fill.from*100+'%','--to':fill.to*100+'%','--tint':item.tint??'#f5f5f7'}}>
      <span className="tune-slider-label">{t(item.label)}<output>{item.display??((item.value>0&&item.min<0?'+':'')+item.value+(item.suffix??''))}</output></span>
      <input type="range" min={item.min} max={item.max} step={item.step??1} value={item.value} disabled={item.disabled} aria-label={t(item.label)} onChange={event=>item.onChange(event.target.valueAsNumber)}/>
    </label>
  </section>;
}
