export const sample = { kind: 'image', name: 'Alpine sample', example: true };
export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

export function isMedia(file) {
  if (!file) return false;
  return /^(image|video)\//.test(file.type) || /\.(png|jpe?g|webp|gif|bmp|avif|heic|heif|mp4|m4v|mov|webm|ogv)$/i.test(file.name);
}

export function fromFile(file) {
  if (file.size > MAX_IMPORT_BYTES) throw new Error('Each file must be 20 MB or smaller.');
  const kind = file.type.startsWith('video/') || /\.(mp4|m4v|mov|webm|ogv)$/i.test(file.name) ? 'video' : 'image';
  return { kind, blob: file, name: file.name };
}

export function loadMedia(info) {
  if (!info) return Promise.resolve(null);
  const { kind, name, example, bytes, type } = info;
  const blob = info.blob ?? (bytes ? new Blob([bytes], { type }) : undefined);
  const url = blob ? URL.createObjectURL(blob) : new URL('./assets/alpine.webp', import.meta.url).href;
  const element = kind === 'video' ? document.createElement('video') : new Image();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(fail, 20000);
    const eventName = kind === 'video' ? 'loadeddata' : 'load';
    function cleanup() {
      clearTimeout(timer);
      element.removeEventListener(eventName, ready);
      element.removeEventListener('error', fail);
    }
    function ready() {
      const width = element.videoWidth || element.naturalWidth;
      const height = element.videoHeight || element.naturalHeight;
      if (!width || !height || (kind === 'video' && (!Number.isFinite(element.duration) || element.duration <= 0))) {
        fail();
        return;
      }
      cleanup();
      resolve({ kind, name, example, blob, element, width, height, url });
    }
    function fail() {
      cleanup();
      releaseMedia({ element, url, kind, blob });
      reject(new Error(kind === 'video' ? 'This browser could not open the recording. Try an H.264 MP4 or WebM.' : 'This browser could not open the image. Try PNG, JPEG, or WebP.'));
    }
    if (kind === 'video') {
      element.playsInline = true;
      element.preload = 'auto';
      element.muted = true;
    }
    element.addEventListener(eventName, ready, { once: true });
    element.addEventListener('error', fail, { once: true });
    element.src = url;
    if (kind === 'video') element.load();
  });
}

export function releaseMedia(media) {
  if (!media) return;
  if (media.kind === 'video') {
    media.element.pause();
    media.element.removeAttribute('src');
    media.element.load();
  }
  if (media.blob) URL.revokeObjectURL(media.url);
}

export function mediaInfo(media) {
  if (!media) return null;
  const { kind, blob, name, example } = media;
  return { kind, blob, name, example };
}

export async function storedMedia(media) {
  if (!media) return null;
  const { blob, ...info } = mediaInfo(media);
  if (!blob) return info;
  // Some WebKit environments support IndexedDB but cannot store File or Blob values.
  return { ...info, bytes: await blob.arrayBuffer(), type: blob.type };
}

export function trimRange(settings, duration) {
  const minimum = Math.min(duration, .1);
  const start = Math.max(0, Math.min(duration - minimum, settings.trimStart));
  const end = Math.max(start + minimum, Math.min(duration, settings.trimEnd ?? duration));
  return [start, end];
}

export function clipProgress(video, settings) {
  const [start, end] = trimRange(settings, video.duration);
  return Math.max(0, Math.min(1, (video.currentTime - start) / (end - start) || 0));
}

let opening;
let draftOwner = '';
export function setDraftOwner(id) {
  const next = id ? String(id) : '';
  if (next === draftOwner) return;
  opening?.then(database => database.close()).catch(() => {});
  opening = null;
  draftOwner = next;
}
function openDatabase() {
  if (opening) return opening;
  const pending = new Promise((resolve, reject) => {
    let settled=false;
    const timer=setTimeout(()=>{
      settled=true;
      reject(new DOMException('Draft storage did not open in time.','TimeoutError'));
    },10000);
    const request = indexedDB.open(draftOwner ? 'styleit-user-' + draftOwner : 'styleit-studio', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'id' });
    request.onsuccess = () => {
      const db = request.result;
      if(settled){db.close();return;}
      settled=true;clearTimeout(timer);
      const invalidate = () => { db.close(); if(opening===pending)opening=null; };
      db.onversionchange = invalidate;
      db.onclose = invalidate;
      resolve(db);
    };
    request.onerror = () => {settled=true;clearTimeout(timer);reject(request.error);};
  }).catch(error => {
    if(opening===pending)opening = null;
    throw error;
  });
  opening=pending;
  return pending;
}

async function withDrafts(mode, operation, retry=true, owner=draftOwner) {
  if(owner!==draftOwner)throw new DOMException('Draft account changed.','AbortError');
  const database = await openDatabase();
  if(owner!==draftOwner)throw new DOMException('Draft account changed.','AbortError');
  try{return await new Promise((resolve, reject) => {
    const transaction = database.transaction('drafts', mode);
    const request = operation(transaction.objectStore('drafts'));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = () => reject(transaction.error ?? new Error('Storage transaction aborted.'));
    transaction.onerror = () => reject(transaction.error ?? request.error);
  });}catch(error){
    // Retry reads only. A write may already have reached storage.
    if(mode!=='readonly'||!retry||owner!==draftOwner||!['InvalidStateError','AbortError','UnknownError'].includes(error?.name))throw error;
    database.close();
    opening=null;
    return withDrafts(mode,operation,false,owner);
  }
}

export const drafts = {
  save: async (draft,{limit=Infinity}={}) => {
    const owner=draftOwner;
    const database=await openDatabase();
    if(owner!==draftOwner)throw new DOMException('Draft account changed.','AbortError');
    return new Promise((resolve,reject)=>{
      const transaction=database.transaction('drafts','readwrite'),store=transaction.objectStore('drafts');let limited=false;
      const found=store.getKey(draft.id);
      found.onsuccess=()=>{if(found.result!==undefined){store.put(draft);return;}const count=store.count();count.onsuccess=()=>{if(count.result>=limit){limited=true;transaction.abort();}else store.put(draft);};};
      transaction.oncomplete=()=>resolve(draft.id);
      transaction.onabort=()=>{const error=new Error(limited?'Draft limit reached':'Could not save the draft');if(limited)error.code='DRAFT_LIMIT';reject(error);};
      transaction.onerror=()=>reject(transaction.error??new Error('Could not save the draft'));
    });
  },
  list: () => withDrafts('readonly', store => store.getAll()),
  remove: id => withDrafts('readwrite', store => store.delete(id)),
};
