// tariffs.ts

const isProd = process.env.NODE_ENV === 'production';

export const TARIFFS = {
  trial: {
    title: isProd
      ? "Ознакомительный период — 24 часа"
      : "Ознакомительный период (тест)",
    price: "0.00",

    // ⏱ ПРОД — дни, ТЕСТ — минуты
    durationDays: isProd ? 1 : undefined,
    durationMinutes: isProd ? undefined : 10,
  },

  "7days": {
    title: isProd
      ? "Подписка на 7 дней"
      : "Подписка на 7 дней (тест)",
    price: "99.00",

    durationDays: isProd ? 7 : undefined,
    durationMinutes: isProd ? undefined : 10,
  },

  "30days": {
    title: isProd
      ? "Подписка на 30 дней"
      : "Подписка на 30 дней (тест)",
    price: "199.00",

    durationDays: isProd ? 30 : undefined,
    durationMinutes: isProd ? undefined : 10,
  },
} as const;

export type TariffKey = keyof typeof TARIFFS;
