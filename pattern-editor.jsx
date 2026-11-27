import React,{useRef,useState} from 'react';
import {Range,Switch} from './text-editor.jsx';
import {t} from './i18n.js';
import {switchPanel} from './ui-motion.js';

export default function PatternInspector({pattern,onChange,onDone}) {
  const root=useRef(null),[style,setStyle]=useState(false);
  const patch=change=>onChange({...pattern,...change});
  return <section ref={root} className="text-inspector" aria-label={t('Image pattern')}>
    <header className="text-inspector-heading">
      {style&&<button type="button" className="ios-text-back" onClick={()=>switchPanel(root.current,()=>setStyle(false))}>{t('Back')}</button>}
      <h2>{t(style?'Style':'Image pattern')}</h2>
      <button type="button" className="ios-text-done" onClick={onDone}>{t('Done')}</button>
    </header>
    <div className="text-inspector-fields">
      {style?<Range label={t('Angle')} min={-180} max={180} value={pattern.angle} suffix="°" onChange={angle=>patch({angle})}/>:<>
        <div className="ios-settings-group">
          <Range label={t('Size')} min={8} max={75} value={pattern.size} suffix="%" onChange={size=>patch({size})}/>
          <Range label={t('Spacing')} min={0} max={100} value={pattern.spacing} suffix="%" onChange={spacing=>patch({spacing})}/>
          <Range label={t('Opacity')} min={0} max={100} value={pattern.opacity} suffix="%" onChange={opacity=>patch({opacity})}/>
          <Switch label={t('Stagger rows')} checked={pattern.stagger} onChange={stagger=>patch({stagger})}/>
        </div>
        <div className="ios-settings-group">
          <button type="button" className="ios-setting-row" onClick={()=>switchPanel(root.current,()=>setStyle(true))}>{t('Style')}</button>
          <button type="button" className="ios-setting-row" onClick={()=>{onChange(null);onDone();}}>{t('Single image')}</button>
        </div>
      </>}
    </div>
  </section>;
}
