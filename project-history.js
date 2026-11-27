const ignoredSettings=new Set(['selectedLayerId']);
function equalObject(a,b,ignore=new Set()) {
  if(a===b)return true;if(!a||!b)return false;
  const keys=new Set([...Object.keys(a),...Object.keys(b)]);
  for(const key of keys){if(ignore.has(key))continue;if(a[key]===b[key])continue;
    if(['pose','slot','framedPose','settings'].includes(key)&&equalObject(a[key],b[key],ignoredSettings))continue;
    if(['layers','objects'].includes(key)&&Array.isArray(a[key])&&Array.isArray(b[key])&&a[key].length===b[key].length&&a[key].every((layer,i)=>equalObject(layer,b[key][i])))continue;
    return false;
  }return true;
}
export function sameProjectContent(a,b) {
  const pagesEqual=(a,b)=>a===b||Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((page,index)=>equalObject(page,b[index],new Set(['selectedObjectId'])));
  return a===b||Boolean(a&&b&&a.title===b.title&&a.layout===b.layout&&a.collageRatio===b.collageRatio&&a.photo===b.photo&&pagesEqual(a.pages,b.pages)&&equalObject(a.settings,b.settings,ignoredSettings)&&a.items.length===b.items.length&&a.items.every((item,i)=>{const other=b.items[i];return item.id===other.id&&item.source===other.source&&item.photo===other.photo&&equalObject(item.settings,other.settings,ignoredSettings);}));
}
export function createHistory(project){return {project,past:[],future:[],transaction:null};}
export function projectHistory(state,action){
  if(action.type==='begin')return state.transaction?state:{...state,transaction:{recorded:false}};
  if(action.type==='end')return state.transaction?{...state,transaction:null}:state;
  if(action.type==='undo'){
    if(!state.past.length)return state;
    const previous=state.past.at(-1),project=previous.id===state.project.id?previous:{...previous,id:state.project.id};
    return {project,past:state.past.slice(0,-1),future:[state.project,...(state.future??[])].slice(0,50),transaction:null};
  }
  if(action.type==='redo'){
    if(!state.future?.length)return state;
    const [next,...future]=state.future,project=next.id===state.project.id?next:{...next,id:state.project.id};
    return {project,past:[...state.past.slice(-49),state.project],future,transaction:null};
  }
  if(action.type!=='set')return state;
  const project=typeof action.value==='function'?action.value(state.project):action.value;
  if(action.reset)return createHistory(project);
  if(project===state.project)return state;
  if(sameProjectContent(project,state.project))return {...state,project};
  const record=!state.transaction?.recorded;
  // A new edit starts a new branch, so anything that could be redone is dropped.
  return {project,past:record?[...state.past.slice(-49),state.project]:state.past,future:[],transaction:state.transaction?{recorded:true}:null};
}
