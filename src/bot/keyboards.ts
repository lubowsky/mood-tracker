// src\bot\keyboards.ts
import { Keyboard } from 'grammy';
import { InlineKeyboard } from "grammy";

export function getMainMenu(hasAccess: boolean) {
  const keyboard = new Keyboard();

  // ПРОВЕРКА ДОСТУПА: (Админ / Тестер / Оплачено / Триал < 24ч)
  if (hasAccess) {
    // Полное меню для тех, у кого есть доступ
    keyboard
      .text('📝 Добавить запись')
      .text('📋 Последние записи')
      .row()
      .text('📊 Подписка')
      .text('⏰ Настройки')
      .row()
      .text('ℹ️ Помощь')
      .text('📚 Справочник эмоций')
      .row()
      .text('💾 Экспорт записей');
  } else {
    // Ограниченное меню для тех, у кого доступ истек
    keyboard
      .text('📊 Подписка')
      .text('⏰ Настройки')
      .row()
      .text('ℹ️ Помощь')
      .text('📚 Справочник эмоций');
  }

  return keyboard.resized();
}

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

  export const deleteAccountKeyboard = new InlineKeyboard()
    .text("❗ Да, удалить", "delete_confirm")
    .row()
    .text("Отмена", "delete_cancel");
  