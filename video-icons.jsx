import React from 'react';
// One outlined family on a 24px grid: 1.8 strokes, round caps, currentColor only.
// Gesture glyphs share the touch disc so Tap, Hold and Swipe read as one family.
const diamond='M10.6 3.4a2 2 0 0 1 2.8 0l7.2 7.2a2 2 0 0 1 0 2.8l-7.2 7.2a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1 0-2.8Z';
const disc=(cx=12,cy=12,r=3.2)=><circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none"/>;
export function VideoIcon({name}){
  const paths={
    play:<path d="M8 5.6v12.8a1.1 1.1 0 0 0 1.7.9l9.9-6.4a1.1 1.1 0 0 0 0-1.8L9.7 4.7A1.1 1.1 0 0 0 8 5.6Z" fill="currentColor" stroke="none"/>,
    pause:<><rect x="6.5" y="5" width="3.8" height="14" rx="1.4" fill="currentColor" stroke="none"/><rect x="13.7" y="5" width="3.8" height="14" rx="1.4" fill="currentColor" stroke="none"/></>,
    split:<><circle cx="6.5" cy="6.5" r="2.7"/><circle cx="6.5" cy="17.5" r="2.7"/><path d="M8.6 8.3 19.5 18M8.6 15.7 19.5 6"/></>,
    keyframe:<path d={diamond}/>,
    'add-keyframe':<><path d={diamond}/><path d="M12 9v6m-3-3h6"/></>,
    'remove-keyframe':<><path d={diamond}/><path d="M9 12h6"/></>,
    video:<><rect x="3" y="5" width="18" height="14" rx="3.5"/><path d="m10 9.2 4.8 2.8-4.8 2.8Z" fill="currentColor"/></>,
    overlay:<><rect x="3" y="3.5" width="14" height="12" rx="3"/><rect x="9" y="10" width="12" height="10.5" rx="3" fill="currentColor" fillOpacity=".18"/></>,
    image:<><rect x="3" y="4" width="18" height="16" rx="3.5"/><circle cx="9" cy="9.5" r="1.8"/><path d="m21 16-4.6-4.6a1.5 1.5 0 0 0-2.1 0L6 19.7"/></>,
    text:<path d="M5 7V5.5h14V7M12 5.5v13m-3 0h6"/>,
    plus:<path d="M12 5v14M5 12h14"/>,
    more:<>{[6,12,18].map(x=><circle key={x} cx={x} cy="12" r="1.5" fill="currentColor" stroke="none"/>)}</>,
    trash:<path d="M4.5 6.5h15M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5m-8 0 .8 12.1A2 2 0 0 0 9.3 20.5h5.4a2 2 0 0 0 2-1.9l.8-12.1M10 10.5v6m4-6v6"/>,
    left:<path d="m14.5 18-6-6 6-6"/>,right:<path d="m9.5 18 6-6-6-6"/>,
    'zoom-in':<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.4 15.4 4.6 4.6M10.5 7.8v5.4m-2.7-2.7h5.4"/></>,
    'zoom-out':<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.4 15.4 4.6 4.6M7.8 10.5h5.4"/></>,
    tap:<>{disc()}<circle cx="12" cy="12" r="7.6"/></>,
    hold:<>{disc()}<circle cx="12" cy="12" r="7.6" opacity=".3"/><path d="M12 4.4a7.6 7.6 0 1 1-7.2 5.2"/></>,
    swipe:<>{disc(6.5,12,3)}<path d="M11.5 12H20m-3.2-3.4L20.2 12l-3.4 3.4"/></>,
    zoom:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.4 15.4 4.6 4.6M10.5 7.8v5.4m-2.7-2.7h5.4"/></>,
    gestures:<>{disc(12,12,2.6)}<circle cx="12" cy="12" r="6.6"/></>,
  };
  if(name==='previous')name='left';if(name==='next')name='right';
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]??paths.keyframe}</svg>;
}
