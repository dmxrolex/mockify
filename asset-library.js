import {loadMedia} from './media.js';
// Categories follow Keynote's shape library: pick a group at the top, then tap or drag a tile.
export const assetGroups=[['frames','Frames'],['camera','Camera'],['arrows','Arrows'],['marks','Marks'],['callouts','Callouts']];
export const assetLibrary=[
  {id:'phone',group:'frames',name:'iPhone',frame:true,width:1206,height:2622},
  // Empty photo spot in a Look: takes the saved photo's proportions, shows a placeholder until filled.
  {id:'photo',group:'hidden',name:'Photo',frame:true,width:1000,height:1000},
  {id:'browser',group:'frames',name:'Browser',frame:true,width:1200,height:860},
  {id:'glass',group:'frames',name:'Glass card',frame:true,width:900,height:650},
  {id:'box',group:'frames',name:'Rounded box',frame:true,width:800,height:800},
  {id:'polaroid',group:'frames',name:'Instant photo',frame:true,width:880,height:1060},
  {id:'film',group:'frames',name:'Film strip',frame:true,width:1200,height:820},
  // Camera overlays: transparent stickers that sit over a screenshot or photo.
  {id:'recording',group:'camera',name:'Recording',width:900,height:1600,view:'0 0 90 160'},
  {id:'viewfinder',group:'camera',name:'Corners',width:1000,height:1000},
  {id:'rec',group:'camera',name:'REC badge',width:720,height:240,view:'0 0 90 30'},
  {id:'live',group:'camera',name:'LIVE badge',width:720,height:280,view:'0 0 72 28'},
  {id:'focus',group:'camera',name:'Focus box',width:700,height:700},
  {id:'player',group:'camera',name:'Video bar',width:1400,height:240,view:'0 0 210 36'},
  {id:'play',group:'camera',name:'Play button',width:600,height:600},
  {id:'tap',group:'camera',name:'Tap',width:600,height:600},
  {id:'swipe',group:'camera',name:'Swipe',width:1000,height:400,view:'0 0 150 60'},
  {id:'arrow',group:'arrows',name:'Arrow',width:900,height:320},
  {id:'curve',group:'arrows',name:'Curved arrow',width:700,height:600},
  {id:'loop',group:'arrows',name:'Loop arrow',width:840,height:720,view:'0 0 140 120'},
  {id:'bend',group:'arrows',name:'Bent arrow',width:720,height:600,view:'0 0 120 100'},
  {id:'double',group:'arrows',name:'Double arrow',width:900,height:320,view:'0 0 180 64'},
  {id:'circle',group:'marks',name:'Circle outline',width:700,height:700},
  {id:'scribble',group:'marks',name:'Scribble',width:900,height:600,view:'0 0 150 100'},
  {id:'underline',group:'marks',name:'Underline',width:900,height:200,view:'0 0 180 40'},
  {id:'highlight',group:'marks',name:'Highlighter',width:900,height:240,view:'0 0 180 48'},
  {id:'sparkle',group:'marks',name:'Sparkle',width:600,height:600},
  {id:'burst',group:'marks',name:'Starburst',width:700,height:700},
  {id:'bubble',group:'callouts',name:'Speech bubble',width:910,height:700,view:'0 0 130 100'},
  {id:'notification',group:'callouts',name:'Notification',width:1000,height:300,view:'0 0 200 60'},
  {id:'rating',group:'callouts',name:'Five stars',width:1000,height:200,view:'0 0 250 50'},
  {id:'check',group:'callouts',name:'Checkmark',width:600,height:600},
  {id:'heart',group:'callouts',name:'Heart',width:600,height:600},
  {id:'cursor',group:'callouts',name:'Cursor',width:500,height:600,view:'0 0 100 120'},
  {id:'newbadge',group:'callouts',name:'New badge',width:640,height:280,view:'0 0 64 28'},
  {id:'likes',group:'callouts',name:'Likes',width:720,height:400,view:'0 0 90 50'},
];
const star=(cx,cy,r)=>Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,d=i%2?r*.45:r;return (cx+Math.cos(a)*d).toFixed(2)+','+(cy+Math.sin(a)*d).toFixed(2);}).join(' ');
const burst=Array.from({length:32},(_,i)=>{const a=-Math.PI/2+i*Math.PI/16,d=i%2?38:47;return (50+Math.cos(a)*d).toFixed(2)+','+(50+Math.sin(a)*d).toFixed(2);}).join(' ');
const line='fill="none" stroke="#f7f7fa" stroke-linecap="round" stroke-linejoin="round"';
export const assetFor=kind=>assetLibrary.find(asset=>asset.id===kind);
export const isAssetFrame=pose=>!!assetFor(pose?.assetKind)?.frame;
export const assetShape=(pose,media)=>{const asset=assetFor(pose.assetKind);if(asset?.frame&&pose.frameAspect>0)return {width:Math.round(1000*pose.frameAspect),height:1000};return asset?.frame?{width:asset.width,height:asset.height}:media;};
export function assetSVG(kind,preview=false){
  const asset=assetFor(kind);if(!asset)throw Error('Unknown asset');
  const shapes={
    phone:preview?'<rect x="20" y="5" width="60" height="90" rx="13" fill="#151518" stroke="#c5c8cc" stroke-width="2"/><rect x="24" y="10" width="52" height="80" rx="10" fill="url(#screen)"/><rect x="40" y="13" width="20" height="5" rx="2.5" fill="#050506"/>':'<rect width="100" height="100" fill="url(#screen)"/><path d="M40 48h20m-10-4v8" stroke="#ffffff99" stroke-width="1"/>',
    glass:'<rect x="7" y="18" width="86" height="64" rx="12" fill="url(#glass)" stroke="#cfe3f4" stroke-opacity=".7" stroke-width="1.3"/><path d="m20 69 22-24 17 17 11-12 14 18" fill="none" stroke="#dae6f0" stroke-width="2" opacity=".7"/><circle cx="66" cy="35" r="5" fill="#dae6f0" opacity=".7"/>',
    box:'<rect x="13" y="13" width="74" height="74" rx="15" fill="#30343c" stroke="#b5bdc9" stroke-width="2"/><path d="m25 69 18-20 15 16 11-10 9 14" fill="none" stroke="#b5bdc9" stroke-width="2"/><circle cx="64" cy="35" r="5" fill="#b5bdc9"/>',
    arrow:'<path d="M10 50h77m-22-22 22 22-22 22" fill="none" stroke="#f7f7fa" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>',
    curve:'<path d="M17 83c-8-39 24-61 65-48M64 15l20 21-22 15" fill="none" stroke="#f7f7fa" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>',
    circle:'<circle cx="50" cy="50" r="37" fill="none" stroke="#f7f7fa" stroke-width="5"/>',
    browser:'<rect x="6" y="14" width="88" height="72" rx="8" fill="#1f2024" stroke="#5b5d64" stroke-width="1.2"/><path d="M6 27h88" stroke="#3a3b40" stroke-width="1"/><circle cx="14" cy="20.5" r="2.2" fill="#ff5f57"/><circle cx="21" cy="20.5" r="2.2" fill="#febc2e"/><circle cx="28" cy="20.5" r="2.2" fill="#28c840"/><rect x="36" y="17.5" width="46" height="6" rx="3" fill="#33343a"/><rect x="10" y="31" width="80" height="51" rx="3" fill="url(#screen)"/>',
    loop:`<path d="M12 98C26 66 62 44 80 62c14 15-6 34-20 22-14-13 8-50 58-52" ${line} stroke-width="7"/><path d="m104 18 16 14-16 15" ${line} stroke-width="7"/>`,
    bend:`<path d="M18 14v44a16 16 0 0 0 16 16h66" ${line} stroke-width="7"/><path d="m86 56 18 18-18 18" ${line} stroke-width="7"/>`,
    double:`<path d="M14 32h152M38 10 14 32l24 22M142 10l24 22-24 22" ${line} stroke-width="7"/>`,
    scribble:`<path d="M126 30C110 9 40 7 18 35 2 57 29 89 81 88c49-1 69-29 47-53C116 21 89 14 60 18" ${line} stroke-width="4.5"/>`,
    underline:`<path d="M8 24c44-11 104-12 164-3" ${line} stroke-width="8"/><path d="M34 33c40-6 88-6 124-2" ${line} stroke-width="3.5" opacity=".75"/>`,
    highlight:'<path d="M6 14Q90 4 174 11l-2 27Q90 46 8 37Z" fill="#ffd60a" fill-opacity=".55"/>',
    sparkle:'<path d="M46 10c4 30 14 40 44 44-30 4-40 14-44 44-4-30-14-40-44-44 30-4 40-14 44-44Z" fill="#f7f7fa"/><path d="M82 8c1.6 7.5 3.8 9.7 11 11-7.2 1.3-9.4 3.5-11 11-1.6-7.5-3.8-9.7-11-11 7.2-1.3 9.4-3.5 11-11Z" fill="#f7f7fa" opacity=".8"/>',
    burst:`<polygon points="${burst}" fill="#ffcc00"/><circle cx="50" cy="50" r="29" fill="none" stroke="#fff6c7" stroke-width="2" opacity=".8"/>`,
    bubble:'<path d="M20 8h90a14 14 0 0 1 14 14v40a14 14 0 0 1-14 14H54L31 94l4-18H20A14 14 0 0 1 6 62V22A14 14 0 0 1 20 8Z" fill="#f7f7fa"/>',
    notification:'<rect x="3" y="3" width="194" height="54" rx="15" fill="#f2f2f5" fill-opacity=".92"/><rect x="12" y="13" width="34" height="34" rx="8" fill="url(#app)"/><rect x="56" y="17" width="72" height="8" rx="4" fill="#1c1c1e"/><rect x="56" y="33" width="118" height="7" rx="3.5" fill="#8e8e93"/><rect x="160" y="16" width="26" height="6" rx="3" fill="#aeaeb2"/>',
    rating:[0,1,2,3,4].map(i=>`<polygon points="${star(25+i*50,26,22)}" fill="#ffcc00"/>`).join(''),
    check:'<circle cx="50" cy="50" r="44" fill="#30d158"/><path d="m29 51 14 14 29-31" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="9"/>',
    heart:'<path d="M50 86C20 64 8 46 14 30c6-16 28-18 36-2 8-16 30-14 36 2 6 16-6 34-36 56Z" fill="#ff375f"/>',
    photo:'<rect x="8" y="8" width="84" height="84" rx="14" fill="#ffffff22" stroke="#ffffff88" stroke-width="2" stroke-dasharray="6 5"/><path d="M50 36v28M36 50h28" stroke="#fff" stroke-width="4" stroke-linecap="round"/>',
    polaroid:'<rect x="12" y="6" width="76" height="88" rx="3" fill="#f6f4ef"/><rect x="18" y="12" width="64" height="62" fill="#c9cdd4"/><path d="m24 66 16-18 12 12 9-8 15 14" fill="none" stroke="#8d939c" stroke-width="2"/><circle cx="66" cy="27" r="5" fill="#8d939c"/>',
    film:'<rect x="4" y="18" width="92" height="64" rx="3" fill="#121214"/>'+[0,1,2,3,4,5,6,7].map(i=>`<rect x="${8+i*11.2}" y="21.5" width="6" height="4.5" rx="1" fill="#f2f2f2" opacity=".85"/><rect x="${8+i*11.2}" y="74" width="6" height="4.5" rx="1" fill="#f2f2f2" opacity=".85"/>`).join('')+'<rect x="10" y="30" width="80" height="40" rx="1.5" fill="#3a3f48"/><path d="m18 64 16-16 11 11 8-7 13 12" fill="none" stroke="#9aa3ae" stroke-width="2"/>',
    recording:`<path d="M5 19V8a3 3 0 0 1 3-3h11M71 5h11a3 3 0 0 1 3 3v11M85 141v11a3 3 0 0 1-3 3H71M19 155H8a3 3 0 0 1-3-3v-11" ${line} stroke-width="1.6"/><circle cx="14" cy="15" r="2.6" fill="#ff3b30"/><text x="19.5" y="17.9" fill="#f7f7fa" font-size="8" font-weight="700" letter-spacing=".4" font-family="-apple-system,'SF Pro Text','Helvetica Neue',Arial,sans-serif">REC</text><text x="76" y="17.9" text-anchor="end" fill="#f7f7fa" font-size="7.5" font-weight="600" font-family="-apple-system,'SF Pro Text','Helvetica Neue',Arial,sans-serif">00:12</text><path d="M45 75v10M40 80h10" ${line} stroke-width="1.2" opacity=".85"/><text x="14" y="148" fill="#f7f7fa" font-size="6.8" font-weight="600" opacity=".9" font-family="-apple-system,'SF Pro Text','Helvetica Neue',Arial,sans-serif">4K · 60</text><rect x="62" y="141.5" width="14" height="7.5" rx="2" fill="none" stroke="#f7f7fa" stroke-width="1"/><rect x="63.8" y="143.3" width="8.6" height="3.9" rx="1" fill="#f7f7fa"/><rect x="76.4" y="143.8" width="1.3" height="2.9" rx=".6" fill="#f7f7fa"/>`,
    viewfinder:`<path d="M8 28V14a6 6 0 0 1 6-6h14M72 8h14a6 6 0 0 1 6 6v14M92 72v14a6 6 0 0 1-6 6H72M28 92H14a6 6 0 0 1-6-6V72" ${line} stroke-width="3.5"/>`,
    rec:`<rect x="1" y="1" width="88" height="28" rx="14" fill="#000" fill-opacity=".55"/><circle cx="16" cy="15" r="5.5" fill="#ff3b30"/><text x="27" y="19.6" fill="#fff" font-size="13" font-weight="700" letter-spacing=".8" font-family="-apple-system,'SF Pro Text','Helvetica Neue',Arial,sans-serif">REC</text><text x="80" y="19.6" text-anchor="end" fill="#fff" fill-opacity=".8" font-size="10" font-weight="600" font-family="-apple-system,'SF Pro Text','Helvetica Neue',Arial,sans-serif">0:12</text>`,
    live:`<rect x="1" y="1" width="70" height="26" rx="7" fill="#ff3b30"/><circle cx="14" cy="14" r="3.6" fill="#fff"/><text x="22" y="18.6" fill="#fff" font-size="13" font-weight="800" letter-spacing=".9" font-family="-apple-system,'SF Pro Text','Helvetica Neue',Arial,sans-serif">LIVE</text>`,
    focus:'<path d="M14 14h72v72H14Z" fill="none" stroke="#ffd60a" stroke-width="2.5"/><path d="M50 14v7M50 79v7M14 50h7M79 50h7" stroke="#ffd60a" stroke-width="2.5" stroke-linecap="round"/>',
    player:`<rect x="1" y="1" width="208" height="34" rx="17" fill="#000" fill-opacity=".5"/><path d="M14 11v14l11-7Z" fill="#fff"/><rect x="34" y="16.5" width="128" height="3" rx="1.5" fill="#fff" fill-opacity=".35"/><rect x="34" y="16.5" width="52" height="3" rx="1.5" fill="#fff"/><circle cx="86" cy="18" r="5" fill="#fff"/><text x="198" y="21.6" text-anchor="end" fill="#fff" font-size="10" font-weight="600" font-family="-apple-system,'SF Pro Text','Helvetica Neue',Arial,sans-serif">0:24</text>`,
    play:'<circle cx="50" cy="50" r="40" fill="#000" fill-opacity=".4" stroke="#fff" stroke-opacity=".85" stroke-width="2.5"/><path d="M41 32v36l29-18Z" fill="#fff"/>',
    tap:'<circle cx="50" cy="50" r="42" fill="#fff" fill-opacity=".1" stroke="#fff" stroke-opacity=".35" stroke-width="2"/><circle cx="50" cy="50" r="28" fill="#fff" fill-opacity=".18" stroke="#fff" stroke-opacity=".6" stroke-width="2"/><circle cx="50" cy="50" r="15" fill="#fff" fill-opacity=".9"/>',
    swipe:'<defs><linearGradient id="trail" x2="1"><stop stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".75"/></linearGradient></defs><rect x="8" y="22" width="112" height="16" rx="8" fill="url(#trail)"/><circle cx="118" cy="30" r="14" fill="#fff" fill-opacity=".92"/><circle cx="118" cy="30" r="21" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="2"/>',
    newbadge:`<rect x="1" y="1" width="62" height="26" rx="13" fill="#0a84ff"/><text x="32" y="18.6" text-anchor="middle" fill="#fff" font-size="13" font-weight="800" letter-spacing=".8" font-family="-apple-system,'SF Pro Text','Helvetica Neue',Arial,sans-serif">NEW</text>`,
    likes:`<path d="M10 2h70a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8H50l-5 7-5-7H10a8 8 0 0 1-8-8V10a8 8 0 0 1 8-8Z" fill="#ff375f"/><path d="M27 33c-8-6-11-10-9.5-14 1.5-3.6 6.5-4 9.5-.6 3-3.4 8-3 9.5.6 1.5 4-1.5 8-9.5 14Z" fill="#fff"/><text x="44" y="27.2" fill="#fff" font-size="15" font-weight="700" font-family="-apple-system,'SF Pro Text','Helvetica Neue',Arial,sans-serif">128</text>`,
    cursor:'<path d="M20 8v86l22-20 16 36 14-6-16-35h30Z" fill="#111" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>',
  };
  const view=asset.view??'0 0 100 100';
  // Shapes with their own viewBox keep their proportions; the legacy 100×100 ones stretch to fit.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${preview?100:asset.width}" height="${preview?100:asset.height}" viewBox="${view}" preserveAspectRatio="${asset.view&&preview?'xMidYMid meet':'none'}"><defs><linearGradient id="app" x2="1" y2="1"><stop stop-color="#5ac8fa"/><stop offset="1" stop-color="#0a84ff"/></linearGradient><linearGradient id="screen" x2="1" y2="1"><stop stop-color="#7e91c8"/><stop offset="1" stop-color="#b6abd0"/></linearGradient><linearGradient id="glass" x2="1" y2="1"><stop stop-color="#cde6ff" stop-opacity=".3"/><stop offset="1" stop-color="#7c93bd" stop-opacity=".08"/></linearGradient></defs>${shapes[kind]}</svg>`;
}
export const assetPreview=kind=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(assetSVG(kind,true));
export function loadAsset(kind){return loadMedia({kind:'image',name:assetFor(kind).name+'.svg',blob:new Blob([assetSVG(kind)],{type:'image/svg+xml'})});}

