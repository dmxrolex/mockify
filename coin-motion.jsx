import React from 'react';
import { TelegramStar } from './brand-icons.jsx';

export function HeaderCoin(){
  return <span className="header-coin" aria-hidden="true"><TelegramStar/></span>;
}

export default function CoinMotion(){
  return <div className="balance-coin-scene" aria-hidden="true">
    <div className="coin-sparkles">{Array.from({length:10},(_,i)=><span key={i} className={'coin-particle particle-'+i%3} style={{'--particle-x':[6,80,12,91,3,78,24,86,36,65][i]+'%','--particle-y':[16,8,73,72,46,88,5,40,85,12][i]+'%','--particle-delay':(-i*.53)+'s','--particle-size':(i%3===0?10:6)+'px'}}/>)}</div>
    <TelegramStar animated className="balance-star"/>
  </div>;
}
