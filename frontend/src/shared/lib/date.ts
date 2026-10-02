// Date presentation helpers.
//
// Persisted/API date values are ISO Gregorian strings (see
// devmap/shared/data-types-and-datetime.md); the Persian/Jalali calendar is
// presentation-only. `Intl.DateTimeFormat('fa-IR')` defaults to the Persian
// solar calendar with Persian digits.
const shortFormatter = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' })
const longFormatter = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' })
const numberFormatter = new Intl.NumberFormat('fa-IR', { useGrouping: false })

/** Parses an ISO `yyyy-MM-dd` local date at local midnight (never UTC, which could shift the day). */
export function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00`)
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
  return shortFormatter.format(parseIsoDate(value))
}

/** Formats an ISO local date with its weekday, such as «دوشنبه ۶ مهر». */
export function formatLongDate(value: string): string {
  return longFormatter.format(parseIsoDate(value))
}

/** Renders a number with Persian digits. */
export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}
