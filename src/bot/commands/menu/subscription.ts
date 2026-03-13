// src/bot/commands/menu/subscription.ts
import { Composer, InlineKeyboard } from "grammy"
import type { MyContext } from "../../middlewares/userMiddleware"

import { getCollection } from "../../../models/database"
import { UserSubscriptionCollection } from "../../../models/UserSubscription"
import { TariffKey, TARIFFS } from "../../../models/tariffs"
import { getMainMenu } from "../../keyboards"
import { calculateEndDate } from "../../../utils/subscriptionUtils"
import { PaymentCollection } from "../../../models/Payments"
import { calculateUserAccess } from "../../../utils/accessService"

const composer = new Composer<MyContext>()

/* -------------------------------------------------- */
/* 📊 МЕНЮ ПОДПИСКИ */
/* -------------------------------------------------- */
composer.hears("📊 Подписка", async (ctx) => {
  console.log("=== SUBSCRIPTION MENU ===")
  console.log("User:", ctx.from?.id)
  console.log("User role:", ctx.user?.role)

  ctx.session.isAddingEntry = false

  if (ctx.user?.role === "admin" || ctx.user?.role === "tester") {
    console.log("Access granted by role")
    return ctx.reply(
      `🌟 *Доступ разрешён*\nСтатус: ${ctx.user.role}.`,
      { parse_mode: "Markdown" }
    )
  }

  const subCollection = await getCollection(UserSubscriptionCollection)
  const now = new Date()
  console.log("NOW:", now)

  const subscription = await subCollection.findOne({
    telegramId: ctx.from!.id,
    isActive: true,
  })
  console.log("Subscription from DB:", subscription)

  /* ✅ АКТИВНАЯ ПОДПИСКА */
  if (subscription && subscription.endDate > now) {
    console.log("Active subscription detected")
    return ctx.reply(
      `✅ *Подписка активна*\n\n` +
        `Тип: *${subscription.plan === "trial" ? "Ознакомительная" : "Платная"}*\n` +
        `Истекает: *${subscription.endDate.toLocaleDateString("ru-RU")} ` +
        `${subscription.endDate.toLocaleTimeString("ru-RU")}*`,
      { parse_mode: "Markdown" }
    )
  }

  /* 🎁 ТРИАЛ ДОСТУПЕН */
  if (!ctx.user?.isTrialExhausted) {
    return ctx.reply(
      `🎁 *Ознакомительный период*\n\n` +
        `Вы можете бесплатно попробовать бота в течение ограниченного времени.`,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard()
          .text("🎁 Активировать пробный период", "activate_trial")
          .row()
          .text("📋 Список тарифов", "show_tariffs"),
      }
    )
  }

  console.log("Trial exhausted, showing tariffs")

  /* ❌ ПОДПИСКИ НЕТ */
  return ctx.reply(
    `❌ *У вас нет активной подписки*\n\nВыберите тарифный план:`,
    {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard().text(
        "📋 Список тарифов",
        "show_tariffs"
      ),
    }
  )
})

/* -------------------------------------------------- */
/* 🎁 АКТИВАЦИЯ TRIAL */
/* -------------------------------------------------- */
composer.callbackQuery("activate_trial", async (ctx) => {
  await ctx.answerCallbackQuery()
  const hasAccess = await calculateUserAccess(ctx.from!.id)

  if (ctx.user?.isTrialExhausted) {
    return ctx.reply("⛔️ Пробный период уже был использован.")
  }

  const subCollection = await getCollection(UserSubscriptionCollection)
  const now = new Date()
  const trialTariff = TARIFFS.trial

  const endDate = calculateEndDate(now, "trial")

  await subCollection.insertOne({
    telegramId: ctx.from!.id,
    plan: "trial",
    kind: "trial",
    isActive: true,
    startDate: now,
    endDate,
    autoRenew: false,
    createdAt: now,
    updatedAt: now,
  })

  await ctx.reply(
    `🎉 *Пробный период активирован!*\n\n` +
      `Доступ открыт до: *${endDate.toLocaleDateString("ru-RU")} ` +
      `${endDate.toLocaleTimeString("ru-RU")}*`,
    {
      parse_mode: "Markdown",
      reply_markup: getMainMenu(!!hasAccess),
    }
  )
})

