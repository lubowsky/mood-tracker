// src/services/daytimeConversation.ts
import type { Conversation } from "@grammyjs/conversations"
import type { MyContext } from "../bot/middlewares/userMiddleware"
import { getCollection } from "../models/database"
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

export async function daytimeConversation(
  conversation: Conversation<MyContext, MyContext>,
  ctx: MyContext
) {
  const userId = ctx.from!.id
  const users = getCollection(UserCollection)
  const user = await users.findOne({ telegramId: userId })

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

  await ctx.reply(message, {
    parse_mode: "Markdown",
    reply_markup: keyboard
  })

  const action = await conversation.waitFor("callback_query:data")
  await action.answerCallbackQuery()

  const data = action.callbackQuery.data

  if (data === "daytime_ok" || data === "daytime_normal") {
    const addedString =
      "\n Что помогает тебе чувствовать себя так?\n\n Если захочешь поделиться чем-то подробнее — загляни в «📝 Добавить запись» в главном меню. Хорошего тебе продолжения дня 💛"

    const responses = {
      daytime_ok: [
        "Здорово слышать 🌞\n" + addedString,
        "Пусть это ощущение мягко сопровождает тебя дальше ✨" + addedString,
        "Отлично! Пусть так продолжается 💫" + addedString,
        "Прекрасно! 💛" + addedString,
        "Здорово! 🌈" + addedString
      ],
      daytime_normal: [
        "Поняла тебя 🌿 \n Если захочешь подробнее описать своё состояние — просто воспользуйся кнопкой «📝 Добавить запись». Береги себя 💛",
        "Спасибо, что ответил 🌼 \n Если появится желание рассказать больше — «Добавить запись» всегда доступна. Тепла тебе 🌱"
      ]
    } as const

    const type = data === "daytime_ok" ? "daytime_ok" : "daytime_normal"
    const replyText = random(responses[type])

    await action.editMessageText(replyText)
    await saveQuickResponse(userId, type === "daytime_ok" ? "positive" : "neutral")

    return
  }

  if (data === "daytime_hard") {
    await action.editMessageText(
      "Понимаю… 💛\nПоделишься, что с тобой?",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Да", callback_data: "hard_yes" },
              { text: "Нет", callback_data: "hard_no" }
            ]
          ]
        }
      }
    )

    const next = await conversation.waitFor("callback_query:data")
    await next.answerCallbackQuery()
    const choice = next.callbackQuery.data

    if (choice === "hard_yes") {
      await next.editMessageText("Хорошо 💛\n\nРасскажи, что происходит:")

      const msg = await conversation.waitFor(":text")
      const text = msg.message!.text || ""

      await saveDetailedDescription(userId, text)

      await msg.reply(
        "Сочувствую тебе. Знай, что ты можешь: 💛" + 
        "\n - позвонить или написать другу, \n -или воспользоваться кнопкой «📝 Добавить запись» в главном меню, чтобы потом обсудить это с психологом или прямо сейчас: ",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Записаться к психологу", callback_data: "hard_help_psy" }],
              // [{ text: "Позвонить или написать другу", callback_data: "hard_help_friend" }],
              // [{ text: "Добавить запись, чтобы обсудить потом", callback_data: "hard_add_entry" }]
            ]
          }
        }
      )

      const final = await conversation.waitFor("callback_query:data")
      await final.answerCallbackQuery()
      return handleHardFinal(final, ctx)
    }

    if (choice === "hard_no") {
      await next.editMessageText(
        "Сочувствую тебе. \n\nЗнай, что ты можешь: 💛" + 
        "\n - позвонить или написать другу, \n -или воспользоваться кнопкой «📝 Добавить запись» в главном меню, чтобы потом обсудить это с психологом или прямо сейчас: ",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Записаться к психологу", callback_data: "hard_help_psy" }],
              // [{ text: "Позвонить или написать другу", callback_data: "hard_help_friend" }],
              // [{ text: "Добавить запись, чтобы обсудить потом", callback_data: "hard_add_entry" }]
            ]
          }
        }
      )

      const final = await conversation.waitFor("callback_query:data")
      await final.answerCallbackQuery()
      return handleHardFinal(final, ctx)
    }
  }

  async function handleHardFinal(query: MyContext, ctx: MyContext) {
    const data = query.callbackQuery!.data

    if (data === "hard_help_psy") {
      await query.editMessageText(
        "Вот ссылка, по которой ты можешь записаться к психологу:\n\n" +
        "https://t.me/psu_shatunova\n\n" +
        "Ты не один 💛"
      )
    }

    if (data === "hard_help_friend") {
      await query.editMessageText(
        "Иногда разговор с близким человеком может дать много тепла 🌿\n" +
        "Подумай, кому ты мог бы написать или позвонить прямо сейчас 💛"
      )
    }

    if (data === "hard_add_entry") {
      await query.editMessageText(
        "Хорошо! Чтобы добавить запись, нажми «📝 Добавить запись» в главном меню."
      )
    }
  }

  if (data === "daytime_detailed") {
    await action.editMessageText(
      `💭 *Расскажи подробнее о своем состоянии:*\n\n` +
      `• Эмоции\n• Физические ощущения\n• Мысли\n\n` +
      `*Пиши в свободной форме* 🌸`,
      { parse_mode: "Markdown" }
    )

    const msg = await conversation.waitFor(":text")
    const text = msg.message!.text || ""

    await saveDetailedDescription(userId, text)
    await msg.reply(`💫 Спасибо, что поделился 🌸 Твои мысли сохранены.`)
    return
  }

  if (data === "daytime_pause_today") {
    if (user) {
      const tomorrow = moment().tz(user.settings.timezone).add(1, "day").startOf("day").toDate()
      await users.updateOne(
        { _id: user._id },
        { $set: { "settings.lastDaytimeNotification": tomorrow } }
      )
    }

    await action.editMessageText(
      `Хорошо, я не буду беспокоить тебя до завтра 🌙\n\n` +
      `Если захочешь записать что-то — используй кнопку "📝 Добавить запись"`
    )

    return
  }

  await action.editMessageText("Спасибо! Если захочешь — используй «📝 Добавить запись»")
}

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
  } catch (e) {
    console.error("Failed to save detailed daytime description:", e)
  }
}
