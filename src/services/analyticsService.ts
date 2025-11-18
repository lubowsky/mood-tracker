import { ObjectId } from 'mongodb';
import { MoodEntry } from '../models/MoodEntry';
import { EntryService } from './entryService';

export interface AnalyticsResult {
  period: string;
  averagePhysical: number;
  averageMental: number;
  commonSymptoms: { name: string; count: number }[];
  commonEmotions: { name: string; count: number }[];
  timeOfDayStats: {
    morning: { physical: number; mental: number; count: number };
    afternoon: { physical: number; mental: number; count: number };
    evening: { physical: number; mental: number; count: number };
    night: { physical: number; mental: number; count: number };
  };
  sleepStats?: {
    averageQuality: number;
    totalEntriesWithSleep: number;
    goodSleepDays: number;
    poorSleepDays: number;
  };
}

export class AnalyticsService {
  static async getAnalytics(userId: ObjectId, days: number = 30): Promise<AnalyticsResult> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    const entries = await EntryService.getEntriesByDateRange(userId, start, end);
    
    if (entries.length === 0) {
      throw new Error('No entries found for the specified period');
    }

    // Средние показатели
    const averagePhysical = entries.reduce((sum, entry) => sum + entry.overallPhysical, 0) / entries.length;
    const averageMental = entries.reduce((sum, entry) => sum + entry.overallMental, 0) / entries.length;

    // Частые симптомы
    const symptomCount: Record<string, number> = {};
    const emotionCount: Record<string, number> = {};

    // Статистика сна
    const sleepEntries = entries.filter(entry => entry.sleepData?.quality);
    const sleepStats = sleepEntries.length > 0 ? {
      averageQuality: sleepEntries.reduce((sum, entry) => sum + (entry.sleepData?.quality || 0), 0) / sleepEntries.length,
      totalEntriesWithSleep: sleepEntries.length,
      goodSleepDays: sleepEntries.filter(entry => (entry.sleepData?.quality || 0) >= 7).length,
      poorSleepDays: sleepEntries.filter(entry => (entry.sleepData?.quality || 0) <= 4).length
    } : undefined;

    entries.forEach(entry => {
      entry.physicalSymptoms.forEach(symptom => {
        symptomCount[symptom.name] = (symptomCount[symptom.name] || 0) + 1;
      });
      entry.emotions.forEach(emotion => {
        emotionCount[emotion.name] = (emotionCount[emotion.name] || 0) + 1;
      });
    });

    // Статистика по времени суток
    const timeOfDayStats = {
      morning: { physical: 0, mental: 0, count: 0 },
      afternoon: { physical: 0, mental: 0, count: 0 },
      evening: { physical: 0, mental: 0, count: 0 },
      night: { physical: 0, mental: 0, count: 0 }
    };

    entries.forEach(entry => {
      const stats = timeOfDayStats[entry.timeOfDay];
      stats.physical += entry.overallPhysical;
      stats.mental += entry.overallMental;
      stats.count += 1;
    });

    // Вычисляем средние для каждого времени суток
    Object.keys(timeOfDayStats).forEach(time => {
      const key = time as keyof typeof timeOfDayStats;
      if (timeOfDayStats[key].count > 0) {
        timeOfDayStats[key].physical /= timeOfDayStats[key].count;
        timeOfDayStats[key].mental /= timeOfDayStats[key].count;
      }
    });

    return {
      period: `${days} days`,
      averagePhysical,
      averageMental,
      commonSymptoms: Object.entries(symptomCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      commonEmotions: Object.entries(emotionCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      timeOfDayStats,
      sleepStats
    };
  }

  static async getCorrelations(userId: ObjectId): Promise<string[]> {
    const entries = await EntryService.getUserEntries(userId, 100);
    const correlations: string[] = [];

    // Простой анализ корреляций
    entries.forEach(entry => {
      // Корреляция стресса и физических симптомов
      if (entry.stressLevel && entry.stressLevel > 7) {
        const physicalSymptoms = entry.physicalSymptoms.map(s => s.name).join(', ');
        if (physicalSymptoms) {
          correlations.push(`Высокий стресс (${entry.stressLevel}/10) связан с симптомами: ${physicalSymptoms}`);
        }
      }

      // Корреляция качества сна и ментального состояния
      if (entry.sleepData?.quality && entry.sleepData.quality < 6 && entry.overallMental < 5) {
        correlations.push(`Плохой сон (${entry.sleepData.quality}/10) связан с низким ментальным состоянием (${entry.overallMental}/10)`);
      }

      // Корреляция качества сна и физического состояния
      if (entry.sleepData?.quality && entry.sleepData.quality < 6 && entry.overallPhysical < 5) {
        correlations.push(`Плохой сон (${entry.sleepData.quality}/10) связан с низким физическим состоянием (${entry.overallPhysical}/10)`);
      }

      // Корреляция между физическим и ментальным состоянием
      if (entry.overallPhysical < 4 && entry.overallMental < 4) {
        correlations.push(`Низкое физическое состояние (${entry.overallPhysical}/10) совпадает с низким ментальным (${entry.overallMental}/10)`);
      }

      if (entry.overallPhysical > 7 && entry.overallMental > 7) {
        correlations.push(`Высокое физическое состояние (${entry.overallPhysical}/10) совпадает с высоким ментальным (${entry.overallMental}/10)`);
      }
    });

    return correlations.slice(0, 10); // Ограничиваем количество выводов
  }

  // Новая функция для анализа эффективности уведомлений
  static async getNotificationEffectiveness(userId: ObjectId, days: number = 30): Promise<{
    totalNotifications: number;
    responseRate: number;
    bySource: Record<string, { sent: number; responded: number; rate: number }>;
    mostResponsiveTime: string;
  }> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    const entries = await EntryService.getEntriesByDateRange(userId, start, end);
    
    const notificationEntries = entries.filter(entry => 
      entry.source !== 'manual'
    );

    const manualEntries = entries.filter(entry => 
      entry.source === 'manual'
    );

    const bySource: Record<string, { sent: number; responded: number; rate: number }> = {};
    const byTimeOfDay: Record<string, number> = {};

    notificationEntries.forEach(entry => {
      // Считаем что на уведомление ответили, если есть хоть какие-то данные
      const responded = entry.thoughts.length > 0 || 
                       entry.emotions.length > 0 || 
                       entry.physicalSymptoms.length > 0 ||
                       (entry.sleepData && Object.keys(entry.sleepData).length > 0);

      if (!bySource[entry.source]) {
        bySource[entry.source] = { sent: 0, responded: 0, rate: 0 };
      }

      bySource[entry.source].sent++;
      if (responded) {
        bySource[entry.source].responded++;
        
        // Статистика по времени суток для ответов
        byTimeOfDay[entry.timeOfDay] = (byTimeOfDay[entry.timeOfDay] || 0) + 1;
      }
    });

    // Вычисляем проценты
    Object.keys(bySource).forEach(source => {
      const data = bySource[source];
      data.rate = data.sent > 0 ? (data.responded / data.sent) * 100 : 0;
    });

    // Находим самое отзывчивое время суток
    const mostResponsiveTime = Object.entries(byTimeOfDay)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'не определено';

    return {
      totalNotifications: notificationEntries.length,
      responseRate: notificationEntries.length > 0 ? 
        (notificationEntries.filter(e => e.thoughts || e.emotions.length > 0 || e.physicalSymptoms.length > 0).length / notificationEntries.length) * 100 : 0,
      bySource,
      mostResponsiveTime
    };
  }
}