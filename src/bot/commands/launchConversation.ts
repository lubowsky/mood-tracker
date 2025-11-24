// src/bot/commands/launchConversation.ts
import { Composer } from "grammy"
import type { MyContext } from "../middlewares/userMiddleware"

const composer = new Composer<MyContext>()

// Специальные команды для запуска бесед из кода
composer.command("launch_morning", async (ctx) => {
  await ctx.conversation.enter("morningConversation", { overwrite: true })
})

composer.command("launch_daytime", async (ctx) => {
  await ctx.conversation.enter("daytimeConversation", { overwrite: true })
})

composer.command("launch_evening", async (ctx) => {
  await ctx.conversation.enter("eveningConversation", { overwrite: true })
})

composer.command("launch_test", async (ctx) => {
  await ctx.conversation.enter("testConversation", { overwrite: true })
})

export default composer