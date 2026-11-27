import React from 'react';
import { MotionSticker } from './animated-sticker.jsx';

const settingsIcon=new URL('./assets/telegram-premium-settings.svg',import.meta.url).href;
const premiumIcon=new URL('./assets/telegram-premium.svg',import.meta.url).href;
const loadPremium=()=>import('./assets/telegram-premium-animated.json');

export default function PremiumEmblem({compact=false}){
  return <span className={'premium-emblem'+(compact?' compact':'')} aria-hidden="true">
    <img src={compact?settingsIcon:premiumIcon} alt="" width="512" height="512" draggable="false"/>
    {!compact&&<MotionSticker className="premium-animation" load={loadPremium}/>}
  </span>;
}
