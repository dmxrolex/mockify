import {loadBadgeAvatar} from './profile-badge.js';
const files = import.meta.glob('./assets/fonts/*.{woff2,ttf}', { eager:true, query:'?url', import:'default' });

export const textFonts = [
  ['impact','Impact','Display'], ['anton','Anton','Display'], ['archivoblack','Archivo Black','Display'], ['bebasneue','Bebas Neue','Display'], ['inter','Inter','Sans'], ['poppins','Poppins','Sans'], ['montserrat','Montserrat','Sans'],
  ['manrope','Manrope','Sans'], ['dmsans','DM Sans','Sans'], ['spacegrotesk','Space Grotesk','Sans'],
  ['nunito','Nunito','Sans'], ['plusjakartasans','Plus Jakarta Sans','Sans'],
  ['playfairdisplay','Playfair Display','Serif'], ['cormorantgaramond','Cormorant Garamond','Serif'],
  ['lora','Lora','Serif'], ['caveat','Caveat','Script'],
].map(([id,name,category])=>({id,name,category,family:'Styleit '+name}));

export function fontFor(id) {
  return textFonts.find(font=>font.id===id) ?? textFonts.find(font=>font.id==='inter');
}

const loading = new Map();
export function loadTextFonts(settings) {
  const layers=Array.isArray(settings.layers)?settings.layers.filter(layer=>layer.type==='text'):[settings.textOverlay];
  return Promise.all(layers.flatMap(layer=>[loadTextFont(layer),loadBadgeAvatar(layer?.badge?.avatar)]));
}
export function loadTextFont(model) {
  if(!model?.enabled || !String(model.text??'').trim()) return Promise.resolve();
  const font=fontFor(model.font);
  const weight=[400,600,700].includes(model.weight)?model.weight:600;
  const key=font.id+'-'+weight;
  if(!loading.has(key)) {
    const bundled=font.id==='impact'?'anton':font.id;
    const url=files[`./assets/fonts/${key}.woff2`]??files[`./assets/fonts/${bundled}.ttf`];
    const face=new FontFace(font.family,(font.id==='impact'?'local("Impact"),':'')+`url("${url}")`,{weight:String(weight),style:'normal',display:'swap'});
    const ready=face.load().then(loaded=>{document.fonts.add(loaded);return document.fonts.load(`${weight} 32px "${font.family}"`,String(model.text));}).catch(()=>{loading.delete(key);throw new Error('The text font could not load. Please try again.');});
    loading.set(key,ready);
  }
  return loading.get(key);
}

export function textFontCSS(model,size) {
  return `${model.italic?'italic ':''}${model.weight} ${size}px "${fontFor(model.font).family}", system-ui, sans-serif`;
}


