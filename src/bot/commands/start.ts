import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../middlewares/userMiddleware';
import { mainMenu } from '../keyboards';

const composer = new Composer<MyContext>();

composer.command('start', async (ctx) => {
  const { policyText } = await import('../../conversations/policy');

  const keyboard = new InlineKeyboard()
    .text('Согласен', 'policy_accept');

  await ctx.reply(policyText, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
});

composer.callbackQuery('policy_accept', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup();

  const greeting = `👋 Привет, ${ctx.from?.first_name}!

Я - бот для отслеживания твоего состояния и настроения. \nСо мной ты сможешь:

📝 *Вести дневник состояния* - записывать физические и эмоциональные ощущения
⏰ *Получать уведомления* - утренние и вечерние напоминания  
📊 *Анализировать закономерности* - видеть связи между событиями и самочувствием
🔍 *Находить триггеры* - понимать, что влияет на твое состояние

*Давай сразу настроим уведомления!* Выбери часовой пояс и удобное время.`

  await ctx.reply(greeting, {
    parse_mode: "Markdown"
  });

  await new Promise((r) => setTimeout(r, 0));

  const { showMainSettings } = await import('./settings');
  await showMainSettings(ctx);
});

export default composer;