// src\services\entryService.ts
import { ObjectId } from 'mongodb';
import { getCollection } from '../models/database';
import { MoodEntry, MoodEntryCollection, SleepData, Emotion } from '../models/MoodEntry';
import { getTimeOfDay } from '../utils/timeUtils';
import { getUserSettings } from './userService';

export class EntryService {
  // Основной метод создания записи
  static async createEntry(entryData: Omit<MoodEntry, '_id' | 'timestamp' | 'timeOfDay'>): Promise<ObjectId> {
    const collection = await getCollection(MoodEntryCollection);
    const timestamp = new Date();

    const userSettings = await getUserSettings(entryData.userId as any);
    const timezone = userSettings?.timezone || 'UTC';
    
    const entry: MoodEntry = {
      ...entryData,
      timestamp,
      timeOfDay: getTimeOfDay(timestamp, timezone)
    };
    
    const result = await collection.insertOne(entry);
    console.log(`Entry created for user ${entryData.userId}, source: ${entryData.source}`);
    return result.insertedId;
  }

  // Создание утренней записи с данными сна
  static async createMorningEntry(userId: ObjectId, sleepData: SleepData, thoughts: string = ''): Promise<ObjectId> {
    return this.createEntry({
      userId,
      sleepData,
      physicalSymptoms: [],
      emotions: [],
      thoughts,
      overallPhysical: 0,
      overallMental: 0,
      source: 'morning_survey'
    });
  }

  // Создание дневной записи из уведомления
  static async createDaytimeEntry(
    userId: ObjectId, 
    thoughts: string, 
    sequenceNumber: number,
    quickResponse?: { moodType: 'positive' | 'neutral' | 'negative' }
  ): Promise<ObjectId> {
    
    let emotions: Emotion[] = [];
    let overallPhysical = 5;
    let overallMental = 5;

    if (quickResponse) {
      const moodLabels = {
        positive: ['удовлетворение', 'спокойствие'],
        neutral: ['нейтрально', 'обычно'],
        negative: ['тревога', 'усталость']
      };

      emotions = moodLabels[quickResponse.moodType].map(name => ({
        name,
        intensity: quickResponse.moodType === 'positive' ? 7 : quickResponse.moodType === 'neutral' ? 5 : 3
      }));

      overallPhysical = quickResponse.moodType === 'positive' ? 7 : quickResponse.moodType === 'neutral' ? 5 : 3;
      overallMental = overallPhysical;
    }

    return this.createEntry({
      userId,
      physicalSymptoms: [],
      emotions,
      thoughts: quickResponse ? `Быстрый ответ: ${quickResponse.moodType}` : thoughts,
      overallPhysical,
      overallMental,
      source: 'daytime_notification',
      notificationSequence: sequenceNumber
    });
  }

  // Создание вечерней записи
  static async createEveningEntry(
  userId: ObjectId, 
  thoughts: string,
  emotions: Emotion[] = [],
  overallPhysical: number = 5,
  overallMental: number = 5
): Promise<ObjectId> {
  return this.createEntry({
    userId,
    physicalSymptoms: [],
    emotions,
    thoughts,
    overallPhysical,
    overallMental,
    source: 'evening_notification'
  });
}

  // Ручное создание записи пользователем
  static async createManualEntry(entryData: Omit<MoodEntry, '_id' | 'timestamp' | 'timeOfDay' | 'source'>): Promise<ObjectId> {
    return this.createEntry({
      ...entryData,
      source: 'manual'
    });
  }

  // Получение записей пользователя
  static async getUserEntries(userId: ObjectId, limit: number = 50, skip: number = 0): Promise<MoodEntry[]> {
    const collection = await getCollection(MoodEntryCollection);
    return await collection
      .find({ userId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray() as MoodEntry[];
  }

  // Получение записей за период
  static async getEntriesByDateRange(userId: ObjectId, start: Date, end: Date): Promise<MoodEntry[]> {
    const collection = await getCollection(MoodEntryCollection);
    return await collection
      .find({
        userId,
        timestamp: { $gte: start, $lte: end }
      })
      .sort({ timestamp: 1 })
      .toArray() as MoodEntry[];
  }

  // Получение записей по источнику
  static async getEntriesBySource(userId: ObjectId, source: MoodEntry['source']): Promise<MoodEntry[]> {
    const collection = await getCollection(MoodEntryCollection);
    return await collection
      .find({
        userId,
        source
      })
      .sort({ timestamp: -1 })
      .toArray() as MoodEntry[];
  }

  // Статистика по количеству записей
  static async getEntriesStats(userId: ObjectId): Promise<{
    total: number;
    bySource: Record<string, number>;
    byTimeOfDay: Record<string, number>;
    last30Days: number;
  }> {
    const collection = await getCollection(MoodEntryCollection);
    
    const total = await collection.countDocuments({ userId });
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const last30Days = await collection.countDocuments({
      userId,
      timestamp: { $gte: thirtyDaysAgo }
    });

    const bySource = await collection.aggregate([
      { $match: { userId } },
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]).toArray();

    const byTimeOfDay = await collection.aggregate([
      { $match: { userId } },
      { $group: { _id: '$timeOfDay', count: { $sum: 1 } } }
    ]).toArray();

    return {
      total,
      bySource: Object.fromEntries(bySource.map(item => [item._id, item.count])),
      byTimeOfDay: Object.fromEntries(byTimeOfDay.map(item => [item._id, item.count])),
      last30Days
    };
  }

  static async deleteEntry(entryId: ObjectId): Promise<boolean> {
    const collection = await getCollection(MoodEntryCollection);
    const result = await collection.deleteOne({ _id: entryId });
    return result.deletedCount > 0;
  }
}