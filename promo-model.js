// Promo codes, shared by the Worker and the app. A code gives one of three rewards:
//   stars    – `amount` stars added to the balance
//   premium  – `amount` days of Premium (added after any current period)
//   discount – `amount` percent off the next purchase in `scope` (all | premium | credits)
export const PROMO_KINDS=['stars','premium','discount'];
export const PROMO_SCOPES=['all','premium','credits'];
export const PROMO_LIMITS={stars:[1,10000],premium:[1,366],discount:[5,90]};

// Codes are case-insensitive: stored and compared in upper case, letters, digits, - and _.
export const normalizeCode=value=>String(value??'').trim().toUpperCase().replace(/\s+/g,'');
export const validCode=code=>/^[A-Z0-9_-]{3,32}$/.test(code);

// Validate an owner's new code; returns {code} or {error}.
export function promoDraft(input,now=Date.now()){
  const code=normalizeCode(input?.code),kind=input?.kind,amount=Math.round(Number(input?.amount));
  if(!validCode(code))return {error:'Use 3–32 letters, digits, - or _.'};
  if(!PROMO_KINDS.includes(kind))return {error:'Choose a reward.'};
  const [min,max]=PROMO_LIMITS[kind];
  if(!Number.isFinite(amount)||amount<min||amount>max)return {error:`Amount must be ${min}–${max}.`};
  const scope=kind==='discount'&&PROMO_SCOPES.includes(input?.scope)?input.scope:'all';
  const maxUses=input?.maxUses==null||input.maxUses===''?null:Math.round(Number(input.maxUses));
  if(maxUses!==null&&(!Number.isFinite(maxUses)||maxUses<1||maxUses>1000000))return {error:'Max redemptions must be at least 1.'};
  const days=input?.validDays==null||input.validDays===''?null:Math.round(Number(input.validDays));
  if(days!==null&&(!Number.isFinite(days)||days<1||days>3650))return {error:'Valid days must be 1–3650.'};
  return {code:{code,kind,amount,scope,maxUses,expiresAt:days?now+days*86400000:null,newUsersOnly:!!input?.newUsersOnly,note:String(input?.note??'').slice(0,80)}};
}

// Price after a discount the account holds for this kind of product (never below 1 star).
export function discountFor(account,kind,now=Date.now()){
  const discount=account?.discount;
  if(!discount?.percent||(discount.expiresAt&&discount.expiresAt<=now))return null;
  if(discount.scope!=='all'&&discount.scope!==kind)return null;
  return discount;
}
export const discountedStars=(stars,discount)=>discount?Math.max(1,Math.round(stars*(100-discount.percent)/100)):stars;
