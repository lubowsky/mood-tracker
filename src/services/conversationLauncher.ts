// src/services/conversationLauncher.ts
import { Bot } from "grammy"
import type { MyContext } from "../bot/middlewares/userMiddleware"

/**
 * Launch conversation by name for given telegramId.
 *
 * Defensive behaviour:
 * 1) If bot.sessionStorage exists and exposes .write/read, try to clear session for user (break stuck conversations).
 * 2) If not available, try best-effort: send a "/cancel" command fake-update before launching.
 * 3) Always then send the real "/launch_<name>" fake update which your composer handles.
 *
 * This keeps the existing behaviour but reduces chance of "daytime blocks evening".
 */
export async function launchConversation(
  bot: Bot<MyContext>,
  name: string,
  telegramId: number,
  userName?: string | number
) {
  try {
    console.log(`🚀 Launching conversation '${name}' for user ${telegramId}`)

    const firstName = typeof userName === "string" || typeof userName === "number"
      ? String(userName)
      : "дорогой Друг"

    try {
      const sess = (bot as any).sessionStorage
      if (sess && typeof sess.write === "function") {
        
        const key = typeof sess.key === "string" ? sess.key : String(telegramId)
        
        await sess.write(String(telegramId), {})
        console.log(`🧹 Cleared session storage for ${telegramId} (via bot.sessionStorage.write)`)
      } else if ((bot as any).session && typeof (bot as any).session === "object") {
        
        const maybeStorage = (bot as any).session
        if (maybeStorage && typeof maybeStorage.write === "function") {
          await maybeStorage.write(String(telegramId), {})
          console.log(`🧹 Cleared session storage for ${telegramId} (via bot.session.write)`)
        }
      } else {
        console.log(`ℹ️ No accessible sessionStorage on bot instance — will try soft cancel before launch`)
      }
    } catch (sessErr) {
      console.warn(`⚠️ sessionStorage clear attempt failed (ignored):`, sessErr)
    }
    try {
      const cancelUpdate = {
        update_id: Date.now() + 1,
        message: {
          message_id: Date.now() + 1,
          date: Math.floor(Date.now() / 1000),
          text: "/cancel",
          chat: {
            id: telegramId,
            type: "private",
            first_name: firstName
          },
          from: {
            id: telegramId,
            is_bot: false,
            first_name: firstName,
            language_code: "ru"
          },
          entities: [
            {
              type: "bot_command",
              offset: 0,
              length: "/cancel".length
            }
          ]
        }
      }
      await bot.handleUpdate(cancelUpdate as any)
      console.log(`🧾 Sent soft /cancel fake-update for ${telegramId}`)
    } catch (cancelErr) {
      console.warn(`⚠️ Soft /cancel attempt failed (ignored):`, cancelErr)
    }
    const launchCommand = `/launch_${name}`
    const fakeUpdate = {
      update_id: Date.now(),
      message: {
        message_id: Date.now(),
        date: Math.floor(Date.now() / 1000),
        text: launchCommand,
        chat: {
          id: telegramId,
          type: "private",
          first_name: firstName
        },
        from: {
          id: telegramId,
          is_bot: false,
          first_name: firstName,
          language_code: "ru"
        },
        entities: [
          {
            type: "bot_command",
            offset: 0,
            length: launchCommand.length
          }
        ]
      }
    }
    await bot.handleUpdate(fakeUpdate as any)

    console.log(`✅ Conversation '${name}' successfully launched for user ${telegramId}`)
    return true

  } catch (error) {
    console.error(`❌ Error launching conversation '${name}' for user ${telegramId}:`, error)
    throw error
  }
}
