
/** When the customer needs the work; nothing picked means "flexible" */
export const WhenDay = {
  ASAP: 'asap',
  TODAY: 'today',
  TOMORROW: 'tomorrow',
  DATE: 'date',
} as const;
export type WhenDay = (typeof WhenDay)[keyof typeof WhenDay];

export const WhenSlot = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  EVENING: 'evening',
} as const;
export type WhenSlot = (typeof WhenSlot)[keyof typeof WhenSlot];
