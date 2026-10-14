import { useId, useState } from 'react'
import { X } from '../../../shared/ui/icons'
import { FormError } from '../../../shared/ui/FormUi'
import { useAiFeedbackPrompt, useAnswerAiFeedback, useCloseAiFeedback } from '../hooks/feedback-hooks'
import {
  aiFeedbackQuestions,
  aiFeedbackReasonLabel,
  aiFeedbackReasonMaxLength,
  aiFeedbackReasonMaxRating,
  aiFeedbackScale,
} from '../types/feedback.format'
import type { AiFeedbackSurface } from '../types/feedback.types'

/**
 * The optional satisfaction prompt about one AI response (Discussion 027 §4).
 * The server decides whether it appears. It never blocks the page: a rating
 * of 3 to 5 is sent at once; 1 or 2 opens an optional reason; closing it is
 * recorded as no response, never as a low rating.
 */
export function AiFeedbackCard({ surface, subjectId }: { surface: AiFeedbackSurface; subjectId: string }) {
  const prompt = useAiFeedbackPrompt(surface, subjectId)
  const answer = useAnswerAiFeedback()
  const close = useCloseAiFeedback()
  const [rating, setRating] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const titleId = useId()
  const reasonId = useId()

  const promptId = prompt.data?.promptId
  if (!promptId || close.isSuccess) return null
  if (answer.isSuccess) return <p className="notice mb-4" role="status">ممنون؛ پاسخ شما ثبت شد.</p>

  const busy = answer.isPending || close.isPending
  const send = (value: number, text: string | null) => answer.mutate({ promptId, rating: value, reason: text })

  return (
    <section className="card mb-4 rounded-3xl text-start" aria-labelledby={titleId}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-text-secondary">یک پرسش اختیاری</p>
          <h2 className="mt-1 font-bold" id={titleId}>{aiFeedbackQuestions[surface]}</h2>
        </div>
        <button
          className="icon-button -me-2 -mt-2"
          type="button"
          aria-label="بستن پرسش"
          disabled={busy}
          onClick={() => close.mutate(promptId)}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would add an unwanted visible legend/border here. */}
      <div className="mt-4 grid grid-cols-5 gap-2" role="group" aria-labelledby={titleId}>
        {aiFeedbackScale.map((label, index) => {
          const value = index + 1
          return (
            <button
              key={label}
              className="choice-chip min-h-12 px-0 text-sm font-bold"
              type="button"
              aria-pressed={rating === value}
              disabled={busy}
              onClick={() => {
                setRating(value)
                if (value > aiFeedbackReasonMaxRating) send(value, null)
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
      {rating !== null && rating <= aiFeedbackReasonMaxRating && (
        <form
          className="mt-4"
          onSubmit={event => {
            event.preventDefault()
            send(rating, reason.trim() || null)
          }}
        >
          <label className="field-label" htmlFor={reasonId}>
            {aiFeedbackReasonLabel} <span className="field-optional">(اختیاری)</span>
          </label>
          <textarea
            className="field-input min-h-24"
            id={reasonId}
            maxLength={aiFeedbackReasonMaxLength}
            value={reason}
            disabled={busy}
            onChange={event => setReason(event.target.value)}
          />
          <button className="primary-button mt-3" type="submit" disabled={busy}>{answer.isPending ? 'در حال ارسال…' : 'ارسال'}</button>
        </form>
      )}
      <FormError error={answer.error ?? close.error} />
    </section>
  )
}
