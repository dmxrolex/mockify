// Safari fallback for dialog closedby="any". Dialog padding is not a backdrop.
export function dismissBackdrop(event,close){
  if('closedBy' in HTMLDialogElement.prototype||event.target!==event.currentTarget)return;
  const rect=event.currentTarget.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();
}
