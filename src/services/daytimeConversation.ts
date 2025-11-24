// src/services/daytimeConversation.ts
import type { Conversation } from "@grammyjs/conversations"
import type { MyContext } from "../bot/middlewares/userMiddleware"
import { getCollection } from "../models/database"
import { MoodEntryCollection } from "../models/MoodEntry"
import { UserCollection } from "../models/User"
import moment from "moment-timezone"

const gentlePhrases = [
  "💫 Привет! Как твое состояние в этот момент?",
  "🌿 Хорошего дня! Что чувствуешь прямо сейчас?",
  "🌸 Добрый день! Как твое настроение?",
  "☀️ Привет! Как твоё самочувствие в эту минуту?",
  "🌼 Здравствуй! Что происходит с тобой сейчас?",
  "💖 Привет! Как твоё эмоциональное состояние?",
  "🌱 Добрый день! Что ты ощущаешь в себе сейчас?"
]

function random<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Conversation для дневного уведомления.
 *
 * Вход: conversation и ctx — вызывается либо по кнопке/команде, либо cron'ом через внутренний апдейт.
 * Поведение максимально совпадает со старым сервисом:
 * - показывает клавиатуру с быстрыми ответами и ссылками
 * - обрабатывает quick responses (редактирует сообщение и сохраняет)
 * - при выборе "📝 Подробнее" просит текст и сохраняет
 * - при выборе "🔕 Не спрашивать сегодня" ставит паузу до завтра
 */
export async function daytimeConversation(
  conversation: Conversation<MyContext, MyContext>,
  ctx: MyContext
) {
  const userId = ctx.from!.id
  const users = getCollection(UserCollection)
  const user = await users.findOne({ telegramId: userId })

  // Бережная фраза (рандом)
  const phrase = random(gentlePhrases)

  const message = `${phrase}\n\n*Можешь коротко описать:*\n• Эмоцию или чувство\n• Физическое ощущение\n• Или просто сказать "всё хорошо" 💛`

  const keyboard = {
    inline_keyboard: [
      [
        { text: "😊 Всё хорошо", callback_data: "daytime_ok" },
        { text: "😐 Нормально", callback_data: "daytime_normal" },
        { text: "😔 Сложно", callback_data: "daytime_hard" }
      ],
      [
        { text: "📝 Подробнее", callback_data: "daytime_detailed" },
        { text: "🔕 Не спрашивать сегодня", callback_data: "daytime_pause_today" }
      ]
    ]
  }

  // Отправляем/редактируем сообщение — если мы вызваны через callback editing may be required.
  // Просто отправим новое сообщение (conversation обычно запускается через internal command)
  await ctx.reply(message, {
    parse_mode: "Markdown",
    reply_markup: keyboard
  })

  // ждём выбора пользователя (callback_query)
  const action = await conversation.waitFor("callback_query:data")
  await action.answerCallbackQuery()

  const data = action.callbackQuery.data

  // --- быстрые ответы ---
  if (data === "daytime_ok" || data === "daytime_normal" || data === "daytime_hard") {
    const responses = {
      daytime_ok: [
        "Здорово слышать 🌞 Если захочешь поделиться чем-то подробнее — загляни в «Добавить запись» в главном меню. Хорошего тебе продолжения дня 💛",
        "Пусть это ощущение мягко сопровождает тебя дальше ✨ Если захочешь углубиться — кнопка «Добавить запись» всегда под рукой."
        ],
        daytime_normal: [
        "Поняла тебя 🌿 Если захочешь подробнее описать своё состояние — просто воспользуйся кнопкой «Добавить запись». Береги себя 💛",
        "Спасибо, что ответил 🌼 Если появится желание рассказать больше — «Добавить запись» всегда доступна. Тепла тебе 🌱"
        ],
        daytime_hard: [
        "Спасибо, что поделился 💖 Если захочешь чуть глубже разобраться в ощущениях — кнопка «Добавить запись» всегда доступна. Поддерживаю тебя 🌷",
        "Понимаю 🌿 Если будет желание описать подробнее — можешь сделать это через «Добавить запись». Пожалуйста, будь к себе мягче 💫"
        ]
    } as const

    const which =
      data === "daytime_ok" ? "daytime_ok" :
      data === "daytime_normal" ? "daytime_normal" :
      "daytime_hard"

    const replyText = random(responses[which])
    // редактируем текст сообщения с выбором
    await action.editMessageText(replyText)

    // сохраняем быстрый ответ в бд
    await saveQuickResponse(userId, which === "daytime_ok" ? "positive" : which === "daytime_normal" ? "neutral" : "negative")

    return
  }

  // --- подробный ответ ---
  if (data === "daytime_detailed") {
    await action.editMessageText(
      `💭 *Расскажи подробнее о своем состоянии:*\n\n` +
      `Можешь описать:\n` +
      `• Что чувствуешь эмоционально\n` +
      `• Физические ощущения\n` +
      `• Мысли, которые приходят\n` +
      `• Или просто поделиться чем-то важным\n\n` +
      `*Пиши в свободной форме* - я выслушаю 🌸`,
      { parse_mode: "Markdown" }
    )

    // ждём текст от пользователя
    const msg = await conversation.waitFor(":text")
    const text = msg.message!.text || ""

    // сохраняем подробное описание
    await saveDetailedDescription(userId, text)

    // подтверждаем пользователю
    await msg.reply(`💫 Спасибо что поделился! Это ценно 🌸\n\nТвои мысли сохранены.`)

    return
  }

  // --- пауза до завтра ---
  if (data === "daytime_pause_today") {
    // обновляем lastDaytimeNotification = завтра начало дня в часовом поясе пользователя
    try {
      if (user) {
        const tomorrow = moment().tz(user.settings.timezone).add(1, "day").startOf("day").toDate()
        await users.updateOne(
          { _id: user._id },
          { $set: { "settings.lastDaytimeNotification": tomorrow } }
        )
      }
    } catch (e) {
      console.error("Failed to set daytime pause:", e)
    }

    await action.editMessageText(
      `Хорошо, я не буду беспокоить тебя до завтра 🌙\n\n` +
      `Если захочешь записать что-то - используй кнопку "📝 Добавить запись"`
    )

    return
  }

  // по умолчанию ничего
  await action.editMessageText("Спасибо! Если захочешь — используй кнопку «📝 Добавить запись»")
}

// ---------------------------
// Вспомогательные функции
// ---------------------------

async function saveQuickResponse(userTelegramId: number, moodType: "positive" | "neutral" | "negative") {
  try {
    const users = getCollection(UserCollection)
    const user = await users.findOne({ telegramId: userTelegramId }) as any
    if (!user) return

    const { EntryService } = await import("./entryService")
    await EntryService.createDaytimeEntry(
      user._id,
      `Быстрый ответ: ${moodType}`,
      1,
      { moodType }
    )
    console.log(`Quick response saved for user ${userTelegramId}: ${moodType}`)
  } catch (e) {
    console.error("Failed to save quick daytime response:", e)
  }
}

async function saveDetailedDescription(userTelegramId: number, text: string, sequenceNumber: number = 1) {
  try {
    const users = getCollection(UserCollection)
    const user = await users.findOne({ telegramId: userTelegramId }) as any
    if (!user) return

    const { EntryService } = await import("./entryService")
    await EntryService.createDaytimeEntry(
      user._id,
      text,
      sequenceNumber
    )

    console.log(`Detailed daytime saved for user ${userTelegramId}`)
  } catch (e) {
    console.error("Failed to save detailed daytime description:", e)
  }
}
