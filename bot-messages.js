export const botCopy={
  en:{
    description:'Turn screenshots and screen recordings into beautiful mockups and animated showcases. Edit, style, and export—all inside Telegram.',
    shortDescription:'Beautiful mockups and animated showcases from your screenshots and recordings. Right inside Telegram.',
    startCommand:'Open Mockify and start creating',
    button:'Open Mockify',
    welcome:e=>`${e('hello')} <b>Welcome to Mockify</b>\n\nTurn screenshots and screen recordings into <b>polished mockups</b> and <b>animated showcases</b>.\n\n${e('shot')} Send or upload a screenshot\n${e('style')} Choose a device, background and look\n${e('export')} Export a crisp image or video\n\n${e('chat')} Your finished work arrives right here in this chat.`,
  },
  ru:{
    description:'Превращайте скриншоты и записи экрана в красивые мокапы и анимированные демонстрации. Редактируйте, оформляйте и экспортируйте прямо в Telegram.',
    shortDescription:'Красивые мокапы и анимированные демонстрации из ваших скриншотов и записей экрана. Прямо в Telegram.',
    startCommand:'Открыть Mockify и начать создавать',
    button:'Открыть Mockify',
    welcome:e=>`${e('hello')} <b>Добро пожаловать в Mockify</b>\n\nПревращайте скриншоты и записи экрана в <b>аккуратные мокапы</b> и <b>анимированные демонстрации</b>.\n\n${e('shot')} Отправьте или загрузите скриншот\n${e('style')} Выберите устройство, фон и стиль\n${e('export')} Экспортируйте чёткое фото или видео\n\n${e('chat')} Готовые работы придут прямо в этот чат.`,
  },
};

// The welcome video ships as a static asset (served by Cloudflare's CDN, not the Worker).
// Rename the file when it changes, so its year-long cache never serves a stale copy.
export const START_VIDEO='/bot/welcome-v1.mp4';

// With `animation` (a Telegram file_id or the video URL) the welcome is one looping, silent
// video with the text as its caption; without it, the plain text welcome.
// Welcome emoji: each slot names the standard emoji it prefers from the premium pack (first
// match wins) and the plain emoji shown when the pack is unavailable.
export const START_EMOJI_PACK='TgDuckX';
const emojiSlots={hello:['👋','🦆','😊','🥰'],shot:['📱','📸','🖼','📷'],style:['🎨','💅','😎','✨'],export:['🚀','⚡','🔥','💪'],chat:['💬','👇','📩','😉']};
const plain=emoji=>emoji.replace(/\uFE0F/g,'');
// Map each slot to a custom emoji from a getStickerSet result; unmatched slots take the
// pack's next unused sticker, so every slot gets a duck when the pack has enough.
export function packEmoji(stickers=[]){
  const usable=stickers.filter(sticker=>sticker.custom_emoji_id&&sticker.emoji),used=new Set(),picked={};
  for(const [slot,wanted] of Object.entries(emojiSlots)){const match=wanted.map(plain).flatMap(want=>usable.filter(sticker=>plain(sticker.emoji)===want&&!used.has(sticker.custom_emoji_id)))[0];if(match){used.add(match.custom_emoji_id);picked[slot]=match;}}
  for(const slot of Object.keys(emojiSlots))if(!picked[slot]){const next=usable.find(sticker=>!used.has(sticker.custom_emoji_id));if(next){used.add(next.custom_emoji_id);picked[slot]=next;}}
  return Object.fromEntries(Object.entries(picked).map(([slot,sticker])=>[slot,{id:sticker.custom_emoji_id,emoji:sticker.emoji}]));
}
const emojiWriter=pack=>slot=>pack?.[slot]?`<tg-emoji emoji-id="${pack[slot].id}">${pack[slot].emoji}</tg-emoji>`:emojiSlots[slot][0];

export function startReply(message,appUrl,animation,pack=null){
  const language=botCopy[message.from?.language_code?.toLowerCase().split('-')[0]]??botCopy.en,copy={...language,welcome:language.welcome(emojiWriter(pack))};
  const reply_markup={inline_keyboard:[[{text:copy.button,web_app:{url:appUrl}}]]};
  if(animation)return {chat_id:message.chat.id,animation,caption:copy.welcome,parse_mode:'HTML',width:1280,height:720,duration:6,reply_markup};
  return {chat_id:message.chat.id,text:copy.welcome,parse_mode:'HTML',reply_markup};
}
