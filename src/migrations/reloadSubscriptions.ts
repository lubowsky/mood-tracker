import { getCollection, connectToDatabase } from '../models/database';
import { UserSubscriptionCollection } from '../models/UserSubscription';

const DAY = 24 * 60 * 60 * 1000;

const TARIFF_DAYS: Record<string, number> = {
  trial: 1,
  '7days': 7,
  '30days': 30,
};

export async function runSubscriptionMigration() {
  console.log("🛠 Подключение к базе данных...");
  await connectToDatabase();

  console.log("🛠 Запуск миграции подписок...");
  const collection = await getCollection(UserSubscriptionCollection);

  const cursor = collection.find({});

  let updated = 0;

  while (await cursor.hasNext()) {
    const sub = await cursor.next();
    if (!sub) continue;

    const plan = sub.plan ?? sub.tariffKey;
    if (!plan || !TARIFF_DAYS[plan]) {
      console.warn(`⚠️ Пропуск подписки ${sub._id} — неизвестный тариф`);
      continue;
    }

    const endDate = new Date(sub.endDate);
    const startDate =
      sub.startDate ??
      new Date(endDate.getTime() - TARIFF_DAYS[plan] * DAY);

    await collection.updateOne(
      { _id: sub._id },
      {
        $set: {
          plan,
          startDate,
          createdAt: sub.createdAt ?? startDate,
          updatedAt: sub.updatedAt ?? new Date(),

          warned3days: sub.warned3days ?? sub.notifiedFar ?? false,
          warned1day: sub.warned1day ?? sub.notifiedNear ?? false,
          expiredNotified:
            sub.expiredNotified ?? sub.notifiedExpired ?? false,
        },
        $unset: {
          tariffKey: "",
          notifiedFar: "",
          notifiedNear: "",
          notifiedExpired: "",
        },
      }
    );

    updated++;
  }

  console.log(`✅ Миграция завершена. Обновлено документов: ${updated}`);
}

runSubscriptionMigration()
  .then(() => {
    console.log("🚀 Скрипт успешно выполнен");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Ошибка в процессе миграции:", err);
    process.exit(1);
  });
