// src\services\userService.ts
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

export async function getUserByTelegramId(telegramId: number): Promise<User | null> {
  const usersCollection = await getCollection(UserCollection)
  return usersCollection.findOne({ telegramId }) as Promise<User | null>
}

export async function updateUserHomeName(telegramId: number, homeName: string): Promise<boolean> {
  const usersCollection = await getCollection(UserCollection)
  
  const result = await usersCollection.updateOne(
    { telegramId },
    { 
      $set: { 
        'settings.homeName': homeName.trim()
      } 
    }
  )
  
  return result.modifiedCount > 0
}

export async function createUser(userData: Omit<User, '_id'>): Promise<string> {
  const usersCollection = await getCollection(UserCollection)
  const result = await usersCollection.insertOne(userData)
  return result.insertedId.toString()
}

export async function getUserSettings(telegramId: number) {
  const user = await getUserByTelegramId(telegramId)
  return user?.settings || null
}