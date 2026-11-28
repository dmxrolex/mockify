// A tap on the dim area around a modal dialog closes it. Skipped only where the dialog itself
// asks for native light dismiss (closedby="any") and the browser supports it. Padding is not a backdrop.
export function dismissBackdrop(event,close){
  if(event.target!==event.currentTarget)return;
  if(event.currentTarget.getAttribute('closedby')==='any'&&'closedBy' in HTMLDialogElement.prototype)return;
  const rect=event.currentTarget.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();
}
