import { getCollection, connectToDatabase } from '../models/database'; // Добавьте импорт подключения
import { UserSubscriptionCollection } from '../models/UserSubscription';

export async function runSubscriptionMigration() {
  console.log("🛠 Подключение к базе данных...");
  
  // 1. Сначала обязательно подключаемся к БД
  await connectToDatabase(); 
  
  console.log("🛠 Запуск миграции подписок...");
  const collection = await getCollection(UserSubscriptionCollection);

  // 2. Выполняем обновление
  const result = await collection.updateMany(
    { notifiedFar: { $exists: false } },
    { 
      $set: { 
        notifiedFar: false, 
        notifiedNear: false, 
        notifiedExpired: false 
      } 
    }
  );

  console.log(`✅ Миграция завершена. Обновлено документов: ${result.modifiedCount}`);
}

runSubscriptionMigration().then(() => {
    console.log("🚀 Скрипт успешно выполнен");
    process.exit(0);
}).catch(err => {
    console.error("❌ Ошибка в процессе миграции:", err);
    process.exit(1);
});