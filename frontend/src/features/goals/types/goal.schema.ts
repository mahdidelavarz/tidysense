import { z } from 'zod'

// Client-side shape/feedback only; the backend remains the authoritative
// validator. Keep this aligned with CreateGoalRequest/UpdateGoalRequest,
// not a competing transport contract.
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ واردشده معتبر نیست.').or(z.literal(''))

export const goalFieldsSchema = z.object({
  title: z.string().trim().min(1, 'عنوان هدف الزامی است.').max(200),
  desiredOutcome: z.string().trim().min(1, 'نتیجه مطلوب الزامی است.').max(2000),
  targetDate: dateField,
  reviewDate: dateField,
})

export type GoalFields = z.infer<typeof goalFieldsSchema>
