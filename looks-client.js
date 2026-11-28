// Looks in the app: the server keeps them for Telegram users; the dev server keeps them locally.
import {lookLimit} from './templates.js';
const key='mockify.templates';
const local=()=>{try{const list=JSON.parse(localStorage.getItem(key));return Array.isArray(list)?list:[];}catch{return [];}};
const store=list=>{try{localStorage.setItem(key,JSON.stringify(list));return true;}catch{return false;}};

async function remote(telegram,body){
  const response=await fetch('/api/looks',{method:'POST',headers:{'Content-Type':'application/json','X-Telegram-Init-Data':telegram.initData},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(data.error==='look_limit'?'look_limit':data.error||'Looks are unavailable right now.');error.limit=data.limit;throw error;}
  return data;
}
export async function loadLooks(telegram,premium){
  if(telegram)return remote(telegram,{action:'list'});
  return {looks:local(),limit:lookLimit(premium)};
}
export async function saveLook(telegram,look,premium){
  if(telegram)return remote(telegram,{action:'save',look});
  const list=local(),exists=list.some(item=>item.id===look.id),limit=lookLimit(premium);
  if(!exists&&list.length>=limit){const error=new Error('look_limit');error.limit=limit;throw error;}
  const next=[{...look,updatedAt:Date.now()},...list.filter(item=>item.id!==look.id)];
  if(!store(next))throw new Error('Could not save the look.');
  return {looks:next,limit};
}
export async function deleteLook(telegram,id,premium){
  if(telegram)return remote(telegram,{action:'delete',id});
  const next=local().filter(item=>item.id!==id);store(next);return {looks:next,limit:lookLimit(premium)};
}
