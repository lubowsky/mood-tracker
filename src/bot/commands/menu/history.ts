import { Composer, InlineKeyboard, InputFile } from 'grammy';
import { MyContext } from '../../middlewares/userMiddleware';
import { getMainMenu } from '../../keyboards';
import { generateTextContent, generateJSONContent } from '../../../utils/exportUtils';

const composer = new Composer<MyContext>();

composer.hears('📋 Последние записи', async (ctx) => {
  console.log('Last entries button pressed by user:', ctx.from?.id);

  try {
    const { EntryService } = await import('../../../services/entryService');
    const { formatDate } = await import('../../../utils/timeUtils');

    const entries = await EntryService.getUserEntries(ctx.user!._id!, 10);

    if (entries.length === 0) {
      await ctx.reply(
        'У тебя пока нет записей. Начни с команды "📝 Добавить запись"',
        { reply_markup: getMainMenu(!!ctx.hasAccess) }
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
          response += `• Качество: ${Number(entry.sleepData.quality).toFixed(1)}/10\n`;
        }
        if (entry.sleepData.dreamDescription) {
          response += `• Сон: ${entry.sleepData.dreamDescription}\n`;
        }
      }

      // ---------- Дневные/вечерние записи ----------
      if (!isMorning) {
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
      reply_markup: getMainMenu(!!ctx.hasAccess)
    });

  } catch (error) {
    console.error('Error listing entries:', error);
    await ctx.reply('Произошла ошибка при получении записей', {
      reply_markup: getMainMenu(!!ctx.hasAccess)
    });
  }
});

composer.hears('💾 Экспорт записей', async (ctx) => {
    await ctx.reply(`💾 *Экспорт данных*`, {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('📝 Text', 'export_text').text('📋 JSON', 'export_json')
    });
});

composer.callbackQuery(/^export_(text|json)$/, async (ctx) => {
    const action = ctx.match![1];
    const { EntryService } = await import('../../../services/entryService');
    const entries = await EntryService.getUserEntries(ctx.user!._id!, 1000);
    
    const timestamp = new Date().toISOString().split('T')[0];
    const content = action === 'json' 
        ? generateJSONContent(entries, ctx.user!.firstName || 'User', timestamp)
        : generateTextContent(entries, ctx.user!.firstName || 'User', timestamp);

    await ctx.replyWithDocument(new InputFile(content, `export.${action === 'json' ? 'json' : 'txt'}`));
    await ctx.answerCallbackQuery();
});

export default composer;