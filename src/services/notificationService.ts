import { Bot } from 'grammy';
import { ObjectId } from 'mongodb';
import { getCollection } from '../models/database';
import { User, UserCollection } from '../models/User';
import moment from 'moment-timezone';
import { MorningSurveyService } from './morningSurveyService';
import { DaytimeNotificationService } from './daytimeNotificationService';

export class NotificationService {
  private bot: Bot;
  private isRunning: boolean = false;
  // private morningSurveyService: MorningSurveyService;
  private daytimeNotificationService: DaytimeNotificationService;
  private retryCount = 0;
  private maxRetries = 3;

  constructor(bot: Bot) {
    this.bot = bot;
    // this.morningSurveyService = new MorningSurveyService(bot);
    this.daytimeNotificationService = new DaytimeNotificationService(bot);
    // console.log("🟣 NotificationService BOT instance:", bot);
    
    // Настраиваем все обработчики
    // this.morningSurveyService.setupHandlers();
    this.daytimeNotificationService.setupHandlers();
    this.setupEveningHandlers();
    this.setupEveningQuickHandlers();
  }

  // НОВЫЙ МЕТОД ДЛЯ ПРОВЕРКИ ПОДКЛЮЧЕНИЯ К БАЗЕ
  private async ensureDatabaseConnection(): Promise<boolean> {
    try {
      await getCollection(UserCollection);
      return true;
    } catch (error) {
      this.retryCount++;
      console.log(`🔄 Database not connected (attempt ${this.retryCount}/${this.maxRetries}), waiting...`);
      
      if (this.retryCount > this.maxRetries) {
        console.error('❌ Max retries reached for database connection');
        return false;
      }

      // Ждем 5 секунд перед повторной попыткой
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Пытаемся снова
      try {
        await getCollection(UserCollection);
        this.retryCount = 0; // Сбрасываем счетчик при успехе
        return true;
      } catch {
        return false;
      }
    }
  }

  // Обработчики для вечерних уведомлений
  private setupEveningHandlers() {
    // Подробное описание вечера
    this.bot.callbackQuery('evening_detailed', async (ctx) => {
      await ctx.answerCallbackQuery();
      await this.handleEveningDetailed(ctx);
    });

    // Быстрая оценка дня
    this.bot.callbackQuery('evening_quick', async (ctx) => {
      await ctx.answerCallbackQuery();
      await this.handleEveningQuick(ctx);
    });

    // Пропуск
    this.bot.callbackQuery('evening_skip', async (ctx) => {
      await ctx.answerCallbackQuery();
      await this.handleEveningSkip(ctx);
    });
  }

  // Обработчики быстрых оценок вечера
  private setupEveningQuickHandlers() {
    const quickResponses = {
      evening_quick_excellent: { text: 'Отличный день! 🌟', type: 'excellent' },
      evening_quick_normal: { text: 'Обычный день. 📅', type: 'normal' },
      evening_quick_hard: { text: 'Сложный день. 💪', type: 'hard' },
      evening_quick_tired: { text: 'Усталый день. 😴', type: 'tired' }
    };

    Object.entries(quickResponses).forEach(([callbackData, response]) => {
      this.bot.callbackQuery(callbackData, async (ctx) => {
        await ctx.answerCallbackQuery();
        await this.saveEveningQuickResponse(ctx, response.type, response.text);
      });
    });
  }

  private async handleEveningDetailed(ctx: any) {
    await ctx.editMessageText(
      `🌙 *Расскажи о своем дне:*\n\n` +
      `Можешь поделиться:\n` +
      `• Самыми яркими моментами дня\n` +
      `• Сложностями которые встретились\n` +
      `• Эмоциональным состоянием\n` +
      `• Планами на завтра\n\n` +
      `*Пиши в свободной форме* - я выслушаю 🌙`,
      { parse_mode: 'Markdown' }
    );
  }

