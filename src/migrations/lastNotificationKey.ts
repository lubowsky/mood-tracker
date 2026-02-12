import { connectToDatabase, getCollection } from "../models/database";
import { UserCollection } from "../models/User";

export async function runMigration() {
  await connectToDatabase(); 
  const collection = await getCollection(UserCollection);
  
  // 1. Всем, у кого нет поля isTrialExhausted, ставим false
  await collection.updateMany(
    { isTrialExhausted: { $exists: false } },
    { $set: { isTrialExhausted: false } }
  );

  // 2. Инициализируем lastNotificationKey пустой строкой, чтобы не было ошибок
  await collection.updateMany(
    { lastNotificationKey: { $exists: false } },
    { $set: { lastNotificationKey: "" } }
  );

  console.log("✅ Миграция пользователей завершена");
}

runMigration()
