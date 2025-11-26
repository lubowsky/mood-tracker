// src/services/cronService.ts
import moment from "moment-timezone"
import cron from "node-cron"
import { getAllUsers } from "./userService"
import type { Bot } from "grammy"
import type { MyContext } from "../bot/middlewares/userMiddleware"
import { launchConversation } from "./conversationLauncher"

export function initCron(bot: Bot<MyContext>) {
  cron.schedule("* * * * *", async () => {
    // console.log("⏰ Checking notifications...")

    const users = await getAllUsers()

    // 🔴 ТЕСТОВЫЙ РЕЖИМ - запускаем тестовый диалог каждую минуту для пользователя
    // const TEST_USER_ID = process.env.TEST_USER_ID1
    //   ? Number(process.env.TEST_USER_ID1)
    //   : null;
    // const testUser = users.find(user => user.telegramId === TEST_USER_ID)
    // if (testUser) {
    //   try {
    //     console.log(`🧪 TEST: Starting test conversation for ${testUser.telegramId}`)
    //     // await launchConversation(bot, "test", testUser.telegramId)
    //     await launchConversation(bot, "daytime", testUser.telegramId, 'test')
    //     console.log(`🧪 TEST: Successfully started test conversation`)
    //   } catch (err) {
    //     console.error("TEST: Error starting test conversation:", err)
    //   }
    // }

    for (const user of users) {
      if (!user.settings?.notificationsEnabled) continue

      const timezone = user.settings.timezone
      const now = moment().tz(timezone)
      const hour = now.hour()
      const minute = now.minute()

      const homeName = user.settings.homeName

      const targetMorning = user.settings.morningNotification
      const targetEvening = user.settings.eveningNotification
      if (!targetMorning || !targetEvening) continue

      const [morningHour, morningMinute] = targetMorning.split(":").map(Number)
      const [eveningHour, eveningMinute] = targetEvening.split(":").map(Number)

      // ------------------------------------------------------------
      // 🌅 Утреннее уведомление
      // ------------------------------------------------------------
      if (hour === morningHour && minute === morningMinute) {
        try {
          console.log(`🌅 Sending morning notification to ${user.telegramId}`)
          await launchConversation(bot, "morning", user.telegramId, homeName)
        } catch (err) {
          console.error("Error sending morning survey:", err)
        }
      }

      // ------------------------------------------------------------
      // 🌞 ДНЕВНЫЕ УВЕДОМЛЕНИЯ
      // ------------------------------------------------------------
      const morning = moment().tz(timezone).hour(morningHour).minute(morningMinute).second(0)
      const evening = moment().tz(timezone).hour(eveningHour).minute(eveningMinute).second(0)

      const totalMinutes = evening.diff(morning, "minutes")
      if (totalMinutes > 0) {
        const interval = totalMinutes / 4

        const daytimeTimes = [
          moment(morning).add(interval * 1, "minutes"),
          moment(morning).add(interval * 2, "minutes"),
          moment(morning).add(interval * 3, "minutes")
        ]

        const isDaytime =
          daytimeTimes.some(t => t.hour() === hour && t.minute() === minute)

        if (isDaytime) {
          try {
            console.log(`🌞 Sending daytime notification to ${user.telegramId}`)

            await launchConversation(bot, "daytime", user.telegramId, homeName)
          } catch (err) {
            console.error("Error sending daytime survey:", err)
          }
        }
      }

      // ------------------------------------------------------------
      // 🌙 ВЕЧЕРНЕЕ УВЕДОМЛЕНИЕ (новое)
      // ------------------------------------------------------------
      if (hour === eveningHour && minute === eveningMinute) {
        try {
          console.log(`🌙 Sending evening notification to ${user.telegramId}`)

          await launchConversation(bot, "evening", user.telegramId, homeName)
        } catch (err) {
          console.error("Error sending evening survey:", err)
        }
      }
    }
  })

  console.log("🕒 Cron service initialized")
}
