
import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../middlewares/userMiddleware';
import { cancelKeyboard, mainMenu } from '../keyboards';
import { EntryService } from '../../services/entryService';
import { formatDate } from '../../utils/timeUtils';
import { ObjectId } from 'mongodb';

const composer = new Composer<MyContext>();

interface EntrySession {
  step: string;
  data: {
    physicalSymptoms: Array<{ name: string; intensity: number; location?: string }>;
    emotions: Array<{ name: string; intensity: number }>;
    thoughts: string;
    overallPhysical: number;
    overallMental: number;
    triggers?: string[];
    activities?: string[];
    food?: string;
    stressLevel?: number;
    sleepData?: {
      quality?: number;
      dreamDescription?: string;
      hours?: number;
    };
    notes?: string;
    tags?: string[];
  };
  currentSymptoms?: string[];
  selectedEmotions: string[];
}

const sessions = new Map<number, EntrySession>();

// ОПРЕДЕЛЯЕМ timeOfDay ПО ТЕКУЩЕМУ ВРЕМЕНИ
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hours = new Date().getHours();
  if (hours >= 5 && hours < 12) return 'morning';
  if (hours >= 12 && hours < 17) return 'afternoon';
  if (hours >= 17 && hours < 23) return 'evening';
  return 'night';
}

// СПИСОК ПОПУЛЯРНЫХ ЭМОЦИЙ
const popularEmotions = [
  '😊 Радость', '😌 Спокойствие', '🤗 Удовлетворение', '🎉 Восторг', '💖 Любовь',
  '🙏 Благодарность', '🌟 Вдохновение', '😇 Умиротворение', '🤩 Восхищение',
  '😐 Нейтрально', '🤔 Задумчивость', '🧐 Любопытство', '⏳ Ожидание',
  '😔 Грусть', '😢 Печаль', '😠 Злость', '😤 Раздражение', '😰 Тревога',
  '😨 Страх', '😓 Усталость', '😩 Истощение', '😞 Разочарование',
  '😒 Скука', '😖 Напряжение', '😵 Замешательство', '🥺 Обида'
];

// ИНЛАЙН-КЛАВИАТУРА ДЛЯ ВЫБОРА ЭМОЦИЙ
function createEmotionsKeyboard(selectedEmotions: string[] = []): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  for (let i = 0; i < popularEmotions.length; i += 2) {
    const rowEmotions = popularEmotions.slice(i, i + 2);
    
    rowEmotions.forEach(emotion => {
      const emotionText = emotion.split(' ')[1];
      const isSelected = selectedEmotions.includes(emotionText);
      const buttonText = isSelected ? `✅ ${emotion}` : emotion;
      const callbackData = isSelected ? `deselect_emotion_${emotionText}` : `select_emotion_${emotionText}`;
      
      keyboard.text(buttonText, callbackData);
    });
    
    if (i + 2 < popularEmotions.length) {
      keyboard.row();
    }
  }
  
  keyboard.row();
  keyboard.text('✍️ Ввести свои эмоции', 'custom_emotions');
  keyboard.row();
  
  if (selectedEmotions.length > 0) {
    keyboard.text(`✅ Готово (${selectedEmotions.length})`, 'emotions_done');
  } else {
    keyboard.text('❌ Нет эмоций', 'emotions_none');
  }
  
  return keyboard;
}

// ИНЛАЙН-КЛАВИАТУРА ДЛЯ ОЦЕНОК 1-10
function createIntensityKeyboard(step: string): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  for (let i = 1; i <= 5; i++) {
    keyboard.text(i.toString(), `intensity_${step}_${i}`);
  }
  keyboard.row();
  
  for (let i = 6; i <= 10; i++) {
    keyboard.text(i.toString(), `intensity_${step}_${i}`);
  }
  
  return keyboard;
}

// КЛАВИАТУРА ДЛЯ СНА
function createSleepKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  keyboard.text('😴 4-5 часов', 'sleep_4');
  keyboard.text('🛌 6-7 часов', 'sleep_6');
  keyboard.row();
  keyboard.text('💤 7-8 часов', 'sleep_7');
  keyboard.text('🌟 8+ часов', 'sleep_8');
  keyboard.row();
  keyboard.text('❌ Не указывать', 'sleep_skip');
  
  return keyboard;
}

