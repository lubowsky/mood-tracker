// src/services/testConversation.ts
import type { Conversation } from "@grammyjs/conversations"
import type { MyContext } from "../bot/middlewares/userMiddleware"

export async function testConversation(
  conversation: Conversation<MyContext, MyContext>,
  ctx: MyContext
) {
  console.log('🟢 TEST CONVERSATION: Started for user', ctx.from?.id)

  // Простое приветствие
  await ctx.reply(
    `🧪 *Тестовый диалог*\n\n` +
    `Это тестовый диалог для проверки работы системы.\n` +
    `Время: ${new Date().toLocaleTimeString()}`,
    { parse_mode: "Markdown" }
  )

  // Простой вопрос с кнопками
  await ctx.reply(
    "Как дела?",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Отлично", callback_data: "test_good" }],
          [{ text: "😐 Нормально", callback_data: "test_ok" }],
          [{ text: "❌ Плохо", callback_data: "test_bad" }]
        ]
      }
    }
  )

  // Ждем ответ
  const answer = await conversation.waitFor("callback_query:data")
  await answer.answerCallbackQuery()

  const responseText = answer.callbackQuery.data === "test_good" ? "Отлично! 🎉" :
                      answer.callbackQuery.data === "test_ok" ? "Нормально 👍" :
                      "Плохо... 😔"

  await answer.editMessageText(`Ты ответил: ${responseText}`)

  // Завершаем диалог
  await ctx.reply(
    `✅ *Тестовый диалог завершен*\n\n` +
    `Время завершения: ${new Date().toLocaleTimeString()}\n` +
    `Статус: Успешно 🎉`,
    { parse_mode: "Markdown" }
  )

  console.log('🟢 TEST CONVERSATION: Completed for user', ctx.from?.id)
}