import React from 'react';
import PremiumEmblem from './premium-emblem.jsx';
import { MotionSticker } from './animated-sticker.jsx';

export function SubscriptionIcon({animated=false}){
  return <PremiumEmblem compact={!animated}/>;
}

export const telegramStar=new URL('./assets/telegram-star.svg',import.meta.url).href;
const loadStar=()=>import('./assets/telegram-star-animated.json');
export function TelegramStar({animated=false,className=''}){return <span className={'telegram-star-art '+className} aria-hidden="true"><img className="telegram-price-star" src={telegramStar} width="24" height="24" alt="" draggable="false"/>{animated&&<MotionSticker className="telegram-star-animation" load={loadStar}/>}</span>;}
