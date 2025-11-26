// src\bot\commands\settings.ts
import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../middlewares/userMiddleware';
import { getCollection } from '../../models/database';
import { User, UserCollection, UserSettings } from '../../models/User';
import { mainMenu } from '../keyboards';

const composer = new Composer<MyContext>();

// Часовые пояса РФ
const RUSSIAN_TIMEZONES = [
  ['Калининград (UTC+2)', 'Europe/Kaliningrad'],
  ['Москва (UTC+3)', 'Europe/Moscow'],
  ['Самара (UTC+4)', 'Europe/Samara'],
  ['Екатеринбург (UTC+5)', 'Asia/Yekaterinburg'],
  ['Омск (UTC+6)', 'Asia/Omsk'],
  ['Красноярск (UTC+7)', 'Asia/Krasnoyarsk'],
  ['Иркутск (UTC+8)', 'Asia/Irkutsk'],
  ['Якутск (UTC+9)', 'Asia/Yakutsk'],
  ['Владивосток (UTC+10)', 'Asia/Vladivostok'],
  ['Магадан (UTC+11)', 'Asia/Magadan'],
  ['Камчатка (UTC+12)', 'Asia/Kamchatka']
];

const MORNING_TIMES = ['06:00', '07:00', '08:00', '09:00', '10:00'];
const EVENING_TIMES = ['20:00', '21:00', '22:00', '23:00', '24:00'];

// Главный обработчик настроек
composer.hears('⏰ Настройки', async (ctx) => {
  await showMainSettings(ctx);
});

// Функция показа главного меню настроек
async function showMainSettings(ctx: MyContext) {
  const user = ctx.user!;
  const settings = user.settings;
  
  const timezoneName = RUSSIAN_TIMEZONES.find(([_, value]) => value === settings.timezone)?.[0] || settings.timezone;
  
  const text = `⏰ *Настройки уведомлений*

*Текущие настройки:*
👤 Имя для обращения: ${settings.homeName}
🕐 Часовой пояс: ${timezoneName}
🌅 Утреннее уведомление: ${settings.morningNotification}
🌙 Вечернее уведомление: ${settings.eveningNotification}
🌞 Дневные уведомления: ${settings.daytimeNotifications ? 'Включены ✅' : 'Выключены ❌'}
🔔 Все уведомления: ${settings.notificationsEnabled ? 'Включены ✅' : 'Выключены ❌'}

*Выбери что хочешь настроить:*`;

  const keyboard = new InlineKeyboard()
    .text('👤 Как к вам обращаться?', 'change_display_name').row()
    .text('🕐 Изменить часовой пояс', 'change_timezone')
    .text('🌅 Изменить утреннее время', 'change_morning_time').row()
    .text('🌙 Изменить вечернее время', 'change_evening_time')
    .text(settings.daytimeNotifications ? '🌞 Выключить дневные' : '🌞 Включить дневные', 'toggle_daytime_notifications').row()
    .text(settings.notificationsEnabled ? '🔕 Выключить все' : '🔔 Включить все', 'toggle_notifications').row()
    .text('✅ Завершить настройки', 'finish_settings');

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } else {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
}

composer.callbackQuery('finish_settings', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText('✅ Настройки сохранены! Теперь ты можешь начать отслеживать свое состояние.');
  await ctx.reply('Главное меню:', { 
    reply_markup: mainMenu 
  });
});

// Обработчики callback-запросов для inline-кнопок
composer.callbackQuery('change_display_name', async (ctx) => {
  await ctx.answerCallbackQuery();
  return await ctx.conversation.enter("changeNameConversation");
});

composer.callbackQuery('change_timezone', async (ctx) => {
  await ctx.answerCallbackQuery();
  await showTimezoneSettings(ctx);
});

composer.callbackQuery('change_morning_time', async (ctx) => {
  await ctx.answerCallbackQuery();
  await showMorningSettings(ctx);
});

composer.callbackQuery('change_evening_time', async (ctx) => {
  await ctx.answerCallbackQuery();
  await showEveningSettings(ctx);
});

composer.callbackQuery('toggle_notifications', async (ctx) => {
  await ctx.answerCallbackQuery();
  const user = ctx.user!;
  const newStatus = !user.settings.notificationsEnabled;
  
  await updateUserSettings(ctx, { notificationsEnabled: newStatus });
  await ctx.editMessageText(
    `✅ Уведомления ${newStatus ? 'включены' : 'выключены'}!`,
    { parse_mode: 'Markdown' }
  );
  
  // Показываем обновленные настройки
  setTimeout(() => showMainSettings(ctx), 1000);
});

composer.callbackQuery('toggle_daytime_notifications', async (ctx) => {
  await ctx.answerCallbackQuery();
  const user = ctx.user!;
  const newStatus = !user.settings.daytimeNotifications;
  
  await updateUserSettings(ctx, { daytimeNotifications: newStatus });
  await ctx.editMessageText(
    `✅ Дневные уведомления ${newStatus ? 'включены' : 'выключены'}!`,
    { parse_mode: 'Markdown' }
  );
  
  setTimeout(() => showMainSettings(ctx), 1000);
});

