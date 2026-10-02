import { formatNumber, formatTime } from '../../../shared/lib/date'
import type { RecurrenceDto, RoutineDto } from './routine.types'

/** ISO weekday numbers in the order of the Jalali week (Saturday first). */
export const weekdayOptions = [
  { value: 6, label: 'شنبه' },
  { value: 7, label: 'یکشنبه' },
  { value: 1, label: 'دوشنبه' },
  { value: 2, label: 'سه‌شنبه' },
  { value: 3, label: 'چهارشنبه' },
  { value: 4, label: 'پنجشنبه' },
  { value: 5, label: 'جمعه' },
] as const

/** The recurrence rule in words, such as «شنبه، دوشنبه» or «روز ۵ هر ماه». */
export function recurrenceLabel(recurrence: RecurrenceDto): string {
  if (recurrence.type === 'SPECIFIC_WEEKDAYS') {
    const selected = (recurrence.daysOfWeek ?? []).map(Number)
    return weekdayOptions.filter(day => selected.includes(day.value)).map(day => day.label).join('، ')
  }
  if (recurrence.type === 'MONTHLY_ON_DAY') return `روز ${formatNumber(Number(recurrence.dayOfMonth))} هر ماه`
  return 'هر روز'
}

/** The Routine's daily slots in words, such as «۰۸:۰۰ و ۲۰:۰۰», or that it has no fixed time. */
export function slotsLabel(timesOfDay: string[]): string {
  return timesOfDay.length === 0 ? 'بدون ساعت مشخص' : timesOfDay.map(formatTime).join(' و ')
}

/** Where a Routine belongs, in words. */
export function routineOwnerLabel(routine: Pick<RoutineDto, 'goalId' | 'projectId'>) {
  if (routine.projectId) return 'زیر یک پروژه'
  if (routine.goalId) return 'زیر یک هدف'
  return 'مستقل'
}
