import React from 'react';
import {Range} from './text-editor.jsx';
import {t} from './i18n.js';
export default function CropInspector({value,onChange,onDone,edges,onEdges}){
  const crop=value??{};
  return <section className="text-inspector" aria-label={t('Crop image')}><header className="text-inspector-heading"><h2>{t('Crop')}</h2><button type="button" className="ios-text-done" onClick={()=>onChange(null)}>{t('Reset')}</button><button type="button" className="ios-text-done" onClick={onDone}>{t('Done')}</button></header><div className="text-inspector-fields">{[['left','Left','right'],['right','Right','left'],['top','Top','bottom'],['bottom','Bottom','top']].map(([key,label,opposite])=><Range key={key} label={t(label)} min={0} max={Math.floor((.95-(crop[opposite]??0))*100)} value={Math.round((crop[key]??0)*100)} suffix="%" onChange={value=>onChange({...crop,[key]:value/100})}/>)}{onEdges&&<Range label={t('Corners')} min={0} max={50} value={Math.min(50,edges??0)} suffix="%" onChange={onEdges}/>}</div></section>;
}
