import {videoPlan,effectPlan,recordingInScene} from './video-plan.js';
import {sceneHasMotion} from './motion-effects.js';
import {watchExportLifecycle} from './export-lifecycle.js';
import {exportPageIndices} from './page-model.js';
import {sceneFor} from './project.js';
import { t } from './i18n.js';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { prepareImage, ensureBotAccess, deliverToBot, saveBrowserFile } from './download-client.js';
import { switchPanel } from './ui-motion.js';
import './download-sheet.css';
import AnimatedSticker from './animated-sticker.jsx';
import {exportCreditCost,premiumActive} from './credit-model.js';
import {accountRequest} from './account-client.js';
import {CreditAmount} from './credits-ui.jsx';
import {hapticImpact,hapticSelection} from './haptics.js';

// Telegram 8.0+: send the finished file to any chat, or save it straight to the device.
const shareIcon='M12 15V3m0 0L8 7m4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7';
const saveIcon='M12 3v12m0 0-4-4m4 4 4-4M5 21h14';
const canTelegram=(app,method)=>!!app?.isVersionAtLeast?.('8.0')&&typeof app[method]==='function';

const loadDownloadSticker=()=>import('./assets/download-duck.json');

export default function DownloadSheet({project,telegram,onClose,onAbandon,account,onAccount=()=>{},onPremium}) {
  const dialog=useRef(null),body=useRef(null),task=useRef(null),urls=useRef([]),prepared=useRef(null),closing=useRef(false);
  const [quality,setQuality]=useState('high'),[phase,setPhase]=useState('choose'),[progress,setProgress]=useState(0),[error,setError]=useState('');
  const [delivery,setDelivery]=useState(null),[notice,setNotice]=useState(''),[busyAction,setBusyAction]=useState('');
  const scene=sceneFor(project),recording=recordingInScene(scene.settings,scene.source),animated=!recording&&sceneHasMotion(scene.settings),moving=!!recording||animated;
  const megabytes=value=>Math.max(1,Math.round((recording?videoPlan(recording.settings,recording.source,value,scene.source):effectPlan(scene.settings,value)).estimatedBytes/1024/1024));
  const pageIndices=exportPageIndices(project),totalPages=pageIndices.length;
  const bundle=totalPages>1;
  function price(value,owner=account,from=0){let cost=0;for(let index=from;index<totalPages;index++){const page=sceneFor(project,pageIndices[index]);cost+=exportCreditCost(recordingInScene(page.settings,page.source)||sceneHasMotion(page.settings)?'video':'image',value,premiumActive(owner));}return cost;}
  const included=premiumActive(account),remaining=prepared.current?.quality===quality?prepared.current.confirmed:0;
  const go=next=>switchPanel(body.current,()=>setPhase(next));
  useLayoutEffect(()=>{dialog.current.showModal();return()=>{task.current?.abort();for(const url of urls.current)setTimeout(()=>URL.revokeObjectURL(url),30000);};},[]);
  useLayoutEffect(()=>watchExportLifecycle(telegram,()=>{if(!task.current)return;closing.current=true;task.current.abort();prepared.current=null;onAbandon();}),[telegram]);
  async function close(value='') {
    if(closing.current)return;closing.current=true;task.current?.abort();const element=dialog.current;
    element.dataset.closing='';
    await Promise.allSettled(element.getAnimations().map(animation=>animation.finished));
    if(element.open)element.close(value);
  }
  async function download(){
    if(task.current)return;
    if(!totalPages){setError(t('Add content before exporting.'));return;}
    const audio=null;for(const item of project.items)if(item.source.kind==='video')item.source.element.pause();
    const controller=new AbortController();task.current=controller;setError('');setProgress(0);setDelivery(null);setNotice('');let last=null;
    try {
      if(telegram){const owner=await accountRequest(telegram);onAccount(owner);if(owner.credits<price(quality,owner,remaining))throw new Error('Not enough stars.');await ensureBotAccess(telegram);}
      await go('working');if(controller.signal.aborted)return;
      if(prepared.current?.quality!==quality)prepared.current={quality,id:crypto.randomUUID(),confirmed:0,file:null};
      const plan=prepared.current,total=totalPages;
      for(let index=plan.confirmed;index<total;index++){
        const file=plan.file??await prepareImage(project,quality,controller.signal,value=>setProgress(Math.floor((index+value*.8)/total*100)),pageIndices[index],audio);
        if(controller.signal.aborted)return;plan.file=file;setProgress(Math.floor((index+.8)/total*100));
        if(telegram){const delivered=await deliverToBot(telegram,file,plan.id+'-'+index,controller.signal,value=>setProgress(Math.floor((index+.8+value*.18)/total*100)),quality);onAccount(delivered.account);last=delivered;}
        else {const url=URL.createObjectURL(file);urls.current.push(url);saveBrowserFile({file,url});}
        if(controller.signal.aborted)return;plan.confirmed=index+1;plan.file=null;setProgress(Math.floor((index+1)/total*100));
      }
      if(total===1&&last)setDelivery(last);
      await go('done');
    }catch(failure){if(failure.account)onAccount(failure.account);if(!controller.signal.aborted){setError(t(failure.message)||'Download could not be prepared.');await go('choose');}}
    finally{if(task.current===controller)task.current=null;if(audio&&audio.context.state!=='closed')audio.context.close().catch(()=>{});}
  }

  function share(){
    if(busyAction||!delivery?.shareId)return;hapticSelection();setNotice('');setBusyAction('share');
    try{telegram.shareMessage(delivery.shareId,sent=>{setBusyAction('');if(sent){hapticImpact('light');setNotice(t('Shared'));}});}
    catch{setBusyAction('');setNotice(t('Sharing is not available here. Your file is in the bot chat.'));}
  }
  function save(){
    if(busyAction||!delivery?.save)return;hapticSelection();setNotice('');setBusyAction('save');
    try{telegram.downloadFile({url:delivery.save.url,file_name:delivery.save.name},accepted=>{setBusyAction('');if(accepted)setNotice(t('Saving to your device…'));});}
    catch{setBusyAction('');setNotice(t('Saving is not available here. Your file is in the bot chat.'));}
  }
  const shareable=canTelegram(telegram,'shareMessage')&&!!delivery?.shareId,saveable=canTelegram(telegram,'downloadFile')&&!!delivery?.save;

  return <dialog ref={dialog} className="download-sheet" aria-labelledby="download-title" onCancel={event=>{event.preventDefault();close();}} onClose={()=>{const choice=dialog.current.returnValue;dialog.current.returnValue='';onClose(choice);}}>
    <span className="download-grabber" aria-hidden="true"/>
    <header className="download-heading"><h2 id="download-title" className="visually-hidden">{t("Download")}</h2><button type="button" aria-label={t("Close download")} onClick={()=>close()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></header>
    <div ref={body} className="download-body" data-phase={phase}>
      <AnimatedSticker load={loadDownloadSticker} className="download-animation" loop/>
      {phase==='choose'&&<>
        <fieldset className="download-quality"><legend className="visually-hidden">{t("Download quality")}</legend>
          {/* Named by outcome: what the file will be, not an abstract quality level. */}
          {(moving?[['standard','HD 720p','Smaller file · Faster to send'],['high','Full HD 1080p','Sharper video · Larger file']]:[['standard','Full HD','Smaller file · Faster to send'],['high','Ultra HD','Sharpest detail · Larger file']]).map(([value,label,detail])=><label key={value}><span><strong>{t(label)}</strong><small>{moving?t(detail.split(' · ')[0])+' · '+megabytes(value)+' MB':t(detail)}</small></span><CreditAmount included={included} value={price(value)}/><input type="radio" name="download-quality" value={value} checked={quality===value} onChange={()=>setQuality(value)}/></label>)}
        </fieldset>
        {account&&<p className="download-credit-balance">{t('Balance')}: {account.credits??0} {t('stars')}</p>}
        <button type="button" className="download-primary download-priced" autoFocus aria-label={t('Download')} onClick={download}><span>{t("Download")}</span><CreditAmount included={included} value={price(quality,account,remaining)}/></button>
        {!included&&onPremium&&<button type="button" className="download-premium" onClick={onPremium}>{t('Unlimited exports with Premium')}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>}
      </>}
      {phase==='working'&&<div className="download-working"><div className="download-progress-label"><span>{t("Downloading…")}</span><output aria-live="polite">{progress}%</output></div><progress max="100" value={progress} aria-label={t("Download progress")}/></div>}
      {phase==='done'&&<><div className="download-complete" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg><h3>{t("Done")}</h3></div>
        {telegram&&<p className="download-sent">{t(totalPages>1?'Your files are in the bot chat':'Sent to your bot chat')}</p>}
        {(shareable||saveable)&&<div className="download-actions">
          {shareable&&<button type="button" disabled={!!busyAction} onClick={share}><span className="ios-setting-icon download-tile-share"><svg viewBox="0 0 24 24" aria-hidden="true"><path d={shareIcon}/></svg></span><span>{t('Share to a chat')}</span><svg className="download-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>}
          {saveable&&<button type="button" disabled={!!busyAction} onClick={save}><span className="ios-setting-icon download-tile-save"><svg viewBox="0 0 24 24" aria-hidden="true"><path d={saveIcon}/></svg></span><span>{t('Save to device')}</span><svg className="download-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>}
        </div>}
        <p className="download-notice" role="status" aria-live="polite">{notice}</p><button type="button" className="download-primary" onClick={()=>close('home')}>{t("Back to home")}</button><button type="button" className="download-home" onClick={()=>close('edit')}>{t("Keep editing")}</button></>}
      {error&&<p className="download-error" role="alert">{error}</p>}
    </div>
  </dialog>;
}
