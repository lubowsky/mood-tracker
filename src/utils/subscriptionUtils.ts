import { TariffKey, TARIFFS } from "../models/tariffs";

export function calculateEndDate(
  start: Date,
  tariffKey: TariffKey
): Date {
  const tariff = TARIFFS[tariffKey];
  const end = new Date(start);

  if (tariff.durationMinutes) {
    end.setMinutes(end.getMinutes() + tariff.durationMinutes);
    return end;
  }

  if (tariff.durationDays) {
    end.setDate(end.getDate() + tariff.durationDays);
    return end;
  }

  throw new Error(`Tariff ${tariffKey} has no duration`);
}
