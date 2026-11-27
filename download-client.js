import {recordingInScene} from './video-plan.js';
import { imageBlob,videoBlob } from './exports.js';
import { sceneFor } from './project.js';
import {formatForMedia} from './image-format.js';
import {pageFor} from './page-model.js';

export async function prepareImage(project,quality,signal,report,index=project.pages?project.pageIndex:project.active,audio=null) {
  const scale=quality==='high'?2:1,bundle=project.pages?project.pages.length>1:project.items.length>1&&project.layout!=='collage';
  const name=project.title.trim().replace(/[^\p{L}\p{N}_-]+/gu,'-').replace(/^-|-$/g,'')||'styleit';
  const {settings,source,photo}=sceneFor(project,index);
  if(recordingInScene(settings,source)){const mime='video/mp4',extension='mp4',blob=await videoBlob(settings,source,photo,mime,signal,report,audio,quality);return new File([blob],name+'.'+extension,{type:blob.type});}
  const page=project.pages?pageFor(project,index):null;
  const primary=page?project.items.find(item=>page.objects.some(object=>object.itemId===item.id))?.source:source;
  const {mime,extension}=await formatForMedia(primary);
  const blob=await imageBlob(settings,source,photo,scale,mime,report,signal);
  return new File([blob],name+(bundle?'-'+String(index+1).padStart(2,'0'):'')+'.'+extension,{type:mime});
}

export async function ensureBotAccess(app) {
  if(app?.isVersionAtLeast?.('6.9')&&app.requestWriteAccess&&!app.initDataUnsafe?.user?.allows_write_to_pm){
    const allowed=await new Promise(resolve=>app.requestWriteAccess(resolve));
    if(!allowed)throw new Error('Allow messages from the bot to receive your file.');
  }
}

export function deliverToBot(app,file,requestId,signal,report,quality='high') {
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open('POST','/api/exports/telegram');
    xhr.setRequestHeader('X-Telegram-Init-Data',app.initData);xhr.setRequestHeader('X-Export-ID',requestId);
    xhr.setRequestHeader('X-Export-Quality',quality);
    const abort=()=>xhr.abort();signal.addEventListener('abort',abort,{once:true});
    const cleanup=()=>signal.removeEventListener('abort',abort);
    xhr.upload.onprogress=event=>{if(event.lengthComputable)report(event.loaded/event.total);};
    xhr.onload=()=>{cleanup();let data;try{data=JSON.parse(xhr.responseText);}catch{reject(new Error('Delivery could not be confirmed. Please check your bot chat.'));return;}if(xhr.status>=200&&xhr.status<300&&data.delivered)resolve(data);else {const error=new Error(data.error||'Could not deliver the file.');error.account=data.account;reject(error);}};
    xhr.onerror=()=>{cleanup();reject(new Error('Connection interrupted. Please check your bot chat before retrying.'));};xhr.onabort=()=>{cleanup();reject(new DOMException('Canceled','AbortError'));};
    if(signal.aborted){cleanup();reject(new DOMException('Canceled','AbortError'));return;}
    const form=new FormData();form.set('file',file,file.name);xhr.send(form);
  });
}

export function saveBrowserFile(result) {
  const link=document.createElement('a');link.href=result.url;link.download=result.file.name;document.body.append(link);link.click();link.remove();
}
