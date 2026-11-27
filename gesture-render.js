import {clamp,gestureAt} from './showcase-model.js';

const fullCircle=Math.PI*2;
const easeOut=value=>1-(1-value)**3;

function ring(ctx,point,radius,width,alpha,colour){
  if(alpha<=0)return;
  ctx.globalAlpha=alpha;
  ctx.beginPath();
  ctx.arc(point.x,point.y,radius,0,fullCircle);
  ctx.lineWidth=width;
  ctx.strokeStyle=colour;
  ctx.stroke();
}

function contact(ctx,point,unit,alpha){
  const size=unit*.011;
  ctx.globalAlpha=alpha;
  ctx.beginPath();
  ctx.arc(point.x,point.y,size,0,fullCircle);
  ctx.fillStyle='#f7f4ff';
  ctx.fill();
  ctx.lineWidth=unit*.002;
  ctx.strokeStyle='#28213d';
  ctx.stroke();
}

function swipeTrail(ctx,point,tail,unit,alpha){
  const distance=Math.hypot(tail.x-point.x,tail.y-point.y);
  if(distance<unit*.004)return;
  const gradient=ctx.createLinearGradient(tail.x,tail.y,point.x,point.y);
  gradient.addColorStop(0,'rgba(161,149,220,0)');
  gradient.addColorStop(1,'rgba(204,192,255,.64)');
  ctx.globalAlpha=alpha;
  ctx.strokeStyle=gradient;
  ctx.lineWidth=unit*.023;
  ctx.beginPath();
  ctx.moveTo(tail.x,tail.y);
  ctx.lineTo(point.x,point.y);
  ctx.stroke();
}

export function drawRecordedGesture(ctx,moment,time,project,unit){
  const action=gestureAt(moment,time);
  if(!action)return;
  const point=project(action);
  const {phase,kind}=action;
  const appear=easeOut(clamp(phase/.11,0,1));
  const release=1-clamp((phase-.84)/.16,0,1);

  ctx.save();
  ctx.lineCap='round';
  if(kind==='tap'){
    const spread=easeOut(phase);
    const radius=unit*(.016+.040*spread);
    const visible=appear*(1-phase)**.92;
    // A broad translucent band reads over busy screens without covering the target.
    ring(ctx,point,radius,unit*.022,visible*.47,'#403255');
    ring(ctx,point,radius,unit*.015,visible*.84,'#cec2ff');
    contact(ctx,point,unit,appear*(1-clamp(phase/.43,0,1))*.92);
  }else if(kind==='hold'){
    const expansion=easeOut(clamp(phase/.26,0,1));
    const radius=unit*(.017+.012*expansion+.008*(1-release));
    ring(ctx,point,radius,unit*.017,appear*release*.45,'#29203d');
    ring(ctx,point,radius,unit*.011,appear*release*.66,'#c0aff8');
    ctx.globalAlpha=appear*release*.9;
    ctx.beginPath();
    ctx.arc(point.x,point.y,radius,-Math.PI/2,-Math.PI/2+fullCircle*phase);
    ctx.lineWidth=unit*.004;
    ctx.strokeStyle='#f6efff';
    ctx.stroke();
    contact(ctx,point,unit,appear*release*.9);
  }else if(kind==='swipe'){
    const tail=project(gestureAt(moment,Math.max(moment.time,time-.16))??action);
    swipeTrail(ctx,point,tail,unit,appear*release);
    ring(ctx,point,unit*.025,unit*.014,appear*release*.46,'#332648');
    ring(ctx,point,unit*.025,unit*.008,appear*release*.72,'#d3c5ff');
    contact(ctx,point,unit,appear*release*.9);
  }
  ctx.restore();
}
