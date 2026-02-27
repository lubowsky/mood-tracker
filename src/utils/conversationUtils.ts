// src\utils\conversationUtils.ts

import { getMainMenu } from "../bot/keyboards";
import { MyContext } from "../bot/middlewares/userMiddleware";
import { calculateUserAccess } from "./accessService";

export async function finishConversation(ctx: MyContext) {
  const hasAccess = await calculateUserAccess(ctx.from!.id)
  await ctx.reply("🏠 Главное меню:", {
    reply_markup: getMainMenu(!!hasAccess)
  })
}

export const goMainButton = [{ text: "🏠 Главное меню", callback_data: "go_main" }]
