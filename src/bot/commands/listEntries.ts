import { Composer } from 'grammy';
import { MyContext } from '../middlewares/userMiddleware';
import { EntryService } from '../../services/entryService';
import { formatDate } from '../../utils/timeUtils';
import { mainMenu } from '../keyboards';

const composer = new Composer<MyContext>();

composer.hears('📋 Последние записи', async (ctx) => {
  try {
    const entries = await EntryService.getUserEntries(ctx.user!._id!, 10);
    
    if (entries.length === 0) {
      await ctx.reply('У тебя пока нет записей. Начни с команды "📝 Добавить запись"', {
        reply_markup: mainMenu
      });
      return;
    }
    
    let response = `📋 *Последние ${entries.length} записей:*\n\n`;
    
    entries.forEach((entry, index) => {
      response += `*Запись #${index + 1}* (${formatDate(entry.timestamp)})\n`;
      response += `🏥 Физическое: ${entry.overallPhysical}/10\n`;
      response += `🧠 Ментальное: ${entry.overallMental}/10\n`;
      
      if (entry.physicalSymptoms.length > 0) {
        response += `💊 Симптомы: ${entry.physicalSymptoms.map(s => s.name).join(', ')}\n`;
      }
      
      if (entry.emotions.length > 0) {
        response += `💭 Эмоции: ${entry.emotions.map(e => e.name).join(', ')}\n`;
      }
      
      if (entry.notes) {
        response += `📝 Заметки: ${entry.notes.slice(0, 50)}${entry.notes.length > 50 ? '...' : ''}\n`;
      }
      
      response += '\n';
    });
    
    await ctx.reply(response, { 
      parse_mode: 'Markdown',
      reply_markup: mainMenu 
    });
    
  } catch (error) {
    console.error('Error listing entries:', error);
    await ctx.reply('Произошла ошибка при получении записей', {
      reply_markup: mainMenu
    });
  }
});

export default composer;