/* -------------------------------------------------- */
/* 📋 СПИСОК ТАРИФОВ */
/* -------------------------------------------------- */
composer.callbackQuery("show_tariffs", async (ctx) => {
  await ctx.answerCallbackQuery()

  const keyboard = new InlineKeyboard()

  Object.entries(TARIFFS)
    .filter(([key]) => key !== "trial")
    .forEach(([key, tariff]) => {
      keyboard
        .text(`${tariff.title} — ${tariff.price}₽`, `buy_tariff_${key}`)
        .row()
    })

  const text = "Выберите тарифный план:"

  if (ctx.callbackQuery.message) {
    await ctx.editMessageText(text, { reply_markup: keyboard })
  } else {
    await ctx.reply(text, { reply_markup: keyboard })
  }
})

/* -------------------------------------------------- */
/* 💳 ПОКУПКА ТАРИФА */
/* -------------------------------------------------- */
composer.callbackQuery(/^buy_tariff_(.+)$/, async (ctx) => {
  const tariffKey = ctx.match[1] as TariffKey
  const tariff = TARIFFS[tariffKey]

  if (!tariff || tariffKey === "trial") {
    return ctx.answerCallbackQuery("Тариф недоступен")
  }

  await ctx.answerCallbackQuery()
  await ctx.deleteMessage()
  
  console.log('Начало оплаты тарифа: ', tariff)
  console.log("INVOICE SENT", process.env.TELEGRAM_PROVIDER_TOKEN!)
  try {
    await ctx.replyWithInvoice(
      tariff.title,
      `Подписка на ${tariff.durationDays} дней`,
      tariffKey,
      "RUB",
      [
        {
          label: tariff.title,
          amount: Math.round(parseFloat(tariff.price) * 100),
        },
      ],
      {
        provider_token: process.env.TELEGRAM_PROVIDER_TOKEN!,
        need_email: true,
        provider_data: JSON.stringify({
            receipt: {
                items: [{
                    description: tariff.title,
                    quantity: "1.00",
                    amount: { value: Number(tariff.price).toFixed(2), currency: "RUB" },
                    vat_code: 0
                }]
            }
        })
      }
    )

    console.log("INVOICE SENT OK")
  } catch (e) {
    console.error("INVOICE ERROR:", e)
  }
})

/* -------------------------------------------------- */
/* ✅ УСПЕШНАЯ ОПЛАТА */
/* -------------------------------------------------- */
export const telegramSuccessPaymentHandler = async (ctx: MyContext) => {
  console.log('telegramSuccessPaymentHandler start')
  const payment = ctx.message?.successful_payment
  if (!payment || !ctx.from) return

  const tariffKey = payment.invoice_payload as TariffKey
  const tariff = TARIFFS[tariffKey]
  const now = new Date()
  const endDate = calculateEndDate(now, tariffKey)

  const subCollection = await getCollection(UserSubscriptionCollection)
  const paymentsCollection = await getCollection(PaymentCollection)

    // 🔒 Защита от повторных callback'ов
  const existingPayment = await paymentsCollection.findOne({
    providerPaymentId: payment.provider_payment_charge_id,
  })

  if (existingPayment) {
    console.log("⚠️ Payment already processed:", payment.provider_payment_charge_id)
    return
  }

  // 1️⃣ сохраняем платёж
  await paymentsCollection.insertOne({
    telegramId: ctx.from.id,
    tariffKey,
    amount: payment.total_amount / 100,
    currency: payment.currency,
    provider: "telegram_yookassa",
    providerPaymentId: payment.provider_payment_charge_id,
    status: "success",
    paidAt: now,
    createdAt: now,
  })

  // 1️⃣ Закрываем все активные подписки (trial / paid)
  await subCollection.updateMany(
    {
      telegramId: ctx.from.id,
      isActive: true,
    },
    {
      $set: {
        isActive: false,
        updatedAt: now,
      },
    }
  )

  // 2️⃣ Создаём НОВУЮ платную подписку
  await subCollection.updateOne(
    { telegramId: ctx.from.id },
    {
      $set: {
        plan: tariffKey,
        kind: "paid",
        isActive: true,
        startDate: now,
        endDate,
        warned3days: false,
        warned1day: false,
        expiredNotified: false,
        updatedAt: now,
      },
    },
    { upsert: true }
  )

  ctx.hasAccess = true

  await ctx.reply(
    `✨ *Подписка активирована!*\n\n` +
      `Доступ открыт до: *${endDate.toLocaleDateString("ru-RU")} ` +
      `${endDate.toLocaleTimeString("ru-RU")}*`,
    {
      parse_mode: "Markdown",
      reply_markup: getMainMenu(!!ctx.hasAccess),
    }
  )
}

export default composer
