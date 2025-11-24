// import { Api, Context, RawApi, Bot } from "grammy"
// import type { MyContext } from "../bot/middlewares/userMiddleware"

// export async function launchConversation(
//   bot: Bot<MyContext>,
//   name: string,
//   userId: number
// ) {
//   const fakeUpdate = {
//     update_id: Date.now(),
//     message: {
//       message_id: 0,
//       date: Math.floor(Date.now() / 1000),
//       chat: { id: userId, type: "private" },
//       from: {
//         id: userId,
//         is_bot: false,
//         first_name: "User",
//       },
//       text: "/force",
//     },
//   }

//   const me = await bot.api.getMe()

//   const ctx = new Context(
//     fakeUpdate as any,
//     bot.api as Api<RawApi>,
//     me
//   ) as MyContext

//   // прогоняем middleware бота
//   console.log(bot)
//   await (bot as any).use(ctx)

//   // запускаем conversation
//   console.log(ctx) // ctx.conversation - не существует
//   await ctx.conversation.enter(name, { overwrite: true })

//   return true
// }

// // src/services/conversationLauncher.ts
// import { Api, Context, RawApi, Bot } from "grammy"
// import type { MyContext } from "../bot/middlewares/userMiddleware"

// export async function launchConversation(
//   bot: Bot<MyContext>,
//   name: string,
//   telegramId: number
// ) {
//   // 1) Fake update — БЕЗ text, чтобы не срабатывали message:text
//   const fakeUpdate = {
//     update_id: Date.now(),
//     message: {
//       message_id: Date.now(),
//       date: Math.floor(Date.now() / 1000),
//       chat: { id: telegramId, type: "private" },
//       from: { id: telegramId, is_bot: false }
//     }
//   }

//   // 2) Пропускаем через handleUpdate (session + conversations middleware)
//   await bot.handleUpdate(fakeUpdate as any)

//   // 3) Создаем ctx вручную на основе fake update
//   const me = await bot.api.getMe()
//   const ctx = new Context(
//     fakeUpdate as any,
//     bot.api as Api<RawApi>,
//     me
//   ) as MyContext

//   // 4) Запускаем Conversation
//   await ctx.conversation.enter(name, { overwrite: true })

//   return true
// }

// src/services/conversationLauncher.ts
import { Bot } from "grammy"
import type { MyContext } from "../bot/middlewares/userMiddleware"

export async function launchConversation(
  bot: Bot<MyContext>,
  name: string,
  telegramId: number,
  userName: number
) {
  try {
    console.log(`🚀 Launching conversation '${name}' for user ${telegramId}`)

    // Создаем fake update со специальной командой
    const fakeUpdate = {
      update_id: Date.now(),
      message: {
        message_id: Date.now(),
        date: Math.floor(Date.now() / 1000),
        text: `/launch_${name}`,
        chat: { 
          id: telegramId, 
          type: "private",
          first_name: userName || 'дорогой Друг'
        },
        from: { 
          id: telegramId, 
          is_bot: false, 
          first_name: userName || 'дорогой Друг',
          language_code: "ru"
        },
        entities: [
          {
            type: "bot_command",
            offset: 0,
            length: `/launch_${name}`.length
          }
        ]
      }
    }

    // Запускаем обработку - команда сама вызовет нужную беседу
    await bot.handleUpdate(fakeUpdate as any)
    
    console.log(`✅ Conversation '${name}' successfully launched for user ${telegramId}`)
    return true

  } catch (error) {
    console.error(`❌ Error launching conversation '${name}' for user ${telegramId}:`, error)
    throw error
  }
}