import { expect, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/get-session', route => route.fulfill({ json: null }));
  await page.goto('/privacy');
});

test('timezone detection validates named zones and falls back to Eastern Time when browser detection is unavailable', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const modulePath = '/src/time/date-time.ts';
    const api = await import(modulePath);
    const validation = [api.isTimeZone('America/New_York'), api.isTimeZone('Asia/Kolkata'), api.isTimeZone('UTC'), api.isTimeZone('Not/AZone'), api.isTimeZone(''), api.isTimeZone(null), api.isTimeZone('+05:30')];
    const original = Intl.DateTimeFormat.prototype.resolvedOptions;
    const detected = api.detectTimeZone();
    let invalid: string;
    let absent: string;
    try {
      Intl.DateTimeFormat.prototype.resolvedOptions = function () { return { ...original.call(this), timeZone: 'Not/AZone' }; };
      invalid = api.detectTimeZone();
      Intl.DateTimeFormat.prototype.resolvedOptions = function () { throw new Error('Unavailable browser setting'); };
      absent = api.detectTimeZone();
    } finally {
      Intl.DateTimeFormat.prototype.resolvedOptions = original;
    }
    return { validation, detectedValid: api.isTimeZone(detected), invalid, absent };
  });
  expect(result.validation).toEqual([true, true, true, false, false, false, false]);
  expect(result.detectedValid).toBe(true);
  expect(result.invalid).toBe('America/New_York');
  expect(result.absent).toBe('America/New_York');
});

test('local datetime input converts seasonal and fractional-hour offsets into UTC without depending on browser timezone', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const modulePath = '/src/time/date-time.ts';
    const api = await import(modulePath);
    return {
      summerInput: api.dateTimeInput('2026-07-01T14:30:17.125Z', 'America/New_York'),
      winterInput: api.dateTimeInput('2026-01-01T15:30:17.125Z', 'America/New_York'),
      rolloverDate: api.dateInput('2026-01-01T04:30:00.000Z', 'America/New_York'),
      summer: api.parseDateTimeInput('2026-07-01T10:30', 'America/New_York'),
      winter: api.parseDateTimeInput('2026-01-01T10:30', 'America/New_York'),
      pacific: api.parseDateTimeInput('2026-07-01T10:30', 'America/Los_Angeles'),
      india: api.parseDateTimeInput('2026-07-01T10:30', 'Asia/Kolkata'),
      empty: api.parseDateTimeInput('', 'America/New_York'),
      missingInput: api.dateTimeInput(null, 'America/New_York'),
      missingDate: api.dateInput(undefined, 'America/New_York'),
      formattedSummer: api.formatDateTime('2026-07-01T14:30:17.125Z', 'America/New_York'),
      formattedWinter: api.formatDateTime('2026-01-01T15:30:17.125Z', 'America/New_York'),
      formattedDate: api.formatDate('2026-01-01T04:30:00.000Z', 'America/New_York'),
      emptyFormatted: [api.formatDateTime(null, 'America/New_York'), api.formatDate(undefined, 'America/New_York')],
    };
  });
  expect(result.summerInput).toBe('2026-07-01T10:30');
  expect(result.winterInput).toBe('2026-01-01T10:30');
  expect(result.rolloverDate).toBe('2025-12-31');
  expect(result.summer).toEqual({ ok: true, value: '2026-07-01T14:30:00.000Z' });
  expect(result.winter).toEqual({ ok: true, value: '2026-01-01T15:30:00.000Z' });
  expect(result.pacific).toEqual({ ok: true, value: '2026-07-01T17:30:00.000Z' });
  expect(result.india).toEqual({ ok: true, value: '2026-07-01T05:00:00.000Z' });
  expect(result.empty).toEqual({ ok: true, value: null });
  expect(result.missingInput).toBe('');
  expect(result.missingDate).toBe('');
  expect(result.formattedSummer).toContain('10:30');
  expect(result.formattedSummer).toContain('EDT');
  expect(result.formattedWinter).toContain('EST');
  expect(result.formattedDate).toContain('Dec 31, 2025');
  expect(result.emptyFormatted).toEqual(['Not set', 'Not set']);
});

