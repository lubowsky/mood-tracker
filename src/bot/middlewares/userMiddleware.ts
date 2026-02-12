// src/bot/middlewares/userMiddleware.ts
import { Context } from 'grammy';
import type { SessionFlavor } from 'grammy';
import type { ConversationFlavor } from '@grammyjs/conversations';

import { getCollection } from '../../models/database';
import { User, UserCollection, defaultUserSettings } from '../../models/User';
import {
  UserSubscription,
  UserSubscriptionCollection
} from '../../models/UserSubscription';

import { TARIFFS } from '../../models/tariffs';
import { calculateEndDate } from '../../utils/subscriptionUtils';

export interface MySession {
  isAddingEntry?: boolean;
  awaitingHomeName?: boolean;
  broadcastMode?: boolean;
  lastBroadcast?: Array<{
    userId: number;
    msgId: number;
  }>;
}

export type MyContext =
  & Context
  & SessionFlavor<MySession>
  & ConversationFlavor<Context>
  & {
      user?: User;
      hasAccess?: boolean;
    };

export async function userMiddleware(ctx: MyContext, next: () => Promise<void>) {
  if (!ctx.from) return next();

  if (!ctx.session) ctx.session = {};

  const usersCollection = await getCollection(UserCollection);
  const subsCollection = await getCollection(UserSubscriptionCollection);

  // ─────────────────────────────────────────────
  // 1️⃣ Получаем или создаём пользователя
  // ─────────────────────────────────────────────
  let user = await usersCollection.findOne({
    telegramId: ctx.from.id
  }) as User | null;

  const now = new Date();

  if (!user) {
    const settings = {
      ...defaultUserSettings,
      homeName: ctx.from.first_name
    };

    const newUser: User = {
      telegramId: ctx.from.id,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      username: ctx.from.username,
      createdAt: now,
      settings,
      role: 'user',
      status: 'active',
      isTrialExhausted: false
    };

    const insertResult = await usersCollection.insertOne(newUser);
    user = { ...newUser, _id: insertResult.insertedId };

    // ─────────────────────────────────────────────
    // 2️⃣ Создаём TRIAL-подписку
    // ─────────────────────────────────────────────
    const trialTariff = TARIFFS.trial;

    const trialSub: UserSubscription = {
      telegramId: user.telegramId,
      plan: 'trial',
      isActive: true,
      startDate: now,
      endDate: calculateEndDate(now, "trial"),
      warned3days: false,
      warned1day: false,
      expiredNotified: false,
      createdAt: now,
      updatedAt: now
    };

    await subsCollection.insertOne(trialSub);
  } else {
    // ─────────────────────────────────────────────
    // 3️⃣ Обновляем настройки, если нужно
    // ─────────────────────────────────────────────
    const mergedSettings = { ...defaultUserSettings, ...user.settings };

    if (JSON.stringify(mergedSettings) !== JSON.stringify(user.settings)) {
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { settings: mergedSettings } }
      );
      user.settings = mergedSettings;
    }
  }

  ctx.user = user;

  // ─────────────────────────────────────────────
  // 4️⃣ Определяем доступ (READ ONLY)
  // ─────────────────────────────────────────────
  if (user.role === 'admin' || user.role === 'tester') {
    ctx.hasAccess = true;
  } else {
    const activeSub = await subsCollection.findOne({
      telegramId: user.telegramId,
      isActive: true,
      endDate: { $gte: new Date() }
    });

    if (!activeSub) {
      ctx.hasAccess = false;
    } else if (
      activeSub.plan === 'trial' &&
      user.isTrialExhausted
    ) {
      ctx.hasAccess = false;
    } else {
      ctx.hasAccess = true;
    }
  }

  await next();
}

