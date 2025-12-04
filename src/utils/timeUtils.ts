// src\utils\timeUtils.ts
import moment from 'moment-timezone';
import { TIME_OF_DAY, TimeOfDay } from '../models/MoodEntry';

export const getUserLocalTime = (timezone: string): string => {
  return moment().tz(timezone).format('DD.MM.YYYY HH:mm');
};

export const formatDateForUser = (date: Date, timezone: string): string => {
  return moment(date).tz(timezone).format('DD.MM.YYYY HH:mm');
};

// export const getTimeOfDay = (date: Date): 'morning' | 'afternoon' | 'evening' | 'night' => {
//   const hour = moment(date).hour();
  
//   if (hour >= 5 && hour < 12) return 'morning';
//   if (hour >= 12 && hour < 17) return 'afternoon';
//   if (hour >= 17 && hour < 22) return 'evening';
//   return 'night';
// };

export function getTimeOfDay(date: Date, timezone: string): TimeOfDay {
  const hour = moment(date).tz(timezone).hour();

  if (hour >= 5 && hour < 12) return TIME_OF_DAY.MORNING;
  if (hour >= 12 && hour < 17) return TIME_OF_DAY.AFTERNOON;
  if (hour >= 17 && hour < 23) return TIME_OF_DAY.EVENING;
  return TIME_OF_DAY.NIGHT;
}

export const formatDate = (date: Date): string => {
  return moment(date).format('DD.MM.YYYY HH:mm');
};

export const getDateRange = (days: number) => {
  const end = moment();
  const start = moment().subtract(days, 'days');
  return { start: start.toDate(), end: end.toDate() };
};

export function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDateTimeFull(date: Date): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}