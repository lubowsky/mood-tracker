// src\bot\commands\mainMenu.ts
import { Composer, InlineKeyboard, InputFile } from 'grammy';
import { MyContext } from '../middlewares/userMiddleware';
import { getMainMenu } from '../keyboards';

import subscriptionModule from './menu/subscription';
import statsModule from './menu/statistics';
import historyModule from './menu/history';
import dictionaryModule from './menu/dictionary';

import { generateTextContent, generateJSONContent } from '../../utils/exportUtils'
import { calculateUserAccess } from '../../utils/accessService';

const composer = new Composer<MyContext>();

const SYSTEM_BUTTONS = [
  '📋 Последние записи',
  '📊 Подписка',
  '⏰ Настройки',
  '💾 Экспорт записей',
];

composer.on('message:text').filter(
  (ctx) => SYSTEM_BUTTONS.includes(ctx.message.text),
  async (ctx, next) => {
    ctx.session.isAddingEntry = false; // Сбрасываем флаг дневника при нажатии любой кнопки меню
    return next();
  }
);

composer.use(subscriptionModule)
// composer.use(statsModule);
composer.use(historyModule);
composer.use(dictionaryModule);

// Временная отладка для mainMenu.ts
console.log('🔵 MainMenu loaded');

composer.hears('⏰ Настройки', async (ctx) => {
  console.log('Settings button pressed by user:', ctx.from?.id);
  const { showMainSettings } = await import('./settings');
  await showMainSettings(ctx);
});

composer.hears('ℹ️ Помощь', async (ctx) => {
  console.log('Help button pressed by user:', ctx.from?.id);

  const keyboard = new InlineKeyboard()
    .url('👩‍⚕️ Записаться к психологу', 'https://t.me/psu_shatunova')
    .row()
    .url('💬 Техподдержка', 'https://t.me/OsipovaVictory')
  
  await ctx.reply(`*Как пользоваться ботом:*

📝 *Добавить запись* - опиши свое состояние:
   - Физические симптомы (головная боль, тошнота и т.д.)
   - Эмоции и их интенсивность
   - Мысли в моменте
   - Контекст (сон, еда, стресс)

📊 *Статистика* - получи анализ за период:
   - Средние показатели
   - Частые симптомы и эмоции
   - Зависимость от времени суток

📋 *Последние записи* - просмотр истории
⏰ *Настройки* - настрой уведомления и часовой пояс
💾 *Экспорт записей* - скачай все данные в файл

[📘 Подробный гайд использования бота](https://docs.google.com/document/d/1d3asSUZO18IjhDTON03cRMver87x4F4rjUhGjX_PbBg/edit?usp=sharing)
`, { 
    parse_mode: 'Markdown',
    // link_preview_options: { is_disabled: true },
    reply_markup: keyboard
  });
});

// Обработчики экспорта
composer.callbackQuery(/^export_(text|json|back)$/, async (ctx) => {
  const action = ctx.match![1];
  const hasAccess = await calculateUserAccess(ctx.from!.id)
  
  if (action === 'back') {
    await ctx.answerCallbackQuery();
    await ctx.deleteMessage();
    await ctx.reply('Главное меню:', { reply_markup: getMainMenu(!!hasAccess) });
    return;
  }
  
  await ctx.answerCallbackQuery({ text: '⏳ Формирую файл...' });
  
  try {
    const { EntryService } = await import('../../services/entryService');
    const { getEntriesPeriod, safeFormatDate } = await import('../../utils/exportUtils');
    const entries = await EntryService.getUserEntries(ctx.user!._id!, 1000);
    
    if (entries.length === 0) {
      await ctx.editMessageText('📝 У тебя пока нет записей для экспорта');
      return;
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    const userName = ctx.user!.firstName || 'Пользователь';
    const period = getEntriesPeriod(entries);
    
    let filename: string, content: Buffer;
    
    if (action === 'json') {
      filename = `дневник-состояния-${timestamp}.json`;
      content = generateJSONContent(entries, userName, timestamp);
    } else {
      filename = `дневник-состояния-${timestamp}.txt`;
      content = generateTextContent(entries, userName, timestamp);
    }

    const periodText = `с ${safeFormatDate(period.start)} по ${safeFormatDate(period.end)}`;
    
    await ctx.replyWithDocument(
      new InputFile(content, filename),
      {
        caption: `💾 Экспортировано ${entries.length} записей\n` +
                `📅 Период: ${periodText}`
      }
    );
    
    await ctx.deleteMessage();
    
  } catch (error) {
    console.error('Export error:', error);
    await ctx.editMessageText('❌ Ошибка при создании файла');
  }
});

// Обработчик кнопки "Назад"
composer.hears('↩️ Назад', async (ctx) => {
  const hasAccess = await calculateUserAccess(ctx.from!.id)
  await ctx.reply('Главное меню:', { 
    reply_markup: getMainMenu(!!hasAccess)
  });
});

export default composer;
