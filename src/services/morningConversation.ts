// src/services/morningConversation.ts
import type { Conversation } from "@grammyjs/conversations"
import type { MyContext } from "../bot/middlewares/userMiddleware"
import { getCollection } from "../models/database"
import { MoodEntryCollection } from "../models/MoodEntry"
import { UserCollection } from "../models/User"
import { finishConversation, goMainButton } from "../utils/conversationUtils"
import { getMainMenu } from "../bot/keyboards"

function createSleepHoursKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "😵‍💫 Почти не спал (1–3 ч)", callback_data: "sleep_h_1_3" }],
      [
        { text: "😴 4–5 часов", callback_data: "sleep_h_4" },
        { text: "🛌 6–7 часов", callback_data: "sleep_h_6" }
      ],
      [
        { text: "💤 7–8 часов", callback_data: "sleep_h_7" },
        { text: "🌟 8+ часов", callback_data: "sleep_h_8" }
      ],
      [{ text: "🚫 Не спал", callback_data: "sleep_h_0" }],
      goMainButton
    ]
  }
}

export async function morningConversation(
  conversation: Conversation<MyContext, MyContext>,
  ctx: MyContext
) {
  const telegramId = ctx.from!.id
  const user = ctx.user

  // ---------- Приветствие ----------
  await ctx.reply(
    `🌅 Доброе утро, ${user?.firstName || ctx.from!.first_name}!\n\n` +
    `Как спалось? Что снилось?\nРасскажи о своём сне и качестве сна.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "💤 Оценить сон", callback_data: "start_sleep" }],
          [{ text: "⏰ Пропустить", callback_data: "skip" }],
          goMainButton
        ]
      }
    }
  )

  const startAction = await conversation.waitFor("callback_query:data")
  await startAction.answerCallbackQuery()

  if (startAction.callbackQuery.data === "skip") {
    await startAction.editMessageText(
      "Хорошего дня! 🌞\nЕсли захочешь — можешь добавить запись в любой момент."
    )
    await finishConversation(ctx)
    return
  }

  if (startAction.callbackQuery.data === "go_main") {
    await finishConversation(ctx)
    return
  }

  // ---------- Оценка качества сна ----------
  const qualityKeyboard = {
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
      ],
      goMainButton
    ]
  }

  await startAction.editMessageText(
    `💤 *Оцени качество сна от 1 до 10:*\n\n` +
    `1 — плохо, не выспался\n` +
    `5 — нормально\n` +
    `10 — отлично, бодрое утро`,
    { parse_mode: "Markdown", reply_markup: qualityKeyboard }
  )

  const qualityAction = await conversation.waitFor("callback_query:data")
  await qualityAction.answerCallbackQuery()

  const qualityData = qualityAction.callbackQuery.data

  if (qualityData === "go_main") {
    await finishConversation(ctx)
    return
  }

  if (!qualityData.startsWith("q_")) {
    await finishConversation(ctx)
    return
  }

  const sleepQuality = Number(qualityData.replace("q_", ""))

  // ---------- Часы сна ----------
  await qualityAction.editMessageText(
    `✅ Качество сна: *${sleepQuality}/10*\n\n` +
    `⏰ Сколько часов ты спал(а) этой ночью?`,
    {
      parse_mode: "Markdown",
      reply_markup: createSleepHoursKeyboard()
    }
  )

  const hoursAction = await conversation.waitFor("callback_query:data")
  await hoursAction.answerCallbackQuery()

  const hoursData = hoursAction.callbackQuery.data

  if (hoursData === "go_main") {
    await finishConversation(ctx)
    return
  }

  const hoursMap: Record<string, number> = {
    sleep_h_1_3: 2,
    sleep_h_4: 4.5,
    sleep_h_6: 6.5,
    sleep_h_7: 7.5,
    sleep_h_8: 8.5,
    sleep_h_0: 0
  }

  const sleepHours = hoursMap[hoursData]

  if (sleepHours === undefined) {
    await finishConversation(ctx)
    return
  }

  let sleepText = "💤 Сон за ночь записан"

  if (sleepHours === 0) {
    sleepText = "🚫 Этой ночью ты совсем не спал(а)"
  } else if (sleepHours <= 3) {
    sleepText = `😵‍💫 Почти не спал(а): *${sleepHours} ч*`
  } else {
    sleepText = `💤 Сон за ночь: *${sleepHours} ч*`
  }

  await hoursAction.editMessageText(
    `${sleepText}\n\n` +
    `💭 Опиши, что тебе снилось: эмоции, детали, ощущения.\n\n` +
    `Просто напиши сообщение ✨`,
    { parse_mode: "Markdown" }
  )

  // ---------- Описание сна ----------
  const dreamMsg = await conversation.waitFor(":text")
  const dreamDescription = dreamMsg.message!.text

  await saveSleepEntry(
    telegramId,
    sleepQuality,
    dreamDescription,
    sleepHours
  )

  // ---------- Финал ----------
  const phrases = [
    "✨ Спасибо, что поделился. Желаю тебе лёгкого и спокойного дня.",
    "🌿 Пусть день будет мягким и бережным к тебе.",
    "💛 Хорошего дня! Не забывай заботиться о себе.",
    "🌼 Пусть сегодня будет больше тепла и понимания.",
    "🌞 Ты сделал(а) важный шаг — береги себя."
  ]

  const phrase = phrases[Math.floor(Math.random() * phrases.length)]

  console.log('перед ответом бота на утреннее взаимодействие', ctx.hasAccess)

  await ctx.reply(
    `${phrase}\n\n` +
    `В любой момент ты можешь добавить запись о своём состоянии.`, {
      reply_markup: getMainMenu(!!ctx.hasAccess)
    }
  )

  await finishConversation(ctx)
}

// ---------- Сохранение ----------
async function saveSleepEntry(
  telegramId: number,
  quality: number,
  dream: string,
  hours: number
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
        hours,
        dreamDescription: dream
      },
      physicalSymptoms: [],
      emotions: [],
      thoughts: dream,
      overallPhysical: 0,
      overallMental: 0
    })
  } catch (e) {
    console.error("❌ Failed to save sleep entry:", e)
  }
}
