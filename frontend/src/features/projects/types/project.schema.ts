import { z } from 'zod'

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ واردشده معتبر نیست.').or(z.literal(''))

export const projectFieldsSchema = z.object({
  title: z.string().trim().min(1, 'عنوان پروژه الزامی است.').max(200),
  completionMeaning: z.string().trim().max(2000),
  goalId: z.string(),
  targetDate: dateField,
  reviewDate: dateField,
})

export type ProjectFields = z.infer<typeof projectFieldsSchema>