  private async handleEveningQuick(ctx: any) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '😊 Отличный день', callback_data: 'evening_quick_excellent' },
          { text: '😐 Обычный день', callback_data: 'evening_quick_normal' }
        ],
        [
          { text: '😔 Сложный день', callback_data: 'evening_quick_hard' },
          { text: '😴 Усталый день', callback_data: 'evening_quick_tired' }
        ]
      ]
    };

    await ctx.editMessageText(
      `⭐️ *Как бы ты оценил свой день?*\n\n` +
      `Выбери подходящий вариант:`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  }

  private async handleEveningSkip(ctx: any) {
    await ctx.editMessageText(
      `Хорошо, отдыхай! 🌙\n\n` +
      `Если перед сном захочется что-то записать - используй кнопку "📝 Добавить запись"`
    );
  }

  private async saveEveningQuickResponse(ctx: any, dayType: string, responseText: string) {
    const usersCollection = await getCollection(UserCollection);
    const user = await usersCollection.findOne({ telegramId: ctx.from.id }) as User;

    if (user) {
      const { EntryService } = await import('./entryService');
      
      const moodMap = {
        excellent: { emotions: ['удовлетворение', 'радость'], intensity: 8 },
        normal: { emotions: ['спокойствие', 'нейтрально'], intensity: 5 },
        hard: { emotions: ['тревога', 'напряжение'], intensity: 3 },
        tired: { emotions: ['усталость', 'истощение'], intensity: 4 }
      };

      const mood = moodMap[dayType as keyof typeof moodMap];

      await EntryService.createEveningEntry(
        user._id!,
        `Быстрая оценка дня: ${dayType}`,
        mood.emotions.map(name => ({ name, intensity: mood.intensity })),
        mood.intensity,
        mood.intensity
      );

      await ctx.editMessageText(
        `${responseText}\n\n` +
        `Спасибо что поделился оценкой дня! 💫`
      );
    }
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;

    // Настраиваем обработчики для утренних опросов
    // this.morningSurveyService.setupHandlers();

    // Настраиваем обработчики для дневных уведомлений
    this.daytimeNotificationService.setupHandlers();

     // Настраиваем обработчики для вечерних уведомлений
    this.setupEveningHandlers();
    this.setupEveningQuickHandlers();

      // ОПТИМИЗИРОВАНО: Проверяем уведомления только в 0-ю минуту каждого часа
    setInterval(() => {
      const now = new Date();
      const currentMinute = now.getMinutes();
      
      // Проверяем только в 0-ю минуту часа (каждый час)
      if (currentMinute === 0) {
        console.log(`Hourly check at ${now.getHours()}:00`);
        this.checkAndSendScheduledNotifications();
      }
    }, 60000); // Все равно проверяем каждую минуту, но выполняем только при currentMinute === 0

    // ОПТИМИЗИРОВАНО: Дневные уведомления проверяем реже - каждые 30 минут
    setInterval(() => {
      const now = new Date();
      const currentMinute = now.getMinutes();
      
      // Проверяем дневные уведомления каждые 30 минут (в :00 и :30)
      if (currentMinute === 0 || currentMinute === 30) {
        console.log(`Daytime check at ${now.getHours()}:${currentMinute}`);
        this.daytimeNotificationService.checkAndSendDaytimeNotifications();
      }
    }, 60000);
    
    console.log('Notification service started');
  }

  private async checkAndSendScheduledNotifications() {
      // Проверяем подключение к базе перед началом
    if (!await this.ensureDatabaseConnection()) {
      console.log('⏸️ Skipping notifications - no database connection');
      return;
    }

    try {
      const now = new Date();
      const currentHour = now.getHours();

      if ((currentHour >= 6 && currentHour <= 10) || (currentHour >= 20 && currentHour <= 24)) {
        const usersCollection = await getCollection(UserCollection);
        const users = await usersCollection.find({ 
          'settings.notificationsEnabled': true 
        }).toArray() as User[];

        console.log(`Checking notifications for ${users.length} users at ${currentHour}:00`);

        for (const user of users) {
          await this.checkUserScheduledNotification(user, currentHour, 0);
              // Ждем 1 секунду между пользователями
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error in notification service:', errorMessage);
      
      // Сбрасываем счетчик попыток при ошибке
      this.retryCount = 0;
    }
  }

  private async checkUserScheduledNotification(user: User, currentHour: number, currentMinute: number) {
    try {
      const userTime = moment().tz(user.settings.timezone);
      const userHour = userTime.hours();

      // УТРЕННИЕ уведомления - отправляем опрос сна
      if (userHour >= 6 && userHour <= 10) {
        const notificationTime = user.settings.morningNotification;
        const [targetHour] = notificationTime.split(':').map(Number);
        
        if (userHour === targetHour) {
          console.log(`Sending morning survey to user ${user.telegramId} at ${userTime.format('HH:mm')}`);
          // await this.morningSurveyService.sendMorningGreeting(user);
          
          // Сбрасываем lastDaytimeNotification при отправке утреннего уведомления
          await this.resetDaytimeNotifications(user._id!);
        }
      }

      // ВЕЧЕРНИЕ уведомления
      if (userHour >= 20 && userHour <= 24) {
        const notificationTime = user.settings.eveningNotification;
        const [targetHour] = notificationTime.split(':').map(Number);
        
        if (userHour === targetHour) {
          console.log(`Sending evening notification to user ${user.telegramId} at ${userTime.format('HH:mm')}`);
          await this.sendEveningNotification(user);
        }
      }
    } catch (error) {
      // ОБНОВЛЕННАЯ ОБРАБОТКА ОШИБОК
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error sending notification to user ${user.telegramId}:`, errorMessage);
    }
  }

  // Сбрасываем дневные уведомления при отправке утреннего
  private async resetDaytimeNotifications(userId: ObjectId) {
    const usersCollection = await getCollection(UserCollection);
    await usersCollection.updateOne(
      { _id: userId },
      { $set: { 'settings.lastDaytimeNotification': null } }
    );
    console.log(`Reset daytime notifications for user ${userId}`);
  }

  private async sendEveningNotification(user: User) {
    const text = `🌙 *Добрый вечер, ${user.firstName}!*

Как прошел твой день?
Хочешь подвести итоги дня и записать свои мысли?

*Это поможет:*
• Лучше понять свои состояния
• Отследить закономерности  
• Заметить прогресс`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📝 Записать вечерние мысли', callback_data: 'evening_detailed' },
          { text: '💤 Быстрая оценка дня', callback_data: 'evening_quick' }
        ],
        [
          { text: '🌙 Сегодня не хочу', callback_data: 'evening_skip' }
        ]
      ]
    };

    try {
      await this.bot.api.sendMessage(user.telegramId, text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error: any) {
      if (error.error_code === 403) {
        console.log(`User ${user.telegramId} blocked the bot, disabling notifications`)
        await this.disableUserNotifications(user._id!);
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error sending evening notification to user ${user.telegramId}:`, errorMessage);
      }
    }
  }

  private async disableUserNotifications(userId: ObjectId) {
    const usersCollection = await getCollection(UserCollection);
    await usersCollection.updateOne(
      { _id: userId },
      { $set: { 'settings.notificationsEnabled': false } }
    );
  }
}