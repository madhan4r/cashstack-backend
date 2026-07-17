export interface DateRange {
  start: Date;
  end: Date;
}

export interface MonthWindow {
  year: number;
  month: number;
  label: string;
}

/** [start, end) UTC boundaries for the calendar month containing `date`. */
export function getUtcMonthRange(date: Date): DateRange {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
  );
  return { start, end };
}

/** [start, end) UTC boundaries for the calendar year containing `date`. */
export function getUtcYearRange(date: Date): DateRange {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const end = new Date(Date.UTC(date.getUTCFullYear() + 1, 0, 1));
  return { start, end };
}

/** [start, end) UTC boundaries for the calendar day containing `date`. */
export function getUtcDayRange(date: Date): DateRange {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

/**
 * The last `n` calendar months up to and including the month of
 * `referenceDate`, oldest first.
 */
export function getLastNMonths(n: number, referenceDate: Date): MonthWindow[] {
  const months: MonthWindow[] = [];

  for (let offset = n - 1; offset >= 0; offset--) {
    const monthDate = new Date(
      Date.UTC(
        referenceDate.getUTCFullYear(),
        referenceDate.getUTCMonth() - offset,
        1,
      ),
    );
    const year = monthDate.getUTCFullYear();
    const month = monthDate.getUTCMonth() + 1;
    months.push({
      year,
      month,
      label: `${year}-${String(month).padStart(2, '0')}`,
    });
  }

  return months;
}

/** The 12 calendar months of `year`, January first. */
export function getMonthsOfYear(year: number): MonthWindow[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return { year, month, label: `${year}-${String(month).padStart(2, '0')}` };
  });
}
