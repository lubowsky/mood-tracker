import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../middlewares/userMiddleware';
import { EntryService } from '../../services/entryService';
import { formatDate, formatTime } from '../../utils/timeUtils';
import { getMainMenu } from '../keyboards';

const composer = new Composer<MyContext>();

// Храним состояние просмотра для каждого пользователя
const viewSessions = new Map<number, {
  entries: any[],
  currentIndex: number,
  total: number
}>();

composer.hears('📋 Мои записи', async (ctx) => {
  try {
    // Получаем все записи (или больше, например 50 последних)
    const entries = await EntryService.getUserEntries(ctx.user!._id!, 50);
    
    if (entries.length === 0) {
      await ctx.reply('📝 У тебя пока нет записей. Начни с кнопки "📝 Добавить запись"', {
        reply_markup: getMainMenu(true)
      });
      return;
    }
    
    // Сохраняем сессию просмотра
    viewSessions.set(ctx.from!.id, {
      entries,
      currentIndex: 0,
      total: entries.length
    });
    
    // Показываем первую запись
    await showEntry(ctx, 0);
    
  } catch (error) {
    console.error('Error listing entries:', error);
    await ctx.reply('❌ Произошла ошибка при получении записей', {
      reply_markup: getMainMenu(!!ctx.hasAccess)
    });
  }
});

// Обработчик для навигации
composer.callbackQuery(/^entry_(prev|next|close)$/, async (ctx) => {
  const userId = ctx.from!.id;
  const session = viewSessions.get(userId);
  const action = ctx.match![1];
  
  if (!session) {
    await ctx.answerCallbackQuery('Сессия просмотра завершена');
    await ctx.deleteMessage();
    return;
  }
  
  await ctx.answerCallbackQuery();
  
  if (action === 'close') {
    viewSessions.delete(userId);
    await ctx.deleteMessage();
    await ctx.reply('📋 Просмотр записей завершен', {
      reply_markup: getMainMenu(!!ctx.hasAccess)
    });
    return;
  }
  
  let newIndex = session.currentIndex;
  
  if (action === 'prev' && newIndex > 0) {
    newIndex--;
  } else if (action === 'next' && newIndex < session.total - 1) {
    newIndex++;
  }
  
  session.currentIndex = newIndex;
  await showEntry(ctx, newIndex);
});

// Функция отображения одной записи
async function showEntry(ctx: MyContext, index: number) {
  const userId = ctx.from!.id;
  const session = viewSessions.get(userId);
  
  if (!session || !session.entries[index]) return;
  
  const entry = session.entries[index];
  const message = formatEntryFull(entry, index, session.total);
  const keyboard = createEntryKeyboard(index, session.total);
  
  if (ctx.callbackQuery) {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } else {
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
}

// Форматирование полной записи
function formatEntryFull(entry: any, currentIndex: number, total: number): string {
  let response = '';
  
  // Заголовок
  response += `📋 *Запись ${currentIndex + 1} из ${total}*\n`;
  response += `⏰ ${formatDate(entry.timestamp)} ${formatTime(entry.timestamp)}\n`;
  response += `📝 Источник: ${getSourceName(entry.source)}\n\n`;
  
  // Основные оценки
  response += `⭐️ *Общее состояние:*\n`;
  response += `🏥 Физическое: ${entry.overallPhysical}/10\n`;
  response += `🧠 Ментальное: ${entry.overallMental}/10\n\n`;
  
  // Физические симптомы
  if (entry.physicalSymptoms && entry.physicalSymptoms.length > 0) {
    response += `💊 *Физические симптомы:*\n`;
    entry.physicalSymptoms.forEach((symptom: any) => {
      const intensity = symptom.intensity ? ` (${symptom.intensity}/10)` : '';
      const location = symptom.location ? ` [${symptom.location}]` : '';
      response += `• ${symptom.name}${intensity}${location}\n`;
    });
    response += `\n`;
  }
  
  // Эмоции
  if (entry.emotions && entry.emotions.length > 0) {
    response += `💭 *Эмоции и чувства:*\n`;
    entry.emotions.forEach((emotion: any) => {
      const intensity = emotion.intensity ? ` (${emotion.intensity}/10)` : '';
      response += `• ${emotion.name}${intensity}\n`;
    });
    response += `\n`;
  }
  
  // Мысли
  if (entry.thoughts && entry.thoughts.trim()) {
    response += `💫 *Мысли и наблюдения:*\n`;
    response += `${entry.thoughts}\n\n`;
  }
  
  // Данные сна (если есть)
  if (entry.sleepData) {
    response += `😴 *Сон:*\n`;
    // if (entry.sleepData.quality) {
    //   response += `• Качество: ${entry.sleepData.quality}/10\n`;
    // }
    if (entry.sleepData.duration) {
      response += `• Продолжительность: ${entry.sleepData.duration}ч\n`;
    }
    if (entry.sleepData.hours) {
      response += `• Часов сна: ${entry.sleepData.hours}\n`;
    }
    if (entry.sleepData.dreamDescription) {
      response += `• Сновидения: ${entry.sleepData.dreamDescription}\n`;
    }
    response += `\n`;
  }
  
  // Контекстные данные
  if (entry.food) {
    response += `🍽️ *Питание:* ${entry.food}\n`;
  }
  
  if (entry.activities && entry.activities.length > 0) {
    response += `🏃 *Активности:* ${entry.activities.join(', ')}\n`;
  }
  
  if (entry.triggers && entry.triggers.length > 0) {
    response += `🎯 *Триггеры:* ${entry.triggers.join(', ')}\n`;
  }
  
  if (entry.stressLevel) {
    response += `😰 *Уровень стресса:* ${entry.stressLevel}/10\n`;
  }
  
  // Заметки
  if (entry.notes) {
    response += `\n📝 *Дополнительные заметки:*\n`;
    response += `${entry.notes}\n`;
  }
  
  return response;
}

// Клавиатура для навигации
function createEntryKeyboard(currentIndex: number, total: number): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  // Навигация
  if (currentIndex > 0) {
    keyboard.text('⬅️ Назад', `entry_prev`);
  }
  
  keyboard.text(`📄 ${currentIndex + 1}/${total}`, `entry_close`);
  
  if (currentIndex < total - 1) {
    keyboard.text('Вперед ➡️', `entry_next`);
  }
  
  keyboard.row();
  keyboard.text('❌ Закрыть', `entry_close`);
  
  return keyboard;
}

// Вспомогательная функция для названий источников
function getSourceName(source: string): string {
  const sources: { [key: string]: string } = {
    'morning_survey': '🌅 Утренний опрос',
    'daytime_notification': '🌞 Дневной опрос', 
    'evening_survey': '🌙 Вечерний опрос',
    'manual': '✍️ Ручная запись',
    'evening': '🌙 Вечерняя запись' // для старых данных
  };
  
  return sources[source] || source;
}

export default composer;
