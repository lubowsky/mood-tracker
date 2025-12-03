// src\bot\commands\mainMenu.ts
import { Composer, InlineKeyboard, InputFile } from 'grammy';
import { MyContext } from '../middlewares/userMiddleware';
import { mainMenu as mainMenuKeyboard } from '../keyboards';
import path from 'path';
import fs from 'fs';
import { AnalyticsService } from '../../services/analyticsService';

import { generateTextContent, generateJSONContent } from '../../utils/exportUtils';
import { formatDate } from '../../utils/timeUtils';

const composer = new Composer<MyContext>();

// Временная отладка для mainMenu.ts
console.log('🔵 MainMenu loaded');

// Обработчики для всех кнопок главного меню
// Статистика  
composer.hears('📊 Статистика', async (ctx) => {
  console.log('Statistics button pressed by user:', ctx.from?.id);
  
  await ctx.reply('Выбери период для анализа:', {
    reply_markup: {
      keyboard: [
        [{ text: '📈 За 7 дней' }, { text: '📊 За 30 дней' }],
        [{ text: '🔍 Корреляции' }, { text: '↩️ Назад' }]
      ],
      resize_keyboard: true
    }
  });
});

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
        reply_markup: mainMenuKeyboard
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
      reply_markup: mainMenuKeyboard
    });
    
  } catch (error) {
    console.error('Error generating correlations:', error);
    await ctx.reply('Произошла ошибка при анализе данных', {
      reply_markup: mainMenuKeyboard
    });
  }
});

composer.hears('↩️ Назад', async (ctx) => {
  console.log('Back to main menu by user:', ctx.from?.id);
  await ctx.reply('Главное меню:', { reply_markup: mainMenuKeyboard });
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
      reply_markup: mainMenuKeyboard
    });
    
  } catch (error: any) {
    console.error('Error generating stats:', error);
    
    if (error.message === 'No entries found for the specified period') {
      await ctx.reply(`За последние ${days} дней нет записей. Начни вести записи для получения статистики!`, {
        reply_markup: mainMenuKeyboard
      });
    } else {
      await ctx.reply('Произошла ошибка при генерации статистики', {
        reply_markup: mainMenuKeyboard
      });
    }
  }
}

// composer.hears('📋 Последние записи', async (ctx) => {
//   console.log('Last entries button pressed by user:', ctx.from?.id);
  
//   try {
//     const { EntryService } = await import('../../services/entryService');
//     const { formatDate } = await import('../../utils/timeUtils');
    
//     const entries = await EntryService.getUserEntries(ctx.user!._id!, 10);
    
//     if (entries.length === 0) {
//       await ctx.reply('У тебя пока нет записей. Начни с команды "📝 Добавить запись"', {
//         reply_markup: mainMenuKeyboard // ← используем переименованный импорт
//       });
//       return;
//     }
    
//     let response = `📋 *Последние ${entries.length} записей:*\n\n`;
    
//     entries.forEach((entry, index) => {
//       response += `*Запись #${index + 1}* (${formatDate(entry.timestamp)})\n`;
//       response += `🏥 Физическое: ${entry.overallPhysical}/10\n`;
//       response += `🧠 Ментальное: ${entry.overallMental}/10\n`;
      
//       if (entry.physicalSymptoms.length > 0) {
//         response += `💊 Симптомы: ${entry.physicalSymptoms.map(s => s.name).join(', ')}\n`;
//       }
      
//       if (entry.emotions.length > 0) {
//         response += `💭 Эмоции: ${entry.emotions.map(e => e.name).join(', ')}\n`;
//       }
      
//       if (entry.notes) {
//         response += `📝 Заметки: ${entry.notes.slice(0, 50)}${entry.notes.length > 50 ? '...' : ''}\n`;
//       }
      
//       response += '─'.repeat(20) + '\n';
//     });
    
//     await ctx.reply(response, { 
//       parse_mode: 'Markdown',
//       reply_markup: mainMenuKeyboard // ← используем переименованный импорт
//     });
    
