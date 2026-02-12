// src/services/cronService.ts
import moment from "moment-timezone"
import cron from "node-cron"
import { InlineKeyboard, type Bot } from "grammy"

import type { MyContext } from "../bot/middlewares/userMiddleware"
import { launchConversation } from "./conversationLauncher"
import { canSendToUser } from "./telegramGuard"

import { getAllUsers } from "./userService"
import { getCollection } from "../models/database"
import { UserCollection } from "../models/User"
import { UserSubscriptionCollection } from "../models/UserSubscription"
import { getMainMenu } from "../bot/keyboards"

function notify3Days(bot: Bot<MyContext>, user: any) {
  return bot.api.sendMessage(
    user.telegramId,
    "⏰ Напоминание:\n\nДо окончания подписки осталось *3 дня*.",
    { parse_mode: "Markdown" }
  )
}

function notify1Day(bot: Bot<MyContext>, user: any) {
  return bot.api.sendMessage(
    user.telegramId,
    "⚠️ Внимание:\n\nПодписка закончится *завтра*.",
    { parse_mode: "Markdown" }
  )
}

/* -------------------------------------------------- */
/* 🔔 УВЕДОМЛЕНИЕ ОБ ОКОНЧАНИИ ПОДПИСКИ */
/* -------------------------------------------------- */
async function notifySubscriptionEnded(
  bot: Bot<MyContext>,
  user: any,
  isTrial: boolean
) {
  const keyboard = new InlineKeyboard().text(
    "📋 Посмотреть тарифы",
    "show_tariffs"
  )

  await bot.api.sendMessage(
    user.telegramId,
    isTrial
      ? "🛑 Ваш пробный период завершён.\n\nВыберите тариф, чтобы продолжить."
      : "⛔️ Ваша подписка закончилась.\n\nПродлите её, чтобы продолжить пользоваться ботом.",
    { reply_markup: keyboard }
  )

  await bot.api.sendMessage(
    user.telegramId,
    "🏠 Меню обновлено.",
    { reply_markup: getMainMenu(false) }
  )
}

/* -------------------------------------------------- */
/* 🚀 БЕЗОПАСНЫЙ ЗАПУСК ОПРОСОВ */
/* -------------------------------------------------- */
async function safeLaunch(
  bot: Bot<MyContext>,
  user: any,
  type: "morning" | "daytime" | "evening",
  homeName: string,
  usersCollection: any
) {
  try {
    const canSend = await canSendToUser(bot, user.telegramId)
    if (!canSend) return

    await launchConversation(bot, type, user.telegramId, homeName)
  } catch (err: any) {
    if (err.description?.includes("bot was blocked by the user")) {
      await usersCollection.updateOne(
        { telegramId: user.telegramId },
        { $set: { status: "blocked", "settings.notificationsEnabled": false } }
      )
    } else {
      console.error("Send error:", err)
    }
  }
}

