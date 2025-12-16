// src\utils\conversationUtils.ts

import { mainMenu } from "../bot/keyboards";
import { MyContext } from "../bot/middlewares/userMiddleware";

export async function finishConversation(ctx: MyContext) {
  await ctx.reply("🏠 Главное меню:", {
    reply_markup: mainMenu
  })
}

export const goMainButton = [{ text: "🏠 Главное меню", callback_data: "go_main" }]
