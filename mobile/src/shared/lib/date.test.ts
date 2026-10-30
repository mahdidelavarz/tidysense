import { formatDayMonth, formatLocalDate, formatNumber, formatTime, parseIsoDate, toIsoDate, toPersianDigits } from './date'

describe('date helpers', () => {
  it('writes Persian digits', () => {
    expect(toPersianDigits('09121234567')).toBe('۰۹۱۲۱۲۳۴۵۶۷')
    expect(formatNumber(42)).toBe('۴۲')
  })

  it('round-trips an ISO local date without shifting the day', () => {
    expect(toIsoDate(parseIsoDate('2026-10-28'))).toBe('2026-10-28')
  })

  it('formats Jalali dates as the web does', () => {
    expect(formatLocalDate('2026-09-28')).toBe('۶ مهر ۱۴۰۵')
    expect(formatDayMonth('2026-03-21')).toBe('۱ فروردین')
    expect(formatLocalDate(null)).toBe('تعیین نشده')
  })

  it('shows a wall-clock time as hours and minutes', () => {
    expect(formatTime('08:30:00')).toBe('۰۸:۳۰')
  })
})
