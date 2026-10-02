import { z } from 'zod'

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ واردشده معتبر نیست.').or(z.literal(''))

const taskFields = z.object({
  title: z.string().trim().min(1, 'عنوان کار الزامی است.').max(200),
  description: z.string().trim().max(2000),
  parentScope: z.string(),
  plannedDate: dateField,
  deadline: dateField,
  sequenceChoice: z.string(),
  isProtected: z.boolean(),
})

export type TaskFields = z.infer<typeof taskFields>

function requireDeadlineAfterPlannedDate(value: TaskFields, context: z.RefinementCtx) {
  if (value.deadline && value.plannedDate && value.deadline < value.plannedDate) {
    context.addIssue({ code: 'custom', path: ['deadline'], message: 'مهلت نمی‌تواند پیش از تاریخ برنامه‌ریزی باشد.' })
  }
}

// A standalone Task (no Goal/Project parent) must carry a planned date; a
// parent-owned Task may stay undated. See mindmap discussion 026.
export const taskFieldsSchema = taskFields.superRefine((value, context) => {
  if (value.parentScope === 'none' && !value.plannedDate) {
    context.addIssue({ code: 'custom', path: ['plannedDate'], message: 'کار مستقل باید تاریخ برنامه‌ریزی داشته باشد.' })
  }
  requireDeadlineAfterPlannedDate(value, context)
})

// On create, no date and no parent is allowed: it is saved as a quick capture instead of a Task.
export const taskCreateFieldsSchema = taskFields.superRefine(requireDeadlineAfterPlannedDate)