/* -------------------------------------------------- */
/* 🕒 CRON */
/* -------------------------------------------------- */
export function initCron(bot: Bot<MyContext>) {
  const IS_PROD = process.env.NODE_ENV === "production"

  const DAY = IS_PROD
    ? 24 * 60 * 60 * 1000
    : 60 * 1000 // ⏱ dev: 1 минута = 1 день

  console.log(
    `🕒 Cron initialized in ${IS_PROD ? "PRODUCTION" : "DEVELOPMENT"} mode`
  )
  
  cron.schedule("* * * * *", async () => {
    const usersCollection = await getCollection(UserCollection)
    const subsCollection = await getCollection(UserSubscriptionCollection)

    const users = (await getAllUsers()).filter(u => u.status === "active")
    const now = new Date()

        // 🔴 ТЕСТОВЫЙ РЕЖИМ - запускаем тестовый диалог каждую минуту для пользователя
    // const TEST_USER_ID = 8056816898

    // const testUser = users.find(u => u.telegramId === TEST_USER_ID)
    // if (testUser) {
    //   const sub = await subsCollection.findOne(
    //     {
    //       telegramId: TEST_USER_ID,
    //       isActive: true,
    //       endDate: { $gt: now },
    //     },
    //     { sort: { endDate: -1 } }
    //   )

    //   if (!sub) {
    //     console.log(`🧪 TEST: No active subscription, skipping`)
    //   } else {
    //     try {
    //       console.log(`🧪 TEST: Starting test conversation`)
    //       await safeLaunch(
    //         bot,
    //         testUser,
    //         "morning",
    //         testUser.settings?.homeName ?? "Home",
    //         usersCollection
    //       )
    //       console.log(`🧪 TEST: Successfully started test conversation`)
    //     } catch (err) {
    //       console.error("TEST: Error starting test conversation:", err)
    //     }
    //   }
    // }

    for (const user of users) {
      /* ==================================================
       * 1️⃣ ПОДПИСКА
       * ================================================== */
      const sub = await subsCollection.findOne(
        {
          telegramId: user.telegramId,
          isActive: true,
        },
        {
          sort: { endDate: -1 },
        }
      )

      if (!sub) {
        // такого состояния быть не должно
        continue
      }

      // ❌ подписка истекла
      if (sub.endDate <= now) {
        await subsCollection.updateOne(
          { _id: sub._id },
          { $set: { isActive: false, updatedAt: now } }
        )

        if (sub.plan === "trial" && !user.isTrialExhausted) {
          await usersCollection.updateOne(
            { _id: user._id },
            { $set: { isTrialExhausted: true } }
          )
        }

        if (!sub.expiredNotified) {
          await notifySubscriptionEnded(bot, user, sub.plan === "trial")

          await subsCollection.updateOne(
            { _id: sub._id },
            {
              $set: {
                expiredNotified: true,
                updatedAt: now,
              },
            }
          )
        }

        continue // НЕТ ДОСТУПА НЕ ШЛЁМ ОПРОСЫ
      }

      /* ==================================================
      * УВЕДОМЛЕНИЯ О СРОКЕ ПОДПИСКИ
      * ================================================== */
      const timeLeft = sub.endDate.getTime() - now.getTime()

      /*  За 3 суток */
      if (
        timeLeft <= 3 * DAY &&
        timeLeft > 2 * DAY &&
        !sub.warned3days
      ) {
        await notify3Days(bot, user)

        await subsCollection.updateOne(
          { _id: sub._id },
          { $set: { warned3days: true, updatedAt: now } }
        )
      }

      /* За 1 сутки */
      if (
        timeLeft <= 1 * DAY &&
        timeLeft > 0 &&
        !sub.warned1day
      ) {
        await notify1Day(bot, user)

        await subsCollection.updateOne(
          { _id: sub._id },
          { $set: { warned1day: true, updatedAt: now } }
        )
      }


      /* ==================================================
       * 2️⃣ ДОСТУП К УВЕДОМЛЕНИЯМ
       * ================================================== */
      if (!user.settings?.notificationsEnabled) continue

      const nowTz = moment().tz(user.settings.timezone)
      const hour = nowTz.hour()
      const minute = nowTz.minute()

      const { morningNotification, eveningNotification } = user.settings
      if (!morningNotification || !eveningNotification) continue

      const [mH, mM] = morningNotification.split(":").map(Number)
      const [eH, eM] = eveningNotification.split(":").map(Number)

      const homeName = user.settings.homeName

      /* 🌅 Утро */
      if (hour === mH && minute === mM) {
        await safeLaunch(bot, user, "morning", homeName, usersCollection)
      }

      /* 🌞 День (3 раза) */
      if (user.settings.daytimeNotifications) {
        const morning = moment(nowTz).hour(mH).minute(mM).second(0)
        const evening = moment(nowTz).hour(eH).minute(eM).second(0)

        const totalMinutes = evening.diff(morning, "minutes")
        if (totalMinutes > 0) {
          const interval = totalMinutes / 4
          const times = [1, 2, 3].map(i =>
            moment(morning).add(interval * i, "minutes")
          )

          if (times.some(t => t.hour() === hour && t.minute() === minute)) {
            await safeLaunch(bot, user, "daytime", homeName, usersCollection)
          }
        }
      }

      /* 🌙 Вечер */
      if (hour === eH && minute === eM) {
        await safeLaunch(bot, user, "evening", homeName, usersCollection)
      }
    }
  })

  console.log("🕒 Cron service initialized")
}
