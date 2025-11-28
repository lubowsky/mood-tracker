// index.ts
import { Bot, session } from "grammy"
import { conversations, createConversation } from "@grammyjs/conversations"

import { config } from "dotenv"
import path from "path"

const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.dev";

config({ path: path.resolve(process.cwd(), envFile) });

console.log(`⚙️ Loaded env file: ${envFile}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);

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
import { changeNameConversation } from "./conversations/changeHomeNameConversation";
import { deleteAccountConversation } from "./conversations/deleteAccountConversation"

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
  bot.use(createConversation<MyContext, MyContext>(changeNameConversation))
  bot.use(
    createConversation<MyContext, MyContext>(deleteAccountConversation, "deleteAccountConversation")
  );

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