// These shapes stay vector paths at every preview/export size. Image content is
// clipped into a fixed frame, so fitting never changes the object's geometry.
export function drawAssetFrame(ctx,pose,media,width,height){
  if(pose.assetKind==='browser')return drawBrowserFrame(ctx,pose,media,width,height);
  if(pose.assetKind==='photo')return drawPhotoSpot(ctx,pose,media,width,height);
  if(pose.assetKind==='polaroid')return drawInstantFrame(ctx,pose,media,width,height);
  if(pose.assetKind==='film')return drawFilmFrame(ctx,pose,media,width,height);
  const glass=pose.assetKind==='glass',pad=glass?width*.035:width*.025,radius=Math.min(width,height)*(glass?.075:.1);
  ctx.save();ctx.beginPath();ctx.roundRect(0,0,width,height,radius);ctx.clip();
  const fill=ctx.createLinearGradient(0,0,width,height);fill.addColorStop(0,glass?'rgba(212,233,255,.28)':'#434750');fill.addColorStop(1,glass?'rgba(92,116,157,.1)':'#181b21');ctx.fillStyle=fill;ctx.fillRect(0,0,width,height);
  ctx.save();ctx.beginPath();ctx.roundRect(pad,pad,width-pad*2,height-pad*2,Math.max(0,radius-pad));ctx.clip();
  if(!pose.assetEmpty&&media?.element){const scale=Math.max((width-pad*2)/media.width,(height-pad*2)/media.height),w=media.width*scale,h=media.height*scale;ctx.drawImage(media.element,pad+(width-pad*2-w)/2,pad+(height-pad*2-h)/2,w,h);}
  else {ctx.strokeStyle=glass?'#d5e2ef99':'#c1c8d080';ctx.lineWidth=width*.007;ctx.lineCap='round';ctx.lineJoin='round';const x=width*.35,y=height*.32,w=width*.3,h=height*.36;ctx.beginPath();ctx.roundRect(x,y,w,h,width*.025);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y+h*.8);ctx.lineTo(x+w*.38,y+h*.4);ctx.lineTo(x+w*.65,y+h*.7);ctx.lineTo(x+w*.8,y+h*.55);ctx.lineTo(x+w,y+h*.78);ctx.stroke();}
  ctx.restore();ctx.beginPath();ctx.roundRect(width*.0015,height*.0015,width*.997,height*.997,radius);ctx.strokeStyle=glass?'#e9f5ff80':'#c4ccd040';ctx.lineWidth=Math.max(1,width*.003);ctx.stroke();ctx.restore();
}

