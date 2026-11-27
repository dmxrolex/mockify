// Native Telegram haptics replace the old synthesized sounds; the preference lives in Settings.
let enabled=true,last=0;
const feedback=()=>globalThis.Telegram?.WebApp?.HapticFeedback;
export function setHapticsEnabled(value){enabled=value!==false;}
export function hapticSelection(){
  if(!enabled)return;const now=performance.now();if(now-last<40)return;last=now;
  try{feedback()?.selectionChanged?.();}catch{}
}
export function hapticImpact(style='light'){if(!enabled)return;try{feedback()?.impactOccurred?.(style);}catch{}}
