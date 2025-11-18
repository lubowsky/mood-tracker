import { connectToDatabase, getCollection } from './database';
import { UserCollection, defaultUserSettings } from './User';

async function migrateUsers() {
  try {
    await connectToDatabase();
    const usersCollection = getCollection(UserCollection);
    
    // Добавляем новые поля настроек существующим пользователям
    const result = await usersCollection.updateMany(
      { 
        $or: [
          { 'settings.daytimeNotifications': { $exists: false } },
          { 'settings.lastDaytimeNotification': { $exists: false } }
        ]
      },
      { 
        $set: { 
          'settings.daytimeNotifications': defaultUserSettings.daytimeNotifications,
          'settings.lastDaytimeNotification': null
        } 
      }
    );
    
    console.log(`Миграция завершена. Обновлено ${result.modifiedCount} пользователей`);
    process.exit(0);
  } catch (error) {
    console.error('Ошибка миграции:', error);
    process.exit(1);
  }
}

migrateUsers();