// A neutral desktop window: title bar with traffic lights and an address pill, content below.
function drawBrowserFrame(ctx,pose,media,width,height){
  const radius=Math.min(width,height)*.045,bar=Math.max(height*.085,width*.05),dot=bar*.16;
  ctx.save();ctx.beginPath();ctx.roundRect(0,0,width,height,radius);ctx.clip();
  ctx.fillStyle='#1f2024';ctx.fillRect(0,0,width,height);
  ctx.fillStyle='#2a2b30';ctx.fillRect(0,0,width,bar);
  ['#ff5f57','#febc2e','#28c840'].forEach((colour,i)=>{ctx.fillStyle=colour;ctx.beginPath();ctx.arc(bar*.55+i*dot*3.1,bar/2,dot,0,Math.PI*2);ctx.fill();});
  ctx.fillStyle='#3a3b41';ctx.beginPath();ctx.roundRect(width*.3,bar*.27,width*.4,bar*.46,bar*.23);ctx.fill();
  const top=bar,inner=height-bar;
  ctx.save();ctx.beginPath();ctx.rect(0,top,width,inner);ctx.clip();
  if(!pose.assetEmpty&&media?.element){const scale=Math.max(width/media.width,inner/media.height),w=media.width*scale,h=media.height*scale;ctx.drawImage(media.element,(width-w)/2,top+(inner-h)/2,w,h);}
  else {const fill=ctx.createLinearGradient(0,top,width,height);fill.addColorStop(0,'#2b2e36');fill.addColorStop(1,'#1a1c22');ctx.fillStyle=fill;ctx.fillRect(0,top,width,inner);
    ctx.strokeStyle='#c1c8d080';ctx.lineWidth=width*.006;ctx.lineCap='round';ctx.lineJoin='round';const x=width*.4,y=top+inner*.33,w=width*.2,h=inner*.34;ctx.beginPath();ctx.roundRect(x,y,w,h,width*.02);ctx.moveTo(x+w*.12,y+h*.82);ctx.lineTo(x+w*.42,y+h*.45);ctx.lineTo(x+w*.62,y+h*.68);ctx.lineTo(x+w*.75,y+h*.55);ctx.lineTo(x+w*.9,y+h*.82);ctx.stroke();}
  ctx.restore();
  ctx.beginPath();ctx.roundRect(width*.0015,height*.0015,width*.997,height*.997,radius);ctx.strokeStyle='#ffffff26';ctx.lineWidth=Math.max(1,width*.003);ctx.stroke();ctx.restore();
}

