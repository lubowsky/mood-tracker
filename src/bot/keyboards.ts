import { Keyboard } from 'grammy';

export const mainMenu = new Keyboard()
  .text('📝 Добавить запись')
  .text('📋 Последние записи')
  .row()
  // .text('🌅 Утро')
  // .text('☀️ День')
  // .text('🌆 Вечер')
  // .row()
  .text('📊 Статистика')
  .text('⏰ Настройки')
  .row()
  .text('ℹ️ Помощь')
  .text('📚 Справочник эмоций')
  .row()
  .text('💾 Экспорт записей')
  .resized();

export const timeOfDayKeyboard = new Keyboard()
  .text('Утро 🌅')
  .text('День ☀️')
  .row()
  .text('Вечер 🌆')
  .text('Ночь 🌙')
  .resized();

export const intensityKeyboard = new Keyboard()
  .text('1').text('2').text('3').text('4').text('5')
  .row()
  .text('6').text('7').text('8').text('9').text('10')
  .resized();

export const cancelKeyboard = new Keyboard()
  .text('❌ Отмена')
  .resized();

export const analyticsKeyboard = new Keyboard()
  .text('📈 За 7 дней')
  .text('📊 За 30 дней')
  .row()
  .text('🔍 Корреляции')
  .text('↩️ Назад')
  .resized();
  