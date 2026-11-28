import React,{useLayoutEffect,useRef,useState} from 'react';
import {t} from './i18n.js';
import {backdrops,finishes} from './render.js';
import {hapticImpact,hapticSelection} from './haptics.js';
import {dismissBackdrop} from './dialog-dismiss.js';
import {lookSpots} from './templates.js';
import './looks-ui.css';

const ratioValue={square:1,story:9/16,wide:16/9,portrait:4/5};

// A Look's card art: its saved snapshot, or a drawn preview of its layout for starter Looks.
export function LookThumb({look}){
  const image=look.thumb||look.preview;
  if(image)return <span className="look-thumb" style={{'--thumb-ratio':ratioValue[look.settings?.ratio]??1}}><img src={image} alt="" draggable={false} decoding="async"/></span>;
  const s=look.settings??{},r=ratioValue[s.ratio]??1,palette=backdrops[s.palette]??backdrops.aurora;
  const background=s.background==='solid'?s.color??'#f2f2f7':`linear-gradient(150deg,${palette.colors.join(',')})`;
  return <span className="look-thumb is-drawn" style={{'--thumb-ratio':r,background}}>
    {look.objects.map(object=>{
      const slot=object.slot??{x:0,y:0,width:1,height:1},sw=slot.width*r,sh=slot.height,scale=(object.pose?.scale??89)/100,aspect=object.aspect??1;
      const fitH=object.kind==='photo'?Math.min(.8*sh,.82*sw/aspect):Math.min(.86*sh,.79*sw/aspect),h=fitH*scale,w=h*aspect;
      const cx=(slot.x+slot.width/2)*r,cy=slot.y+slot.height/2;
      return <i key={object.id} data-kind={object.kind} style={{left:(cx-w/2)/r*100+'%',top:(cy-h/2)*100+'%',width:w/r*100+'%',height:h*100+'%',rotate:(object.pose?.roll??0)+'deg','--finish':finishes[object.pose?.finish]?.swatch??'#d8d8de'}}/>;
    })}
    {(look.layers??[]).filter(layer=>layer.type==='text').map(layer=><b key={layer.id} style={{left:layer.x*100+'%',top:layer.y*100+'%',width:Math.min(80,String(layer.text).length*layer.size/r/14)+'%',height:Math.max(2,layer.size/14)+'%',background:layer.color}}/>)}
  </span>;
}

function useDialog(onClose){
  const ref=useRef(null);
  useLayoutEffect(()=>{const element=ref.current;element.showModal();return()=>{if(element.open)element.close();};},[]);
  return {ref,props:{onCancel:event=>{event.preventDefault();onClose();},onClick:event=>dismissBackdrop(event,onClose)}};
}

// Save the current page as a Look: snapshot, name, and which texts to ask for each time.
export function LookSaveSheet({thumb,texts,initialName,onSave,onClose,busy=false,error='',limit,count,premium,onPremium,updating=false}){
  const {ref,props}=useDialog(onClose);
  const [name,setName]=useState(initialName),[ask,setAsk]=useState(()=>texts.map(text=>text.id));
  const full=!updating&&count>=limit;
  return <dialog ref={ref} className="look-sheet" aria-labelledby="look-sheet-title" {...props}>
    <span className="look-sheet-grabber" aria-hidden="true"/>
    <header className="look-sheet-heading"><button type="button" onClick={onClose}>{t('Cancel')}</button><h2 id="look-sheet-title">{t(updating?'Update look':'Save look')}</h2><button type="button" className="is-primary" disabled={busy||full||!name.trim()} onClick={()=>{hapticImpact('medium');onSave(name.trim(),ask);}}>{t(busy?'Saving…':'Save')}</button></header>
    <div className="look-sheet-body">
      <div className="look-sheet-preview"><img src={thumb} alt=""/></div>
      <label className="look-name"><span>{t('Name')}</span><input type="text" maxLength={40} value={name} enterKeyHint="done" onChange={event=>setName(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}}/></label>
      <p className="look-sheet-note">{t('Background, phones, watermark, stickers and texts are saved. Your screenshots become empty spots to fill next time.')}</p>
      {texts.length>0&&<div className="look-asks">
        <h3>{t('Change each time')}</h3>
        {texts.map(text=><button key={text.id} type="button" role="switch" aria-checked={ask.includes(text.id)} onClick={()=>{hapticSelection();setAsk(prior=>prior.includes(text.id)?prior.filter(id=>id!==text.id):[...prior,text.id]);}}><span>“{text.text||t('Text')}”</span><i/></button>)}
      </div>}
      {full?<div className="look-limit"><strong>{t(premium?'You have 10 looks, the most you can keep.':'Free accounts keep 1 look.')}</strong><span>{t(premium?'Delete one on Home to save another.':'Premium keeps up to 10.')}</span>{!premium&&onPremium&&<button type="button" onClick={onPremium}>{t('See Premium')}</button>}</div>
        :<p className="look-sheet-count">{t('{count} of {limit} looks').replace('{count}',updating?count:count+1).replace('{limit}',limit)}</p>}
      {error&&<p className="look-sheet-error" role="alert">{error}</p>}
    </div>
  </dialog>;
}

