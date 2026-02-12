//src\models\Payments.ts
import { Collection } from "mongodb"

export interface Payment {
  telegramId: number

  tariffKey: string
  amount: number
  currency: string

  provider: "telegram_yookassa"
  providerPaymentId: string

  status: "success" | "failed" | "refunded"

  paidAt: Date
  createdAt: Date
}

export const PaymentCollection = "payments"