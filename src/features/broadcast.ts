// src/features/broadcast.ts
import { Composer } from "grammy";
import { getAllUsers } from "../services/userService";
import type { MyContext } from "../bot/middlewares/userMiddleware";

const composer = new Composer<MyContext>();

const ADMIN_IDS = [
  process.env.TEST_USER_ID1,
  process.env.TEST_USER_ID2
].filter(Boolean).map((s) => Number(s));

console.log("🔔 broadcast module loaded. Admins:", ADMIN_IDS);

// ----------------------
// /broadcast — запуск
// ----------------------
composer.command("broadcast", async (ctx) => {
  if (!ctx.from) return;

  if (!ADMIN_IDS.includes(ctx.from.id)) {
    return ctx.reply("У вас нет прав использовать эту команду.");
  }

  ctx.session.broadcastMode = true;

  await ctx.reply(
    "Введите текст рассылки.\n\n" +
    "Чтобы отправить *тихое сообщение*, начните текст с:\n" +
    "`!silent `\n\n" +
    "Пример:\n`!silent Завтра бот будет недоступен 10 минут`\n\n" +
    "Или отправьте /cancel чтобы выйти.",
    { parse_mode: "Markdown" }
  );
});

// ----------------------
// /cancel — отмена режима
// ----------------------
composer.command("cancel", async (ctx) => {
  if (ctx.session?.broadcastMode) {
    ctx.session.broadcastMode = false;
    return ctx.reply("Режим рассылки отменён.");
  }
});

// ----------------------
// /delete_broadcast — удалить последнюю рассылку
// ----------------------
composer.command("delete_broadcast", async (ctx) => {
  if (!ctx.from || !ADMIN_IDS.includes(ctx.from.id)) {
    return ctx.reply("У вас нет прав.");
  }

  const list = ctx.session.lastBroadcast;

  if (!list || list.length === 0) {
    return ctx.reply("Нет данных о последней рассылке.");
  }

  let deleted = 0;

  for (const item of list) {
    try {
      await ctx.api.deleteMessage(item.userId, item.msgId);
      deleted++;
    } catch (err) {
      console.warn("⚠ Не удалось удалить сообщение", item.userId, err);
    }
  }

  ctx.session.lastBroadcast = [];
  await ctx.reply(`Готово. Удалено сообщений: ${deleted}.`);
});

// ----------------------
// Ловим текст от админа в режиме рассылки
// ----------------------
composer.on("message:text", async (ctx) => {
  if (!ctx.session?.broadcastMode) return;
  if (!ctx.from) return;

  // не реагируем на команды
  if (ctx.message.text.startsWith("/")) return;

  ctx.session.broadcastMode = false;

  let messageText = ctx.message.text;
  let silent = false;

  if (messageText.startsWith("!silent ")) {
    silent = true;
    messageText = messageText.replace("!silent ", "").trim();
  }

  console.log(`📣 broadcast start (admin=${ctx.from.id}, silent=${silent})`);

  const users = await getAllUsers();
  const sentMessages: Array<{ userId: number; msgId: number }> = [];

  let sent = 0;

  for (const u of users) {
    try {
      const msg = await ctx.api.sendMessage(u.telegramId, messageText, {
        disable_notification: silent,
      });

      sentMessages.push({ userId: u.telegramId, msgId: msg.message_id });
      sent++;
    } catch (err) {
      console.warn(`⚠ Ошибка отправки пользователю ${u.telegramId}`, err);
    }
  }

  ctx.session.lastBroadcast = sentMessages;

  console.log(`📣 broadcast done: отправлено ${sent}/${users.length}`);

  await ctx.reply(
    `Рассылка завершена.\n` +
    `Отправлено: ${sent} пользователей.\n` +
    `Silent: ${silent ? "Да" : "Нет"}\n\n` +
    `Чтобы удалить рассылку у всех — используйте /delete_broadcast`
  );
});

export default composer;
