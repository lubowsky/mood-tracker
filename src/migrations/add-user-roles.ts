// src/migrations/add-user-roles.ts
import { Db } from 'mongodb';
import { UserCollection } from '../models/User';

export async function up(db: Db) {
  const collection = db.collection(UserCollection);

  // Всем, у кого еще нет поля role, ставим 'user'
  const result = await collection.updateMany(
    { role: { $exists: false } },
    { $set: { role: 'user' } }
  );

  // Создаем индекс для быстрого поиска по ролям
  await collection.createIndex({ role: 1 });

  console.log(`[migration] Roles added to ${result.modifiedCount} users.`);
}