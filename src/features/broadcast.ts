// src\features\broadcast.ts
import { Composer } from "grammy";
import { getAllUsers } from "../services/userService";
import type { MyContext } from "../bot/middlewares/userMiddleware";

const composer = new Composer<MyContext>();

const ADMIN_IDS = [
  process.env.TEST_USER_ID1,
  process.env.TEST_USER_ID2
].filter(Boolean).map((s) => Number(s));

// Лог на загрузку файла — помогает убедиться, что модуль подключился
console.log("🔔 broadcast command module loaded. Admins:", ADMIN_IDS);

composer.command("broadcast", async (ctx) => {
  console.log("🔔 /broadcast called by", ctx.from?.id);
  if (!ctx.from) return;

  // Проверка прав
  if (!ADMIN_IDS.includes(ctx.from.id)) {
    await ctx.reply("У вас нет прав использовать эту команду.");
    return;
  }

  await ctx.reply("Введите текст сообщения, которое нужно отправить всем пользователям (или отправьте /cancel для завершения команды):");
  ctx.session.broadcastMode = true;
});

composer.command("cancel", async (ctx) => {
  if (ctx.session?.broadcastMode) {
    ctx.session.broadcastMode = false;
    await ctx.reply("Режим рассылки отменён.");
  }
});

composer.on("message:text", async (ctx) => {
  if (!ctx.from) return;

  if (ctx.message.text.startsWith("/")) return;

  if (!ctx.session?.broadcastMode) return;

  console.log("🔔 broadcast: got text from admin", ctx.from.id);
  ctx.session.broadcastMode = false; // выходим из режима

  const messageText = ctx.message.text;

    const users = await getAllUsers();

    let sent = 0;
    for (const u of users) {
        try {
        await ctx.api.sendMessage(u.telegramId, messageText);
        sent++;
        } catch (err) {
        console.warn("Не удалось отправить пользователю", u.telegramId, err);
        }
    }

//   for (const adminId of ADMIN_IDS) {
//     try {
//       await ctx.api.sendMessage(adminId, `📢 *Сообщение от Администратора сервиса*\n\n` + messageText, {
//         parse_mode: 'Markdown',
//       });
//       console.log(`🔔 broadcast: sent to admin ${adminId}`);
//     } catch (err) {
//       console.warn(`🔔 broadcast: failed to send admin ${adminId}`, err);
//     }
//   }
});

export default composer;