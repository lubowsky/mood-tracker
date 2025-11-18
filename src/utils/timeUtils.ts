import moment from 'moment-timezone';


export const getUserLocalTime = (timezone: string): string => {
  return moment().tz(timezone).format('DD.MM.YYYY HH:mm');
};

export const formatDateForUser = (date: Date, timezone: string): string => {
  return moment(date).tz(timezone).format('DD.MM.YYYY HH:mm');
};

export const getTimeOfDay = (date: Date): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = moment(date).hour();
  
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
};

export const formatDate = (date: Date): string => {
  return moment(date).format('DD.MM.YYYY HH:mm');
};

export const getDateRange = (days: number) => {
  const end = moment();
  const start = moment().subtract(days, 'days');
  return { start: start.toDate(), end: end.toDate() };
};