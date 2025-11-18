import { Bot, InlineKeyboard } from 'grammy';
import { ObjectId } from 'mongodb';
import { getCollection } from '../models/database';
import { User, UserCollection } from '../models/User';
import { MoodEntry, MoodEntryCollection, SleepData } from '../models/MoodEntry';
import { getTimeOfDay } from '../utils/timeUtils';

export class MorningSurveyService {
  private bot: Bot;
  private surveySessions = new Map<number, MorningSurveySession>();
  private handlersSetup = false;

  constructor(bot: Bot) {
    this.bot = bot;
    this.setupHandlers();
  }

  // Отправка утреннего приветствия
  async sendMorningGreeting(user: User) {
    const greetingText = `🌅 Доброе утро, ${user.firstName}! 

Как спалось? Что снилось? 
Расскажи о своем сне и качестве сна.`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '💤 Оценить сон', callback_data: 'start_sleep_survey' }],
        [{ text: '⏰ Пропустить', callback_data: 'skip_morning_survey' }]
      ]
    };

    try {
      await this.bot.api.sendMessage(user.telegramId, greetingText, {
        reply_markup: keyboard
      });
    } catch (error: any) {
      if (error.error_code === 403) {
        console.log(`User ${user.telegramId} blocked the bot`);
      }
    }
  }

  // Обработка callback-запросов
