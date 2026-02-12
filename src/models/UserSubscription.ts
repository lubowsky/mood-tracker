// src/models/UserSubscription.ts
import { ObjectId } from 'mongodb';

import { TariffKey } from './tariffs';

export interface UserSubscription {
  _id?: ObjectId;
  telegramId: number;

  plan: TariffKey;        // trial | 7days | 30days
  isActive: boolean;

  startDate: Date;
  endDate: Date;

  paymentId?: string;

  warned3days?: boolean;
  warned1day?: boolean;
  expiredNotified?: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSubscriptionCollection = 'user_subscriptions';