// ИНЛАЙН-КЛАВИАТУРА ДЛЯ СТРЕССА
function createStressKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  keyboard.text('😊 1-2 - Спокойно', 'stress_1');
  keyboard.text('😐 3-4 - Норма', 'stress_3');
  keyboard.row();
  keyboard.text('😟 5-6 - Напряжение', 'stress_5');
  keyboard.text('😰 7-8 - Стресс', 'stress_7');
  keyboard.row();
  keyboard.text('😫 9-10 - Сильный стресс', 'stress_9');
  keyboard.text('❌ Не указывать', 'stress_skip');
  
  return keyboard;
}

// ИНЛАЙН-КЛАВИАТУРА ДЛЯ БЫСТРЫХ ОПЦИЙ
function createQuickOptionsKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  keyboard.text('🍽️ Еда/питание', 'quick_food');
  keyboard.text('🏃 Активности', 'quick_activities');
  keyboard.row();
  keyboard.text('🎯 Триггеры', 'quick_triggers');
  keyboard.text('📝 Заметки', 'quick_notes');
  keyboard.row();
  keyboard.text('✅ Завершить запись', 'quick_finish');
  
  return keyboard;
}

composer.hears('📝 Добавить запись', async (ctx) => {
  console.log('нажата кнопка Добавить запись пользователем', ctx.user?.firstName, ctx.user?.telegramId)
  const session: EntrySession = {
    step: 'physical_symptoms',
    data: {
      physicalSymptoms: [],
      emotions: [],
      thoughts: '',
      overallPhysical: 0,
      overallMental: 0
    },
    selectedEmotions: []
  };
  
  sessions.set(ctx.from!.id, session);
  ctx.session.isAddingEntry = true;
  
  await ctx.reply(`🏥 *Физические симптомы*

Опиши физические ощущения (через запятую):
• Головная боль
• Тошнота  
• Усталость
• Напряжение в мышцах
• Или другие симптомы

*Пример:* "головная боль, тошнота, напряжение в шее"
*Или напиши "нет" если симптомов нет*`, {
    parse_mode: 'Markdown',
    reply_markup: cancelKeyboard
  });
});

// ОБРАБОТЧИК СНА
composer.callbackQuery(/^sleep_(\w+)$/, async (ctx) => {
  const sleepType = ctx.match![1];
  const userId = Number(ctx.from?.id);
  const session = sessions.get(userId);
  
  if (session) {
    const sleepMap: { [key: string]: number } = {
      '4': 4.5, '6': 6.5, '7': 7.5, '8': 8.5, 'skip': 0
    };
    
    if (sleepType !== 'skip') {
      session.data.sleepData = {
        hours: sleepMap[sleepType],
        quality: Math.min(10, Math.max(1, sleepMap[sleepType] * 1.2)) // Авторасчет качества
      };
    }
    
    await ctx.editMessageText(`😰 *Уровень стресса*

Выбери уровень стресса за последние часы:`, {
      parse_mode: 'Markdown',
      reply_markup: createStressKeyboard()
    });
    
    await ctx.answerCallbackQuery(sleepType === 'skip' ? 'Сон не указан' : `Сон: ${sleepMap[sleepType]} часов`);
  }
});

