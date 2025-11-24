import { ObjectId } from 'mongodb';

export interface UserSettings {
  timezone: string; 
  morningNotification: string;
  eveningNotification: string;
  notificationsEnabled: boolean;
  daytimeNotifications: boolean;
  lastDaytimeNotification?: Date;
  homeName?: string;
}

export interface User {
  _id?: ObjectId;
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  createdAt: Date;
  settings: UserSettings;
}

export const UserCollection = 'users';

export const defaultUserSettings: UserSettings = {
  timezone: 'Europe/Moscow',
  morningNotification: '09:00',
  eveningNotification: '21:00',
  notificationsEnabled: true,
  daytimeNotifications: true
};