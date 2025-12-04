// src\models\MoodEntry.ts
import { ObjectId } from 'mongodb';

export interface PhysicalSymptom {
  name: string;
  intensity: number;
  location?: string;
}

export interface Emotion {
  name: string;
  intensity: number;
}

export interface SleepData {
  quality?: number;
  dreamDescription?: string;
  hours?: number;
}

export const TIME_OF_DAY = {
  MORNING: "morning",
  AFTERNOON: "afternoon",
  EVENING: "evening",
  NIGHT: "night"
} as const;

export type TimeOfDay = typeof TIME_OF_DAY[keyof typeof TIME_OF_DAY];

export interface MoodEntry {
  _id?: ObjectId;
  userId: ObjectId;
  timestamp: Date;
  timeOfDay: TimeOfDay;
  
  // Данные сна (для утренних записей)
  sleepData?: SleepData;
  
  // Основные данные
  physicalSymptoms: PhysicalSymptom[];
  emotions: Emotion[];
  thoughts: string;
  overallPhysical: number;
  overallMental: number;
  
  // Контекст
  triggers?: string[];
  activities?: string[];
  food?: string;
  stressLevel?: number;
  
  notes?: string;
  tags?: string[];
  
  // Мета-информация
  source: 'manual' | 'morning_survey' | 'daytime_notification' | 'evening_notification';
  notificationSequence?: number; // Для дневных уведомлений (1, 2, 3)
}

export const MoodEntryCollection = 'mood_entries';
export const UserCollection = 'users';
