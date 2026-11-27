import {recordingInScene} from './video-plan.js';
import { createRenderer, loadWatermarkBadge, ratios } from './render.js';
import { clipProgress } from './media.js';
import {exportPageIndices} from './page-model.js';
import { sceneFor } from './project.js';
import { loadTextFonts } from './text-fonts.js';
import { loadBadgeAvatar } from './profile-badge.js';

let nativeWebP;
function canEncodeWebP(){
  return nativeWebP??=new Promise(resolve=>{
    const probe=document.createElement('canvas');probe.width=probe.height=1;
    try{probe.toBlob(blob=>resolve(blob?.type==='image/webp'),'image/webp');}catch{resolve(false);}
  });
}

function makeArtboard(settings, scale) {
  const canvas = document.createElement('canvas');
  const [width, height] = ratios[settings.ratio];
  canvas.width = width * scale;
  canvas.height = height * scale;
  return { canvas, paint: createRenderer(canvas,{cacheScene:false}) };
}

export async function imageBlob(settings, media, photo, scale, mime, report=()=>{}, signal) {
  const check=()=>{if(signal?.aborted)throw new DOMException('Export canceled','AbortError');};
  check();report(.05);
  await Promise.all([loadWatermarkBadge(settings.watermarkBadge),loadBadgeAvatar(settings.mark?.badge),loadTextFonts(settings)]);
  check();report(.15);
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const { canvas, paint } = makeArtboard(settings, scale);
  const progress = media.kind === 'video' ? clipProgress(media.element, settings) : 0;
  paint(settings, media, photo, progress);report(.4);
  if (mime === 'image/jpeg' && settings.background === 'transparent') {
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  try{
    // Probe with one pixel, avoiding a wasted full-size PNG encode on WebKit.
    const native=mime!=='image/webp'||await canEncodeWebP();check();
    let blob=native?await new Promise((resolve,reject)=>{try{canvas.toBlob(resolve,mime,...(mime==='image/png'?[]:[.98]));}catch(error){reject(error);}}):null;
    check();
    // WebKit may silently return PNG when asked to encode WebP.
    if(mime==='image/webp'&&blob?.type!==mime){
      report(.6);const {encodeWebP}=await import('./webp-encoder.js');check();blob=await encodeWebP(canvas,signal);
    }
    check();if(!blob||blob.type!==mime)throw new Error('Could not encode the image. Try Full HD.');
    report(1);return blob;
  }finally{paint.dispose();canvas.width=canvas.height=1;}
}

export async function imageArchive(project, scale, mime, extension, stem, signal, progress) {
  const { zipSync } = await import('fflate');
  const entries = {};
  const indices=exportPageIndices(project);
  for (const index of indices) {
    if (signal.aborted) throw new DOMException('Export canceled', 'AbortError');
    const { settings, source, photo } = sceneFor(project, index);
    const blob = await imageBlob(settings, source, photo, scale, mime);
    const position = String(index + 1).padStart(2, '0');
    entries[`${stem}-${position}.${extension}`] = new Uint8Array(await blob.arrayBuffer());
    progress(Object.keys(entries).length / indices.length);
  }
  return new Blob([zipSync(entries, { level: 0 })], { type: 'application/zip' });
}

export function videoFormats() {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return [];
  const options = [
    ['video/mp4;codecs=avc1.42E028,mp4a.40.2', 'MP4', 'mp4'],
    ['video/mp4;codecs=avc1,mp4a.40.2', 'MP4', 'mp4'],
    ['video/mp4', 'MP4', 'mp4'],
    ['video/webm;codecs=vp8,opus', 'WebM', 'webm'],
    ['video/webm;codecs=vp9,opus', 'WebM', 'webm'],
    ['video/webm', 'WebM', 'webm'],
  ];
  const supported = new Set();
  return options.filter(([type, label]) => {
    if (supported.has(label) || !MediaRecorder.isTypeSupported(type)) return false;
    supported.add(label);
    return true;
  });
}

export function prepareAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return null;
  const context = new Audio();
  const ready = context.resume().catch(() => {});
  return { context, ready };
}

export async function videoBlob(settings,sources,photo,mimeType,signal,progress,audio,quality='high'){
  try{
    if(!recordingInScene(settings,sources))throw new Error('No recording on this canvas.');
    if(!globalThis.VideoEncoder||!globalThis.VideoDecoder)throw new Error('Quality video export is unavailable in this browser. Update Telegram or open the app in a supported browser.');
    const {offlineVideo}=await import('./offline-video.js');
    const blob=await offlineVideo(settings,sources,photo,quality,signal,progress);
    if(!blob)throw new Error('Quality video export is unavailable for this recording in this browser. Update Telegram or try a supported browser.');
    return blob;
  }finally{if(audio&&audio.context.state!=='closed')await audio.context.close().catch(()=>{});}
}
