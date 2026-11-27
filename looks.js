// Looks: one tap sets background, phone finish, shadow and status bar together.
import {backdrops,finishes} from './render.js';
import {changePage,pageFor} from './page-model.js';

// Looks carry the whole style: background, format and watermark as well as the phone.
const pageKeys=['background','palette','color','ratio','mark'];
const framedKeys=['finish','shadowStyle','shadow','shadowAngle','cleanup','statusTone','statusStyle'];
const flatKeys=['shadowStyle','shadow','shadowAngle','imageEdges'];
export const lookKeys=[...new Set([...pageKeys,...framedKeys,...flatKeys])];

export const builtInLooks=[
  {id:'aurora',name:'Aurora',settings:{background:'gradient',palette:'aurora',finish:'silver',shadowStyle:'soft',shadow:55}},
  {id:'tide',name:'Tide',settings:{background:'gradient',palette:'tide',finish:'cobalt',shadowStyle:'soft',shadow:55}},
  {id:'dawn',name:'Dawn',settings:{background:'gradient',palette:'dawn',finish:'rose',shadowStyle:'soft',shadow:45}},
  {id:'ember',name:'Ember',settings:{background:'gradient',palette:'ember',finish:'graphite',shadowStyle:'soft',shadow:55}},
  {id:'midnight',name:'Midnight',settings:{background:'gradient',palette:'dusk',finish:'graphite',shadowStyle:'long',shadow:60,shadowAngle:45}},
  {id:'paper',name:'Paper',settings:{background:'solid',color:'#f2f2f7',finish:'silver',shadowStyle:'soft',shadow:35}},
  {id:'jade',name:'Jade',settings:{background:'gradient',palette:'jade',finish:'graphite',shadowStyle:'soft',shadow:50}},
  {id:'clay',name:'Clay',settings:{background:'gradient',palette:'clay',finish:'rose',shadowStyle:'long',shadow:50,shadowAngle:35}},
];

const pick=(settings,keys)=>Object.fromEntries(keys.filter(key=>settings?.[key]!==undefined).map(key=>[key,settings[key]]));

// The current design as a reusable look. Photo backgrounds fall back to the gradient.
export function captureLook(settings){
  const look=pick(settings,lookKeys);
  if(look.background==='photo'||look.background==='blur')look.background='gradient';
  return look;
}

export function lookPreview(look){
  const s=look.settings,palette=backdrops[s.palette]??backdrops.aurora;
  const background=s.background==='solid'?s.color??'#f2f2f7':s.background==='transparent'?'repeating-conic-gradient(#3a3a3e 0 25%,#2a2a2e 0 50%) 0 0/8px 8px':`linear-gradient(150deg,${palette.colors.join(',')})`;
  return {background,finish:finishes[s.finish]?.swatch??'#343343',long:s.shadowStyle==='long'};
}

export const sameLook=(look,settings)=>Boolean(settings)&&['background','palette','finish','shadowStyle'].every(key=>look.settings[key]===undefined||look.settings[key]===settings[key])&&(look.settings.background!=='solid'||look.settings.color===settings.color);

// Every object on the page takes the parts of the look that fit it: framed phones get the
// finish and status bar, frameless images keep their own corners and media.
export function applyLook(project,look){
  const page=pageFor(project);if(!page)return project;
  const s=look.settings;
  let next=changePage(project,pick(s,pageKeys));
  const target=pageFor(next);
  const objects=target.objects.map(object=>{
    if(object.pose.hideDevice||object.pose.assetKind)return object;
    const patch=pick(s,object.pose.device==='flat'?flatKeys:framedKeys);
    return Object.keys(patch).length?{...object,pose:{...object.pose,...patch}}:object;
  });
  return {...next,pages:next.pages.map(item=>item.id===target.id?{...item,objects}:item)};
}

const storeKey='mockify.looks';
export function savedLooks(){try{const value=JSON.parse(localStorage.getItem(storeKey));return Array.isArray(value)?value.filter(item=>item?.id&&item.settings):[];}catch{return [];}}
export function storeLooks(list){try{localStorage.setItem(storeKey,JSON.stringify(list.slice(0,8)));return true;}catch{return false;}}
export function findLook(id){return savedLooks().find(look=>look.id===id)??builtInLooks.find(look=>look.id===id)??null;}
