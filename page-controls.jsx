import {dismissBackdrop} from './dialog-dismiss.js';
import {assetLibrary,assetGroups,assetPreview} from './asset-library.js';
import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {t} from './i18n.js';
import {ensurePages,pageFor,selectPage,selectObject,assignObject,pageMediaChoices,addPage,finishPages,deletePage} from './page-model.js';
import './page-controls.css';
import {jellyPress} from './ui-motion.js';
import {Picker} from './editor-controls.jsx';
import {SelectionIcon} from './selection-toolbar.jsx';

export function PageIcon({name}){
  const paths={merge:'M3 7h7v10H3ZM14 7h7v10h-7ZM10 12h4',pages:'M8 3h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM3 8v11a3 3 0 0 0 3 3h9',page:'M6 3h9l4 4v14H6Zm9 0v5h4',left:'m14 6-6 6 6 6',right:'m10 6 6 6-6 6',plus:'M12 5v14M5 12h14',check:'m5 12 4 4L19 6',trash:'M4 7h16M9 4h6M6 7l1 13h10l1-13M10 10v7m4-7v7',split:'M3 5h6v14H3ZM15 5h6v14h-6M12 3v3m0 3v3m0 3v3m0 3v1'};
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]}/></svg>;
}
export function PageNavigation({index,count,onChange,onManage,disabled=false}){
  const total=Math.max(1,count);
  return <nav className="page-navigation" aria-label={t('Pages')}><button type="button" aria-label={t('Previous page')} onPointerDown={jellyPress} disabled={disabled||index===0} onClick={()=>onChange(index-1)}><PageIcon name="left"/></button><button type="button" className="page-count" aria-label={t('Manage pages')} disabled={disabled} onPointerDown={jellyPress} onClick={onManage}><PageIcon name="pages"/><span><strong>{index+1}</strong><span aria-hidden="true"> / </span>{total}</span></button><button type="button" aria-label={t('Next page')} onPointerDown={jellyPress} disabled={disabled||index>=total-1} onClick={()=>onChange(index+1)}><PageIcon name="right"/></button></nav>;
}
// Small pills under the canvas: page switcher and page manager, plus the canvas size menu.
const formats=[['square','1:1',[6,6,12,12]],['portrait','4:5',[6.5,5,11,14]],['story','9:16',[8,3.5,8,17]],['wide','16:9',[3.5,8,17,8]]];
export function EditorContextRow({index,count,onPage,onManage,disabled=false,ratio,onRatio}){
  const sizeButton=useRef(null),[sizeOpen,setSizeOpen]=useState(false),current=formats.find(([key])=>key===ratio)??formats[0];
  return <div className="editor-context-row">
    {count>1&&<PageNavigation index={index} count={count} onChange={onPage} onManage={onManage} disabled={disabled}/>}
    <button className="merge-action" type="button" disabled={disabled} onPointerDown={jellyPress} onClick={onManage}><PageIcon name="pages"/>{t(count>1?'Pages':'Page')}</button>
    {onRatio&&<button ref={sizeButton} className="merge-action size-action" type="button" aria-haspopup="menu" aria-expanded={sizeOpen} aria-label={t('Canvas size')+', '+current[1]} onPointerDown={jellyPress} onClick={()=>setSizeOpen(!sizeOpen)}><FormatGlyph box={current[2]}/>{current[1]}</button>}
    {sizeOpen&&<Picker anchor={sizeButton} label={t('Canvas size')} className="size-picker" onClose={()=>setSizeOpen(false)}>
      <div className="size-picker-options" role="menu">{formats.map(([key,label,box])=><button key={key} type="button" role="menuitemradio" aria-checked={key===ratio} onClick={()=>{onRatio(key);setSizeOpen(false);}}><FormatGlyph box={box}/><span>{label}</span></button>)}</div>
    </Picker>}
  </div>;
}
function FormatGlyph({box:[x,y,w,h]}){return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x={x} y={y} width={w} height={h} rx="2"/></svg>;}
export function pageSwipeMargin(preview,event){
  if(event.target.closest('button,input,textarea,a,.artboard-frame,.video-timeline,.preview-zoom,.editor-context-row'))return false;
  const artboard=preview.querySelector('.artboard');
  const bounds=artboard?.getBoundingClientRect();
  if(!bounds||event.clientY<bounds.top||event.clientY>bounds.bottom)return false;
  const canvas=artboard.querySelector('.artboard-frame')?.getBoundingClientRect();
  return canvas&&(event.clientX<canvas.left||event.clientX>canvas.right||event.clientY<canvas.top||event.clientY>canvas.bottom);
}