// Long-press (or ⋯) on a Look: use, rename, update with the current design, or delete.
export function LookManageSheet({look,onUse,onRename,onUpdate,onDelete,onClose}){
  const {ref,props}=useDialog(onClose);
  const [renaming,setRenaming]=useState(false),[name,setName]=useState(look.name),[confirm,setConfirm]=useState(false);
  return <dialog ref={ref} className="look-sheet look-manage" aria-label={look.name} {...props}>
    <span className="look-sheet-grabber" aria-hidden="true"/>
    <div className="look-manage-head"><LookThumb look={look}/><div><strong>{look.name}</strong><small>{t('{count} spots').replace('{count}',lookSpots(look))}</small></div></div>
    {renaming?<div className="look-rename"><input type="text" autoFocus maxLength={40} value={name} onChange={event=>setName(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&name.trim())onRename(name.trim());}}/><button type="button" disabled={!name.trim()} onClick={()=>onRename(name.trim())}>{t('Save')}</button></div>
    :<div className="look-actions">
      <button type="button" onClick={onUse}><span className="look-action-icon is-use"><svg viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span>{t('Use this look')}</button>
      <button type="button" onClick={()=>setRenaming(true)}><span className="look-action-icon"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16Zm9-13 4 4"/></svg></span>{t('Rename')}</button>
      {onUpdate&&<button type="button" onClick={onUpdate}><span className="look-action-icon"><svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/></svg></span>{t('Update with this design')}</button>}
      <button type="button" className="is-danger" onClick={()=>{if(confirm)onDelete();else{hapticImpact('light');setConfirm(true);}}}><span className="look-action-icon is-danger"><svg viewBox="0 0 24 24"><path d="M4.5 6.5h15M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5m-8 0 .8 12.1A2 2 0 0 0 9.3 20.5h5.4a2 2 0 0 0 2-1.9l.8-12.1"/></svg></span>{t(confirm?'Tap again to delete':'Delete look')}</button>
    </div>}
  </dialog>;
}

// A press that opens the manage sheet on long-press or right-click, and uses the Look on tap.
export function useLookPress(onTap,onHold){
  const timer=useRef(0),held=useRef(false);
  return look=>({
    onPointerDown:()=>{held.current=false;clearTimeout(timer.current);if(onHold)timer.current=setTimeout(()=>{held.current=true;hapticImpact('medium');onHold(look);},480);},
    onPointerUp:()=>clearTimeout(timer.current),onPointerLeave:()=>clearTimeout(timer.current),onPointerCancel:()=>clearTimeout(timer.current),
    onContextMenu:event=>{if(onHold){event.preventDefault();clearTimeout(timer.current);held.current=true;onHold(look);}},
    onClick:()=>{if(held.current){held.current=false;return;}hapticSelection();onTap(look);},
  });
}
