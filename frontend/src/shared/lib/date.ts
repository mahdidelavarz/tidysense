// Date presentation helpers.
//
// Persisted/API date values are ISO Gregorian strings (see
// devmap/shared/data-types-and-datetime.md); the Persian/Jalali calendar is
// presentation-only. `Intl.DateTimeFormat('fa-IR')` already defaults to the
// Persian solar calendar with Persian digits, so no extra calendar library
// is needed to render it correctly.
const jalaliFormatter = new Intl.DateTimeFormat('fa-IR')

/** Formats an ISO `yyyy-MM-dd` local date as a Persian/Jalali date, or a placeholder when absent. */
export function formatLocalDate(value: string | null | undefined): string {
  if (!value) return 'تعیین نشده'
  return jalaliFormatter.format(new Date(`${value}T00:00:00`))
}