// Функция показа выбора часового пояса
async function showTimezoneSettings(ctx: MyContext) {
  const keyboard = new InlineKeyboard();
  
  // Добавляем кнопки часовых поясов по 2 в ряд
  for (let i = 0; i < RUSSIAN_TIMEZONES.length; i += 2) {
    const row = [];
    row.push(InlineKeyboard.text(RUSSIAN_TIMEZONES[i][0], `timezone_${RUSSIAN_TIMEZONES[i][1]}`));
    
    if (RUSSIAN_TIMEZONES[i + 1]) {
      row.push(InlineKeyboard.text(RUSSIAN_TIMEZONES[i + 1][0], `timezone_${RUSSIAN_TIMEZONES[i + 1][1]}`));
    }
    
    keyboard.row(...row);
  }
  
  keyboard.row(InlineKeyboard.text('↩️ Назад', 'back_to_settings'));

  await ctx.editMessageText('🕐 *Выбери свой часовой пояс:*', {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

async function showHomeNameSettings(ctx: MyContext) {
  const user = ctx.user!;
  const currentHomeName = user.settings.homeName || ctx.from?.first_name || 'пользователь';
  
  // Устанавливаем состояние ожидания имени
  ctx.session.awaitingHomeName = true;
  
  const keyboard = new InlineKeyboard();
  keyboard.row(InlineKeyboard.text('↩️ Назад', 'back_to_settings'));
  
  await ctx.editMessageText(
    'Давайте сделаем общение более персонализированным! ✨\n\n' +
    'Какое имя мне использовать для обращений к вам? Это сделает уведомления более тёплыми и персональными.\n\n' +
    `Сейчас я обращаюсь к вам как «${currentHomeName}». Если вы ничего не измените, я буду продолжать так обращаться.\n\n` +
    'Просто отправьте желаемое обращение в чат, и я его запомню!', {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

// Функция показа выбора утреннего времени
async function showMorningSettings(ctx: MyContext) {
  const keyboard = new InlineKeyboard()
    .text('06:00', 'morning_06:00')
    .text('07:00', 'morning_07:00').row()
    .text('08:00', 'morning_08:00')
    .text('09:00', 'morning_09:00')
    .text('10:00', 'morning_10:00').row()
    .text('↩️ Назад', 'back_to_settings');

  await ctx.editMessageText('🌅 *Выбери время утреннего уведомления:*', {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

// Функция показа выбора вечернего времени
async function showEveningSettings(ctx: MyContext) {
  const keyboard = new InlineKeyboard()
    .text('20:00', 'evening_20:00')
    .text('21:00', 'evening_21:00')
    .text('22:00', 'evening_22:00').row()
    .text('23:00', 'evening_23:00')
    .text('24:00', 'evening_24:00').row()
    .text('↩️ Назад', 'back_to_settings');

  await ctx.editMessageText('🌙 *Выбери время вечернего уведомления:*', {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

// Обработчики выбора часового пояса
RUSSIAN_TIMEZONES.forEach(([name, value]) => {
  composer.callbackQuery(`timezone_${value}`, async (ctx) => {
    await ctx.answerCallbackQuery();
    await updateUserSettings(ctx, { timezone: value });
    await ctx.editMessageText(`✅ Часовой пояс установлен: ${name}`, {
      parse_mode: 'Markdown'
    });
    
    // Показываем обновленные настройки
    setTimeout(() => showMainSettings(ctx), 1000);
  });
});

// Обработчики выбора утреннего времени
MORNING_TIMES.forEach(time => {
  composer.callbackQuery(`morning_${time}`, async (ctx) => {
    await ctx.answerCallbackQuery();
    await updateUserSettings(ctx, { morningNotification: time });
    await ctx.editMessageText(`✅ Утреннее уведомление установлено на ${time}`, {
      parse_mode: 'Markdown'
    });
    
    // Показываем обновленные настройки
    setTimeout(() => showMainSettings(ctx), 1000);
  });
});

// Обработчики выбора вечернего времени
EVENING_TIMES.forEach(time => {
  composer.callbackQuery(`evening_${time}`, async (ctx) => {
    await ctx.answerCallbackQuery();
    await updateUserSettings(ctx, { eveningNotification: time });
    await ctx.editMessageText(`✅ Вечернее уведомление установлено на ${time}`, {
      parse_mode: 'Markdown'
    });
    
    // Показываем обновленные настройки
    setTimeout(() => showMainSettings(ctx), 1000);
  });
});

// Обработчик кнопки "Назад"
composer.callbackQuery('back_to_settings', async (ctx) => {
  await ctx.answerCallbackQuery();
  await showMainSettings(ctx);
});

async function updateUserSettings(ctx: MyContext, updates: Partial<UserSettings>) {
  const usersCollection = await getCollection(UserCollection);
  await usersCollection.updateOne(
    { _id: ctx.user!._id },
    { $set: { 
      ...Object.fromEntries(
        Object.entries(updates).map(([key, value]) => [`settings.${key}`, value])
      )
    }}
  );
  
  // Обновляем объект пользователя в контексте
  const updatedUser = await usersCollection.findOne({ _id: ctx.user!._id }) as User;
  ctx.user = updatedUser;
}

composer.callbackQuery('finish_settings', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText('✅ Настройки сохранены! Теперь ты можешь начать отслеживать свое состояние.');
  
  // Показываем главное меню с REPLY клавиатурой
  const { mainMenu } = await import('../keyboards');
  await ctx.reply('Главное меню:', { 
    reply_markup: mainMenu 
  });
});

// Экспортируем функцию для использования в start.ts
export { showMainSettings };

export default composer;