// src/conversations/changeHomeNameConversation.ts
import { Conversation } from "@grammyjs/conversations";
import { MyContext } from "../bot/middlewares/userMiddleware";
import { updateUserHomeName } from "../services/userService";

export async function changeNameConversation(
  conv: Conversation<MyContext, MyContext>,
  ctx: MyContext
) {
  await ctx.reply("Введите имя, которое я буду использовать:");

  const { message } = await conv.wait();

  if (!message?.text) {
    await ctx.reply("Пожалуйста, отправьте текст.");
    return;
  }

  const newName = message.text.trim();

  await updateUserHomeName(ctx.from!.id, newName);

  await ctx.reply(`Готово! Я буду обращаться к вам как «${newName}».`);
}
