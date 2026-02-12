// src/webhooks/yookassa.ts
import { getCollection } from '../models/database'
import { UserSubscriptionCollection } from '../models/UserSubscription'
import { TARIFFS, TariffKey } from '../models/tariffs'
import { calculateEndDate } from '../utils/subscriptionUtils'

export async function handleYooKassaWebhook(event: any) {
  if (event.event !== 'payment.succeeded') return

  const payment = event.object
  const { telegramId } = payment.metadata

  const tariff = payment.metadata?.tariff as TariffKey | undefined

  if (!tariff || !(tariff in TARIFFS)) {
    console.warn('❌ Unknown tariff in YooKassa webhook:', tariff)
    return
  }

  const tariffData = TARIFFS[tariff]
  const startDate = new Date()
  const endDate = calculateEndDate(startDate, tariff)
  const subs = getCollection(UserSubscriptionCollection)

  await subs.updateOne(
    { telegramId: Number(telegramId) },
    {
      $set: {
        plan: tariff,
        startDate,
        endDate,
        isActive: true,
        paymentId: payment.id,
        amountPaid: Number(payment.amount.value),
        paymentDate: new Date(payment.created_at),
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
        autoRenew: false,
      },
    },
    { upsert: true }
  )
}
