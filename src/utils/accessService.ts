// src/utils/accessService.ts

import { getCollection } from "../models/database"
import { UserSubscriptionCollection } from "../models/UserSubscription"
import { UserCollection } from "../models/User"

export async function calculateUserAccess(telegramId: number): Promise<boolean> {
  console.log("=== calculateUserAccess START ===")
  console.log("telegramId:", telegramId)

  const usersCollection = await getCollection(UserCollection)
  const subsCollection = await getCollection(UserSubscriptionCollection)

  const user = await usersCollection.findOne({ telegramId })
  console.log("USER:", user)

  if (!user) {
    console.log("RESULT: false (user not found)")
    console.log("=== calculateUserAccess END ===")
    return false
  }


  // Админ / тестер
  if (user.role === "admin" || user.role === "tester") {
    console.log("RESULT: true (admin/tester)")
    console.log("=== calculateUserAccess END ===")
    return true
  }

  const activeSub = await subsCollection.findOne({
    telegramId,
    isActive: true,
    endDate: { $gte: new Date() }
  })

  console.log("ACTIVE SUB:", activeSub)

  if (!activeSub) {
    console.log("RESULT: false (no active subscription)")
    console.log("=== calculateUserAccess END ===")
    return false
  }

  if (activeSub.plan === "trial" && user.isTrialExhausted) {
    console.log("RESULT: false (trial exhausted)")
    console.log("=== calculateUserAccess END ===")
    return false
  }

  console.log("RESULT: true (valid subscription)")
  console.log("=== calculateUserAccess END ===")
  return true
}
