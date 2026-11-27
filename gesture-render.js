import {clamp,gestureKind} from './showcase-model.js';

// Telegram-style touch indicator: a finger-sized translucent grey disc with a thin
// white rim and a soft shadow. It settles onto the screen, presses in, swells slightly
// while held, travels with the finger on a swipe, then lifts off and fades.
const fullCircle=Math.PI*2;
const ease=value=>{const t=clamp(value,0,1);return t*t*(3-2*t);};
const smooth=value=>{const t=clamp(value,0,1);return t*t*t*(t*(t*6-15)+10);};
const DESCEND=.12,PRESS=.1,LIFT=.28;
// 22 pt radius on a ~393 pt wide phone screen.
const RADIUS=22/393;

export function touchState(moment,time){
  const kind=gestureKind(moment);
  if(kind==='none')return null;
  const duration=kind==='tap'?.65:clamp(moment.duration??1,.3,4),age=time-moment.time;
  if(age<0||age>duration)return null;
  // A tap keeps the finger down briefly; longer gestures keep it down until the lift.
  const down=DESCEND,up=kind==='tap'?Math.min(duration-LIFT,down+.12):Math.max(down,duration-LIFT);
  let alpha=1,scale;
  if(age<down){const a=ease(age/down);alpha=a;scale=1.18-.18*a;}
  else if(age<=up){
    const pressed=1-.06*ease((age-down)/PRESS);
    scale=kind==='hold'?pressed+.1*ease((age-down)/Math.max(.01,up-down)):pressed;
  }else{
    const k=ease((age-up)/Math.max(.01,duration-up));
    alpha=1-k;scale=(kind==='hold'?1.04:.94)+.12*k;
  }
  let x=moment.x,y=moment.y;
  if(kind==='swipe'){
    const travel=smooth((age-down)/Math.max(.01,up-down));
    x=moment.x+((moment.endX??moment.x)-moment.x)*travel;
    y=moment.y+((moment.endY??Math.max(0,moment.y-.25))-moment.y)*travel;
  }
  return {kind,x,y,alpha:clamp(alpha,0,1),scale};
}

export function drawRecordedGesture(ctx,moment,time,project,unit){
  const state=touchState(moment,time);
  if(!state||state.alpha<=0)return;
  const point=project(state);
  // Size the disc from the projected screen so it matches the phone at every zoom.
  const left=project({x:0,y:state.y}),right=project({x:1,y:state.y});
  const top=project({x:state.x,y:0}),bottom=project({x:state.x,y:1});
  const screen=Math.min(Math.hypot(right.x-left.x,right.y-left.y),Math.hypot(bottom.x-top.x,bottom.y-top.y));
  const radius=Math.max(unit*.012,(screen>0?screen:unit*.45)*RADIUS)*state.scale;
  const a=state.alpha;
  ctx.save();
  ctx.beginPath();
  ctx.arc(point.x,point.y,radius,0,fullCircle);
  ctx.shadowColor=`rgba(0,0,0,${.28*a})`;
  ctx.shadowBlur=radius*.45;
  ctx.shadowOffsetY=radius*.08;
  ctx.fillStyle=`rgba(70,70,78,${.37*a})`;
  ctx.fill();
  ctx.shadowColor='transparent';
  ctx.lineWidth=Math.max(1,radius*.073);
  ctx.strokeStyle=`rgba(255,255,255,${.78*a})`;
  ctx.stroke();
  ctx.restore();
}
