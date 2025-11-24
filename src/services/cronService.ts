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

    // 🔴 ТЕСТОВЫЙ РЕЖИМ - запускаем тестовый диалог каждую минуту для пользователя 151366380
    // const testUser = users.find(user => user.telegramId === 151366380)
    // if (testUser) {
    //   try {
    //     console.log(`🧪 TEST: Starting test conversation for ${testUser.telegramId}`)
    //     // await launchConversation(bot, "test", testUser.telegramId)
    //     await launchConversation(bot, "morning", testUser.telegramId)
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
          await launchConversation(bot, "morning", user.telegramId, user.firstName)
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

        // console.log(daytimeTimes)

        const isDaytime =
          daytimeTimes.some(t => t.hour() === hour && t.minute() === minute)

        if (isDaytime) {
          try {
            console.log(`🌞 Sending daytime notification to ${user.telegramId}`)

            // await bot.api.sendMessage(
            //   user.telegramId,
            //   "💫 Привет! Как твоё состояние в этот момент?\n\n Нажми на кнопку [☀️ День] в меню, чтобы запустить дневной диалог."
            // )

            // await bot.handleUpdate({
            //   update_id: Date.now(),
            //   message: {
            //     message_id: Date.now(),
            //     date: Math.floor(Date.now() / 1000),
            //     chat: { id: user.telegramId, type: "private", first_name: user.firstName },
            //     from: { id: user.telegramId, is_bot: false, first_name: user.firstName },
               
            //   }
            // })
            await launchConversation(bot, "daytime", user.telegramId, user.firstName)
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

          // await bot.api.sendMessage(
          //   user.telegramId,
          //   "🌙 Как прошёл твой день? Хочешь подвести небольшой итог?\n\n Нажми на кнопку [🌆 Вечер] в меню, чтобы запустить диалог."
          // )

          // await bot.handleUpdate({
          //   update_id: Date.now(),
          //   message: {
          //     message_id: Date.now(),
          //     date: Math.floor(Date.now() / 1000),
          //     chat: { id: user.telegramId, type: "private", first_name: user.firstName },
          //     from: { id: user.telegramId, is_bot: false, first_name: user.firstName },
            
          //   }
          // })
          await launchConversation(bot, "evening", user.telegramId, user.firstName)
        } catch (err) {
          console.error("Error sending evening survey:", err)
        }
      }
    }
  })

  console.log("🕒 Cron service initialized")
}
