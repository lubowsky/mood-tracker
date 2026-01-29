// src/models/UserSubscription.ts
import { ObjectId } from 'mongodb';

export interface UserSubscription {
  _id?: ObjectId;
  telegramId: number;
  
  // Статус подписки
  isActive: boolean;
  plan: '7days' | '30days' | null;
  
  // Период подписки
  startDate: Date;
  endDate: Date;
  
  // Оплата
  paymentId?: string;
  amountPaid: number;
  paymentDate?: Date;
  
  // Для продления
  autoRenew: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

export const UserSubscriptionCollection = 'user_subscriptions';
