// Borders: one row of choices for the selected photo — no border, plain borders, the iPhone and
// the frames that used to sit in Assets — plus a thickness slider for the plain ones.
import React,{useEffect,useState} from 'react';
import {t} from './i18n.js';
import {hapticSelection} from './haptics.js';
import {PanelHeader} from './tune-panel.jsx';
import {assetPreview,borderColours} from './asset-library.js';
import {borderChoice} from './page-model.js';
import './border-panel.css';

// Slim by default, like the border new photos get; up to a bold 10.
const DEFAULT_WIDTH=1.5,MAX_WIDTH=10;
const plain=[['white','White'],['black','Black'],['cream','Cream'],['line','Line']];
const frames=[['phone','iPhone'],['browser','Browser'],['polaroid','Instant'],['film','Film'],['glass','Glass'],['box','Box']];

function Swatch({style}){
  if(style==='line')return <span className="border-face is-line"><i/></span>;
  return <span className="border-face" style={{'--border':borderColours[style]}}><i/></span>;
}

export default function BorderInspector({settings,disabled,onChoose,onDone}){
  const current=borderChoice(disabled?null:settings),isPlain=plain.some(([key])=>key===current);
  const [width,setWidth]=useState(settings.borderWidth??DEFAULT_WIDTH);
  useEffect(()=>{setWidth(settings.borderWidth??DEFAULT_WIDTH);},[settings.borderWidth,settings.selectedLayerId]);
  const choose=key=>{if(key===current)return;hapticSelection();onChoose(key,isPlain||plain.some(([k])=>k===key)?width:undefined);};
  const option=(key,label,face)=><button key={key} type="button" className="polished-option border-option" role="radio" aria-checked={current===key} aria-pressed={current===key} onClick={()=>choose(key)}>{face}<small>{t(label)}</small></button>;
  return <section className="border-panel" aria-label={t('Borders')}>
    <PanelHeader title="Borders" onBack={onDone} onDone={onDone}/>
    <fieldset className="border-choices" disabled={disabled} role="radiogroup" aria-label={t('Borders')}>
      {option('none','None',<span className="border-face is-none"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="m6.5 17.5 11-11"/></svg></span>)}
      {plain.map(([key,label])=>option(key,label,<Swatch style={key}/>))}
      <span className="border-divider" aria-hidden="true"/>
      {frames.map(([key,label])=>option(key,label,<span className="border-face is-frame"><img src={assetPreview(key)} alt="" draggable={false}/></span>))}
    </fieldset>
    {/* Thickness only means something for the plain borders; it stays in place, disabled, otherwise. */}
    <label className="tune-slider border-width" data-disabled={!isPlain||disabled||undefined} style={{'--from':'0%','--to':(width-.5)/(MAX_WIDTH-.5)*100+'%','--tint':'#f5f5f7'}}>
      <span className="tune-slider-label">{t('Thickness')}<output>{width}</output></span>
      <input type="range" min=".5" max={MAX_WIDTH} step=".5" value={width} disabled={!isPlain||disabled} aria-label={t('Border thickness')}
        onChange={event=>{const value=Number(event.target.value);setWidth(value);onChoose(current,value);}}/>
    </label>
  </section>;
}
