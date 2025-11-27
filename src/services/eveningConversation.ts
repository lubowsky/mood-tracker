import type { Conversation } from "@grammyjs/conversations"
import type { MyContext } from "../bot/middlewares/userMiddleware"
import { getCollection } from "../models/database"
import { UserCollection, type User } from "../models/User"
import { MoodEntryCollection } from "../models/MoodEntry"

type EveningQuickKey =
  | "evening_q_excellent"
  | "evening_q_normal"
  | "evening_q_hard"
  | "evening_q_tired"

const map: Record<EveningQuickKey, { text: string; type: string; intensity: number }> = {
  evening_q_excellent: { text: "Отличный день! 🌟", type: "excellent", intensity: 8 },
  evening_q_normal:    { text: "Обычный день. 📅",  type: "normal",    intensity: 5 },
  evening_q_hard:      { text: "Сложный день. 🤲",  type: "hard",      intensity: 3 },
  evening_q_tired:     { text: "Усталый день. 😴",  type: "tired",     intensity: 4 }
}

export async function eveningConversation(
  conversation: Conversation<MyContext, MyContext>,
  ctx: MyContext
) {
  const userId = ctx.from!.id

  const users = await getCollection(UserCollection)
  const user = await users.findOne({ telegramId: userId }) as User | null
  if (!user) {
    await ctx.reply("Не удалось загрузить профиль пользователя 😔")
    return
  }

  // --- отправляем приветствие ---
  const message = `🌙 *Добрый вечер, ${user.settings.homeName}!*  

Как прошёл твой день?  
Хочешь мягко подвести итоги и записать свои мысли?

*Это помогает:*  
• лучше понимать своё состояние  
• замечать закономерности  
• фиксировать прогресс`

  const keyboard = {
    inline_keyboard: [
      [
        { text: "📝 Записать вечерние мысли", callback_data: "evening_detailed" },
        { text: "✨ Краткая оценка дня", callback_data: "evening_quick" }
      ],
      [{ text: "🌙 Сегодня не хочу", callback_data: "evening_skip" }]
    ]
  }

  await ctx.reply(message, {
    parse_mode: "Markdown",
    reply_markup: keyboard
  })

  // ждём выбора
  const action = await conversation.waitForCallbackQuery([
    "evening_detailed",
    "evening_quick",
    "evening_skip"
  ])

  const data = action.callbackQuery.data

  // --- ПРОПУСК ---
  if (data === "evening_skip") {
    await action.editMessageText(
      `Хорошо 🌙  
Отдыхай.  

Если позже захочешь что-то записать — нажми «📝 Добавить запись» в главном меню.`
    )
    return
  }

  // --- ПОДРОБНЫЙ ОТВЕТ ---
  if (data === "evening_detailed") {
    await action.editMessageText(
      `🌙 *Расскажи о своём дне:*\n\n` +
      `Можешь поделиться:\n` +
      `• яркими моментами\n` +
      `• сложностями\n` +
      `• эмоциями\n` +
      `• мыслями о завтрашнем дне\n\n` +
      `Пиши свободно — я рядом 🌙`,
      { parse_mode: "Markdown" }
    )

    const msg = await conversation.waitFor("message:text")

    const entries = await getCollection(MoodEntryCollection)
    await entries.insertOne({
      userId: user._id,
      text: msg.message.text,
      type: "evening",
      createdAt: new Date()
    })

    await ctx.reply(
      `Спасибо, что поделился 🌿  
Береги себя и хорошего тебе вечера.`
    )

    return
  }

  // --- БЫСТРЫЕ ОЦЕНКИ ---
  if (data === "evening_quick") {
    await action.editMessageText(
      `⭐️ *Как бы ты оценил свой день?*\n\nВыбери подходящий вариант:`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "😊 Отличный",  callback_data: "evening_q_excellent" },
              { text: "😐 Обычный",   callback_data: "evening_q_normal" }
            ],
            [
              { text: "😔 Сложный",   callback_data: "evening_q_hard" },
              { text: "😴 Усталый",   callback_data: "evening_q_tired" }
            ]
          ]
        }
      }
    )

    const quick = await conversation.waitForCallbackQuery([
      "evening_q_excellent",
      "evening_q_normal",
      "evening_q_hard",
      "evening_q_tired"
    ])

    const key = quick.callbackQuery.data as EveningQuickKey
    const chosen = map[key]

    const entries = await getCollection(MoodEntryCollection)
    await entries.insertOne({
      userId: user._id,
      type: "evening",
      quickType: chosen.type,
      emotions: [
        { name: chosen.type, intensity: chosen.intensity }
      ],
      createdAt: new Date()
    })

    await quick.editMessageText(
      `${chosen.text}\n\nСпасибо, что поделился ✨  
Если захочешь подробнее описать своё состояние — нажми «Добавить запись» в главном меню.  
Хорошего тебе завершения дня 🌙`
    )

    return
  }
}
