import { getCollection } from "../models/database"
import { UserCollection, User } from "../models/User"

/**
 * Возвращает список telegramId всех пользователей,
 * которые включили уведомления.
 */
export async function getAllUserIds(): Promise<number[]> {
  const usersCollection = await getCollection(UserCollection)

  // можно фильтровать по notificationsEnabled
  const users = await usersCollection
    .find({ "settings.notificationsEnabled": true })
    .toArray() as User[]

  return users.map(u => u.telegramId)
}

export async function getAllUsers() {
  const col = await getCollection(UserCollection)
  return col.find({}).toArray()
}
