// src\migrations\init-subscriptions.ts
import { Db } from 'mongodb';
import { UserSubscriptionCollection } from '../models/UserSubscription';

export async function up(db: Db) {
  const collection = db.collection(UserSubscriptionCollection);

  // 1. Создаём коллекцию, если её нет
  const collections = await db.listCollections().toArray();
  const exists = collections.some(c => c.name === UserSubscriptionCollection);

  if (!exists) {
    await db.createCollection(UserSubscriptionCollection);
  }

  // 2. Индексы
  await collection.createIndex(
    { telegramId: 1 },
    { unique: true }
  );

  await collection.createIndex(
    { endDate: 1 }
  );

  console.log('[migration] user_subscriptions initialized');
}

export async function down(db: Db) {
  // откат делать НЕ будем, потому что данные платёжные
  console.log('[migration] down skipped');
}