//   } catch (error) {
//     console.error('Error listing entries:', error);
//     await ctx.reply('Произошла ошибка при получении записей', {
//       reply_markup: mainMenuKeyboard // ← используем переименованный импорт
//     });
//   }
// });
composer.hears('📋 Последние записи', async (ctx) => {
  console.log('Last entries button pressed by user:', ctx.from?.id);

  try {
    const { EntryService } = await import('../../services/entryService');
    const { formatDate } = await import('../../utils/timeUtils');

    const entries = await EntryService.getUserEntries(ctx.user!._id!, 10);

    if (entries.length === 0) {
      await ctx.reply(
        'У тебя пока нет записей. Начни с команды "📝 Добавить запись"',
        { reply_markup: mainMenuKeyboard }
      );
      return;
    }

    let response = `📋 *Последние ${entries.length} записей:*\n\n`;

    entries.forEach((entry, index) => {
      response += `*Запись #${index + 1}* (${formatDate(entry.timestamp)})\n`;

      const isMorning = entry.timeOfDay === 'morning';

      // ---------- Утро: сон ----------
      if (isMorning && entry.sleepData) {
        response += `💤 *Сон:*\n`;
        if (entry.sleepData.hours !== undefined) {
          response += `• Длительность: ${entry.sleepData.hours} ч.\n`;
        }
        if (entry.sleepData.quality !== undefined) {
          response += `• Качество: ${entry.sleepData.quality}/10\n`;
        }
        if (entry.sleepData.dreamDescription) {
          response += `• Сон: ${entry.sleepData.dreamDescription}\n`;
        }
      }

      // ---------- Дневные/вечерние записи ----------
      if (!isMorning && !entry.sleepData) {
        // Физическое
        if (entry.overallPhysical != null) {
          response += `🏥 Физическое: ${entry.overallPhysical}/10\n`;
        }

        // Ментальное
        if (entry.overallMental != null) {
          response += `🧠 Ментальное: ${entry.overallMental}/10\n`;
        }

        // Мысли
        if (entry.thoughts) {
          response += `🧠 Мысли: ${entry.thoughts}\n`;
        }
      }

      // ---------- Симптомы ----------
      if (entry.physicalSymptoms?.length > 0) {
        const symptoms = entry.physicalSymptoms.map((s) =>
          s.intensity ? `${s.name} (${s.intensity}/10)` : s.name
        );
        response += `💊 Симптомы: ${symptoms.join(', ')}\n`;
      }

      // ---------- Эмоции ----------
      if (entry.emotions?.length > 0) {
        const emotions = entry.emotions.map((e) =>
          e.intensity ? `${e.name} (${e.intensity}/10)` : e.name
        );
        response += `💭 Эмоции: ${emotions.join(', ')}\n`;
      }
      const triggers = entry.triggers || []
      // ---------- Триггеры ----------
      if (triggers?.length > 0) {
        response += `⚡ Триггеры: ${triggers.join(', ')}\n`;
      }
      const activities = entry.activities || []
      // ---------- Активности ----------
      if (activities?.length > 0) {
        response += `🏃 Активности: ${activities.join(', ')}\n`;
      }

      // ---------- Питание ----------
      if (entry.food) {
        response += `🍽 Питание: ${entry.food}\n`;
      }

      // ---------- Стресс ----------
      if (entry.stressLevel != null) {
        response += `😣 Стресс: ${entry.stressLevel}/10\n`;
      }

      // ---------- Заметки ----------
      if (entry.notes) {
        response += `📝 Заметки: ${entry.notes}\n`;
      }

      response += '─'.repeat(20) + '\n';
    });

    await ctx.reply(response, {
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard
    });

  } catch (error) {
    console.error('Error listing entries:', error);
    await ctx.reply('Произошла ошибка при получении записей', {
      reply_markup: mainMenuKeyboard
    });
  }
});

