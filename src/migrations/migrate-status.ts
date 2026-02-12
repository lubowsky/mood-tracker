import { getCollection, connectToDatabase } from '../models/database';
import { UserCollection } from '../models/User';

async function migrateUserStatus() {
  try {
    await connectToDatabase();
    const usersCollection = await getCollection(UserCollection);

    // Всем, у кого нет поля status, ставим 'active'
    const result = await usersCollection.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'active' } }
    );

    console.log(`✅ Миграция завершена. Обновлено пользователей: ${result.modifiedCount}`);
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
  } finally {
    process.exit(0);
  }
}

migrateUserStatus();