setupHandlers() {
    if (this.handlersSetup) {
      console.log('🟢 Handlers already setup, skipping...');
      return;
    }
    
    console.log('🟢 [MorningSurveyService] Setting up handlers...');
    this.handlersSetup = true;

    this.bot.on('callback_query:data', async (ctx) => {
        const data = ctx.callbackQuery.data;
        const userId = ctx.from.id;
        
        console.log(`🔵 [UNIVERSAL HANDLER] User ${userId} pressed: "${data}"`);

        try {
            await ctx.answerCallbackQuery(); // Всегда отвечаем на callback

            switch (data) {
                case 'button_1':
                    console.log('🎉 1 BUTTON WORKED!');
                    await ctx.editMessageText('✅ Качество сна оценено: 1/10');
                    await this.handleSleepQuality(ctx, 1);
                    break;
                case 'button_2':
                    console.log('🎉 2 BUTTON WORKED!');
                    await ctx.editMessageText('✅ Качество сна оценено: 2/10');
                    await this.handleSleepQuality(ctx, 2);
                    break;
          
                case 'button_3':
                    console.log('🎉 3 BUTTON WORKED!');
                    await ctx.editMessageText('✅ Качество сна оценено: 3/10');
                    await this.handleSleepQuality(ctx, 3);
                    break;
          
                case 'button_4':
                    console.log('🎉 4 BUTTON WORKED!');
                    await ctx.editMessageText('✅ Качество сна оценено: 4/10');
                    await this.handleSleepQuality(ctx, 4);
                    break;
          
                case 'button_5':
                    console.log('🎉 5 BUTTON WORKED!');
                    await ctx.editMessageText('✅ Качество сна оценено: 5/10');
                    await this.handleSleepQuality(ctx, 5);
                    break;
          
                case 'button_6':
                    console.log('🎉 6 BUTTON WORKED!');
                    await ctx.editMessageText('✅ Качество сна оценено: 6/10');
                    await this.handleSleepQuality(ctx, 6);
                    break;
          
                case 'button_7':
                    console.log('🎉 7 BUTTON WORKED!');
                    await ctx.editMessageText('✅ Качество сна оценено: 7/10');
                    await this.handleSleepQuality(ctx, 7);
                    break;
          
                case 'button_8':
                    console.log('🎉 8 BUTTON WORKED!');
                    await ctx.editMessageText('✅ Качество сна оценено: 8/10');
                    await this.handleSleepQuality(ctx, 8);
                    break;
          
                case 'button_9':
                    console.log('🎉 9 BUTTON WORKED!');
                    await ctx.editMessageText('✅ Качество сна оценено: 9/10');
                    await this.handleSleepQuality(ctx, 9);
                    break;
          
                case 'button_10':
                    await ctx.editMessageText('✅ Качество сна оценено: 10/10');
                    await this.handleSleepQuality(ctx, 10);
                    break;
          
                    
                case 'start_sleep_survey':
                    console.log('🟢 start_sleep_survey handler called');
                    await this.startSleepSurvey(ctx);
                    break;
                    
                case 'skip_morning_survey':
                    console.log('🟢 skip_morning_survey handler called');
                    await ctx.editMessageText('Хорошего дня! 🌞\nЕсли захочешь записать свое состояние позже - используй кнопку "📝 Добавить запись"');
                    break;

                case 'describe_dream_yes':
                  console.log('🟢 describe_dream_yes handler called');
                  await ctx.answerCallbackQuery();
                  await this.askForDreamDescription(ctx);
                  break

                case'describe_dream_no':
                  console.log('🟢 describe_dream_no handler called');
                  await ctx.answerCallbackQuery();
                  await this.askForAdditionalSurvey(ctx);
                  break

      if (data === 'start_sleep_survey') {
        await this.startSleepSurvey(ctx);
        return;
      }

      if (data === 'skip_morning_survey') {
        await this.finishMorningSurvey(ctx);
        return;
      }

      // --- 3) Описание сна ---
      if (data === 'describe_dream_yes') {
        console.log('🟢 describe_dream_yes handler');
        await this.askForDreamDescription(ctx);
        return;
      }

      if (data === 'describe_dream_no') {
        console.log('🟢 describe_dream_no handler');
        await this.askForAdditionalSurvey(ctx);
        return;
      }

      // --- 4) Дополнительный опрос ---
      if (data === 'additional_survey_yes') {
        console.log('🟢 additional_survey_yes handler');
        await this.startAdditionalSurvey(ctx);
        return;
      }

      if (data === 'additional_survey_no') {
        console.log('🟢 additional_survey_no handler');
        await this.finishMorningSurvey(ctx);
        return;
      }
  
                    
                default:
                    // Обработка button_ кнопок - никогда не работает!!!
                    if (data.startsWith('button_')) {
                      console.log(`работает общий обработчик кнопок!!!!!!!!!!!!!!!!!!`);
                        const quality = parseInt(data.replace('button_', ''));
                        if (!isNaN(quality) && quality >= 1 && quality <= 10) {
                            console.log(`🎉 SLEEP QUALITY: ${quality} BUTTON WORKED!!!!!!!!!!!!!!!!!!`);
                            await ctx.editMessageText(`✅ Кнопка сна сработала! Качество: ${quality}`);
                            await this.handleSleepQuality(ctx, quality);
                        }
                    }
                    break;
            }
        } catch (error) {
            console.error('❌ Error in callback handler:', error);
        }
    });

    this.bot.on('message:text', async (ctx) => {
      const userId = ctx.from.id;
      const session = this.surveySessions.get(userId);

      console.log(`🟢 [TEXT] Received from ${userId}, step:`, session?.step);

      if (session?.step === 'awaiting_dream_description') {
        console.log('🟢 Handling dream description...');
        await this.handleDreamDescription(userId, ctx.message.text);
      }
    });

    // Основные обработчики
    // this.bot.callbackQuery('start_sleep_survey', async (ctx) => {
    //   console.log('🟢 start_sleep_survey handler called');
    //   await ctx.answerCallbackQuery();
    //   await this.startSleepSurvey(ctx);
    // });

    // this.bot.callbackQuery('skip_morning_survey', async (ctx) => {
    //   console.log('🟢 skip_morning_survey handler called');
    //   await ctx.answerCallbackQuery();
    //   await ctx.editMessageText('Хорошего дня! 🌞\nЕсли захочешь записать свое состояние позже - используй кнопку "📝 Добавить запись"');
    // });

    // // Обработчики для дополнительного опроса
    // this.bot.callbackQuery('additional_survey_yes', async (ctx) => {
    //   console.log('🟢 additional_survey_yes handler called');
    //   await ctx.answerCallbackQuery();
    //   await this.startAdditionalSurvey(ctx);
    // });

    // this.bot.callbackQuery('additional_survey_no', async (ctx) => {
    //   console.log('🟢 additional_survey_no handler called');
    //   await ctx.answerCallbackQuery();
    //   await this.finishMorningSurvey(ctx);
    // });

    // // Обработчик текстовых сообщений для описания сна
    // this.bot.on('message:text', async (ctx) => {
    //   console.log('🟢 Обработка текстового сообщения с описанием сна');
    //   const userId = ctx.from.id;
    //   const session = this.surveySessions.get(userId);
    //   console.log('🟢 session', session);
      
    //   if (session?.step === 'awaiting_dream_description') {
    //     console.log('🟢 вот тут вызовем handleDreamDescription');
    //     await this.handleDreamDescription(userId, ctx.message.text);
    //   }
    // });

    console.log('🟢 [MorningSurveyService] Handlers setup completed');
}

