import React from 'react';
// Lucide outlined icon paths (ISC); gesture rings use the same 24px grid.
const diamond='M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41L13.7 2.71a2.41 2.41 0 0 0-3.41 0Z';
export function VideoIcon({name}){
  const paths={
    play:<path d="m8 5 11 7-11 7Z"/>,pause:<path d="M9 5v14m6-14v14"/>,
    split:<><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.12 8.12 12 12M20 4 8.12 15.88m6.68-1.08L20 20"/></>,
    keyframe:<path d={diamond}/>, 'add-keyframe':<><path d={diamond}/><path d="M12 8v8m-4-4h8"/></>,
    video:<><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3Z"/></>,
    overlay:<><rect x="2" y="3" width="20" height="18" rx="2"/><rect x="11" y="11" width="11" height="10" rx="2"/></>,
    image:<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></>,
    text:<path d="M4 7V4h16v3M12 4v16m-4 0h8"/>,
    plus:<path d="M12 5v14M5 12h14"/>,more:<>{[5,12,19].map(x=><circle key={x} cx={x} cy="12" r="1" fill="currentColor"/>)}</>,
    trash:<><path d="M4 7h16M9 4h6M6 7l1 13h10l1-13m-8 3v7m4-7v7"/></>,
    left:<path d="m15 18-6-6 6-6"/>,right:<path d="m9 18 6-6-6-6"/>,
    'zoom-in':<><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6M7 10h6m-3-3v6"/></>,
    'zoom-out':<><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6M7 10h6"/></>,
    tap:<><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></>,
    hold:<><path d="M12 3a9 9 0 1 1-9 9"/><circle cx="12" cy="12" r="3"/></>,
    swipe:<><circle cx="5" cy="12" r="3"/><path d="M10 12h11m-4-4 4 4-4 4"/></>,
  };
  if(name==='previous')name='left';if(name==='next')name='right';
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]??paths.keyframe}</svg>;
}