async function saveEntryAndFinish(ctx: any, session: EntrySession, userId: number) {
  console.log('Пользователь завершает ручной ввод addEntry', Number(ctx.from?.id))
  try {
    // Добавляем симптомы из временного хранилища
    if (session.currentSymptoms) {
      for (const symptom of session.currentSymptoms) {
        session.data.physicalSymptoms.push({
          name: symptom,
          intensity: 0,
          location: ''
        });
      }
    }

    const moodEntryData = {
      userId: ctx.user!._id!,
      timestamp: new Date(),
      timeOfDay: getTimeOfDay(),
      source: 'manual' as const,
      
      // Основные данные
      physicalSymptoms: session.data.physicalSymptoms,
      emotions: session.data.emotions,
      thoughts: session.data.thoughts,
      overallPhysical: session.data.overallPhysical,
      overallMental: session.data.overallMental,
      
      // Контекст
      triggers: session.data.triggers,
      activities: session.data.activities,
      food: session.data.food,
      stressLevel: session.data.stressLevel,
      
      // Сон
      sleepData: session.data.sleepData,
      
      notes: session.data.notes,
      tags: session.data.tags || []
    };

    const entryId = await EntryService.createManualEntry(moodEntryData);
    
    sessions.delete(userId);
    ctx.session.isAddingEntry = false;
    
    // ОБНОВЛЕННАЯ СВОДКА
    let summary = `✅ *Запись сохранена!*\n\n`;
    // summary += `• Время суток: ${getTimeOfDay()}\n`;
    summary += `• Физическое состояние: ${session.data.overallPhysical}/10\n`;
    summary += `• Ментальное состояние: ${session.data.overallMental}/10\n`;
    summary += `• Симптомы: ${session.data.physicalSymptoms.map(s => s.name).join(', ') || 'нет'}\n`;
    summary += `• Эмоции: ${session.data.emotions.map(e => e.name).join(', ') || 'нет'}\n`;
    
    if (session.data.sleepData?.hours) {
      const qualityRounded = Number(session.data.sleepData.quality).toFixed(1);
      summary += `• Сон: ${session.data.sleepData.hours} часов (качество: ${qualityRounded}/10)\n`;
    }
    if (session.data.stressLevel) summary += `• Стресс: ${session.data.stressLevel}/10\n`;
    if (session.data.food) summary += `• Питание: ${session.data.food}\n`;
    if (session.data.activities) summary += `• Активности: ${session.data.activities.join(', ')}\n`;
    
    summary += `\nЗапись #${entryId.toString().slice(-6)} сохранена в ${formatDate(new Date())}.`;
    
    await ctx.reply(summary, {
      parse_mode: 'Markdown',
    });
    
    await ctx.reply('Через некоторое время сможешь проанализировать закономерности в статистике!', {
      reply_markup: mainMenu
    });
    console.log('addEntry успешно сохранено', Number(ctx.from?.id))
    
  } catch (error) {
    console.error('Error saving entry:', error);
    await ctx.reply('❌ Ошибка при сохранении записи. Попробуйте снова.', {
      reply_markup: mainMenu
    });
    sessions.delete(userId);
    ctx.session.isAddingEntry = false;
  }
}

composer.callbackQuery(/^select_emotion_(.+)$/, async (ctx) => {
  const emotion = ctx.match![1];
  const userId = Number(ctx.from?.id);
  const session = sessions.get(userId);
  
  if (session && session.step === 'emotions_selection') {
    if (!session.selectedEmotions.includes(emotion)) {
      session.selectedEmotions.push(emotion);
    }
    
    await ctx.editMessageText(`💭 *Выбери эмоции* (${session.selectedEmotions.length} выбрано)\n\nОтмечай подходящие эмоции:`, {
      parse_mode: 'Markdown',
      reply_markup: createEmotionsKeyboard(session.selectedEmotions)
    });
    
    await ctx.answerCallbackQuery(`Добавлено: ${emotion}`);
  }
});

composer.callbackQuery(/^deselect_emotion_(.+)$/, async (ctx) => {
  const emotion = ctx.match![1];
  const userId = Number(ctx.from?.id);
  const session = sessions.get(userId);
  
  if (session && session.step === 'emotions_selection') {
    session.selectedEmotions = session.selectedEmotions.filter(e => e !== emotion);
    
    await ctx.editMessageText(`💭 *Выбери эмоции* (${session.selectedEmotions.length} выбрано)\n\nОтмечай подходящие эмоции:`, {
      parse_mode: 'Markdown',
      reply_markup: createEmotionsKeyboard(session.selectedEmotions)
    });
    
    await ctx.answerCallbackQuery(`Убрано: ${emotion}`);
  }
});

composer.callbackQuery('custom_emotions', async (ctx) => {
  const userId = Number(ctx.from?.id);
  const session = sessions.get(userId);
  
  if (session && session.step === 'emotions_selection') {
    session.step = 'emotions_custom';
    
    await ctx.editMessageText(`✍️ *Введи свои эмоции*

Напиши эмоции через запятую:
*Пример:* "легкая тревога, смутное беспокойство, надежда"

Или просто нажми "Пропустить" если не хочешь указывать`, {
      parse_mode: 'Markdown'
    });
    
    await ctx.answerCallbackQuery();
  }
});

