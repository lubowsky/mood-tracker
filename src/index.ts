import { Bot, session } from 'grammy';
import { MyContext, userMiddleware } from './bot/middlewares/userMiddleware';
import { connectToDatabase } from './models/database';
import { NotificationService } from './services/notificationService';
import { MorningSurveyService } from './services/morningSurveyService';
import { DaytimeNotificationService } from './services/daytimeNotificationService';

// Команды
import start from './bot/commands/start';
import mainMenu from './bot/commands/mainMenu';
import addEntry from './bot/commands/addEntry';
import getStats from './bot/commands/getStats';
import listEntries from './bot/commands/listEntries';
import settings from './bot/commands/settings';
import devCommands from './bot/commands/devCommands';

export let bot: Bot<MyContext>;
export let morningService: MorningSurveyService;
export let daytimeService: DaytimeNotificationService;
export let notificationService: NotificationService;

async function bootstrap() {
  // Подключаемся к базе данных
  await connectToDatabase();

  // Инициализируем бота
  bot = new Bot<MyContext>(process.env.BOT_TOKEN!);

  // Мидлвары
  bot.use(userMiddleware);

  // Команды
  bot.use(devCommands)
  bot.use(start);
  bot.use(mainMenu);
  bot.use(settings);
  bot.use(addEntry);
  bot.use(getStats);
  bot.use(listEntries);
  
  morningService = new MorningSurveyService(bot);
  morningService.setupHandlers();
  
  notificationService = new NotificationService(bot);
  notificationService.start();

  // Обработка ошибок
  bot.catch((error) => {
    console.error('Bot error:', error);
  });

  // Запуск бота
  await bot.start();
  console.log('Bot started successfully!');
}

bootstrap().catch(console.error);