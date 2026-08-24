/** User-facing notification categories — what Settings actually shows a
 * toggle for. Several raw `PushPayload.data.type` values can share one
 * category (both savings-goal alert types are one toggle to the user). */
export enum NotificationCategory {
  RECURRING = 'recurring',
  BUDGET = 'budget',
  HOUSEHOLD = 'household',
  SAVINGS_GOAL = 'savings_goal',
  LOW_BALANCE = 'low_balance',
}

/** Maps a raw `data.type` tag to the category it's gated by. A type absent
 * here (e.g. no `type` at all) has no toggle and is always sent. */
const CATEGORY_BY_TYPE: Record<string, NotificationCategory> = {
  recurring_due_today: NotificationCategory.RECURRING,
  budget_threshold: NotificationCategory.BUDGET,
  household_invite: NotificationCategory.HOUSEHOLD,
  savings_goal_milestone: NotificationCategory.SAVINGS_GOAL,
  savings_goal_deadline: NotificationCategory.SAVINGS_GOAL,
  low_balance: NotificationCategory.LOW_BALANCE,
};

export function categoryForType(
  type: string | undefined,
): NotificationCategory | null {
  if (!type) return null;
  return CATEGORY_BY_TYPE[type] ?? null;
}

/** A category absent from the user's map is enabled by default. */
export function isCategoryEnabled(
  preferences: Record<string, boolean>,
  category: NotificationCategory,
): boolean {
  return preferences[category] ?? true;
}
