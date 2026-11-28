import {useCallback,useEffect,useRef,useState} from 'react';
import {drafts} from './media.js';

export function useDrafts(owner,telegram){
  const [state,setState]=useState({owner,list:null,error:false,loading:true});
  const generation=useRef(0),timer=useRef(null);
  const refresh=useCallback(async(attempt=0)=>{
    const token=++generation.current;
    clearTimeout(timer.current);
    setState(previous=>previous.owner===owner?{...previous,loading:true,error:false}:{owner,list:null,loading:true,error:false});
    try{
      const list=await drafts.list();
      if(token!==generation.current)return;
      setState({owner,list:list.toSorted((a,b)=>b.updated-a.updated),loading:false,error:false});
    }catch{
      if(token!==generation.current)return;
      setState(previous=>({...previous,loading:false,error:true}));
      if(attempt<3)timer.current=setTimeout(()=>refresh(attempt+1),500*2**attempt);
    }
  },[owner]);
  useEffect(()=>{
    void refresh();
    const resume=()=>{if(!document.hidden)void refresh();};
    document.addEventListener('visibilitychange',resume);
    window.addEventListener('pageshow',resume);
    telegram?.onEvent?.('activated',resume);
    return()=>{
      ++generation.current;clearTimeout(timer.current);
      document.removeEventListener('visibilitychange',resume);
      window.removeEventListener('pageshow',resume);
      telegram?.offEvent?.('activated',resume);
    };
  },[refresh,telegram]);
  return {...(state.owner===owner?state:{list:null,error:false,loading:true}),refresh};
}
