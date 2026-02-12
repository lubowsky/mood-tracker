import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../middlewares/userMiddleware';

const composer = new Composer<MyContext>();

composer.command('start', async (ctx) => {
  const { policyText } = await import('../../conversations/policy');

  const keyboard = new InlineKeyboard()
    .text('Согласен', 'policy_accept');

  // try {
  //     await ctx.api.setChatMenuButton({
  //         chat_id: ctx.chat?.id,
  //         menu_button: {
  //             type: "web_app",
  //             text: "Статистика",
  //             web_app: {
  //                 url: `https://modd-tracker-mini-app.vercel.app?telegramId=${ctx.from?.id}`,
  //             },
  //         },
  //     });
  // } catch (error) {
  //     console.error("Ошибка установки кнопки меню:", error);
  // }

  await ctx.reply(policyText, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
});

composer.callbackQuery('policy_accept', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup();

  const isReturningUser = ctx.user?.isTrialExhausted;

  let greeting = "";

  if (isReturningUser) {
    greeting = `👋 С возвращением, ${ctx.from?.first_name}! 

    Приятно, что ты решил(а) продолжить работу над собой. \nДавай актуализируем настройки уведомлений, чтобы тебе было удобно.`;
  } else {
    greeting = `👋 Привет, ${ctx.from?.first_name}!

      Я помогу тебе лучше понимать себя:
      📝 *Вести дневник состояния* — фиксировать физические и эмоциональные ощущения.
      ⏰ *Получать уведомления* — бережные напоминания утром и вечером.  
      🔍 *Находить триггеры* — узнавать, что именно влияет на твой комфорт.

      🎁 *Для тебя открыт пробный доступ:* \nБлижайшие **24 часа** ты можешь пользоваться всеми функциями бота совершенно бесплатно. Это время, чтобы ты мог(ла) без спешки осмотреться и почувствовать, подходит ли тебе такой формат.

      *Давай настроим уведомления!* \nВыбери часовой пояс и удобное время.`;
  }

  await ctx.reply(greeting, { parse_mode: "Markdown" });

  const { showMainSettings } = await import('./settings');
  await showMainSettings(ctx);
});

export default composer;