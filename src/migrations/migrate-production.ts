import { config } from "dotenv";
import path from "path";
import { connectToDatabase, getCollection } from '../models/database';
import { UserCollection } from '../models/User';
import { UserSubscriptionCollection } from '../models/UserSubscription';

// Загружаем окружение (продакшен или дев)
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.dev";
config({ path: path.resolve(process.cwd(), envFile) });

async function runFullMigration() {
  try {
    console.log(`📡 Соединение с БД для полной миграции (${envFile})...`);
    const db = await connectToDatabase();
    const usersCollection = await getCollection(UserCollection);

    console.log('--- Начинаем процесс миграции ---');

    // 1. РОЛИ: Устанавливаем 'user' всем, у кого роли нет
    const rolesResult = await usersCollection.updateMany(
      { role: { $exists: false } },
      { $set: { role: 'user' } }
    );
    await usersCollection.createIndex({ role: 1 });
    console.log(`✅ Роли: обновлено ${rolesResult.modifiedCount} пользователей, индекс создан.`);

    // 2. СТАТУСЫ: Ставим 'active' всем новым/старым пользователям
    const statusResult = await usersCollection.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'active' } }
    );
    console.log(`✅ Статусы: обновлено ${statusResult.modifiedCount} пользователей.`);

    // 3. ТРИАЛ: Закрываем пробный период тем, кто с нами больше 24 часов
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const trialResult = await usersCollection.updateMany(
      { 
        createdAt: { $lt: twentyFourHoursAgo },
        isTrialExhausted: { $exists: false } 
      },
      { 
        $set: { isTrialExhausted: true } 
      }
    );
    console.log(`✅ Триал: завершен для ${trialResult.modifiedCount} старых пользователей.`);

    // 4. ПОДПИСКИ: Инициализация коллекции и индексов
    const collections = await db.listCollections().toArray();
    const exists = collections.some(c => c.name === UserSubscriptionCollection);
    if (!exists) {
      await db.createCollection(UserSubscriptionCollection);
    }
    const subCollection = db.collection(UserSubscriptionCollection);
    await subCollection.createIndex({ telegramId: 1 }, { unique: true });
    await subCollection.createIndex({ endDate: 1 });
    console.log('✅ Подписки: Коллекция и индексы проверены/созданы.');

    console.log('---');
    console.log('🎉 Все миграции успешно выполнены!');
  } catch (error) {
    console.error('❌ Критическая ошибка миграции:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runFullMigration();
