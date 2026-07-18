/** Only persisted once a due date has actually passed — there's no
 * "PENDING" row for future occurrences; those are computed on the fly by
 * `getUpcoming` rather than stored. */
export enum OccurrenceStatus {
  GENERATED = 'GENERATED',
  MISSED = 'MISSED',
}
