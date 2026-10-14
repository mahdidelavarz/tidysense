// The wording of the satisfaction prompt, version 1. The wording belongs to the
// version: changing the question, the scale labels or the reason prompt means
// changing `aiFeedbackInstrumentVersion` here, `AiResponseFeedbackInstrument.Version`
// on the server and the metric dictionary, so answers are never merged across wordings.
import type { AiFeedbackSurface } from './feedback.types'

export const aiFeedbackInstrumentVersion = 1

export const aiFeedbackQuestions: Record<AiFeedbackSurface, string> = {
  PLANNING_DRAFT: 'از پیش‌نویسی که کنار گذاشتید چقدر راضی بودید؟',
}

/** The five-point scale of Discussion 027 §4, from 1 to 5. */
export const aiFeedbackScale = ['بد', 'ضعیف', 'معمولی', 'خوب', 'عالی'] as const

/** A rating at or below this opens the optional reason field. */
export const aiFeedbackReasonMaxRating = 2

export const aiFeedbackReasonLabel = 'چه چیزی خوب نبود؟'
export const aiFeedbackReasonMaxLength = 500
