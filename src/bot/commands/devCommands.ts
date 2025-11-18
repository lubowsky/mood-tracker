import { Composer } from 'grammy';
import { MyContext } from '../middlewares/userMiddleware';
import { getCollection } from '../../models/database';
import { User, UserCollection } from '../../models/User';

import {
  morningService,
  daytimeService,
  notificationService
} from '../../index';

const composer = new Composer<MyContext>();

// 🔴 ПРОВЕРКА РАЗРАБОТЧИКА
function isDeveloper(userId: number): boolean {
  const developerIds = [151366380, 1041487347]; // Ваши ID
  return developerIds.includes(userId);
}

// 🔴 КОМАНДА ДЛЯ ТЕСТИРОВАНИЯ УТРЕННЕГО УВЕДОМЛЕНИЯ
composer.command('morning', async (ctx) => {
  if (!ctx.from) return;
  
  if (!isDeveloper(ctx.from.id)) {
    await ctx.reply('❌ Эта команда только для разработчиков');
    return;
  }

  console.log('🔄 Manual morning notification triggered by developer');

  try {
    // Получаем пользователя из базы
    const usersCollection = await getCollection(UserCollection);
    const user = await usersCollection.findOne({ telegramId: ctx.from.id }) as User;

    if (!user) {
      await ctx.reply('❌ Пользователь не найден в базе');
      return;
    }
    
    // 🔴 ВЫЗЫВАЕМ РЕАЛЬНЫЙ МЕТОД, КОТОРЫЙ ИСПОЛЬЗУЕТСЯ УТРОМ
    await morningService.sendMorningGreeting(user);

  } catch (error) {
    console.error('Error sending morning notification:', error);
    await ctx.reply('❌ Ошибка при отправке утреннего уведомления');
  }
});

// 🔴 КОМАНДА ДЛЯ ТЕСТИРОВАНИЯ ДНЕВНОГО УВЕДОМЛЕНИЯ
composer.command('day', async (ctx) => {
  if (!ctx.from) return;
  
  if (!isDeveloper(ctx.from.id)) {
    await ctx.reply('❌ Эта команда только для разработчиков');
    return;
  }

  console.log('🔄 Manual daytime notification triggered by developer');

  try {
    const usersCollection = await getCollection(UserCollection);
    const user = await usersCollection.findOne({ telegramId: ctx.from.id }) as User;

    if (!user) {
      await ctx.reply('❌ Пользователь не найден в базе');
      return;
    }
    
    // 🔴 ВЫЗЫВАЕМ РЕАЛЬНЫЙ МЕТОД
    await daytimeService.sendDaytimeNotification(user);
    
    await ctx.reply('✅ Дневное уведомление отправлено!');

  } catch (error) {
    console.error('Error sending daytime notification:', error);
    await ctx.reply('❌ Ошибка при отправке дневного уведомления');
  }
});

// 🔴 КОМАНДА ДЛЯ ТЕСТИРОВАНИЯ ВЕЧЕРНЕГО УВЕДОМЛЕНИЯ
composer.command('evening', async (ctx) => {
  if (!ctx.from) return;
  
  if (!isDeveloper(ctx.from.id)) {
    await ctx.reply('❌ Эта команда только для разработчиков');
    return;
  }

  console.log('🔄 Manual evening notification triggered by developer');

  try {
    const usersCollection = await getCollection(UserCollection);
    const user = await usersCollection.findOne({ telegramId: ctx.from.id }) as User;

    if (!user) {
      await ctx.reply('❌ Пользователь не найден в базе');
      return;
    }
    
    // 🔴 ВЫЗЫВАЕМ РЕАЛЬНЫЙ МЕТОД (делаем его публичным)
    await (notificationService as any).sendEveningNotification(user);
    
    await ctx.reply('✅ Вечернее уведомление отправлено!');

  } catch (error) {
    console.error('Error sending evening notification:', error);
    await ctx.reply('❌ Ошибка при отправке вечернего уведомления');
  }
});

export default composer;
