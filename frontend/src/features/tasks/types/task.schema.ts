import { z } from 'zod'

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ واردشده معتبر نیست.').or(z.literal(''))

// A standalone Task (no Goal/Project parent) must carry a planned date; a
// parent-owned Task may stay undated. See mindmap discussion 026.
export const taskFieldsSchema = z.object({
  title: z.string().trim().min(1, 'عنوان کار الزامی است.').max(200),
  description: z.string().trim().max(2000),
  parentScope: z.string(),
  plannedDate: dateField,
  deadline: dateField,
  sequenceChoice: z.string(),
}).superRefine((value, context) => {
  if (value.parentScope === 'none' && !value.plannedDate) {
    context.addIssue({ code: 'custom', path: ['plannedDate'], message: 'کار مستقل باید تاریخ برنامه‌ریزی داشته باشد.' })
  }
  if (value.deadline && value.plannedDate && value.deadline < value.plannedDate) {
    context.addIssue({ code: 'custom', path: ['deadline'], message: 'مهلت نمی‌تواند پیش از تاریخ برنامه‌ریزی باشد.' })
  }
})

export type TaskFields = z.infer<typeof taskFieldsSchema>
