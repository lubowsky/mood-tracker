import type { Bot } from "grammy"
import type { MyContext } from "../bot/middlewares/userMiddleware"
import { getCollection } from "../models/database"
import { UserCollection } from "../models/User"

export async function canSendToUser(
  bot: Bot<MyContext>,
  telegramId: number
): Promise<boolean> {
  try {
    await bot.api.sendChatAction(telegramId, "typing")
    return true
  } catch (err: any) {
    const code = err?.error_code

    if (code === 400 || code === 403) {
      console.warn(`🚫 User ${telegramId} is unreachable. Disabling notifications.`)

      const users = await getCollection(UserCollection)
      await users.updateOne(
        { telegramId },
        { $set: { "settings.notificationsEnabled": false } }
      )
    } else {
      console.error(`❌ Telegram check failed for ${telegramId}`, err)
    }

    return false
  }
}