// A Look's photo spot: the photo fills it edge to edge once added; until then a soft dashed card.
function drawPhotoSpot(ctx,pose,media,width,height){
  const radius=Math.min(width,height)*Math.max(0,Math.min(50,pose.imageEdges??4))/100;
  ctx.save();ctx.beginPath();ctx.roundRect(0,0,width,height,radius);ctx.clip();
  if(!pose.assetEmpty&&media?.element){const scale=Math.max(width/media.width,height/media.height),w=media.width*scale,h=media.height*scale;ctx.drawImage(media.element,(width-w)/2,(height-h)/2,w,h);ctx.restore();return;}
  ctx.fillStyle='rgba(255,255,255,.14)';ctx.fillRect(0,0,width,height);ctx.restore();
  ctx.save();ctx.setLineDash([width*.02,width*.016]);ctx.lineWidth=Math.max(2,width*.006);ctx.strokeStyle='rgba(255,255,255,.6)';ctx.beginPath();ctx.roundRect(ctx.lineWidth,ctx.lineWidth,width-ctx.lineWidth*2,height-ctx.lineWidth*2,radius);ctx.stroke();ctx.restore();
}


// Shared: cover `media` into a rectangle, or draw a quiet image placeholder there.
function fillSpot(ctx,pose,media,x,y,w,h,{empty='#2b2e36',ink='#c1c8d080'}={}){
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  if(!pose.assetEmpty&&media?.element){const scale=Math.max(w/media.width,h/media.height),dw=media.width*scale,dh=media.height*scale;ctx.drawImage(media.element,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}
  else {ctx.fillStyle=empty;ctx.fillRect(x,y,w,h);ctx.strokeStyle=ink;ctx.lineWidth=Math.max(2,w*.008);ctx.lineCap='round';ctx.lineJoin='round';const iw=w*.3,ih=h*.3,ix=x+(w-iw)/2,iy=y+(h-ih)/2;ctx.beginPath();ctx.roundRect(ix,iy,iw,ih,iw*.08);ctx.moveTo(ix+iw*.12,iy+ih*.82);ctx.lineTo(ix+iw*.42,iy+ih*.45);ctx.lineTo(ix+iw*.62,iy+ih*.68);ctx.lineTo(ix+iw*.75,iy+ih*.55);ctx.lineTo(ix+iw*.9,iy+ih*.82);ctx.stroke();}
  ctx.restore();
}

// An instant photo: warm white card, even borders and a deeper bottom edge.
function drawInstantFrame(ctx,pose,media,width,height){
  const side=width*.06,bottom=Math.max(side*2.6,height*.17),radius=width*.012;
  ctx.save();ctx.beginPath();ctx.roundRect(0,0,width,height,radius);ctx.clip();
  const paper=ctx.createLinearGradient(0,0,0,height);paper.addColorStop(0,'#fbfaf6');paper.addColorStop(1,'#efece5');ctx.fillStyle=paper;ctx.fillRect(0,0,width,height);
  fillSpot(ctx,pose,media,side,side,width-side*2,height-side-bottom,{empty:'#cfd3d9',ink:'#8d939cb0'});
  ctx.strokeStyle='#00000014';ctx.lineWidth=Math.max(1,width*.002);ctx.strokeRect(side,side,width-side*2,height-side-bottom);
  ctx.restore();
}

// A strip of 35mm film: black base with sprocket holes along both edges.
function drawFilmFrame(ctx,pose,media,width,height){
  const band=height*.14,radius=Math.min(width,height)*.02;
  ctx.save();ctx.beginPath();ctx.roundRect(0,0,width,height,radius);ctx.clip();
  ctx.fillStyle='#111113';ctx.fillRect(0,0,width,height);
  const holeW=band*.42,holeH=band*.36,gap=holeW*1.25,count=Math.floor((width-gap)/(holeW+gap)),start=(width-(count*(holeW+gap)-gap))/2;
  ctx.fillStyle='#ecebe6';
  for(let i=0;i<count;i++){const x=start+i*(holeW+gap);ctx.beginPath();ctx.roundRect(x,(band-holeH)/2,holeW,holeH,holeW*.18);ctx.roundRect(x,height-band+(band-holeH)/2,holeW,holeH,holeW*.18);ctx.fill();}
  const inset=width*.03;fillSpot(ctx,pose,media,inset,band,width-inset*2,height-band*2);
  ctx.restore();
}
