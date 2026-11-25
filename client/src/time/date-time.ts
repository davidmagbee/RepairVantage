import { Temporal } from '@js-temporal/polyfill';

export const DEFAULT_TIME_ZONE = 'America/New_York';
export type TimeDisambiguation = 'reject' | 'earlier' | 'later';
export type ParsedDateTime = { ok: true; value: string | null }
  | { ok: false; kind: 'invalid' | 'nonexistent' | 'ambiguous'; error: string };

/** Use named IANA zones, never a fixed EST offset that would mislabel summer dates. */
export function isTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value || /^[+-]/.test(value)) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Browser detection is a preference default; unsupported or unavailable detection falls back to Eastern Time. */
export function detectTimeZone() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isTimeZone(zone) ? zone : DEFAULT_TIME_ZONE;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

function instant(value: string) {
  return Temporal.Instant.from(value);
}

/** Minute-only controls are a view: callers must omit unchanged inputs to preserve stored seconds. */
export function dateTimeInput(value: string | null | undefined, timeZone: string) {
  return value ? instant(value).toZonedDateTimeISO(timeZone).toPlainDateTime().toString({ smallestUnit: 'minute' }) : '';
}

export function dateInput(value: string | null | undefined, timeZone: string) {
  return value ? instant(value).toZonedDateTimeISO(timeZone).toPlainDate().toString() : '';
}

/** A wall time must identify one instant; DST gaps never normalize and repeated hours require explicit choice. */
export function parseDateTimeInput(value: string, timeZone: string, disambiguation: TimeDisambiguation = 'reject'): ParsedDateTime {
  if (!value) return { ok: true, value: null };
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) || !isTimeZone(timeZone)
      || !['reject', 'earlier', 'later'].includes(disambiguation)) {
    return { ok: false, kind: 'invalid', error: 'Enter a valid date and time in the selected time zone.' };
  }
  let wallTime: Temporal.PlainDateTime;
  try {
    wallTime = Temporal.PlainDateTime.from(value, { overflow: 'reject' });
  } catch {
    return { ok: false, kind: 'invalid', error: 'Enter a valid date and time in the selected time zone.' };
  }
  // Earlier/later can normalize a skipped time, so validate their wall-time round trips before accepting either.
  const earlier = wallTime.toZonedDateTime(timeZone, { disambiguation: 'earlier' });
  const later = wallTime.toZonedDateTime(timeZone, { disambiguation: 'later' });
  if (!earlier.toPlainDateTime().equals(wallTime) || !later.toPlainDateTime().equals(wallTime)) {
    return { ok: false, kind: 'nonexistent', error: 'That local time does not exist because the clocks move forward. Choose another time.' };
  }
  if (earlier.epochNanoseconds !== later.epochNanoseconds && disambiguation === 'reject') {
    return { ok: false, kind: 'ambiguous', error: 'That local time occurs twice because the clocks move back. Choose the first or second occurrence.' };
  }
  const resolved = disambiguation === 'later' ? later : earlier;
  return { ok: true, value: resolved.toInstant().toString({ fractionalSecondDigits: 3 }) };
}

/** Existing repeated-hour timestamps already identify an occurrence, including their original seconds and milliseconds. */
export function occurrenceForInstant(value: string | null | undefined, timeZone: string): TimeDisambiguation {
  if (!value) return 'reject';
  const saved = instant(value);
  const wallTime = saved.toZonedDateTimeISO(timeZone).toPlainDateTime();
  const earlier = wallTime.toZonedDateTime(timeZone, { disambiguation: 'earlier' });
  const later = wallTime.toZonedDateTime(timeZone, { disambiguation: 'later' });
  if (earlier.epochNanoseconds === later.epochNanoseconds) return 'reject';
  return saved.epochNanoseconds === earlier.epochNanoseconds ? 'earlier' : 'later';
}

/** Formatting never changes the stored instant and keeps the active zone visible next to the clock time. */
export function formatDateTime(value: string | null | undefined, timeZone: string) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat(undefined, {
    timeZone, year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(value));
}

export function formatDate(value: string | null | undefined, timeZone: string) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat(undefined, { timeZone, year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
}

function calendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Expected a calendar date');
  return Temporal.PlainDate.from(value, { overflow: 'reject' });
}

/** Calendar arithmetic deliberately counts civil dates rather than elapsed 24-hour periods. */
export function civilDayDistance(start: string, end: string) {
  return calendarDate(start).until(calendarDate(end), { largestUnit: 'day' }).days;
}

export function addCalendarDaysISO(value: string, days: number) {
  return calendarDate(value).add({ days }).toString();
}

export function dayOfWeek(value: string) {
  return calendarDate(value).dayOfWeek % 7;
}

/** The selected end date is inclusive in the UI and next local midnight is exclusive on the API. */
export function calendarDateRange(start: string, end: string, timeZone: string):
  { ok: true; from: string; to: string; count: number } | { ok: false; error: string } {
  try {
    if (!isTimeZone(timeZone)) throw new RangeError('Invalid time zone');
    const first = calendarDate(start);
    const last = calendarDate(end);
    const count = first.until(last, { largestUnit: 'day' }).days + 1;
    if (count < 1 || count > 93) throw new RangeError('Invalid date range');
    const from = first.toZonedDateTime(timeZone).toInstant();
    const to = last.add({ days: 1 }).toZonedDateTime(timeZone).toInstant();
    if (Temporal.Instant.compare(from, to) >= 0) throw new RangeError('Date does not exist in this zone');
    return { ok: true, from: from.toString({ fractionalSecondDigits: 3 }), to: to.toString({ fractionalSecondDigits: 3 }), count };
  } catch {
    return { ok: false, error: 'Choose a valid schedule range of up to 93 calendar days in the selected time zone.' };
  }
}

/** Return civil dates, including the final day, so timezone changes cannot shift the selected month. */
export function monthDateRange(timeZone: string, now = new Date().toISOString()) {
  const today = instant(now).toZonedDateTimeISO(timeZone).toPlainDate();
  const first = today.with({ day: 1 });
  return { start: first.toString(), end: first.add({ months: 1 }).subtract({ days: 1 }).toString() };
}
