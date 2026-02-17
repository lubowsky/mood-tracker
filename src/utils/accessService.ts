// src/utils/accessService.ts

import { getCollection } from "../models/database"
import { UserSubscriptionCollection } from "../models/UserSubscription"
import { UserCollection } from "../models/User"

export async function calculateUserAccess(telegramId: number): Promise<boolean> {
  const usersCollection = await getCollection(UserCollection)
  const subsCollection = await getCollection(UserSubscriptionCollection)

  const user = await usersCollection.findOne({ telegramId })

  if (!user) return false

  // Админ / тестер
  if (user.role === "admin" || user.role === "tester") {
    return true
  }

  const activeSub = await subsCollection.findOne({
    telegramId,
    isActive: true,
    endDate: { $gte: new Date() }
  })

  if (!activeSub) return false

  if (activeSub.plan === "trial" && user.isTrialExhausted) {
    return false
  }

  return true
}
