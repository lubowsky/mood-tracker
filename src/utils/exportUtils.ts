import { formatDate, formatTime } from './timeUtils';

// Функция для получения читаемых названий источников
export function getSourceName(source: string): string {
  const sourceNames: { [key: string]: string } = {
    'morning_survey': '🌅 Утренний опрос',
    'daytime_notification': '🌞 Дневной опрос',
    'evening_survey': '🌙 Вечерний опрос', 
    'evening': '🌙 Вечерняя запись',
    'manual': '✍️ Ручная запись'
  };
  return sourceNames[source] || source;
}

// Функция для получения периода из записей
export function getEntriesPeriod(entries: any[]): { start: Date; end: Date } {
  if (!entries || entries.length === 0) {
    const now = new Date();
    return { start: now, end: now };
  }
  
  // Убеждаемся, что все записи имеют timestamp и он валидный
  const validEntries = entries.filter(entry => 
    entry.timestamp && !isNaN(new Date(entry.timestamp).getTime())
  );
  
  if (validEntries.length === 0) {
    const now = new Date();
    return { start: now, end: now };
  }
  
  // Находим самую раннюю и самую позднюю дату
  let startDate = new Date(validEntries[0].timestamp);
  let endDate = new Date(validEntries[0].timestamp);
  
  validEntries.forEach(entry => {
    const entryDate = new Date(entry.timestamp);
    if (entryDate < startDate) startDate = entryDate;
    if (entryDate > endDate) endDate = entryDate;
  });
  
  return { start: startDate, end: endDate };
}

export function safeFormatDate(date: Date | string | null | undefined): string {
  if (!date) return 'Неизвестно';
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Неизвестно';
    
    return formatDate(dateObj);
  } catch (error) {
    return 'Неизвестно';
  }
}

// Генератор текстового контента для экспорта
export function generateTextContent(entries: any[], userName: string, timestamp: string): Buffer {
  const period = getEntriesPeriod(entries);
  
  let content = `ДНЕВНИК СОСТОЯНИЯ\n`;
  content += `Пользователь: ${userName}\n`;
  content += `Дата экспорта: ${timestamp}\n`;
  content += `Период записей: с ${formatDate(period.start)} по ${formatDate(period.end)}\n`;
  content += `Всего записей: ${entries.length}\n`;
  content += '='.repeat(50) + '\n\n';
  
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  sortedEntries.forEach((entry, index) => {
    content += `ЗАПИСЬ ${index + 1} из ${sortedEntries.length}\n`;
    content += `Дата: ${formatDate(entry.timestamp)} ${formatTime(entry.timestamp)}\n`;
    content += `Тип: ${getSourceName(entry.source)}\n`;
    
    if (entry.overallPhysical > 0) content += `Физическое: ${entry.overallPhysical}/10\n`;
    if (entry.overallMental > 0) content += `Ментальное: ${entry.overallMental}/10\n`;
    
    if (entry.physicalSymptoms?.length > 0) {
      content += `Симптомы: ${entry.physicalSymptoms.map((s: any) => s.name).join(', ')}\n`;
    }
    
    if (entry.emotions?.length > 0) {
      content += `Эмоции: ${entry.emotions.map((e: any) => e.name).join(', ')}\n`;
    }
    
    if (entry.thoughts) {
      content += `Мысли: ${entry.thoughts}\n`;
    }
    
    if (entry.sleepData?.quality) {
      content += `Качество сна: ${entry.sleepData.quality}/10\n`;
    }
    
    if (entry.stressLevel) content += `Стресс: ${entry.stressLevel}/10\n`;
    if (entry.notes) content += `Заметки: ${entry.notes}\n`;
    
    content += '\n' + '─'.repeat(40) + '\n\n';
  });
  
  return Buffer.from(content, 'utf-8');
}

// Генератор JSON для экспорта
export function generateJSONContent(entries: any[], userName: string, timestamp: string): Buffer {
  const period = getEntriesPeriod(entries);
  
  const exportData = {
    meta: {
      user: userName,
      exportDate: timestamp,
      totalEntries: entries.length,
      period: {
        start: period.start,
        end: period.end,
        formatted: `с ${formatDate(period.start)} по ${formatDate(period.end)}`
      }
    },
    entries: entries.map(entry => ({
      ...entry,
      _id: entry._id?.toString(),
      userId: entry.userId?.toString()
    }))
  };
  
  return Buffer.from(JSON.stringify(exportData, null, 2), 'utf-8');
}