// Ready-made Looks shown on Home, built in the same format as saved ones.
import {smartSlots} from './page-model.js';
import {textDefaults} from './text-model.js';

const PHONE=1350/2760,full={x:0,y:0,width:1,height:1};
const phone=(slot,pose={})=>({kind:'phone',aspect:PHONE,slot,pose:{locked:true,device:'iphone18',finish:'silver',scale:89,x:0,y:0,roll:0,...pose}});
const text=(id,value,{x=.5,y=.1,size=44,weight=700,color='#ffffff',ask=true}={})=>({...textDefaults,id,type:'text',text:value,anchor:null,x,y,size,weight,color,ask});
const row=(count,ratio,pose)=>smartSlots(Array(count).fill(PHONE),ratio).map(slot=>phone(slot,pose));
const make=(id,name,settings,objects,texts=[])=>({id:'starter-'+id,starter:true,name,settings,objects:objects.map((object,index)=>({...object,id:id+'-'+index})),layers:texts,version:1});

export const starterLooks=[
  make('headline','Headline',{background:'gradient',palette:'aurora',ratio:'square'},
    [phone({x:0,y:.2,width:1,height:1.02})],[text('t1','Your headline here',{y:.09,size:40})]),
  make('duo','Duo',{background:'gradient',palette:'tide',ratio:'square'},row(2,'square',{finish:'cobalt'})),
  make('store','App Store',{background:'gradient',palette:'dawn',ratio:'story'},
    [phone({x:0,y:.24,width:1,height:.84},{finish:'rose'})],[text('t1','Say what it does',{y:.1,size:46}),text('t2','One short line of detail',{y:.16,size:26,weight:500})]),
  make('trio','Trio',{background:'gradient',palette:'ember',ratio:'wide'},row(3,'wide',{finish:'graphite'})),
  make('tilt','Tilted',{background:'gradient',palette:'dusk',ratio:'square'},[phone(full,{finish:'graphite',roll:-10,shadowStyle:'long',shadow:60,shadowAngle:45})]),
  make('photo','Photo card',{background:'solid',color:'#f2f2f7',ratio:'portrait'},
    [{kind:'photo',aspect:4/3,slot:{x:0,y:.06,width:1,height:.86},pose:{locked:false,device:'flat',scale:100,x:0,y:0,roll:0,imageEdges:6,shadowStyle:'soft',shadow:30}}],
    [text('t1','Caption goes here',{y:.86,size:34,color:'#1c1c1e'})]),
];
