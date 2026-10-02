import { z } from 'zod'

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ واردشده معتبر نیست.').or(z.literal(''))

// Only these three patterns produce deterministic local dates. Weekdays are ISO
// numbers (Monday = 1 … Sunday = 7); the monthly day is a day of the Jalali month.
// See mindmap discussion 024 for slots: zero or more unique local times.
export const routineFieldsSchema = z.object({
  title: z.string().trim().min(1, 'عنوان روتین الزامی است.').max(200),
  description: z.string().trim().max(2000),
  parentScope: z.string(),
  recurrenceType: z.enum(['DAILY', 'SPECIFIC_WEEKDAYS', 'MONTHLY_ON_DAY']),
  daysOfWeek: z.array(z.number().int().min(1).max(7)),
  dayOfMonth: z.string(),
  timesOfDay: z.array(z.string().regex(/^\d{2}:\d{2}$/)).max(24, 'حداکثر ۲۴ ساعت در روز قابل ثبت است.'),
  effectiveFrom: dateField,
}).superRefine((value, context) => {
  if (value.recurrenceType === 'SPECIFIC_WEEKDAYS' && value.daysOfWeek.length === 0) {
    context.addIssue({ code: 'custom', path: ['daysOfWeek'], message: 'دست‌کم یک روز هفته را انتخاب کنید.' })
  }
  if (value.recurrenceType === 'MONTHLY_ON_DAY') {
    const day = Number(value.dayOfMonth)
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      context.addIssue({ code: 'custom', path: ['dayOfMonth'], message: 'روز ماه باید عددی بین ۱ و ۳۱ باشد.' })
    }
  }
  if (new Set(value.timesOfDay).size !== value.timesOfDay.length) {
    context.addIssue({ code: 'custom', path: ['timesOfDay'], message: 'هر ساعت فقط یک بار می‌تواند ثبت شود.' })
  }
})

export type RoutineFields = z.infer<typeof routineFieldsSchema>
