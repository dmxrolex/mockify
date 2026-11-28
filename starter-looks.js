// Quick start: ready-made Looks shown on Home, in the same format as saved ones. Each has a real
// preview rendered by Mockify itself with sample screens (scripts/render-starters.cjs).
import {smartSlots} from './page-model.js';
import {textDefaults} from './text-model.js';

const PHONE=1350/2760,full={x:0,y:0,width:1,height:1};
const phone=(slot,pose={})=>({kind:'phone',aspect:PHONE,slot,pose:{locked:true,device:'iphone18',finish:'silver',scale:89,x:0,y:0,roll:0,...pose}});
const photo=(slot,aspect,pose={})=>({kind:'photo',aspect,slot,pose:{locked:false,device:'flat',scale:100,x:0,y:0,roll:0,imageEdges:6,shadowStyle:'soft',shadow:30,...pose}});
const text=(id,value,{x=.5,y=.1,size=44,weight=700,color='#ffffff',ask=true}={})=>({...textDefaults,id,type:'text',text:value,anchor:null,x,y,size,weight,color,ask});
const row=(count,ratio,pose)=>smartSlots(Array(count).fill(PHONE),ratio).map(slot=>phone(slot,pose));
const preview=id=>new URL(`./assets/starters/${id}.webp`,import.meta.url).href;
const make=(id,name,tag,settings,objects,texts=[])=>({id:'starter-'+id,starter:true,name,tag,preview:preview(id),settings,objects:objects.map((object,index)=>({...object,id:id+'-'+index})),layers:texts,version:1});

export const starterLooks=[
  make('headline','Headline','1 screen · 1:1',{background:'gradient',palette:'aurora',ratio:'square'},
    [phone({x:0,y:.2,width:1,height:1.02})],[text('t1','Your headline here',{y:.09,size:40})]),
  make('store','App Store','1 screen · 9:16',{background:'gradient',palette:'dawn',ratio:'story'},
    [phone({x:-.15,y:.23,width:1.3,height:.9},{finish:'rose'})],[text('t1','Say what it does',{y:.1,size:46,color:'#4a2335'}),text('t2','One short line of detail',{y:.16,size:26,weight:500,color:'#6d3a55'})]),
  make('duo','Duo','2 screens · 1:1',{background:'gradient',palette:'tide',ratio:'square'},row(2,'square',{finish:'cobalt'})),
  make('fan','Fan','3 screens · 1:1',{background:'gradient',palette:'jade',ratio:'square'},[
    phone({x:-.2,y:.08,width:.8,height:.9},{roll:-12,finish:'graphite'}),phone({x:.4,y:.08,width:.8,height:.9},{roll:12,finish:'graphite'}),phone({x:.1,y:.02,width:.8,height:.95},{finish:'graphite'})]),
  make('trio','Trio','3 screens · 16:9',{background:'gradient',palette:'ember',ratio:'wide'},row(3,'wide',{finish:'graphite'})),
  make('feature','Feature','1 screen · 16:9',{background:'gradient',palette:'lilac',ratio:'wide'},
    [phone({x:.5,y:.02,width:.45,height:1.02})],[text('t1','Big idea, small screen',{x:.3,y:.36,size:42}),text('t2','Explain the one thing it does best',{x:.3,y:.5,size:24,weight:500}),text('t3','Available on iOS',{x:.3,y:.64,size:22,weight:600,color:'#efe7ff'})]),
  make('tilted','Tilted','1 screen · 1:1',{background:'gradient',palette:'dusk',ratio:'square'},[phone(full,{finish:'graphite',roll:-10,shadowStyle:'long',shadow:60,shadowAngle:45})]),
  make('clean','Clean','1 screen · 4:5',{background:'solid',color:'#f2f2f7',palette:null,ratio:'portrait'},
    [phone({x:0,y:.18,width:1,height:.92},{finish:'silver',shadow:35})],[text('t1','Simple. Fast. Yours.',{y:.09,size:38,color:'#1c1c1e'})]),
  make('stack','Stack','2 screens · 9:16',{background:'gradient',palette:'peach',ratio:'story'},[
    phone({x:-.12,y:.16,width:.9,height:.62},{roll:-6,finish:'rose'}),phone({x:.22,y:.38,width:.9,height:.62},{roll:6,finish:'rose'})],[text('t1','Two screens, one story',{y:.08,size:42,color:'#4a2335'})]),
  make('night','Night','1 screen · 1:1',{background:'solid',color:'#0b0b10',palette:null,ratio:'square'},
    [phone({x:0,y:.16,width:1,height:1},{finish:'graphite',shadowStyle:'soft',shadow:80})],[text('t1','Now in dark mode',{y:.08,size:36})]),
  make('photo','Photo card','1 photo · 4:5',{background:'solid',color:'#f2f2f7',palette:null,ratio:'portrait'},
    [photo({x:0,y:.06,width:1,height:.86},4/3)],[text('t1','Caption goes here',{y:.86,size:34,color:'#1c1c1e'})]),
  make('gallery','Gallery','4 screens · 16:9',{background:'gradient',palette:'frost',ratio:'wide'},row(4,'wide',{finish:'silver'})),
];
