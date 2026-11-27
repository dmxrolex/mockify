export const botCopy={
  en:{
    description:'Turn screenshots and screen recordings into beautiful mockups and animated showcases. Edit, style, and export—all inside Telegram.',
    shortDescription:'Beautiful mockups and animated showcases from your screenshots and recordings. Right inside Telegram.',
    startCommand:'Open Mockify and start creating',
    button:'Open Mockify',
    welcome:'<b>Welcome to Mockify ✨</b>\n\nTurn screenshots and screen recordings into <b>beautiful mockups</b> and <b>animated showcases</b>.\n\nFrame it. Style it. Make it yours.\nYour finished images and videos land right here in chat.',
  },
  ru:{
    description:'Превращайте скриншоты и записи экрана в красивые мокапы и анимированные демонстрации. Редактируйте, оформляйте и экспортируйте прямо в Telegram.',
    shortDescription:'Красивые мокапы и анимированные демонстрации из ваших скриншотов и записей экрана. Прямо в Telegram.',
    startCommand:'Открыть Mockify и начать создавать',
    button:'Открыть Mockify',
    welcome:'<b>Добро пожаловать в Mockify ✨</b>\n\nПревращайте скриншоты и записи экрана в <b>красивые мокапы</b> и <b>анимированные демонстрации</b>.\n\nДобавляйте рамки, фон и свой стиль.\nГотовые изображения и видео придут прямо в этот чат.',
  },
};

export function startReply(message,appUrl){
  const copy=botCopy[message.from?.language_code?.toLowerCase().split('-')[0]]??botCopy.en;
  return {chat_id:message.chat.id,text:copy.welcome,parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:copy.button,web_app:{url:appUrl}}]]}};
}