composer.hears('⏰ Настройки', async (ctx) => {
  console.log('Settings button pressed by user:', ctx.from?.id);
  // Импортируем функцию настроек динамически
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

*Советы:*
- Записывай состояние в разное время суток
- Отмечай триггеры и контекст
- Регулярно просматривай статистику`, { 
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
});

composer.hears('💾 Экспорт записей', async (ctx) => {
  console.log('Export button pressed by user:', ctx.from?.id);
  
  await ctx.reply(
    `💾 *Экспорт всех записей*\n\n` +
    `Выбери формат для скачивания:\n` +
    `• 📝 Text - Простой текстовый файл\n` +
    `• 📋 JSON - Для переноса в другие приложения`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('📝 Text', 'export_text')
        .text('📋 JSON', 'export_json')
        .row()
        .text('↩️ Назад', 'export_back')
    }
  );
});

// Обработчики экспорта
composer.callbackQuery(/^export_(text|json|back)$/, async (ctx) => {
  const action = ctx.match![1];
  
  if (action === 'back') {
    await ctx.answerCallbackQuery();
    await ctx.deleteMessage();
    await ctx.reply('Главное меню:', { reply_markup: mainMenuKeyboard });
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
  await ctx.reply('Главное меню:', { 
    reply_markup: mainMenuKeyboard // ← используем переименованный импорт
  });
});

composer.hears('📚 Справочник эмоций', async (ctx) => {
  console.log('📚 Emotions dictionary button pressed by user:', ctx.from?.id);
  
  const keyboard = new InlineKeyboard()
    .text('Радость', 'emotion_joy')
    .text('Интерес', 'emotion_interest')
    .row()
    .text('Стыд', 'emotion_shame')
    .text('Грусть', 'emotion_sadness')
    .row()
    .text('Страх', 'emotion_fear')
    .text('Злость', 'emotion_anger')
    .row()
    .text('Отвращение', 'emotion_disgust')
    .row()
    .text('📥 Скачать справочник', 'download_emotions_guide')
    .row()
    .text('📚 Различие чувств и эмоций', 'difference_feelings_and_emotions')

  await ctx.reply(
    `*📚 Справочник эмоций*\n\n` +
    `*Что это такое?*\n` +
    `Это подробный классификатор эмоций, который поможет вам:\n\n` +
    `• 🎯 *Точно определять* свои чувства\n` +
    `• 💭 *Лучше понимать* эмоциональное состояние\n` +
    `• 📝 *Обогатить словарь* для ведения дневника\n` +
    `• 🔍 *Замечать нюансы* между похожими эмоциями\n\n` +
    `*Выберите категорию эмоций для изучения:*`,
    { 
      parse_mode: 'Markdown',
      reply_markup: keyboard
    }
  );
});

composer.callbackQuery('download_emotions_guide', async (ctx) => {
  await ctx.answerCallbackQuery('📥 Отправляем файл...');
  
  try {
    // Путь к готовому файлу
    const filePath = path.join(__dirname, '../../assets/emotions_guide.pdf');
    
    // Проверяем, что файл существует
    if (!fs.existsSync(filePath)) {
      await ctx.reply('❌ Файл временно недоступен');
      return;
    }

    // Создаем InputFile из готового файла
    const file = new InputFile(fs.createReadStream(filePath), 'справочник_эмоций.pdf');
    
    await ctx.replyWithDocument(
      file,
      {
        caption: `*📚 Полный справочник эмоций*\n\n` +
                `Сохраните этот файл для удобного использования:\n` +
                `• 📖 Изучайте спектр эмоций\n` +
                `• 💭 Используйте для саморефлексии\n` +
                `• 📝 Обогащайте словарный запас\n\n` +
                `_Файл подготовлен специально для бота InnerWeather_`,
        parse_mode: 'Markdown'
      }
    );

  } catch (error) {
    console.error('Error sending emotions file:', error);
    await ctx.answerCallbackQuery('❌ Ошибка при отправке файла');
  }
});

composer.callbackQuery('emotion_joy', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `*Радость:*\n\nСчастье, Восторг, Ликование, Приподнятость, Умиротворение, Забота, Ожидание, Надежда, Освобождение, Возбуждение, Принятие, Вера, Удовлетворение, Уверенность, Довольство, Окрыленность, Торжественность, Жизнерадостность, Облегчение, Достоинство, Удивление, Блаженство, Спокойствие, Гордость, Восхищение, Вдохновение, Воодушевление, Смирение, Волнение, Благодарность, Радушие, Озарение, Веселье, Сентиментальность`,
    { 
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('« Назад к списку эмоций', 'back_to_emotions')
    }
  );
});

composer.callbackQuery('emotion_sadness', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `*Грусть:*\n\nОбида, Досада, Зависть, Огорчение, Истерика, Растерянность, Сломленность, Безвыходность, Апатия, Неуверенность, Грусть, Печаль, Горечь, Тоска, Скорбь, Лень, Жалость, Отрешенность, Отчаяние, Душевная боль, Безнадежность, Отчужденность, Разочарование, Потрясение, Сожаление, Скука, Безысходность, Загнанность, Тупик, Усталость, Принуждение, Одиночество, Отверженность, Подавленность, Холодность, Безучастность, Равнодушие, Умиротворение, Ожидание, Удовлетворение, Сочувствие, Спокойствие, Смирение, Раскаяние, Угрюмость, горе, сентиментальность, принятие`,
    { 
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('« Назад к списку эмоций', 'back_to_emotions')
    }
  );
});

composer.callbackQuery('emotion_fear', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `*Страх:*\n\nРевность, Ужас, Испуг, Оцепенение, Замороженность, Подозрение, Тревога, Ошарашенность, Беспокойство, Боязнь, Унижение, Замешательство, Вина, Сомнение, Застенчивость, Растерянность, Опасение, Сломленность, Подвох, Ошеломленность, Раскаяние, Безвыходность, Неполноценность, Неловскость, Безразличие, Апатия, Неуверенность, Лень, Отчаяние, Беспомощность, Безнадежность, Потрясение, Скука, Безысходность, Загнанность, Одиночество, Волнение, Робость, Позор, Смятение`,
    { 
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('« Назад к списку эмоций', 'back_to_emotions')
    }
  );
});

composer.callbackQuery('emotion_anger', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `*Злость/агрессия:*\n\nБешенство, Ярость, Ненависть, Истерика, Злость, Гнев, Раздражение, Презрение, Негодование, Обида, Ревность, Уязвленность, Досада, Зависть, Неприязнь, Возмущение, Нервозность, Пренебрежение, Недовольство, Вредность, Огорчение, Нетерпимость, Вседозволенность, Надменность, Превосходство, Апатия, Усталость, Разочарование, Скука, Холодность, Враждебность, Угрюмость, несправедливость, зависть, месть, злорадство, нетерпимость, принуждение`,
    { 
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('« Назад к списку эмоций', 'back_to_emotions')
    }
  );
});

// Добавьте аналогичные обработчики для остальных эмоций...
composer.callbackQuery('emotion_interest', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `*Интерес:*\n\nЗависть, Подозрение, Приподнятость, Оживление, Увлечение, Ожидание, Возбуждение, Предвкушение, Любопытство, Нетерпение, Изумление, Уверенность, Окрыленность, Удивление, Сочувствие, Гордость, Восхищение, Уважение, Очарование, Искренность, Вдохновение, Воодушевление, Смятение, Вожделение, Смущение, спонтанность, надежда, нетерпимость, Вера`,
    { 
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('« Назад к списку эмоций', 'back_to_emotions')
    }
  );
});

composer.callbackQuery('emotion_shame', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `*Стыд:*\n\nРевность, Уязвленность, Зависть, Вседозволенность, Подозрение, Унижение, Замешательство, Вина, Стыд, Сомнение, Застенчивость, Смущение, Надменность, Безвыходность, Высокомерие, Неудобство, Неловкость, Беспомощность, Отчужденность, Скука, Безысходность, Тупик, Отверженность, Холодность, Возбуждение, Восхищение, Раскаяние, Волнение, Робость, Позор, Смятение, Смущение, несправедливость, принуждение`,
    { 
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('« Назад к списку эмоций', 'back_to_emotions')
    }
  );
});

composer.callbackQuery('emotion_disgust', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `*Отвращение:*\n\nПрезрение, Неприязнь, Отвращение, Пренебрежение, Вредность, Надменность, Превосходство, Высокомерие, Лень, Жалость, Холодность, Брезгливость, омерзение, Мерзость, Я хочу отвергнуть, несправедливость, месть, нетерпимость, принуждение`,
    { 
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('« Назад к списку эмоций', 'back_to_emotions')
    }
  );
});

composer.callbackQuery('difference_feelings_and_emotions', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `🧠 *Эмоция* — это прежде всего телесный процесс. 

⚡️ *Эмоция*: быстрая, направленная, часто привязанная к конкретному стимулу. Она мобилизует тело: либо к действию, либо к уклонению, либо к остановке и наблюдению.

💓 С физиологической точки зрения эмоция — это вспышка автономной и моторной активности. В ней участвуют дыхание, сердцебиение, микро-движения лица, готовность к движению. Эмоция длится до 3 минут.

🎯 *Зачем нужна эмоция?* Она экономична и эффективна — почти всегда быстрее, чем рассудок. Эмоция подсказывает: что важно прямо сейчас. 

❤️ *Чувство* — это не просто долго длящееся состояние. Это: накопленный смысл, который формируется в поле отношений.

🔄 Чувство складывается из повторяющихся эмоциональных эпизодов и из того, как эти эпизоды были встречены другими: родителями, значимыми людьми, партнёром, обществом. Чувства возникают только в отношениях и меняются тоже в отношениях.

📊 *Как отличить эмоцию от чувства?*

⏰ *Временная характеристика:*
• Эмоция: вспышка — секунды, минуты ⚡️
• Чувство: устойчивое переживание — часы, дни, месяцы, годы 📅

💪 *Телесный профиль:*
• Эмоция: ясные физиологические маркееры — внезапное учащение дыхания, напряжение, желание двинуться 🏃‍♂️
• Чувство: хроническая позиция — «я всегда так», усталость, внутреннее предвзятое ожидание 😴

🎭 *Контекст:*
• Эмоция: связана с триггером «здесь и сейчас» 🎯
• Чувство: проявляется в разных отношениях и ситуациях как устойчивая схема 🔄

🔥 *Злость*
• Функция: защищает границы, мобилизует на действие 🛡️
• Телесно: часто в руках, плечах, челюсти, может быть «горячей», хочется двигаться вперёд 💪

🤢 *Отвращение*
• Функция: защита от токсичного, дистанцирование 🚫
• Телесно: ощущение в горле, животе, лице; желание «отвернуться» 🙈

😳 *Стыд*
• Функция: сигнал о риске разрыва связи, отношений 💔
• Телесно: опускание головы, закрывание корпуса, замирание, горят или краснеют уши и щеки — есть желание «спрятаться» 🙈

😊 *Радость*
• Функция: укреплять связь и отношения, подтверждать полноту опыта 🤝
• Телесно: расширение, лёгкость, улыбка, свободный вдох 🌈

😨 *Страх*
• Функция: охрана жизни; предупреждает о риске ⚠️
• Телесно: сжатие, холод в конечностях, желание замереть или убежать 🏃‍♂️

🤔 *Интерес*
• Функция: двигаться к новому; учиться 📚
• Телесно: лёгкость, направленность вперёд, улыбка 😊
• Интерес — это ресурс для изменения 💫

😔 *Грусть*
• Функция: отпускание, переработка потерь 🍂
• Телесно: тяжесть в плечах, сдавливание в груди, слёз 😢
• Грусть — не то же самое, что депрессия; грусть — адаптивна, если ей дают место 🌱`,
    { 
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('« Назад к списку эмоций', 'back_to_emotions')
    }
  );
});

// Обработчик кнопки "Назад" для эмоций
composer.callbackQuery('back_to_emotions', async (ctx) => {
  await ctx.answerCallbackQuery();
  
  const keyboard = new InlineKeyboard()
    .text('Радость', 'emotion_joy')
    .text('Интерес', 'emotion_interest')
    .row()
    .text('Стыд', 'emotion_shame')
    .text('Грусть', 'emotion_sadness')
    .row()
    .text('Страх', 'emotion_fear')
    .text('Злость', 'emotion_anger')
    .row()
    .text('Отвращение', 'emotion_disgust')
    .row()
    .text('📥 Скачать справочник', 'download_emotions_guide')
    .row()
    .text('📚 Различие чувств и эмоций', 'difference_feelings_and_emotions');

  await ctx.editMessageText('*📚 Справочник эмоций*\n\nВыберите категорию эмоций для просмотра:', {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
});

export default composer;

// import { Composer, InlineKeyboard, InputFile } from 'grammy';
// import { MyContext } from '../middlewares/userMiddleware';
// import { mainMenu as mainMenuKeyboard } from '../keyboards';
// import path from 'path';
// import fs from 'fs';
// import { AnalyticsService } from '../../services/analyticsService';
// import { generateTextContent, generateJSONContent } from '../../utils/exportUtils';
// import { formatDate } from '../../utils/timeUtils';

// const composer = new Composer<MyContext>();

// // Временная отладка для mainMenu.ts
// console.log('🔵 MainMenu loaded');

// // ========== СУЩЕСТВУЮЩИЕ ОБРАБОТЧИКИ (оставляем как есть) ==========

// // Статистика  
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

// composer.hears('📈 За 7 дней', async (ctx) => {
//   console.log('7 days stats requested by user:', ctx.from?.id);
//   await generateStats(ctx, 7);
// });

// composer.hears('📊 За 30 дней', async (ctx) => {
//   console.log('30 days stats requested by user:', ctx.from?.id);
//   await generateStats(ctx, 30);
// });

// composer.hears('🔍 Корреляции', async (ctx) => {
//   console.log('Correlations requested by user:', ctx.from?.id);
//   try {
//     const correlations = await AnalyticsService.getCorrelations(ctx.user!._id!);
    
//     if (correlations.length === 0) {
//       await ctx.reply('Пока недостаточно данных для анализа корреляций. Продолжай вести записи!', {
//         reply_markup: mainMenuKeyboard
//       });
//       return;
//     }
    
//     let response = `🔍 *Возможные корреляции:*\n\n`;
    
//     correlations.forEach((correlation, index) => {
//       response += `${index + 1}. ${correlation}\n\n`;
//     });
    
//     response += `*Примечание:* Это автоматический анализ. Для точных выводов проконсультируйся со специалистом.`;
    
//     await ctx.reply(response, {
//       parse_mode: 'Markdown',
//       reply_markup: mainMenuKeyboard
//     });
    
//   } catch (error) {
//     console.error('Error generating correlations:', error);
//     await ctx.reply('Произошла ошибка при анализе данных', {
//       reply_markup: mainMenuKeyboard
//     });
//   }
// });

// composer.hears('↩️ Назад', async (ctx) => {
//   console.log('Back to main menu by user:', ctx.from?.id);
//   await ctx.reply('Главное меню:', { reply_markup: mainMenuKeyboard });
// });

// async function generateStats(ctx: MyContext, days: number) {
//   console.log(`Generating stats for ${days} days for user:`, ctx.from?.id);
  
//   try {
//     const stats = await AnalyticsService.getAnalytics(ctx.user!._id!, days);
//     console.log('Stats generated successfully:', stats);
    
//     let response = `📊 *Статистика за ${days} дней*\n\n`;
    
//     response += `*Общие показатели:*\n`;
//     response += `🏥 Среднее физическое: ${stats.averagePhysical.toFixed(1)}/10\n`;
//     response += `🧠 Среднее ментальное: ${stats.averageMental.toFixed(1)}/10\n\n`;
    
//     if (stats.sleepStats) {
//       response += `*Статистика сна:*\n`;
//       response += `💤 Среднее качество: ${stats.sleepStats.averageQuality.toFixed(1)}/10\n`;
//       response += `📈 Записей с данными сна: ${stats.sleepStats.totalEntriesWithSleep}\n`;
//       response += `😊 Хороших ночей: ${stats.sleepStats.goodSleepDays}\n`;
//       response += `😴 Плохих ночей: ${stats.sleepStats.poorSleepDays}\n\n`;
//     }
    
//     response += `*Частые симптомы:*\n`;
//     if (stats.commonSymptoms.length > 0) {
//       stats.commonSymptoms.forEach(symptom => {
//         response += `• ${symptom.name}: ${symptom.count} раз\n`;
//       });
//     } else {
//       response += `Нет данных\n`;
//     }
    
//     response += `\n*Частые эмоции:*\n`;
//     if (stats.commonEmotions.length > 0) {
//       stats.commonEmotions.forEach(emotion => {
//         response += `• ${emotion.name}: ${emotion.count} раз\n`;
//       });
//     } else {
//       response += `Нет данных\n`;
//     }
    
//     response += `\n*По времени суток:*\n`;
//     response += `🌅 Утро: Физ. ${stats.timeOfDayStats.morning.physical.toFixed(1)}/10, Мент. ${stats.timeOfDayStats.morning.mental.toFixed(1)}/10\n`;
//     response += `☀️ День: Физ. ${stats.timeOfDayStats.afternoon.physical.toFixed(1)}/10, Мент. ${stats.timeOfDayStats.afternoon.mental.toFixed(1)}/10\n`;
//     response += `🌆 Вечер: Физ. ${stats.timeOfDayStats.evening.physical.toFixed(1)}/10, Мент. ${stats.timeOfDayStats.evening.mental.toFixed(1)}/10\n`;
//     response += `🌙 Ночь: Физ. ${stats.timeOfDayStats.night.physical.toFixed(1)}/10, Мент. ${stats.timeOfDayStats.night.mental.toFixed(1)}/10\n`;
    
//     await ctx.reply(response, {
//       parse_mode: 'Markdown',
//       reply_markup: mainMenuKeyboard
//     });
    
//   } catch (error: any) {
//     console.error('Error generating stats:', error);
    
//     if (error.message === 'No entries found for the specified period') {
//       await ctx.reply(`За последние ${days} дней нет записей. Начни вести записи для получения статистики!`, {
//         reply_markup: mainMenuKeyboard
//       });
//     } else {
//       await ctx.reply('Произошла ошибка при генерации статистики', {
//         reply_markup: mainMenuKeyboard
//       });
//     }
//   }
// }

// composer.hears('📋 Последние записи', async (ctx) => {
//   console.log('Last entries button pressed by user:', ctx.from?.id);
  
//   try {
//     const { EntryService } = await import('../../services/entryService');
//     const { formatDate } = await import('../../utils/timeUtils');
    
//     const entries = await EntryService.getUserEntries(ctx.user!._id!, 10);
    
//     if (entries.length === 0) {
//       await ctx.reply('У тебя пока нет записей. Начни с команды "📝 Добавить запись"', {
//         reply_markup: mainMenuKeyboard
//       });
//       return;
//     }
    
//     let response = `📋 *Последние ${entries.length} записей:*\n\n`;
    
//     entries.forEach((entry, index) => {
//       response += `*Запись #${index + 1}* (${formatDate(entry.timestamp)})\n`;
//       response += `🏥 Физическое: ${entry.overallPhysical}/10\n`;
//       response += `🧠 Ментальное: ${entry.overallMental}/10\n`;
      
//       if (entry.physicalSymptoms.length > 0) {
//         response += `💊 Симптомы: ${entry.physicalSymptoms.map(s => s.name).join(', ')}\n`;
//       }
      
//       if (entry.emotions.length > 0) {
//         response += `💭 Эмоции: ${entry.emotions.map(e => e.name).join(', ')}\n`;
//       }
      
//       if (entry.notes) {
//         response += `📝 Заметки: ${entry.notes.slice(0, 50)}${entry.notes.length > 50 ? '...' : ''}\n`;
//       }
      
//       response += '─'.repeat(20) + '\n';
//     });
    
//     await ctx.reply(response, { 
//       parse_mode: 'Markdown',
//       reply_markup: mainMenuKeyboard
//     });
    
//   } catch (error) {
//     console.error('Error listing entries:', error);
//     await ctx.reply('Произошла ошибка при получении записей', {
//       reply_markup: mainMenuKeyboard
//     });
//   }
// });

// composer.hears('⏰ Настройки', async (ctx) => {
//   console.log('Settings button pressed by user:', ctx.from?.id);
//   const { showMainSettings } = await import('./settings');
//   await showMainSettings(ctx);
// });

// composer.hears('ℹ️ Помощь', async (ctx) => {
//   console.log('Help button pressed by user:', ctx.from?.id);

//   const keyboard = new InlineKeyboard()
//     .url('👩‍⚕️ Записаться к психологу', 'https://t.me/psu_shatunova')
//     .row()
//     .url('💬 Техподдержка', 'https://t.me/OsipovaVictory')
  
//   await ctx.reply(`*Как пользоваться ботом:*

// 📝 *Добавить запись* - опиши свое состояние:
//    - Физические симптомы (головная боль, тошнота и т.д.)
//    - Эмоции и их интенсивность
//    - Мысли в моменте
//    - Контекст (сон, еда, стресс)

// 📊 *Статистика* - получи анализ за период:
//    - Средние показатели
//    - Частые симптомы и эмоции
//    - Зависимость от времени суток

// 📋 *Последние записи* - просмотр истории
// ⏰ *Настройки* - настрой уведомления и часовой пояс
// 💾 *Экспорт записей* - скачай все данные в файл

// *Советы:*
// - Записывай состояние в разное время суток
// - Отмечай триггеры и контекст
// - Регулярно просматривай статистику`, { 
//     parse_mode: 'Markdown',
//     reply_markup: keyboard
//   });
// });

// // ========== НОВЫЙ КОД ДЛЯ ЭКСПОРТА ==========

// composer.hears('💾 Экспорт записей', async (ctx) => {
//   console.log('Export button pressed by user:', ctx.from?.id);
  
//   await ctx.reply(
//     `💾 *Экспорт всех записей*\n\n` +
//     `Выбери формат для скачивания:\n` +
//     `• 📝 Text - Простой текстовый файл\n` +
//     `• 📋 JSON - Для переноса в другие приложения`,
//     {
//       parse_mode: 'Markdown',
//       reply_markup: new InlineKeyboard()
//         .text('📝 Text', 'export_text')
//         .text('📋 JSON', 'export_json')
//         .row()
//         .text('↩️ Назад', 'export_back')
//     }
//   );
// });

// // Обработчики экспорта
// composer.callbackQuery(/^export_(text|json|back)$/, async (ctx) => {
//   const action = ctx.match![1];
  
//   if (action === 'back') {
//     await ctx.answerCallbackQuery();
//     await ctx.deleteMessage();
//     await ctx.reply('Главное меню:', { reply_markup: mainMenuKeyboard });
//     return;
//   }
  
//   await ctx.answerCallbackQuery({ text: '⏳ Формирую файл...' });
  
//   try {
//     const { EntryService } = await import('../../services/entryService');
//     const entries = await EntryService.getUserEntries(ctx.user!._id!, 1000);
    
//     if (entries.length === 0) {
//       await ctx.editMessageText('📝 У тебя пока нет записей для экспорта');
//       return;
//     }
    
//     const timestamp = new Date().toISOString().split('T')[0];
//     const userName = ctx.user!.firstName || 'Пользователь';
    
//     let filename: string, content: Buffer;
    
//     if (action === 'json') {
//       filename = `дневник-состояния-${timestamp}.json`;
//       content = generateJSONContent(entries, userName, timestamp);
//     } else {
//       filename = `дневник-состояния-${timestamp}.txt`;
//       content = generateTextContent(entries, userName, timestamp);
//     }
    
//     await ctx.replyWithDocument(
//       new InputFile(content, filename),
//       {
//         caption: `💾 Экспортировано ${entries.length} записей\n` +
//                 `📅 Период: с ${formatDate(entries[entries.length-1].timestamp)} по ${formatDate(entries[0].timestamp)}`
//       }
//     );
    
//     await ctx.deleteMessage();
    
//   } catch (error) {
//     console.error('Export error:', error);
//     await ctx.editMessageText('❌ Ошибка при создании файла');
//   }
// });

// // ========== СУЩЕСТВУЮЩИЙ КОД ДЛЯ ЭМОЦИЙ (оставляем как есть) ==========

// composer.hears('📚 Справочник эмоций', async (ctx) => {
//   console.log('📚 Emotions dictionary button pressed by user:', ctx.from?.id);
  
//   const keyboard = new InlineKeyboard()
//     .text('Радость', 'emotion_joy')
//     .text('Интерес', 'emotion_interest')
//     .row()
//     .text('Стыд', 'emotion_shame')
//     .text('Грусть', 'emotion_sadness')
//     .row()
//     .text('Страх', 'emotion_fear')
//     .text('Злость', 'emotion_anger')
//     .row()
//     .text('Отвращение', 'emotion_disgust')
//     .row()
//     .text('📥 Скачать справочник', 'download_emotions_guide')
//     .row()
//     .text('📚 Различие чувств и эмоций', 'difference_feelings_and_emotions')

//   await ctx.reply(
//     `*📚 Справочник эмоций*\n\n` +
//     `*Что это такое?*\n` +
//     `Это подробный классификатор эмоций, который поможет вам:\n\n` +
//     `• 🎯 *Точно определять* свои чувства\n` +
//     `• 💭 *Лучше понимать* эмоциональное состояние\n` +
//     `• 📝 *Обогатить словарь* для ведения дневника\n` +
//     `• 🔍 *Замечать нюансы* между похожими эмоциями\n\n` +
//     `*Выберите категорию эмоций для изучения:*`,
//     { 
//       parse_mode: 'Markdown',
//       reply_markup: keyboard
//     }
//   );
// });

// // ... остальной код для эмоций (оставляем без изменений) ...

// composer.callbackQuery('download_emotions_guide', async (ctx) => {
//   await ctx.answerCallbackQuery('📥 Отправляем файл...');
  
//   try {
//     const filePath = path.join(__dirname, '../../assets/emotions_guide.pdf');
    
//     if (!fs.existsSync(filePath)) {
//       await ctx.reply('❌ Файл временно недоступен');
//       return;
//     }

//     const file = new InputFile(fs.createReadStream(filePath), 'справочник_эмоций.pdf');
    
//     await ctx.replyWithDocument(
//       file,
//       {
//         caption: `*📚 Полный справочник эмоций*\n\n` +
//                 `Сохраните этот файл для удобного использования:\n` +
//                 `• 📖 Изучайте спектр эмоций\n` +
//                 `• 💭 Используйте для саморефлексии\n` +
//                 `• 📝 Обогащайте словарный запас\n\n` +
//                 `_Файл подготовлен специально для бота InnerWeather_`,
//         parse_mode: 'Markdown'
//       }
//     );

//   } catch (error) {
//     console.error('Error sending emotions file:', error);
//     await ctx.answerCallbackQuery('❌ Ошибка при отправке файла');
//   }
// });

// // ... остальные обработчики эмоций ...

// export default composer;