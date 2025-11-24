// src\bot\commands\getStats.ts
import { Composer } from 'grammy';
import { MyContext } from '../middlewares/userMiddleware';
import { AnalyticsService } from '../../services/analyticsService';
import { mainMenu } from '../keyboards';

const composer = new Composer<MyContext>();

// Обработчик для кнопки "📊 Статистика" из главного меню
// composer.hears('📊 Статистика', async (ctx) => {
//   console.log('Statistics button pressed by user:', ctx.from?.id);
  
//   await ctx.reply('Выбери период для анализа:', {
//     reply_markup: {
//       keyboard: [
//         [{ text: '📈 За 7 дней' }, { text: '📊 За 30 дней' }],
//         [{ text: '🔍 Корреляции' }, { text: '↩️ Назад' }]
//       ],
//       resize_keyboard: true
//     }
//   });
// });

// Обработчики для статистики (добавляем логирование)
composer.hears('📈 За 7 дней', async (ctx) => {
  console.log('7 days stats requested by user:', ctx.from?.id);
  await generateStats(ctx, 7);
});

composer.hears('📊 За 30 дней', async (ctx) => {
  console.log('30 days stats requested by user:', ctx.from?.id);
  await generateStats(ctx, 30);
});

composer.hears('🔍 Корреляции', async (ctx) => {
  console.log('Correlations requested by user:', ctx.from?.id);
  try {
    const correlations = await AnalyticsService.getCorrelations(ctx.user!._id!);
    
    if (correlations.length === 0) {
      await ctx.reply('Пока недостаточно данных для анализа корреляций. Продолжай вести записи!', {
        reply_markup: mainMenu
      });
      return;
    }
    
    let response = `🔍 *Возможные корреляции:*\n\n`;
    
    correlations.forEach((correlation, index) => {
      response += `${index + 1}. ${correlation}\n\n`;
    });
    
    response += `*Примечание:* Это автоматический анализ. Для точных выводов проконсультируйся со специалистом.`;
    
    await ctx.reply(response, {
      parse_mode: 'Markdown',
      reply_markup: mainMenu
    });
    
  } catch (error) {
    console.error('Error generating correlations:', error);
    await ctx.reply('Произошла ошибка при анализе данных', {
      reply_markup: mainMenu
    });
  }
});

composer.hears('↩️ Назад', async (ctx) => {
  console.log('Back to main menu by user:', ctx.from?.id);
  await ctx.reply('Главное меню:', { reply_markup: mainMenu });
});

async function generateStats(ctx: MyContext, days: number) {
  console.log(`Generating stats for ${days} days for user:`, ctx.from?.id);
  
  try {
    const stats = await AnalyticsService.getAnalytics(ctx.user!._id!, days);
    console.log('Stats generated successfully:', stats);
    
    let response = `📊 *Статистика за ${days} дней*\n\n`;
    
    response += `*Общие показатели:*\n`;
    response += `🏥 Среднее физическое: ${stats.averagePhysical.toFixed(1)}/10\n`;
    response += `🧠 Среднее ментальное: ${stats.averageMental.toFixed(1)}/10\n\n`;
    
    if (stats.sleepStats) {
      response += `*Статистика сна:*\n`;
      response += `💤 Среднее качество: ${stats.sleepStats.averageQuality.toFixed(1)}/10\n`;
      response += `📈 Записей с данными сна: ${stats.sleepStats.totalEntriesWithSleep}\n`;
      response += `😊 Хороших ночей: ${stats.sleepStats.goodSleepDays}\n`;
      response += `😴 Плохих ночей: ${stats.sleepStats.poorSleepDays}\n\n`;
    }
    
    response += `*Частые симптомы:*\n`;
    if (stats.commonSymptoms.length > 0) {
      stats.commonSymptoms.forEach(symptom => {
        response += `• ${symptom.name}: ${symptom.count} раз\n`;
      });
    } else {
      response += `Нет данных\n`;
    }
    
    response += `\n*Частые эмоции:*\n`;
    if (stats.commonEmotions.length > 0) {
      stats.commonEmotions.forEach(emotion => {
        response += `• ${emotion.name}: ${emotion.count} раз\n`;
      });
    } else {
      response += `Нет данных\n`;
    }
    
    response += `\n*По времени суток:*\n`;
    response += `🌅 Утро: Физ. ${stats.timeOfDayStats.morning.physical.toFixed(1)}/10, Мент. ${stats.timeOfDayStats.morning.mental.toFixed(1)}/10\n`;
    response += `☀️ День: Физ. ${stats.timeOfDayStats.afternoon.physical.toFixed(1)}/10, Мент. ${stats.timeOfDayStats.afternoon.mental.toFixed(1)}/10\n`;
    response += `🌆 Вечер: Физ. ${stats.timeOfDayStats.evening.physical.toFixed(1)}/10, Мент. ${stats.timeOfDayStats.evening.mental.toFixed(1)}/10\n`;
    response += `🌙 Ночь: Физ. ${stats.timeOfDayStats.night.physical.toFixed(1)}/10, Мент. ${stats.timeOfDayStats.night.mental.toFixed(1)}/10\n`;
    
    await ctx.reply(response, {
      parse_mode: 'Markdown',
      reply_markup: mainMenu
    });
    
  } catch (error: any) {
    console.error('Error generating stats:', error);
    
    if (error.message === 'No entries found for the specified period') {
      await ctx.reply(`За последние ${days} дней нет записей. Начни вести записи для получения статистики!`, {
        reply_markup: mainMenu
      });
    } else {
      await ctx.reply('Произошла ошибка при генерации статистики', {
        reply_markup: mainMenu
      });
    }
  }
}

export default composer;