export function usePageSwipe({index,count,onPage,onTap,disabled}){
  const gesture=useRef(null);
  return {
    onPointerDown:event=>{
      if(disabled||count<2||!event.isPrimary||event.button!==0||!pageSwipeMargin(event.currentTarget,event))return;
      gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY};
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerUp:event=>{
      const start=gesture.current;
      if(start?.id!==event.pointerId)return;
      gesture.current=null;
      const x=event.clientX-start.x,y=event.clientY-start.y;
      if(Math.abs(x)>=40&&Math.abs(x)>Math.abs(y)*1.35){
        const next=index+(x<0?1:-1);
        if(next>=0&&next<count)onPage(next);
      }else if(Math.hypot(x,y)<8)onTap();
    },
    onPointerCancel:()=>{gesture.current=null;},
    onLostPointerCapture:()=>{gesture.current=null;}
  };
}

export function AdjustInspector({settings,update,onDone,disabled=false}){
  const controls=[['brightness','Brightness','M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17m10-10 1.4-1.4'],['contrast','Contrast','M12 4a8 8 0 0 1 0 16Z'],['saturation','Saturation','M12 3c-3 4-7 7.5-7 11a7 7 0 0 0 14 0c0-3.5-4-7-7-11Z'],['warmth','Warmth','M10 5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0ZM12 8v9']];
  return <section className="text-inspector adjust-inspector" aria-label={t('Adjust')}><header className="text-inspector-heading"><button type="button" className="ios-text-back" aria-label={t('Back to editor controls')} onClick={onDone}><PageIcon name="left"/></button><h2>{t('Adjust')}</h2><button type="button" className="ios-text-done" disabled={disabled||!controls.some(([key])=>settings[key])} onClick={()=>update(Object.fromEntries(controls.map(([key])=>[key,0])))}>{t('Reset')}</button><button type="button" className="ios-text-done" onClick={onDone}>{t('Done')}</button></header><div className="ios-settings-group">{controls.map(([key,label,path])=><label className="adjust-row" key={key}><span className={'ios-setting-icon '+key}><svg viewBox="0 0 24 24" aria-hidden="true">{['brightness','contrast'].includes(key)&&<circle cx="12" cy="12" r={key==='brightness'?4:8}/>}<path d={path} fill={key==='contrast'?'currentColor':'none'}/></svg></span><span className="adjust-value">{t(label)}<output>{settings[key]>0?'+':''}{settings[key]??0}</output></span><input type="range" className="polished-range" aria-label={t(label)} min="-100" max="100" step="1" value={settings[key]??0} disabled={disabled} style={{'--fill':((settings[key]??0)+100)/2+'%'}} onChange={event=>update({[key]:event.target.valueAsNumber})}/></label>)}</div></section>;
}
export function ToolsSheet({onClose,onInsert,getCanvasRect}){
  const dialog=useRef(null),closing=useRef(false),drag=useRef(null),[ghost,setGhost]=useState(null),[pending,setPending]=useState(null),[group,setGroup]=useState(()=>{try{return assetGroups.some(([key])=>key===sessionStorage.getItem('mockify.assetGroup'))?sessionStorage.getItem('mockify.assetGroup'):'frames';}catch{return 'frames';}});
  function chooseGroup(key){setGroup(key);try{sessionStorage.setItem('mockify.assetGroup',key);}catch{}}
  const native='popover' in HTMLElement.prototype;
  useLayoutEffect(()=>{const element=dialog.current;const source=document.querySelector('[data-tool="tools"]');native?element.showPopover(source?{source}:undefined):element.show();const escape=event=>{if(event.key==='Escape'){event.preventDefault();close();}};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);},[]);
  useLayoutEffect(()=>{const outside=event=>{if(!dialog.current.contains(event.target)&&!event.target.closest('[data-tool="tools"]'))close();};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[]);
  async function close(){if(closing.current)return;closing.current=true;const element=dialog.current;if(!matchMedia('(prefers-reduced-motion: reduce)').matches){try{await element.animate([{translate:'0 0',opacity:1},{translate:'0 100%',opacity:.5}],{duration:180,easing:'ease-in',fill:'forwards'}).finished;}catch{}}native?element.hidePopover():element.close();onClose();}
  async function insert(kind,point){if(pending)return;setPending(kind);if(await onInsert(kind,point)!==false)close();else setPending(null);}
  function begin(event,kind){if(event.button!==0||pending)return;event.currentTarget.setPointerCapture(event.pointerId);drag.current={kind,x:event.clientX,y:event.clientY,moved:false,pointer:event.pointerId};}
  function move(event){const state=drag.current;if(!state||state.pointer!==event.pointerId)return;if(Math.hypot(event.clientX-state.x,event.clientY-state.y)>6)state.moved=true;if(state.moved)setGhost({kind:state.kind,x:event.clientX,y:event.clientY});}
  function end(event,cancel=false){const state=drag.current;if(!state||state.pointer!==event.pointerId)return;drag.current=null;setGhost(null);if(!cancel&&state.moved){const rect=getCanvasRect();if(rect&&event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom)insert(state.kind,{x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height});}if(state.moved)event.currentTarget.dataset.suppressClick='true';}
  return <dialog ref={dialog} popover={native?'manual':undefined} className="merge-sheet bottom-sheet tools-sheet" aria-labelledby="tools-title"><span className="merge-grabber" aria-hidden="true"/><header className="merge-heading"><span/><h2 id="tools-title">{t('Assets')}</h2><button type="button" autoFocus onClick={close}>{t('Done')}</button></header><div className="ios-segment asset-groups" role="radiogroup" aria-label={t('Asset category')} style={{'--count':assetGroups.length,'--segment':assetGroups.findIndex(([key])=>key===group)}}>{assetGroups.map(([key,label])=><button key={key} type="button" role="radio" aria-checked={group===key} onClick={()=>chooseGroup(key)}>{t(label)}</button>)}</div><div className="asset-library-grid">{assetLibrary.filter(asset=>asset.group===group).map(asset=><button type="button" className="asset-library-card" key={asset.id} disabled={!!pending} aria-label={t(asset.name)} title={t(asset.name)} onPointerDown={event=>begin(event,asset.id)} onPointerMove={move} onPointerUp={event=>end(event)} onPointerCancel={event=>end(event,true)} onLostPointerCapture={event=>end(event,true)} onClick={event=>{if(event.currentTarget.dataset.suppressClick){delete event.currentTarget.dataset.suppressClick;return;}insert(asset.id);}}><span><img src={assetPreview(asset.id)} alt="" draggable={false}/></span><small>{t(asset.name)}</small></button>)}</div>{ghost&&<img className="asset-drag-ghost" src={assetPreview(ghost.kind)} alt="" draggable={false} style={{left:ghost.x,top:ghost.y}}/>}</dialog>;
}
export function PagesSheet({project,onApply,onClose,renderPreview}){
  const dialog=useRef(null),[draft,setDraft]=useState(()=>ensurePages(project)),page=pageFor(draft),index=draft.pageIndex??0;
  const visiblePages=draft.pages.map((page,index)=>({page,index})).filter(item=>item.page.keepEmpty||item.page.objects.length||item.page.photo||item.index===index||(item.page.settings.layers??[]).some(layer=>layer.type==='text'));
  const pageNumbers=new Map(visiblePages.map(({index},i)=>[index,i+1]));
  const choices=pageMediaChoices(draft),currentMedia=choices.filter(choice=>choice.pageIndex===index);
  const otherMedia=choices.filter(choice=>choice.pageIndex!==index);
  const closing=useRef(false),rail=useRef(null),hold=useRef(null),[newPageId,setNewPageId]=useState(null),[pageMenu,setPageMenu]=useState(null);
  useLayoutEffect(()=>{dialog.current.showModal();},[]);
  useEffect(()=>{const cancel=()=>{clearTimeout(hold.current?.timer);hold.current?.source?.removeAttribute('data-holding');hold.current=null;};window.addEventListener('blur',cancel);return()=>{cancel();window.removeEventListener('blur',cancel);};},[]);
  useLayoutEffect(()=>{if(newPageId)rail.current?.querySelector('[data-new="true"]')?.scrollIntoView({block:'nearest',inline:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});},[newPageId]);
  function cancelHold(){clearTimeout(hold.current?.timer);hold.current?.source?.removeAttribute('data-holding');}
  function openActions(source,id){cancelHold();setPageMenu({id,anchor:{current:source}});}
  function beginHold(event,id){
    if(event.button!==0)return;cancelHold();const source=event.currentTarget,state={x:event.clientX,y:event.clientY,fired:false,id,source};
    state.timer=setTimeout(()=>{state.fired=true;source.dataset.holding='true';},450);hold.current=state;
  }
  function moveHold(event){const state=hold.current;if(state&&Math.hypot(event.clientX-state.x,event.clientY-state.y)>8){state.fired=false;cancelHold();}}
  function endHold(event,id){const state=hold.current;cancelHold();if(event.button===2||state?.id===id&&state.fired){event.preventDefault();const source=event.currentTarget;setTimeout(()=>{if(source.isConnected&&!closing.current)openActions(source,id);},0);}}
  function choosePage(actual,id){cancelHold();if(hold.current?.id===id&&hold.current.fired){hold.current=null;return;}setPageMenu(null);setDraft(prior=>selectPage(prior,actual));}
  function createPage(){setPageMenu(null);cancelHold();const next=addPage(draft);setNewPageId(pageFor(next).id);setDraft(next);}
  function removePage(id){setPageMenu(null);setDraft(prior=>{const target=prior.pages.findIndex(item=>item.id===id);return target<0?prior:deletePage(prior,target);});requestAnimationFrame(()=>dialog.current?.querySelector('.page-actions')?.focus({preventScroll:true}));}
  async function close(apply=false){if(closing.current)return;closing.current=true;setPageMenu(null);cancelHold();const element=dialog.current;if(!matchMedia('(prefers-reduced-motion: reduce)').matches){try{await element.animate([{translate:'0 0',opacity:1},{translate:'0 100%',opacity:.5}],{duration:180,easing:'ease-in',fill:'forwards'}).finished;}catch{}}if(apply)onApply(finishPages(draft));element.close();}
  function extractMedia(ids){
    setPageMenu(null);
    setDraft(prior=>ids.reduceRight((next,id)=>assignObject(next,page.id,id,false),prior));
  }
  function moveHere(event,id){
    const keyboard=event.detail===0;
    setDraft(prior=>assignObject(prior,page.id,id));
    if(keyboard)requestAnimationFrame(()=>dialog.current?.querySelector('.page-media-current [aria-pressed="true"]')?.focus({preventScroll:true}));
  }
  function mediaTile(choice,i,move=false){
    const origin=t('Page')+' '+pageNumbers.get(choice.pageIndex);
    const label=t(choice.source.kind==='video'?'Video':'Image')+' '+(i+1);
    const selected=page.settings.selectedLayerId===choice.id;
    return <button type="button" className="merge-image-choice" key={choice.id}
      aria-label={move?t('Move to this page')+' · '+origin+' · '+label:label}
      aria-pressed={move?undefined:selected}
      onClick={move?event=>moveHere(event,choice.id):()=>setDraft(prior=>selectObject(prior,choice.id))}>
      <span className="merge-source-art">
        {choice.source.kind==='video'?<video src={choice.source.url} muted playsInline preload="metadata" aria-hidden="true"/>
          :<img src={choice.source.url} alt="" loading="lazy" draggable={false}/>}
        {(move||selected)&&<span className="merge-check"><PageIcon name={move?'plus':'check'}/></span>}
      </span>
      {move&&<span className="merge-media-origin">{origin}</span>}
    </button>;
  }
  return <dialog ref={dialog} className="merge-sheet bottom-sheet pages-sheet" closedby="any" onClick={event=>dismissBackdrop(event,()=>close())} aria-labelledby="pages-title" onClose={onClose} onCancel={event=>{event.preventDefault();close();}}><form method="dialog" onSubmit={event=>{event.preventDefault();close(true);}}>
    <span className="merge-grabber" aria-hidden="true"/><header className="merge-heading"><button type="button" className="ios-text-back" onClick={()=>close()}>{t('Cancel')}</button><h2 id="pages-title">{t('Page')}</h2><button type="submit" className="ios-text-done">{t('Done')}</button></header>
    <div ref={rail} className="merge-page-rail" role="group" aria-label={t('Select a page')} onScroll={cancelHold}>{visiblePages.map(({page:item,index:actual},i)=><button type="button" key={item.id} className={'merge-page-card'+(!('CSSStartingStyleRule' in window)?' page-entry-fallback':'')} data-new={item.id===newPageId?'true':undefined} aria-label={t('Page')+' '+(i+1)} aria-pressed={actual===index} aria-haspopup="menu" onPointerDown={event=>beginHold(event,item.id)} onPointerMove={moveHold} onPointerUp={event=>endHold(event,item.id)} onPointerCancel={()=>{cancelHold();hold.current=null;}} onContextMenu={event=>event.preventDefault()} onKeyDown={event=>{if(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10'){event.preventDefault();openActions(event.currentTarget,item.id);}}} onClick={()=>choosePage(actual,item.id)}><span className="merge-page-art">{renderPreview(draft,actual)}</span><span>{i+1}{item.objects.length>1&&<small>{item.objects.length}</small>}</span></button>)}<button type="button" className="merge-page-card merge-new-page" aria-label={t('New page')} onPointerDown={jellyPress} onClick={createPage}><span className="merge-page-art"><PageIcon name="plus"/></span><span>{t('New page')}</span></button></div>
    <div className="merge-section-heading">
      <h3 id="page-media-title">{t('On this page')}</h3>
      <div className="page-heading-actions">
        <button type="button" disabled={currentMedia.length<2} aria-label={t('Split into pages')} onClick={()=>extractMedia(currentMedia.slice(1).map(choice=>choice.id))}><PageIcon name="split"/>{t('Split')}</button>
        <button type="button" className="page-actions" aria-label={t('Page actions')} aria-haspopup="menu" aria-expanded={!!pageMenu} onClick={event=>openActions(event.currentTarget,page.id)}><SelectionIcon name="more"/></button>
      </div>
    </div>
    {currentMedia.length?<div className="merge-image-grid page-media-current" role="group" aria-labelledby="page-media-title">{currentMedia.map((choice,i)=>mediaTile(choice,i))}</div>
      :<p className="page-media-empty">{t('No images on this page.')}</p>}
    {otherMedia.length>0&&<>
      <div className="merge-section-heading page-media-next"><h3 id="page-move-title">{t('Move from another page')}</h3></div>
      <div className="merge-image-grid" role="group" aria-labelledby="page-move-title">{otherMedia.map((choice,i)=>mediaTile(choice,i,true))}</div>
    </>}
  </form>{pageMenu&&<Picker menu anchor={pageMenu.anchor} placement="above" label={t('Page actions')} className="action-menu page-context-menu" onClose={()=>setPageMenu(null)}>
    {pageMenu.id===page.id&&currentMedia.length>1&&<button type="button" disabled={!currentMedia.some(choice=>choice.id===page.settings.selectedLayerId)} onClick={()=>extractMedia([page.settings.selectedLayerId])}><PageIcon name="split"/><span>{t('Move to new page')}</span></button>}
    <button type="button" className="destructive" onClick={()=>removePage(pageMenu.id)}><SelectionIcon name="trash"/><span>{t('Delete page')}</span></button>
  </Picker>}</dialog>;
}
