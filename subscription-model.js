// Shared catalogue; invoice prices and entitlements are verified by the worker.
export const subscriptionOffers=[{months:1,stars:69},{months:3,stars:149},{months:5,stars:250}];
export function subscriptionInfo(subscription,now=Date.now()) {
  const raw=subscription?.expiresAt;
  const parsed=typeof raw==='number'?raw:typeof raw==='string'?Date.parse(raw):NaN;
  const expiresAt=Number.isFinite(parsed)&&parsed>0?parsed:null;
  return {active:expiresAt!==null&&expiresAt>now,expiresAt};
}
export function extendMonths(timestamp,months) {
  const date=new Date(timestamp),day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+months);
  const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,last));return date.getTime();
}
export function subscriptionDate(timestamp,language='en') {
  return new Intl.DateTimeFormat(language==='ru'?'ru-RU':'en-GB',{day:'numeric',month:'short',year:'numeric'}).format(timestamp);
}
export function monthUnit(months,language='en') {
  return language==='ru'?{one:'месяц',few:'месяца',many:'месяцев',other:'месяца'}[new Intl.PluralRules('ru').select(months)]:months===1?'month':'months';
}
