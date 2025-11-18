import { Bot } from 'grammy';
import { ObjectId } from 'mongodb';
import { getCollection } from '../models/database';
import { User, UserCollection } from '../models/User';
import moment from 'moment-timezone';

interface QuickResponses {
  positive: string[];
  neutral: string[];
  negative: string[];
}

export class DaytimeNotificationService {
  private bot: Bot;

  private retryCount = 0;
  private maxRetries = 3;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  private async ensureDatabaseConnection(): Promise<boolean> {
    try {
      getCollection(UserCollection);
      return true;
    } catch (error) {
      this.retryCount++;
      console.log(`🔄 Daytime: Database not connected (attempt ${this.retryCount}/${this.maxRetries})`);
      
      if (this.retryCount > this.maxRetries) {
        return false;
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        getCollection(UserCollection);
        this.retryCount = 0;
        return true;
      } catch {
        return false;
      }
    }
  }

  // Проверка и отправка дневных уведомлений
  async checkAndSendDaytimeNotifications() {
    if (!await this.ensureDatabaseConnection()) {
      console.log('⏸️ Skipping daytime notifications - no database connection');
      return;
    }

    try {
      const usersCollection = await getCollection(UserCollection);
      const users = await usersCollection.find({ 
        'settings.notificationsEnabled': true,
        'settings.daytimeNotifications': true
      }).toArray() as User[];

      const now = new Date();

      for (const user of users) {
        await this.checkUserDaytimeNotification(user, now);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error in daytime notification service:', errorMessage);
      this.retryCount = 0;
    }
  }

  private async checkUserDaytimeNotification(user: User, now: Date) {
    try {
      const userTime = moment(now).tz(user.settings.timezone);
      const userHour = userTime.hours();
      const userMinute = userTime.minutes();

      // Проверяем только в дневные часы (после утреннего уведомления до вечернего)
      const morningHour = parseInt(user.settings.morningNotification.split(':')[0]);
      const eveningHour = parseInt(user.settings.eveningNotification.split(':')[0]);
      
      // Проверяем что сейчас между утренним и вечерним временем
      if (userHour >= morningHour && userHour < eveningHour && userMinute === 0) {
        const shouldSend = await this.shouldSendDaytimeNotification(user, userTime);
        
        if (shouldSend) {
          console.log(`Sending daytime notification to user ${user.telegramId} at ${userTime.format('HH:mm')}`);
          await this.sendDaytimeNotification(user);
          await this.updateLastDaytimeNotification(user._id!, userTime.toDate());
        }
      }
    } catch (error) {
      console.error(`Error checking daytime notification for user ${user.telegramId}:`, error);
    }
  }

  private async shouldSendDaytimeNotification(user: User, userTime: moment.Moment): Promise<boolean> {
    // Если никогда не отправляли дневное уведомление - проверяем время от утреннего
    if (!user.settings.lastDaytimeNotification) {
      const morningTime = moment(userTime).tz(user.settings.timezone);
      const morningHour = parseInt(user.settings.morningNotification.split(':')[0]);
      morningTime.hours(morningHour).minutes(0).seconds(0);
      
      const hoursSinceMorning = userTime.diff(morningTime, 'hours');
      console.log(`First daytime check: ${hoursSinceMorning} hours since morning notification`);
      
      // Первое дневное уведомление через 3 часа после утреннего
      return hoursSinceMorning >= 3;
    }

    const lastNotification = moment(user.settings.lastDaytimeNotification).tz(user.settings.timezone);
    const hoursSinceLastNotification = userTime.diff(lastNotification, 'hours');

    console.log(`Daytime check: ${hoursSinceLastNotification} hours since last daytime notification`);

    // Отправляем каждые 3 часа
    return hoursSinceLastNotification >= 3;
  }

  public async sendDaytimeNotification(user: User) {
    // Бережные и поддерживающие фразы
    const gentlePhrases = [
      "💫 Привет! Как твое состояние в этот момент?",
      "🌿 Хорошего дня! Что чувствуешь прямо сейчас?",
      "🌸 Добрый день! Как твое настроение?",
      "☀️ Привет! Как твое самочувствие в эту минуту?",
      "🌼 Здравствуй! Что происходит с тобой сейчас?",
      "💖 Привет! Как твое эмоциональное состояние?",
      "🌱 Добрый день! Что ты ощущаешь в себе сейчас?"
    ];

    const randomPhrase = gentlePhrases[Math.floor(Math.random() * gentlePhrases.length)];

    const message = `${randomPhrase}\n\n*Можешь коротко описать:*\n• Эмоцию или чувство\n• Физическое ощущение\n• Или просто сказать "всё хорошо" 💛`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '😊 Всё хорошо', callback_data: 'daytime_ok' },
          { text: '😐 Нормально', callback_data: 'daytime_normal' },
          { text: '😔 Сложно', callback_data: 'daytime_hard' }
        ],
        [
          { text: '📝 Подробнее', callback_data: 'daytime_detailed' },
          { text: '🔕 Не спрашивать сегодня', callback_data: 'daytime_pause_today' }
        ]
      ]
    };

    try {
      await this.bot.api.sendMessage(user.telegramId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      console.log(`Daytime notification sent to user ${user.telegramId}`);
    } catch (error: any) {
      if (error.error_code === 403) {
        console.log(`User ${user.telegramId} blocked the bot, disabling notifications`);
        await this.disableUserNotifications(user._id!);
      } else {
        console.error(`Error sending daytime notification to user ${user.telegramId}:`, error);
      }
    }
  }

  private async updateLastDaytimeNotification(userId: ObjectId, timestamp: Date) {
    const usersCollection = await getCollection(UserCollection);
    await usersCollection.updateOne(
      { _id: userId },
      { $set: { 'settings.lastDaytimeNotification': timestamp } }
    );
    console.log(`Updated lastDaytimeNotification for user ${userId}`);
  }

  private async disableUserNotifications(userId: ObjectId) {
    const usersCollection = await getCollection(UserCollection);
    await usersCollection.updateOne(
      { _id: userId },
      { $set: { 'settings.daytimeNotifications': false } }
    );
  }

  // Настройка обработчиков для дневных уведомлений
  setupHandlers() {
    // Обработчики быстрых ответов
    this.bot.callbackQuery('daytime_ok', async (ctx) => {
      await ctx.answerCallbackQuery();
      await this.handleQuickResponse(ctx, 'positive');
    });

    this.bot.callbackQuery('daytime_normal', async (ctx) => {
      await ctx.answerCallbackQuery();
      await this.handleQuickResponse(ctx, 'neutral');
    });

    this.bot.callbackQuery('daytime_hard', async (ctx) => {
      await ctx.answerCallbackQuery();
      await this.handleQuickResponse(ctx, 'negative');
    });

    this.bot.callbackQuery('daytime_detailed', async (ctx) => {
      await ctx.answerCallbackQuery();
      await this.askForDetailedDescription(ctx);
    });

    this.bot.callbackQuery('daytime_pause_today', async (ctx) => {
      await ctx.answerCallbackQuery();
      await this.pauseDaytimeNotifications(ctx);
    });
  }

  private async handleQuickResponse(ctx: any, moodType: 'positive' | 'neutral' | 'negative') {
    const responses: QuickResponses = {
      positive: [
        "Рад слышать! 🌞",
        "Отлично! Пусть так продолжается 💫",
        "Прекрасно! 💛",
        "Здорово! 🌈"
      ],
      neutral: [
        "Понятно, спасибо что поделился 🌿",
        "Спасибо за ответ 🌼",
        "Принято! 💫",
        "Ясно, спасибо 🌱"
      ],
      negative: [
        "Спасибо что поделился. Береги себя 💖",
        "Понимаю. Будь к себе бережнее 🌷",
        "Спасибо за честность. Заботься о себе 🌿",
        "Принято. Помни, что это временно 💫"
      ]
    };

    const randomResponse = responses[moodType][Math.floor(Math.random() * responses[moodType].length)];
    
    await ctx.editMessageText(randomResponse);

    // Сохраняем быстрый ответ в базу
    await this.saveQuickResponse(ctx.from.id, moodType);
  }

  private async askForDetailedDescription(ctx: any) {
    await ctx.editMessageText(
      `💭 *Расскажи подробнее о своем состоянии:*\n\n` +
      `Можешь описать:\n` +
      `• Что чувствуешь эмоционально\n` +
      `• Физические ощущения\n` +
      `• Мысли которые приходят\n` +
      `• Или просто поделиться чем-то важным\n\n` +
      `*Пиши в свободной форме* - я выслушаю 🌸`,
      { parse_mode: 'Markdown' }
    );
  }

  private async pauseDaytimeNotifications(ctx: any) {
    const usersCollection = await getCollection(UserCollection);
    const user = await usersCollection.findOne({ telegramId: ctx.from.id }) as User;
    
    if (user) {
      // Пауза до завтра
      const tomorrow = moment().tz(user.settings.timezone).add(1, 'day').startOf('day').toDate();
      
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { 'settings.lastDaytimeNotification': tomorrow } }
      );
    }

    await ctx.editMessageText(
      `Хорошо, я не буду беспокоить тебя до завтра 🌙\n\n` +
      `Если захочешь записать что-то - используй кнопку "📝 Добавить запись"`
    );
  }

  private async saveQuickResponse(userId: number, moodType: 'positive' | 'neutral' | 'negative') {
    const usersCollection = await getCollection(UserCollection);
    const user = await usersCollection.findOne({ telegramId: userId }) as User;

    if (user) {
        const { EntryService } = await import('./entryService');
        
        // Получаем sequenceNumber из текущего уведомления (нужно будет передавать)
        // Пока используем 1 как заглушку
        await EntryService.createDaytimeEntry(
        user._id!,
        `Быстрый ответ: ${moodType}`,
        1, // sequenceNumber будет передаваться из контекста
        { moodType }
        );
        
        console.log(`Quick response saved for user ${userId}: ${moodType}`);
    }
  }

// Обработка подробного описания от пользователя
    async handleDetailedDescription(userId: number, description: string, sequenceNumber: number = 1) {
        const usersCollection = await getCollection(UserCollection);
        const user = await usersCollection.findOne({ telegramId: userId }) as User;

        if (user) {
            const { EntryService } = await import('./entryService');
            
            await EntryService.createDaytimeEntry(
            user._id!,
            description,
            sequenceNumber
            );

            await this.bot.api.sendMessage(userId,
            `💫 Спасибо что поделился! Это ценно 🌸\n\n` +
            `Твои мысли сохранены.`
            );
            
            console.log(`Detailed response saved for user ${userId}, sequence: ${sequenceNumber}`);
        }
    }
}