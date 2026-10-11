import { useId } from 'react'
import { formatNumber } from '../../../shared/lib/date'
import { FormError } from '../../../shared/ui/FormUi'
import { useSubmitPilotFeedback } from '../hooks/pilot-hooks'
import { pilotQuestions, pilotScale } from '../types/pilot.format'
import type { PilotInstrument } from '../types/pilot.types'

/**
 * One optional pilot question about something the user just finished. It
 * never stands in the way: the page's own actions stay usable, and not
 * answering is a valid outcome that is recorded as no response.
 */
export function PilotQuestion({ instrument, subjectId }: { instrument: PilotInstrument; subjectId: string }) {
  const submit = useSubmitPilotFeedback()
  const titleId = useId()
  const copy = pilotQuestions[instrument]

  if (submit.isSuccess) {
    return <p className="notice mt-6" role="status">ممنون؛ پاسخ شما ثبت شد.</p>
  }
  return (
    <section className="card mt-6 rounded-3xl text-start" aria-labelledby={titleId}>
      <p className="text-xs text-text-secondary">یک پرسش اختیاری برای بهتر شدن تایدی‌سنس</p>
      <h2 className="mt-1 font-bold" id={titleId}>{copy.question}</h2>
      {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would add an unwanted visible legend/border here. */}
      <div className="mt-4 grid grid-cols-5 gap-2" role="group" aria-labelledby={titleId}>
        {pilotScale.map(answer => (
          <button
            key={answer}
            className="choice-chip min-h-12 px-0 text-base font-bold"
            type="button"
            disabled={submit.isPending}
            aria-label={`${formatNumber(answer)} از ${formatNumber(pilotScale.length)}${answer === 1 ? `، ${copy.lowest}` : answer === pilotScale.length ? `، ${copy.highest}` : ''}`}
            onClick={() => submit.mutate({ instrument, subjectId, answer })}
          >
            {formatNumber(answer)}
          </button>
        ))}
      </div>
      <p className="mt-2 flex justify-between gap-3 text-xs text-text-secondary" aria-hidden="true">
        <span>{formatNumber(1)}: {copy.lowest}</span>
        <span>{formatNumber(pilotScale.length)}: {copy.highest}</span>
      </p>
      <FormError error={submit.error} />
    </section>
  )
}
