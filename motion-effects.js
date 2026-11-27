// Automatic motion for a phone or image, in the spirit of Rotato's presets (circle spin,
// floating, turn, zoom). Every effect is a pure function of progress (0..1), so the editor
// preview, selection handles and the exported video all show exactly the same frame.
// Ids `push` and `sway` are kept from the original effects so saved drafts keep working.
export const motionEffects=[
  {id:'still',label:'None'},
  {id:'spin',label:'Spin'},
  {id:'float',label:'Float'},
  {id:'sway',label:'Turn'},
  {id:'push',label:'Zoom in'},
];
export const EFFECT_SECONDS=4;            // length of the video a still mockup exports as
const ids=new Set(motionEffects.map(effect=>effect.id));
export const effectOf=pose=>ids.has(pose?.motion)?pose.motion:'still';
export const hasMotion=pose=>effectOf(pose)!=='still';
// Any object on the page (or the single scene) that moves.
export const sceneHasMotion=settings=>hasMotion(settings)||!!settings?.pageObjects?.some(object=>hasMotion(object.pose));

const wave=p=>Math.sin(p*Math.PI*2);
const smooth=p=>p<.5?4*p*p*p:1-(-2*p+2)**3/2;

// Offsets on top of the pose: scale factor, roll in degrees, x/y in the pose's percent units,
// and turn added to the phone's left/right perspective (-1..1).
export function motionAt(pose,progress=0){
  const p=Math.max(0,Math.min(1,Number(progress)||0));
  switch(effectOf(pose)){
    // One full turn with a gentle pull back halfway, so the loop starts and ends upright.
    case 'spin':return {scale:1-.1*Math.sin(Math.PI*p),roll:360*smooth(p),x:0,y:0,turn:0};
    // Weightless bob with a slight counter-tilt; seamless when the video loops.
    case 'float':return {scale:1,roll:2.2*wave(p+.25),x:0,y:-2.4*wave(p),turn:0};
    case 'sway':return {scale:1,roll:7*wave(p),x:0,y:0,turn:.55*wave(p)};
    case 'push':return {scale:1+.16*(1-Math.cos(p*Math.PI))/2,roll:0,x:0,y:0,turn:0};
    default:return {scale:1,roll:0,x:0,y:0,turn:0};
  }
}

// The pose with its effect applied; perspective is clamped to what the device art supports.
export function movedPose(pose,progress){
  const m=motionAt(pose,progress);
  if(!hasMotion(pose))return {pose,turn:0};
  return {pose:{...pose,scale:(pose.scale??100)*m.scale,roll:(pose.roll??0)+m.roll,x:(pose.x??0)+m.x,y:(pose.y??0)+m.y},turn:m.turn};
}
export const turnedDirection=(angle,turn)=>Math.max(-1,Math.min(1,({front:0,left:-1,right:1}[angle]??0)+turn));
