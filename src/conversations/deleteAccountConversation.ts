import { Conversation } from "@grammyjs/conversations";
import { MyContext } from "../bot/middlewares/userMiddleware";
import { InlineKeyboard } from "grammy";
import { deleteUserData } from "../services/deleteUser";

export async function deleteAccountConversation(
  conversation: Conversation<MyContext, MyContext>,
  ctx: MyContext
) {

  const warningText =
    "⚠️ *Удаление аккаунта*\n\n" +
    "Это действие удалит *все твои данные* из базы:\n" +
    "• дневники,\n" +
    "• отметки состояния,\n" +
    "• настройки,\n" +
    "• идентификатор Telegram.\n\n" +
    "*Восстановить данные будет невозможно.*\n\n" +
    "Ты уверен, что хочешь удалить аккаунт?";

  const keyboard = new InlineKeyboard()
    .text("❗ Да, удалить", "confirm_delete")
    .row()
    .text("Отмена", "cancel_delete");

  await ctx.reply(warningText, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });

  const response = await conversation.waitForCallbackQuery([
    "confirm_delete",
    "cancel_delete",
  ]);


  if (response.callbackQuery.data === "cancel_delete") {
    await response.answerCallbackQuery();

    await response.editMessageText(
      "Удаление отменено. Твои данные в безопасности 🙂"
    );

    return;
  }

  if (response.callbackQuery.data === "confirm_delete") {
    await response.answerCallbackQuery();

    const telegramId = response.from.id;

    await deleteUserData(telegramId);

    await response.editMessageText(
      "🗑️ *Аккаунт удалён*\n\nВсе данные были полностью удалены.",
      { parse_mode: "Markdown" }
    );

    return;
  }
}
