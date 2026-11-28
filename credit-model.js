export const WELCOME_CREDITS=30;
export const FREE_DRAFT_LIMIT=5;
export const creditPacks=[{id:'credits-50',credits:50,stars:50},{id:'credits-200',credits:200,stars:200},{id:'credits-600',credits:600,stars:500,bonus:100}];
export function exportCreditCost(kind,quality='standard',premium=false){return premium?0:(kind==='video'?2.5:1)+(quality==='high'?1:0);}
export function premiumActive(account,now=Date.now()){const value=account?.subscription?.expiresAt;return (typeof value==='number'?value:typeof value==='string'?Date.parse(value):0)>now;}
export function accountFromRow(row,now=Date.now()){
  const percent=Number(row?.discount_percent)||0,until=Number(row?.discount_until)||null;
  return {credits:Number(row?.credits)||0,welcomeClaimed:row?.welcome_claimed_at!=null,subscription:{expiresAt:Number(row?.subscription_expires_at)||null},
    discount:percent&&(!until||until>now)?{percent,scope:row.discount_scope||'all',expiresAt:until,code:row.discount_code||''}:null};
}
