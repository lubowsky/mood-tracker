// src/services/morningConversation.ts
import type { Conversation } from "@grammyjs/conversations"
import type { MyContext } from "../bot/middlewares/userMiddleware"
import { getCollection } from "../models/database"
import { MoodEntryCollection } from "../models/MoodEntry"
import { UserCollection } from "../models/User"

export async function morningConversation(
  conversation: Conversation<MyContext, MyContext>,
  ctx: MyContext
) {
  const user = ctx.user
  const userId = ctx.from!.id

  console.log("📌 morningConversation started for", ctx.from?.id)

  // Приветствие
  try{
    await ctx.reply(
      `🌅 Доброе утро, ${user?.firstName || ctx.from!.first_name}!\n\n` +
      `Как спалось? Что снилось?\nРасскажи о своём сне и качестве сна.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "💤 Оценить сон", callback_data: "start_sleep" }],
            [{ text: "⏰ Пропустить", callback_data: "skip" }]
          ]
        }
      }
    )
  } catch (err) {
    console.log('ошибка при отправке первого утреннего сообщения: ', err)
  }


  const first = await conversation.waitFor("callback_query:data")
  console.log("📌 morning step1", ctx.from?.id)
  await first.answerCallbackQuery()

  if (first.callbackQuery.data === "skip") {
    await first.editMessageText(
      "Хорошего дня! 🌞\nЕсли хочешь — можешь использовать «📝 Добавить запись», чтобы записать своё состояние."
    )
    return
  }

  // Оценка сна
  const keyboard = {
    inline_keyboard: [
      [
        { text: "1", callback_data: "q_1" },
        { text: "2", callback_data: "q_2" },
        { text: "3", callback_data: "q_3" },
        { text: "4", callback_data: "q_4" },
        { text: "5", callback_data: "q_5" }
      ],
      [
        { text: "6", callback_data: "q_6" },
        { text: "7", callback_data: "q_7" },
        { text: "8", callback_data: "q_8" },
        { text: "9", callback_data: "q_9" },
        { text: "10", callback_data: "q_10" }
      ]
    ]
  }

  await first.editMessageText(
    `💤 *Оцени качество сна от 1 до 10:*\n\n` +
    `1 — плохо, не выспался\n` +
    `5 — нормально\n` +
    `10 — отлично, бодрое утро`,
    { parse_mode: "Markdown", reply_markup: keyboard }
  )

  const scoreAction = await conversation.waitFor("callback_query:data")
  console.log("📌 morning step2", ctx.from?.id)
  await scoreAction.answerCallbackQuery()

  const sleepQuality = Number(scoreAction.callbackQuery.data.replace("q_", ""))

  await scoreAction.editMessageText(
    `✅ Качество сна: *${sleepQuality}/10*\n\n` +
    `💭 Опиши, что тебе снилось: какие эмоции, детали, ощущения…\n\n` +
    `Просто напиши сообщение ✨`,
    { parse_mode: "Markdown" }
  )

  // Ждём текст описания сна
  const dreamMsg = await conversation.waitFor(":text")
  console.log("📌 morning step3", ctx.from?.id)
  const dreamDescription = dreamMsg.message!.text

  // Сохраняем в базу
  await saveSleepEntry(userId, sleepQuality, dreamDescription, user?._id)

  // Финальное сообщение с поддержкой и ссылкой на добавление записи
  const phrases = [
    "✨ Спасибо, что поделился. Желаю тебе лёгкого и спокойного дня.",
    "🌿 Твоя искренность — это сила. Пусть день будет мягким.",
    "💛 Хорошего дня! Не забывай: ты можешь всегда записать, как себя чувствуешь.",
    "🌼 Пусть сегодня будет много тепла и понимания.",
    "🌞 Ты проделал(а) важную работу — береги себя сегодня."
  ]
  const phrase = phrases[Math.floor(Math.random() * phrases.length)]

  await ctx.reply(
    `${phrase}\n\n` +
    `В любой момент ты можешь нажать «📝 Добавить запись», чтобы описать своё физическое и ментальное состояние.`
  )
}

// Функция для сохранения — аналогична ранее
async function saveSleepEntry(
  telegramId: number,
  quality: number,
  dream: string | undefined,
  userMongoId: any
) {
  try {
    const users = getCollection(UserCollection)
    const entries = getCollection(MoodEntryCollection)

    const user = await users.findOne({ telegramId })
    if (!user) return

    await entries.insertOne({
      userId: user._id,
      timestamp: new Date(),
      timeOfDay: "morning",
      source: "morning_survey",
      sleepData: {
        quality,
        dreamDescription: dream
      },
      physicalSymptoms: [],
      emotions: [],
      thoughts: dream || "",
      overallPhysical: 0,
      overallMental: 0
    })
  } catch (e) {
    console.error("❌ Failed to save sleep entry:", e)
  }
}
