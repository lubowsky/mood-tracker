// import { Bot, session } from 'grammy';
// import { conversations, createConversation } from "@grammyjs/conversations"
// import { MyContext, userMiddleware } from './bot/middlewares/userMiddleware';
// import { connectToDatabase } from './models/database';
// import { NotificationService } from './services/notificationService';
// import { MorningSurveyService } from './services/morningSurveyService';
// import { DaytimeNotificationService } from './services/daytimeNotificationService';

// // Команды
// import start from './bot/commands/start';
// import mainMenu from './bot/commands/mainMenu';
// import addEntry from './bot/commands/addEntry';
// import getStats from './bot/commands/getStats';
// import listEntries from './bot/commands/listEntries';
// import settings from './bot/commands/settings';
// import devCommands from './bot/commands/devCommands';

// export let bot: Bot<MyContext>;
// export let morningService: MorningSurveyService;
// export let daytimeService: DaytimeNotificationService;
// export let notificationService: NotificationService;

// async function bootstrap() {
//   // Подключаемся к базе данных
//   await connectToDatabase();

//   // Инициализируем бота
//   bot = new Bot<MyContext>(process.env.BOT_TOKEN!);

//   // Мидлвары
//   bot.use(userMiddleware);

//   // Команды
//   bot.use(devCommands)
//   bot.use(start);
//   bot.use(mainMenu);
//   bot.use(settings);
//   bot.use(addEntry);
//   bot.use(getStats);
//   bot.use(listEntries);
  
//   morningService = new MorningSurveyService(bot);
//   morningService.setupHandlers();
  
//   notificationService = new NotificationService(bot);
//   notificationService.start();

//   // Обработка ошибок
//   bot.catch((error) => {
//     console.error('Bot error:', error);
//   });

//   // Запуск бота
//   await bot.start();
//   console.log('Bot started successfully!');
// }

// bootstrap().catch(console.error);


// вот тут попытка сделать так, чтобы уведомления отправлялись и по кнопке и по времени - пока не работает.
// import { Bot, session } from "grammy"
// import { conversations, createConversation } from "@grammyjs/conversations"
// import cron from "node-cron"

// import { connectToDatabase } from "./models/database"
// import { morningConversation } from "./services/morningConversation"
// import { daytimeConversation  } from "./services/daytimeService"
// import { eveningConversation  } from "./services/eveningConversation"
// import { userMiddleware } from "./bot/middlewares/userMiddleware"
// import type { MyContext } from "./bot/middlewares/userMiddleware"
// import { getAllUserIds } from "./services/userService"
// import { initCron } from "./services/cronService"
// // import { router } from "./services/router"

// import start from './bot/commands/start';
// import mainMenu from './bot/commands/mainMenu';
// import addEntry from './bot/commands/addEntry';
// import getStats from './bot/commands/getStats';
// import listEntries from './bot/commands/listEntries';
// import settings from './bot/commands/settings';
// import { launchConversation } from "./services/conversationLauncher"

// export const bot = new Bot<MyContext>(process.env.BOT_TOKEN!)

// async function main() {
//   console.log("⏳ Connecting to database...")
//   await connectToDatabase()
//   console.log("✅ Database is ready")

//   bot.use(session({ initial: () => ({}) }))
//   bot.use(userMiddleware)

//   bot.use(conversations())
//   bot.use(createConversation(daytimeConversation))
//   bot.use(createConversation<MyContext, MyContext>(morningConversation))
//   bot.use(createConversation< MyContext, MyContext >(eveningConversation))
  
//   bot.use(start);
//   bot.use(mainMenu);
//   bot.use(settings);
//   bot.use(addEntry);
//   bot.use(getStats);
//   bot.use(listEntries);

//   bot.hears("🌅 Утро", async (ctx) => {
//     await ctx.conversation.enter("morningConversation")
//   })
//   bot.hears("☀️ День", async (ctx) => {
//     await ctx.conversation.enter("daytimeConversation")
//   })
//   bot.hears("🌆 Вечер", async (ctx) => {
//     await ctx.conversation.enter("daytimeConversation")
//   })

//   // скрытая команда для cron-триггера
//   bot.command("__internal_morning", (ctx) =>
//     ctx.conversation.enter("morningConversation")
//   )
//   bot.command("__internal_daytime", (ctx) =>
//     ctx.conversation.enter("daytimeConversation")
//   )
//   bot.command("__internal_evening", async (ctx) => {
//     await ctx.conversation.enter("eveningConversation")
//   })

//   bot.command("__cron_morning_test", async (ctx) => {
//     console.log("⚡ CRON COMMAND RECEIVED:", ctx.from?.id)
//     await ctx.conversation.enter("morningConversation")
//   })

//   // bot.use(router.build())

//   await bot.init()

//   initCron(bot)

//   console.log("🤖 Starting bot...")
//   bot.start()
// }

// main().catch((err) => {
//   console.error("FATAL ERROR:", err)
//   process.exit(1)
// })

// index.ts
import { Bot, session } from "grammy"
import { conversations, createConversation } from "@grammyjs/conversations"

import start from './bot/commands/start';
import mainMenu from './bot/commands/mainMenu';
import addEntry from './bot/commands/addEntry';
import getStats from './bot/commands/getStats';
import listEntries from './bot/commands/listEntries';
import settings from './bot/commands/settings';

import { connectToDatabase } from "./models/database"
import { morningConversation } from "./services/morningConversation"
import { daytimeConversation } from "./services/daytimeConversation"
import { eveningConversation  } from "./services/eveningConversation"
import { userMiddleware } from "./bot/middlewares/userMiddleware"
import { testConversation } from "./services/testConversation"
import type { MyContext } from "./bot/middlewares/userMiddleware"
import { initCron } from "./services/cronService"
import launchConversation from './bot/commands/launchConversation'

async function main() {
  await connectToDatabase()

  const bot = new Bot<MyContext>(process.env.BOT_TOKEN!)

  bot.use(session({ initial: () => ({}) }))
  bot.use(userMiddleware)

  bot.use(conversations())
  bot.use(createConversation(morningConversation, "morningConversation"))
  bot.use(createConversation(daytimeConversation, "daytimeConversation"))
  bot.use(createConversation(eveningConversation, "eveningConversation"))
  bot.use(createConversation(testConversation, "testConversation"))

  bot.use(launchConversation)

  bot.use(start);
  bot.use(mainMenu);
  bot.use(settings);
  bot.use(addEntry);
  bot.use(getStats);
  bot.use(listEntries);

  // cron
  initCron(bot)

  bot.catch((err) => console.error("Bot error:", err.error))
  bot.start()
}

main().catch(console.error)