composer.callbackQuery('emotions_done', async (ctx) => {
  const userId = Number(ctx.from?.id);
  const session = sessions.get(userId);
  
  if (session && session.step === 'emotions_selection') {
    session.selectedEmotions.forEach(emotion => {
      session.data.emotions.push({
        name: emotion,
        intensity: 0
      });
    });
    
    session.step = 'mental_intensity';
    
    await ctx.editMessageText(`🧠 *Ментальное состояние*

Оцени общее ментальное состояние:`, {
      parse_mode: 'Markdown',
      reply_markup: createIntensityKeyboard('mental')
    });
    
    await ctx.answerCallbackQuery(`Выбрано ${session.selectedEmotions.length} эмоций`);
  }
});

composer.callbackQuery('emotions_none', async (ctx) => {
  const userId = Number(ctx.from?.id);
  const session = sessions.get(userId);
  
  if (session && session.step === 'emotions_selection') {
    session.step = 'mental_intensity';
    
    await ctx.editMessageText(`🧠 *Ментальное состояние*

Оцени общее ментальное состояние:`, {
      parse_mode: 'Markdown',
      reply_markup: createIntensityKeyboard('mental')
    });
    
    await ctx.answerCallbackQuery('Эмоции не указаны');
  }
});

composer.callbackQuery(/^intensity_physical_(\d+)$/, async (ctx) => {
  const intensity = parseInt(ctx.match![1]);
  const userId = Number(ctx.from?.id);
  const session = sessions.get(userId);
  
  if (session && session.step === 'physical_intensity') {
    session.data.overallPhysical = intensity;
    session.step = 'emotions_selection';
    
    await ctx.editMessageText(`💭 *Выбери эмоции*\n\nОтмечай подходящие эмоции из списка:`, {
      parse_mode: 'Markdown',
      reply_markup: createEmotionsKeyboard()
    });
    
    await ctx.answerCallbackQuery(`Физическое состояние: ${intensity}/10`);
  }
});

composer.callbackQuery(/^intensity_mental_(\d+)$/, async (ctx) => {
  const intensity = parseInt(ctx.match![1]);
  const userId = Number(ctx.from?.id);
  const session = sessions.get(userId);
  
  if (session && session.step === 'mental_intensity') {
    session.data.overallMental = intensity;
    session.step = 'thoughts';
    
    await ctx.editMessageText(`💫 *Мысли в моменте*

Опиши свои текущие мысли, что приходит в голову:
*Или напиши "нет" если сложно сформулировать*`, {
      parse_mode: 'Markdown'
    });
    
    await ctx.answerCallbackQuery(`Ментальное состояние: ${intensity}/10`);
  }
});

composer.callbackQuery(/^stress_(\w+)$/, async (ctx) => {
  const stressType = ctx.match![1];
  const userId = Number(ctx.from?.id);
  const session = sessions.get(userId);
  
  if (session) {
    const stressMap: { [key: string]: number } = {
      '1': 1.5, '3': 3.5, '5': 5.5, '7': 7.5, '9': 9.5, 'skip': 0
    };
    
    if (stressType !== 'skip') {
      session.data.stressLevel = stressMap[stressType];
    }
    
    await ctx.editMessageText(`📋 *Дополнительная информация*

Можешь добавить контекст или завершить запись:`, {
      parse_mode: 'Markdown',
      reply_markup: createQuickOptionsKeyboard()
    });
    
    await ctx.answerCallbackQuery(stressType === 'skip' ? 'Стресс не указан' : `Стресс: ${stressMap[stressType]}/10`);
  }
});

composer.callbackQuery(/^quick_(.+)$/, async (ctx) => {
  const option = ctx.match![1];
  const userId = Number(ctx.from?.id);
  const session = sessions.get(userId);
  
  if (session) {
    switch (option) {
      case 'food':
        session.step = 'additional_food';
        await ctx.editMessageText(`🍽️ *Что ел/ешь?*

Опиши свое питание за последние часы:`, { parse_mode: 'Markdown' });
        break;
        
      case 'activities':
        session.step = 'additional_activities';
        await ctx.editMessageText(`🏃 *Активности*

Какие активности были (работа, спорт, отдых и т.д.):`, { parse_mode: 'Markdown' });
        break;
        
      case 'triggers':
        session.step = 'additional_triggers';
        await ctx.editMessageText(`🎯 *Триггеры/события*

Что повлияло на твое состояние (события, разговоры и т.д.):`, { parse_mode: 'Markdown' });
        break;
        
      case 'notes':
        session.step = 'additional_notes';
        await ctx.editMessageText(`📝 *Дополнительные заметки*

Любые другие наблюдения или комментарии:`, { parse_mode: 'Markdown' });
        break;
        
      case 'finish':
        await saveEntryAndFinish(ctx, session, userId);
        return;
    }
    
    await ctx.answerCallbackQuery();
  }
});

