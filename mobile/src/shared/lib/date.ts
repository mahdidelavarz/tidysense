import { format } from 'date-fns-jalali'
import { faIR } from 'date-fns-jalali/locale'

// Date presentation helpers, the same outputs as frontend/src/shared/lib/date.ts.
//
// API dates are ISO Gregorian strings (devmap/shared/data-types-and-datetime.md); the Jalali calendar is
// presentation only. The web uses Intl's Persian calendar; Hermes on Android does not promise it, so the
// app formats with date-fns-jalali and writes Persian digits itself.

const persianDigits = '۰۱۲۳۴۵۶۷۸۹'

/** Replaces Latin digits with Persian ones. */
export function toPersianDigits(value: string): string {
  return value.replace(/\d/g, digit => persianDigits[Number(digit)] ?? digit)
}

/** Parses an ISO `yyyy-MM-dd` local date at local midnight (never UTC, which could shift the day). */
export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

/** Serialises a local Date to the ISO `yyyy-MM-dd` form the API expects. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Formats an ISO local date as a Jalali date such as «۶ مهر ۱۴۰۵», or a placeholder when absent. */
export function formatLocalDate(value: string | null | undefined): string {
  if (!value) return 'تعیین نشده'
  return toPersianDigits(format(parseIsoDate(value), 'd MMMM yyyy', { locale: faIR }))
}

/** Formats an ISO local date with its weekday, such as «دوشنبه ۶ مهر». */
export function formatLongDate(value: string): string {
  return toPersianDigits(format(parseIsoDate(value), 'EEEE d MMMM', { locale: faIR }))
}

/** Formats an ISO local date as day and month only, such as «۶ مهر». */
export function formatDayMonth(value: string): string {
  return toPersianDigits(format(parseIsoDate(value), 'd MMMM', { locale: faIR }))
}

/** Renders a number with Persian digits. */
export function formatNumber(value: number): string {
  return toPersianDigits(String(value))
}

/** Formats an API local wall-clock time (`HH:mm` or `HH:mm:ss`) as «۰۸:۳۰». */
export function formatTime(value: string): string {
  return toPersianDigits(value.slice(0, 5))
}
