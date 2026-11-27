let current=null,suppressUntil=0,suppressedOwner=null;
export const canvasGestureActive=()=>Boolean(current);
document.addEventListener('click',event=>{if(performance.now()<suppressUntil&&suppressedOwner?.contains(event.target)){suppressUntil=0;suppressedOwner=null;event.preventDefault();event.stopImmediatePropagation();}},true);
export function captureCanvasGesture(owner,event,handlers){
  if(current&&current.owner!==owner)return false;
  if(!current){
    const state=current={owner,pointers:new Set(),captures:new Map(),start:{x:event.clientX,y:event.clientY},moved:false};
    const move=e=>{if(!state.pointers.has(e.pointerId))return;e.stopPropagation();if(Math.hypot(e.clientX-state.start.x,e.clientY-state.start.y)>4)state.moved=true;handlers.move(e);};
    const end=e=>{if(!state.pointers.has(e.pointerId))return;e.stopPropagation();handlers.end(e);state.pointers.delete(e.pointerId);if(!state.pointers.size){if(state.moved){suppressUntil=performance.now()+120;suppressedOwner=owner;}state.cleanup();}};
    const down=e=>{if(!owner.contains(e.target)){e.preventDefault();e.stopImmediatePropagation();}};
    const cancel=()=>{for(const pointerId of [...state.pointers])end(new PointerEvent('pointercancel',{pointerId}));};
    const visibility=()=>{if(document.hidden)cancel();};
    state.cleanup=()=>{document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',end,true);document.removeEventListener('pointercancel',end,true);document.removeEventListener('pointerdown',down,true);window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',visibility);if(current===state)current=null;for(const [id,target] of state.captures)if(target.hasPointerCapture(id))target.releasePointerCapture(id);};
    document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',end,true);document.addEventListener('pointerdown',down,true);
    window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',visibility);
  }
  current.pointers.add(event.pointerId);current.captures.set(event.pointerId,event.currentTarget);event.currentTarget.setPointerCapture(event.pointerId);return true;
}
export function releaseCanvasGesture(owner){if(current?.owner===owner)current.cleanup();}
