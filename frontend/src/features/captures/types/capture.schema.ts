import { z } from 'zod'

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ واردشده معتبر نیست.').or(z.literal(''))

// A capture becomes a Task only once it is a commitment: it has a planned
// date or belongs to a Goal or Project. See mindmap discussion 026.
export const captureTaskFieldsSchema = z.object({
  title: z.string().trim().min(1, 'عنوان کار الزامی است.').max(200),
  parentScope: z.string(),
  plannedDate: dateField,
  deadline: dateField,
}).superRefine((value, context) => {
  if (value.parentScope === 'none' && !value.plannedDate) {
    context.addIssue({ code: 'custom', path: ['plannedDate'], message: 'برای تبدیل به کار، تاریخ یا یک هدف/پروژه انتخاب کنید.' })
  }
  if (value.deadline && value.plannedDate && value.deadline < value.plannedDate) {
    context.addIssue({ code: 'custom', path: ['deadline'], message: 'مهلت نمی‌تواند پیش از تاریخ برنامه‌ریزی باشد.' })
  }
})

export type CaptureTaskFields = z.infer<typeof captureTaskFieldsSchema>
