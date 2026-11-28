import {videoPlan,effectPlan,recordingInScene,MAX_VIDEO_BYTES} from './video-plan.js';
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
import {HeaderCoin} from './coin-motion.jsx';



export default function DownloadSheet({project,telegram,onClose,onAbandon,account,onAccount=()=>{},onPremium}) {
  const dialog=useRef(null),body=useRef(null),task=useRef(null),urls=useRef([]),prepared=useRef(null),closing=useRef(false);
  const [quality,setQuality]=useState(()=>{const scene=sceneFor(project),recording=recordingInScene(scene.settings,scene.source);return recording&&videoPlan(recording.settings,recording.source,'high',scene.source).estimatedBytes>MAX_VIDEO_BYTES?'standard':'high';}),[phase,setPhase]=useState('choose'),[progress,setProgress]=useState(0),[error,setError]=useState('');
  const scene=sceneFor(project),recording=recordingInScene(scene.settings,scene.source),animated=!recording&&sceneHasMotion(scene.settings),moving=!!recording||animated;
  const planFor=value=>recording?videoPlan(recording.settings,recording.source,value,scene.source):effectPlan(scene.settings,value);
  const megabytes=value=>Math.max(1,Math.round(planFor(value).estimatedBytes/1024/1024));
  // Telegram bots can send up to ~50 MB: rule out sizes that cannot be delivered before the tap.
  const tooLarge=value=>moving&&planFor(value).estimatedBytes>MAX_VIDEO_BYTES;
  const maxClip=value=>{const plan=planFor(value),seconds=Math.floor(plan.seconds*MAX_VIDEO_BYTES/plan.estimatedBytes);return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');};
  const nothingFits=tooLarge('standard')&&tooLarge('high');
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
    const controller=new AbortController();task.current=controller;setError('');setProgress(0);
    try {
      if(telegram){const owner=await accountRequest(telegram);onAccount(owner);if(owner.credits<price(quality,owner,remaining))throw new Error('Not enough stars.');await ensureBotAccess(telegram);}
      await go('working');if(controller.signal.aborted)return;
      if(prepared.current?.quality!==quality)prepared.current={quality,id:crypto.randomUUID(),confirmed:0,file:null};
      const plan=prepared.current,total=totalPages;
      for(let index=plan.confirmed;index<total;index++){
        const file=plan.file??await prepareImage(project,quality,controller.signal,value=>setProgress(Math.floor((index+value*.8)/total*100)),pageIndices[index],audio);
        if(controller.signal.aborted)return;plan.file=file;setProgress(Math.floor((index+.8)/total*100));
        if(telegram){const delivered=await deliverToBot(telegram,file,plan.id+'-'+index,controller.signal,value=>setProgress(Math.floor((index+.8+value*.18)/total*100)),quality);onAccount(delivered.account);}
        else {const url=URL.createObjectURL(file);urls.current.push(url);saveBrowserFile({file,url});}
        if(controller.signal.aborted)return;plan.confirmed=index+1;plan.file=null;setProgress(Math.floor((index+1)/total*100));
      }
      await go('done');
    }catch(failure){if(failure.account)onAccount(failure.account);if(!controller.signal.aborted){setError(t(failure.message)||'Download could not be prepared.');await go('choose');}}
    finally{if(task.current===controller)task.current=null;if(audio&&audio.context.state!=='closed')audio.context.close().catch(()=>{});}
  }

  return <dialog ref={dialog} className="download-sheet" aria-labelledby="download-title" onCancel={event=>{event.preventDefault();close();}} onClose={()=>{const choice=dialog.current.returnValue;dialog.current.returnValue='';onClose(choice);}}>
    <span className="download-grabber" aria-hidden="true"/>
    <header className="download-heading"><h2 id="download-title" className="visually-hidden">{t("Download")}</h2><button type="button" aria-label={t("Close download")} onClick={()=>close()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></header>
    <div ref={body} className="download-body" data-phase={phase}>
      {/* A duck for each moment: preparing, finished, or something went wrong. */}
      {(sticker=>sticker==='download'?<AnimatedSticker key={sticker} slot="download" className="download-animation" loop/>:<AnimatedSticker key={sticker} slot={sticker} className="download-animation" loop={sticker!=='done'} fallback={<AnimatedSticker slot="download" className="download-animation" loop/>}/>)(phase==='done'?'done':error?'error':'download')}
      {phase==='choose'&&<>
        <fieldset className="download-quality"><legend className="visually-hidden">{t("Download quality")}</legend>
          {/* Named by outcome: what the file will be, not an abstract quality level. */}
          {(moving?[['standard','HD 720p','Smaller file · Faster to send'],['high','Full HD 1080p','Sharper video · Larger file']]:[['standard','Full HD','Smaller file · Faster to send'],['high','Ultra HD','Sharpest detail · Larger file']]).map(([value,label,detail])=><label key={value}><span><strong>{t(label)}</strong><small>{tooLarge(value)?t('Too long · trim to under {time}').replace('{time}',maxClip(value)):moving?t(detail.split(' · ')[0])+' · '+megabytes(value)+' MB':t(detail)}</small></span><CreditAmount included={included} value={price(value)}/><input type="radio" name="download-quality" value={value} checked={quality===value} disabled={tooLarge(value)} onChange={()=>setQuality(value)}/></label>)}
        </fieldset>
        {nothingFits&&<p className="download-limit">{t('This video is too long to send. Trim it to under {time} in the editor, then export.').replace('{time}',maxClip('standard'))}</p>}
        {/* Balance rides on top of the Download button as a small gold tab. */}
        <div className="download-pay">
          {account&&<span className="download-balance"><HeaderCoin/><span>{t('Balance')}</span><strong>{(account.credits??0).toLocaleString(document.documentElement.lang)}</strong></span>}
        <button type="button" className="download-primary download-priced" autoFocus aria-label={t('Download')} disabled={nothingFits||tooLarge(quality)} onClick={download}><span>{t("Download")}</span><CreditAmount included={included} value={price(quality,account,remaining)}/></button>
        </div>
        {!included&&onPremium&&<button type="button" className="download-premium" onClick={onPremium}>{t('Unlimited exports with Premium')}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>}
      </>}
      {phase==='working'&&<div className="download-working"><div className="download-progress-label"><span>{t("Downloading…")}</span><output aria-live="polite">{progress}%</output></div><progress max="100" value={progress} aria-label={t("Download progress")}/></div>}
      {phase==='done'&&<><div className="download-complete" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg><h3>{t("Done")}</h3></div>
        {telegram&&<p className="download-sent">{t(totalPages>1?'Your files are in the bot chat':'Sent to your bot chat')}</p>}
        <button type="button" className="download-primary" onClick={()=>close('home')}>{t("Back to home")}</button><button type="button" className="download-home" onClick={()=>close('edit')}>{t("Keep editing")}</button></>}
      {error&&<p className="download-error" role="alert">{error}</p>}
    </div>
  </dialog>;
}
