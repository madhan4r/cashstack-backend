import { IsObject } from 'class-validator';

/** Partial map of `NotificationCategory` -> enabled. Only the categories
 * present are changed; omitted ones keep their existing value. Validated
 * loosely (any object of booleans) rather than per-known-category so a
 * client on an older build sending a since-removed category key doesn't
 * hard-fail the request. */
export class UpdateNotificationPreferencesDto {
  @IsObject()
  preferences!: Record<string, boolean>;
}

export function validatePreferencesShape(
  preferences: Record<string, unknown>,
): preferences is Record<string, boolean> {
  return Object.values(preferences).every((v) => typeof v === 'boolean');
}