private async startSleepSurvey(ctx: any) {
    const userId = ctx.from.id;
    console.log('🟢 startSleepSurvey called for user:', userId);
    
    this.surveySessions.set(userId, {
        step: 'sleep_quality',
        data: {}
    });

    const keyboard = {
        inline_keyboard: [
            [
                { text: '1', callback_data: 'button_1' },
                { text: '2', callback_data: 'button_2' },
                { text: '3', callback_data: 'button_3' },
                { text: '4', callback_data: 'button_4' },
                { text: '5', callback_data: 'button_5' },
            ],
            [
                { text: '6', callback_data: 'button_6' },
                { text: '7', callback_data: 'button_7' },
                { text: '8', callback_data: 'button_8' },
                { text: '9', callback_data: 'button_9' },
                { text: '10', callback_data: 'button_10' },
            ]
        ]
    };
    
    const messageText = `💤 *Оцени качество сна от 1 до 10:*\n\n` +
        `1 - Очень плохо, не выспался\n` +
        `5 - Нормально\n` +
        `10 - Отлично, бодрое утро`;

    console.log('🔵 [MESSAGE] Editing message with text length:', messageText.length);

    try {
        const result = await ctx.editMessageText(messageText, { 
            parse_mode: 'Markdown', 
            reply_markup: keyboard 
        });
        console.log('🟢 Message edited successfully, result:', result ? 'success' : 'no result');
        
    } catch (error: any) {
        console.error('❌ Error editing message:', error);
        console.error('❌ Error details:', error.description || error.message);
        
        // Fallback: отправляем новое сообщение
        console.log('🟢 Trying to send new message as fallback...');
        try {
            await ctx.reply(messageText, { 
                parse_mode: 'Markdown', 
                reply_markup: keyboard 
            });
            console.log('🟢 New message sent successfully as fallback');
        } catch (fallbackError: any) {
            console.error('❌ Fallback also failed:', fallbackError);
        }
    }
}

  private async handleSleepQuality(ctx: any, quality: number) {
    const userId = ctx.from.id;
    console.log('🟢 handleSleepQuality called for user:', userId, 'quality:', quality);
    
    const session = this.surveySessions.get(userId);
    
    if (session) {
      session.data.sleepQuality = quality;
      session.step = 'dream_description';
      this.surveySessions.set(userId, session);
    }

    const keyboard = {
      inline_keyboard: [
        [{ text: '✅ Да, записать сон', callback_data: 'describe_dream_yes' }],
        [{ text: '❌ Нет, пропустить', callback_data: 'describe_dream_no' }]
      ]
    };

    await ctx.editMessageText(
      `✅ Качество сна оценено: ${quality}/10\n\n` +
      `Хочешь записать, что тебе снилось?`,
      { reply_markup: keyboard }
    );
  }

  private async askForDreamDescription(ctx: any) {
    const userId = ctx.from.id;
    const session = this.surveySessions.get(userId);

    console.log('🟢 askForDreamDescription - запустился процесс описания сна');
    
    if (session) {
      session.step = 'awaiting_dream_description';
      this.surveySessions.set(userId, session);
    }

    await ctx.editMessageText(
      `💭 *Опиши свой сон:*\n\n` +
      `Расскажи что тебе снилось, какие были эмоции во сне, запомнившиеся детали...\n\n` +
      `*Просто напиши сообщение в чат - я его сохраню* ✨`,
      { parse_mode: 'Markdown' }
    );
  }

  private async askForAdditionalSurvey(ctx: any) {
    const userId = ctx.from.id;
    const session = this.surveySessions.get(userId);
    
    // Сохраняем данные сна (без описания)
    if (session?.data.sleepQuality) {
      await this.saveSleepData(userId, {
        quality: session.data.sleepQuality
      });
    }

    const keyboard = {
      inline_keyboard: [
        [{ text: '✅ Да, записать состояние', callback_data: 'additional_survey_yes' }],
        [{ text: '❌ Нет, завершить', callback_data: 'additional_survey_no' }]
      ]
    };

    await ctx.editMessageText(
      `📝 *Хочешь записать свое текущее состояние?*\n\n` +
      `Эмоции, физическое самочувствие, мысли...`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  }

  private async startAdditionalSurvey(ctx: any) {
    await ctx.editMessageText(
      `Отлично! Используй кнопку "📝 Добавить запись" в главном меню чтобы подробно описать свое состояние.`
    );

    // Показываем главное меню
    try {
      const { mainMenu } = await import('../bot/keyboards');
      await ctx.reply('Главное меню:', { reply_markup: mainMenu });
    } catch (error) {
      console.log('⚠️ Could not load main menu, sending simple message');
      await ctx.reply('Вы можете использовать команды бота через меню.');
    }

    // Очищаем сессию
    this.surveySessions.delete(ctx.from.id);
  }

  private async finishMorningSurvey(ctx: any) {
    await ctx.editMessageText(
      `🌞 Спасибо! Хорошего дня!\n\n` +
      `Если захочешь записать свое состояние позже - используй кнопку "📝 Добавить запись"`
    );

    // Очищаем сессию
    this.surveySessions.delete(ctx.from.id);
  }

  // Обработка текстового описания сна
  async handleDreamDescription(userId: number, dreamText: string) {
    console.log('🟢 handleDreamDescription called for user:', userId);
    
    const session = this.surveySessions.get(userId);
    
    if (session?.step === 'awaiting_dream_description' && session.data.sleepQuality) {
      // Сохраняем данные сна с описанием
      await this.saveSleepData(userId, {
        quality: session.data.sleepQuality,
        dreamDescription: dreamText
      });

      // Обновляем сессию
      session.step = 'additional_survey';
      this.surveySessions.set(userId, session);

      const keyboard = {
        inline_keyboard: [
          [{ text: '✅ Да, записать состояние', callback_data: 'additional_survey_yes' }],
          [{ text: '❌ Нет, завершить', callback_data: 'additional_survey_no' }]
        ]
      };

      await this.bot.api.sendMessage(userId,
        `✅ Сон записан!\n\n` +
        `📝 *Хочешь записать свое текущее состояние?*\n\n` +
        `Эмоции, физическое самочувствие, мысли...`,
        { parse_mode: 'Markdown', reply_markup: keyboard }
      );
    }
  }

  private async saveSleepData(userId: number, sleepData: any) {
    try {
      const usersCollection = getCollection(UserCollection);
      const user = await usersCollection.findOne({ telegramId: userId }) as User;

      if (user) {
        const entriesCollection = getCollection(MoodEntryCollection);
        
        const entry: MoodEntry = {
          userId: user._id!,
          timestamp: new Date(),
          timeOfDay: 'morning',
          sleepData: {
            quality: sleepData.quality,
            dreamDescription: sleepData.dreamDescription
          },
          physicalSymptoms: [],
          emotions: [],
          thoughts: sleepData.dreamDescription || '',
          overallPhysical: 0,
          overallMental: 0,
          source: 'morning_survey' // Добавлено обязательное поле
        };

        await entriesCollection.insertOne(entry);
        console.log(`✅ Sleep data saved for user ${userId}, quality: ${sleepData.quality}`);
      }
    } catch (error) {
      console.error('❌ Error saving sleep data:', error);
    }
  }

  // Проверка, находится ли пользователь в процессе опроса
  isUserInSurvey(userId: number): boolean {
    return this.surveySessions.has(userId);
  }
}

interface MorningSurveySession {
  step: 'sleep_quality' | 'dream_description' | 'awaiting_dream_description' | 'additional_survey';
  data: {
    sleepQuality?: number;
    dreamDescription?: string;
  };
}
