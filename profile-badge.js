const avatars=new Map();

export function badgeAvatar(url) {
  return avatars.get(url)?.image;
}

export function loadBadgeAvatar(url) {
  if(!/^data:image\/png;base64,[\w+/=]+$/.test(url??'')||url.length>300000)return Promise.resolve();
  if(avatars.has(url))return avatars.get(url).ready;
  if(avatars.size>=32)avatars.delete(avatars.keys().next().value);
  const image=new Image();
  const entry={image:null,ready:new Promise(resolve=>{
    image.onload=()=>{entry.image=image;resolve();};
    image.onerror=()=>resolve();
    image.src=url;
  })};
  avatars.set(url,entry);
  return entry.ready;
}

export async function makeProfileBadge(profile,telegram) {
  const name=[profile.firstName,profile.lastName].filter(Boolean).join(' ').trim();
  const initials=(name||profile.username||'T').split(/\s+/).slice(0,2).map(part=>Array.from(part)[0]).join('').toUpperCase();
  const badge={initials,avatar:''};
  if(telegram?.initData){
    try{
      const response=await fetch('/api/profile-avatar',{method:'POST',headers:{'X-Telegram-Init-Data':telegram.initData},signal:AbortSignal.timeout(9500)});
      if(response.ok&&response.status!==204){
        const avatarType=response.headers.get('X-Avatar-Type')??response.headers.get('Content-Type');
        if(!['image/jpeg','image/png','image/webp','image/svg+xml'].includes(avatarType))throw Error('Invalid profile photo');
        const url=URL.createObjectURL(new Blob([await response.arrayBuffer()],{type:avatarType}));
        try{
          const image=new Image();image.src=url;await image.decode();
          const canvas=document.createElement('canvas');canvas.width=canvas.height=160;
          const side=Math.min(image.naturalWidth,image.naturalHeight);
          canvas.getContext('2d').drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,160,160);
          badge.avatar=canvas.toDataURL();
          await loadBadgeAvatar(badge.avatar);
        }finally{URL.revokeObjectURL(url);}
      }
    }catch{ /* The initials remain available if the photo cannot load. */ }
  }
  return {text:profile.username?'@'+profile.username:name||'Telegram',badge};
}
