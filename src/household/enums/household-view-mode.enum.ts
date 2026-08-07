/** Per-viewer preference for how household data is shown to them —
 * doesn't affect what other members see, or who owns what, only what this
 * particular member currently chooses to see/edit through their own
 * account. See `HouseholdService.getAccessibleUserIds`. */
export enum HouseholdViewMode {
  /** See and edit every household member's data pooled together (default,
   * matches the household feature's original behavior). */
  COMBINED = 'COMBINED',
  /** See and edit only your own data, even while still a household member. */
  SEPARATE = 'SEPARATE',
}