test('invalid dates and daylight-saving gaps are rejected while repeated hours require an explicit occurrence', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const modulePath = '/src/time/date-time.ts';
    const api = await import(modulePath);
    return {
      invalid: ['2026-02-29T10:30', '2026-13-01T10:30', '2026-01-01T24:00', '2026-01-01T10:60', '2026-01-01', 'invalid'].map(value => api.parseDateTimeInput(value, 'America/New_York')),
      invalidZone: api.parseDateTimeInput('2026-01-01T10:30', 'Not/AZone'),
      invalidChoice: api.parseDateTimeInput('2026-11-01T01:30', 'America/New_York', 'unknown'),
      gap: ['reject', 'earlier', 'later'].map(choice => api.parseDateTimeInput('2026-03-08T02:30', 'America/New_York', choice)),
      fold: api.parseDateTimeInput('2026-11-01T01:30', 'America/New_York'),
      first: api.parseDateTimeInput('2026-11-01T01:30', 'America/New_York', 'earlier'),
      second: api.parseDateTimeInput('2026-11-01T01:30', 'America/New_York', 'later'),
      afterGap: api.parseDateTimeInput('2026-03-08T03:30', 'America/New_York'),
      leap: api.parseDateTimeInput('2028-02-29T10:30', 'America/New_York'),
      savedFirst: api.occurrenceForInstant('2026-11-01T05:30:17.125Z', 'America/New_York'),
      savedSecond: api.occurrenceForInstant('2026-11-01T06:30:58.999Z', 'America/New_York'),
      savedOrdinary: api.occurrenceForInstant('2026-07-01T14:30:17.125Z', 'America/New_York'),
      savedMissing: api.occurrenceForInstant(null, 'America/New_York'),
    };
  });
  for (const invalid of [...result.invalid, result.invalidZone, result.invalidChoice]) expect(invalid).toMatchObject({ ok: false, kind: 'invalid' });
  for (const gap of result.gap) expect(gap).toMatchObject({ ok: false, kind: 'nonexistent' });
  expect(result.fold).toMatchObject({ ok: false, kind: 'ambiguous' });
  expect(result.first).toEqual({ ok: true, value: '2026-11-01T05:30:00.000Z' });
  expect(result.second).toEqual({ ok: true, value: '2026-11-01T06:30:00.000Z' });
  expect(result.afterGap).toEqual({ ok: true, value: '2026-03-08T07:30:00.000Z' });
  expect(result.leap).toEqual({ ok: true, value: '2028-02-29T15:30:00.000Z' });
  expect([result.savedFirst, result.savedSecond, result.savedOrdinary, result.savedMissing]).toEqual(['earlier', 'later', 'reject', 'reject']);
});

test('calendar ranges use civil dates through 23-hour and 25-hour days with an inclusive form end', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const modulePath = '/src/time/date-time.ts';
    const api = await import(modulePath);
    const zone = 'America/New_York';
    return {
      spring: api.calendarDateRange('2026-03-08', '2026-03-08', zone),
      autumn: api.calendarDateRange('2026-11-01', '2026-11-01', zone),
      maximum: api.calendarDateRange('2026-01-01', '2026-04-03', zone),
      invalid: [
        api.calendarDateRange('2026-01-01', '2026-04-04', zone),
        api.calendarDateRange('2026-01-02', '2026-01-01', zone),
        api.calendarDateRange('2026-02-29', '2026-03-01', zone),
        api.calendarDateRange('2026-01-01', '2026-01-02', 'Not/AZone'),
        api.calendarDateRange('invalid', '2026-01-02', zone),
        api.calendarDateRange('2011-12-30', '2011-12-30', 'Pacific/Apia'),
      ],
      distance: api.civilDayDistance('2026-03-07', '2026-03-09'),
      nextDate: api.addCalendarDaysISO('2026-03-08', 1),
      leapDate: api.addCalendarDaysISO('2028-02-28', 1),
      weekdays: [api.dayOfWeek('2026-11-01'), api.dayOfWeek('2026-11-02')],
      boundaryMonth: api.monthDateRange(zone, '2026-03-01T04:30:00.000Z'),
      leapMonth: api.monthDateRange(zone, '2028-02-10T15:00:00.000Z'),
    };
  });
  expect(result.spring).toEqual({ ok: true, from: '2026-03-08T05:00:00.000Z', to: '2026-03-09T04:00:00.000Z', count: 1 });
  expect(result.autumn).toEqual({ ok: true, from: '2026-11-01T04:00:00.000Z', to: '2026-11-02T05:00:00.000Z', count: 1 });
  expect(result.maximum).toMatchObject({ ok: true, count: 93 });
  for (const invalid of result.invalid) expect(invalid.ok).toBe(false);
  expect(result.distance).toBe(2);
  expect(result.nextDate).toBe('2026-03-09');
  expect(result.leapDate).toBe('2028-02-29');
  expect(result.weekdays).toEqual([0, 1]);
  expect(result.boundaryMonth).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  expect(result.leapMonth).toEqual({ start: '2028-02-01', end: '2028-02-29' });
});