// ОБРАБОТЧИК СООБЩЕНИЙ
composer.on('message:text', async (ctx, next) => {
  if (ctx.message.text.startsWith('/')) {
    return next();
  }
  if (ctx.message.text?.endsWith("_internal")) {
    return next();
  }
  console.log('🟢 Вызван обработчик из addEntry message:text addEntry');
  const userId = ctx.from!.id;
  const session = sessions.get(userId);

  console.log('sessiaon: ', ctx.session)
  
  // if (!session) return;

  if (ctx.session?.awaitingHomeName || ctx.session?.broadcastMode) return next();;

  if (!session || !ctx.session.isAddingEntry) {
    return next(); // Пропускаем все сообщения не связанные с добавлением записи
  }
  
  console.log('🟢 message:text addEntry - user is in adding process Пользователь нажал добавить запись и добавляет её');
  
  const text = ctx.message.text;
  
  if (text === '❌ Отмена') {
    sessions.delete(userId);

    ctx.session.isAddingEntry = false;
    await ctx.reply('Запись отменена', { reply_markup: mainMenu });
    return;
  }

  try {
    switch (session.step) {
      case 'physical_symptoms':
        if (text.toLowerCase() !== 'нет' && text.trim() !== '') {
          const symptoms = text.split(',').map(s => s.trim()).filter(s => s);
          session.currentSymptoms = symptoms;
        }
        
        session.step = 'physical_intensity';
        await ctx.reply(`📊 *Интенсивность физических симптомов*

Оцени общее физическое состояние:`, {
          parse_mode: 'Markdown',
          reply_markup: createIntensityKeyboard('physical')
        });
        break;

      case 'emotions_custom':
        if (text.toLowerCase() !== 'нет' && text.trim() !== '' && text.toLowerCase() !== 'пропустить') {
          const customEmotions = text.split(',').map(e => e.trim()).filter(e => e);
          customEmotions.forEach(emotion => {
            session.data.emotions.push({
              name: emotion,
              intensity: 0
            });
          });
        }
        
        session.step = 'mental_intensity';
        await ctx.reply(`🧠 *Ментальное состояние*

Оцени общее ментальное состояние:`, {
          parse_mode: 'Markdown',
          reply_markup: createIntensityKeyboard('mental')
        });
        break;

      case 'thoughts':
        session.data.thoughts = text;
        session.step = 'sleep';
        
        await ctx.reply(`😴 *Сон*

Сколько часов спал прошлой ночью?`, {
          parse_mode: 'Markdown',
          reply_markup: createSleepKeyboard()
        });
        break;

      case 'additional_food':
        session.data.food = text;
        session.step = 'additional_done';
        await ctx.reply('🍽️ Информация о питании сохранена!', {
          reply_markup: createQuickOptionsKeyboard()
        });
        break;

      case 'additional_activities':
        session.data.activities = text.split(',').map(a => a.trim()).filter(a => a);
        session.step = 'additional_done';
        await ctx.reply('🏃 Активности сохранены!', {
          reply_markup: createQuickOptionsKeyboard()
        });
        break;

      case 'additional_triggers':
        session.data.triggers = text.split(',').map(t => t.trim()).filter(t => t);
        session.step = 'additional_done';
        await ctx.reply('🎯 Триггеры сохранены!', {
          reply_markup: createQuickOptionsKeyboard()
        });
        break;

      case 'additional_notes':
        session.data.notes = text;
        session.step = 'additional_done';
        await ctx.reply('📝 Заметки сохранены!', {
          reply_markup: createQuickOptionsKeyboard()
        });
        break;

      case 'additional_done':
        await ctx.reply('📋 Что еще хочешь добавить?', {
          reply_markup: createQuickOptionsKeyboard()
        });
        break;
    }
  } catch (error) {
    console.error('Error in addEntry flow:', error);
    ctx.session.isAddingEntry = false;
    await ctx.reply('Произошла ошибка. Попробуйте снова.', { reply_markup: mainMenu });
    sessions.delete(userId);
  }
});

export default composer;
