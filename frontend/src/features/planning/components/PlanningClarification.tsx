import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { formatNumber } from '../../../shared/lib/date'
import { FormField } from '../../../shared/ui/FormUi'
import { type ClarificationFields, clarificationSchema } from '../types/planning.schema'
import type { PlanningAnswer, PlanningAttemptDto, PlanningClarificationDto } from '../types/planning.types'
import { PlanningStartError } from './PlanningStartError'

const maxTurns = 3

/**
 * The questions a draft needs answered first. Nothing exists yet: the user
 * answers, asks for a draft as it stands, rewrites the intention, or leaves
 * for the manual path. There are at most three such steps.
 */
export function PlanningClarification({ attempt, clarification, pending, error, onAnswer, onDraftNow, onEdit, onManual, onCancel }: {
  attempt: PlanningAttemptDto
  clarification: PlanningClarificationDto
  pending: boolean
  error: unknown
  onAnswer: (answers: PlanningAnswer[]) => void
  onDraftNow: () => void
  onEdit: () => void
  onManual: () => void
  onCancel: () => void
}) {
  const questions = clarification.questions
  const form = useForm<ClarificationFields>({
    resolver: zodResolver(clarificationSchema),
    defaultValues: { answers: questions.map(() => '') },
  })
  const missing = form.formState.errors.answers?.root?.message ?? form.formState.errors.answers?.message
  const turn = Number(clarification.turn)

  const submit = form.handleSubmit(values => onAnswer(
    questions
      .map((question, index) => ({ questionId: question.id, text: values.answers[index] ?? '' }))
      .filter(answer => answer.text.length > 0),
  ))

  return (
    <form className="card form-stack" onSubmit={submit} noValidate aria-busy={pending} aria-labelledby="planning-clarification">
      <div>
        <h2 className="font-bold" id="planning-clarification">چند پرسش پیش از ساخت پیش‌نویس</h2>
        <p className="mt-1 text-sm text-text-secondary">
          پاسخ این پرسش‌ها پیش‌نویس را دقیق‌تر می‌کند. هنوز چیزی ساخته نشده است.
          {' '}گام {formatNumber(turn)} از حداکثر {formatNumber(maxTurns)}.
        </p>
      </div>
      <p className="notice whitespace-pre-wrap wrap-break-word">{attempt.intention}</p>
      {clarification.message && <p className="notice-attention whitespace-pre-wrap wrap-break-word">{clarification.message}</p>}
      {questions.map((question, index) => (
        <FormField
          key={question.id}
          label={question.text}
          name={`answers.${index}`}
          multiline
          maxLength={500}
          registration={form.register(`answers.${index}`)}
          error={form.formState.errors.answers?.[index]?.message}
        />
      ))}
      {missing && <p className="field-error" role="alert">{missing}</p>}
      <PlanningStartError error={error} />
      <div className="flex flex-wrap items-center gap-3">
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? 'در حال ارسال…' : 'ادامه'}
        </button>
        <button className="secondary-button" type="button" disabled={pending} onClick={onDraftNow}>همین حالا پیش‌نویس بساز</button>
        <button className="ghost-button" type="button" disabled={pending} onClick={onEdit}>ویرایش نوشته</button>
        <button className="ghost-button" type="button" disabled={pending} onClick={onManual}>خودم دستی می‌سازم</button>
        <button className="ghost-button" type="button" disabled={pending} onClick={onCancel}>انصراف</button>
      </div>
    </form>
  )
}
