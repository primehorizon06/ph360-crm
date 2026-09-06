export const REMINDER_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
} as const;

export type ReminderStatusValue =
  (typeof REMINDER_STATUS)[keyof typeof REMINDER_STATUS];
