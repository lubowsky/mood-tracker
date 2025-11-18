export const validateIntensity = (value: number): boolean => {
  return value >= 1 && value <= 10;
};

export const validateTimeOfDay = (value: string): boolean => {
  return ['morning', 'afternoon', 'evening', 'night'].includes(value);
};