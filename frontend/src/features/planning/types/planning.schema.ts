import { z } from 'zod'

// Client-side shape/feedback only; the backend remains the authoritative
// validator of a draft and of every edit to it.
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ واردشده معتبر نیست.').or(z.literal(''))

export const intentionSchema = z.object({
  intention: z.string().trim().min(1, 'بنویسید می‌خواهید روی چه چیزی پیش بروید.').max(2000, 'متن بیش از حد طولانی است.'),
})

export type IntentionFields = z.infer<typeof intentionSchema>

/** One answer per question, in the order asked. Unanswered questions are simply left empty. */
export const clarificationSchema = z.object({
  answers: z.array(z.string().trim().max(500, 'پاسخ بیش از حد طولانی است.')),
}).refine(value => value.answers.some(answer => answer.length > 0), {
  path: ['answers'],
  message: 'دست‌کم به یکی از پرسش‌ها پاسخ دهید یا «همین حالا پیش‌نویس بساز» را انتخاب کنید.',
})

export type ClarificationFields = z.infer<typeof clarificationSchema>

/** One form for every proposal type; fields that do not belong to the type are simply not shown. */
export const proposalFieldsSchema = z.object({
  entityType: z.string(),
  title: z.string().trim().min(1, 'عنوان الزامی است.').max(200),
  description: z.string().trim().max(2000),
  /** `none`, `context`, or `draft:<draftId>`. */
  parent: z.string(),
  desiredOutcome: z.string().trim().max(2000),
  completionMeaning: z.string().trim().max(2000),
  targetDate: dateField,
  reviewDate: dateField,
  plannedDate: dateField,
  deadline: dateField,
  // Empty means the proposed recurrence is not one a Routine can have; the user must choose one.
  recurrenceType: z.enum(['', 'DAILY', 'SPECIFIC_WEEKDAYS', 'MONTHLY_ON_DAY']),
  daysOfWeek: z.array(z.number().int().min(1).max(7)),
  dayOfMonth: z.string(),
  effectiveFrom: dateField,
}).superRefine((value, context) => {
  if (value.entityType === 'GOAL' && value.desiredOutcome.length === 0) {
    context.addIssue({ code: 'custom', path: ['desiredOutcome'], message: 'نتیجه مطلوب الزامی است.' })
  }
  if (value.entityType !== 'ROUTINE') return
  if (value.recurrenceType === '') {
    context.addIssue({ code: 'custom', path: ['recurrenceType'], message: 'یکی از تکرارهای پشتیبانی‌شده را انتخاب کنید.' })
  }
  if (value.recurrenceType === 'SPECIFIC_WEEKDAYS' && value.daysOfWeek.length === 0) {
    context.addIssue({ code: 'custom', path: ['daysOfWeek'], message: 'دست‌کم یک روز هفته را انتخاب کنید.' })
  }
  if (value.recurrenceType === 'MONTHLY_ON_DAY') {
    const day = Number(value.dayOfMonth)
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      context.addIssue({ code: 'custom', path: ['dayOfMonth'], message: 'روز ماه باید عددی بین ۱ و ۳۱ باشد.' })
    }
  }
})

export type ProposalFields = z.infer<typeof proposalFieldsSchema>
