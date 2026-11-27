import {useCallback,useEffect,useReducer} from 'react';
import {flushSync} from 'react-dom';
import {createHistory,projectHistory} from './project-history.js';
export function useProjectHistory(initial,enabled){
  const [state,dispatch]=useReducer(projectHistory,null,()=>createHistory(typeof initial==='function'?initial():initial));
  const setProject=useCallback((value,options={})=>dispatch({type:'set',value,reset:options.reset}),[]);
  const undo=useCallback(()=>dispatch({type:'undo'}),[]);
  useEffect(()=>{
    if(!enabled)return;
    const pointers=new Set(),keys=new Set();let ending;
    const begin=()=>{clearTimeout(ending);flushSync(()=>dispatch({type:'begin'}));};
    // WebKit can run microtasks between native event listeners. End after the
    // whole release event so the canvas's final buffered move stays in this undo.
    const end=()=>{clearTimeout(ending);ending=setTimeout(()=>{if(!pointers.size&&!keys.size)flushSync(()=>dispatch({type:'end'}));},0);};
    const down=e=>{if(e.button!==0||e.target.closest('.editor-undo'))return;if(!e.target.closest('.app-shell.is-editor,.editor-picker,.bottom-sheet'))return;pointers.add(e.pointerId);begin();};
    const up=e=>{pointers.delete(e.pointerId);end();};
    const keydown=e=>{
      const editable=e.target.closest('textarea,input:not([type="range"]):not([type="radio"]):not([type="checkbox"]),[contenteditable="true"]');
      if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'&&!editable){e.preventDefault();undo();return;}
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)&&!editable){keys.add(e.key);begin();}
    };
    const keyup=e=>{keys.delete(e.key);end();};
    const blur=()=>{pointers.clear();keys.clear();end();};
    document.addEventListener('pointerdown',down,true);document.addEventListener('pointerup',up,true);document.addEventListener('pointercancel',up,true);document.addEventListener('keydown',keydown,true);document.addEventListener('keyup',keyup,true);window.addEventListener('blur',blur);
    return()=>{clearTimeout(ending);document.removeEventListener('pointerdown',down,true);document.removeEventListener('pointerup',up,true);document.removeEventListener('pointercancel',up,true);document.removeEventListener('keydown',keydown,true);document.removeEventListener('keyup',keyup,true);window.removeEventListener('blur',blur);dispatch({type:'end'});};
  },[enabled,undo]);
  return {project:state.project,setProject,undo,canUndo:state.past.length>0,past:state.past};
}
