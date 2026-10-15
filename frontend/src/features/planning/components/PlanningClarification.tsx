import { useId, useState } from 'react'
import { formatNumber } from '../../../shared/lib/date'
import { Pencil, Sparkles } from '../../../shared/ui/icons'
import type { PlanningAnswer, PlanningClarificationDto } from '../types/planning.types'
import { PlanningStartError } from './PlanningStartError'

const countWords = ['یک', 'دو', 'سه', 'چهار']
const writeOwn = 'خودت بنویس'
const answerLength = 500

/** What the user has given for one question so far. «خودت بنویس» is open when `other` is true. */
type Draft = { options: number[]; other: boolean; text: string }

/** A question without options is answered in words, so its field starts open (029 §7). */
const blank = (options: string[]): Draft => ({ options: [], other: options.length === 0, text: '' })

/**
 * Step two, «پرسش‌ها»: up to four questions the draft needs, each answered by
 * choosing one of its two options, by «خودت بنویس» and one's own words, or by
 * both. Every question may be left unanswered; with no answer at all the draft
 * is built as it stands (028 §2, 029 §7). Nothing exists yet.
 */
export function PlanningClarification({ clarification, pending, error, onAnswer, onDraftNow }: {
  clarification: PlanningClarificationDto
  pending: boolean
  error: unknown
  onAnswer: (answers: PlanningAnswer[]) => void
  onDraftNow: () => void
}) {
  const questions = clarification.questions
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const turn = Number(clarification.turn)

  const answers = questions.flatMap(question => {
    const draft = drafts[question.id] ?? blank(question.options ?? [])
    const text = draft?.other ? draft.text.trim() : ''
    if (!draft || (draft.options.length === 0 && text.length === 0)) return []
    return [{ questionId: question.id, options: draft.options, text: text || null }]
  })
  const tooLong = questions.some(question => (drafts[question.id]?.text.length ?? 0) > answerLength)

  const change = (id: string, options: string[], next: (draft: Draft) => Draft) =>
    setDrafts(current => ({ ...current, [id]: next(current[id] ?? blank(options)) }))

  return (
    <form
      onSubmit={event => {
        event.preventDefault()
        if (tooLong) return
        // Building with no answer is the same as «بدون پاسخ بساز».
        if (answers.length === 0) onDraftNow()
        else onAnswer(answers)
      }}
      noValidate
      aria-busy={pending}
      aria-labelledby="planning-questions"
    >
      <h1 className="display-title text-[1.625rem] leading-10" id="planning-questions">
        {countWords[questions.length - 1] ?? formatNumber(questions.length)} پرسش کوتاه
      </h1>
      <p className="mt-1 text-sm leading-7 text-text-secondary">
        یکی را انتخاب کنید، یا «{writeOwn}». همه اختیاری‌اند.
        {turn > 1 && ` این دور ${formatNumber(turn)} از حداکثر ${formatNumber(3)} است.`}
      </p>
      {clarification.message && <p className="notice-attention mt-3 whitespace-pre-wrap wrap-break-word">{clarification.message}</p>}

      <ol className="mt-4 space-y-3">
        {questions.map((question, index) => (
          <Question
            key={question.id}
            number={index + 1}
            text={question.text}
            reason={question.reason ?? null}
            options={question.options ?? []}
            multiple={question.multiple ?? false}
            draft={drafts[question.id] ?? blank(question.options ?? [])}
            disabled={pending}
            onChange={next => change(question.id, question.options ?? [], next)}
          />
        ))}
      </ol>

      <div className="flow-footer">
        <div className="flex items-center gap-3 text-xs font-bold text-text-secondary">
          <span className="answer-progress" aria-hidden="true">
            <span style={{ width: `${(answers.length / questions.length) * 100}%` }} />
          </span>
          <span role="status">{formatNumber(answers.length)} از {formatNumber(questions.length)} پاسخ</span>
        </div>
        <PlanningStartError error={error} />
        <button className="primary-button mt-3 min-h-13.5 w-full rounded-[1.125rem] text-[0.9375rem]" type="submit" disabled={pending || tooLong}>
          <Sparkles size={20} aria-hidden="true" />
          {pending ? 'در حال ارسال…' : 'پیش‌نویس را بساز'}
        </button>
        <button className="mx-auto mt-1 flex min-h-11 items-center px-3 text-sm font-bold text-text-secondary hover:text-text-primary" type="button" disabled={pending} onClick={onDraftNow}>
          بدون پاسخ بساز
        </button>
      </div>
    </form>
  )
}

function Question({ number, text, reason, options, multiple, draft, disabled, onChange }: {
  number: number
  text: string
  reason: string | null
  options: string[]
  multiple: boolean
  draft: Draft
  disabled: boolean
  onChange: (next: (draft: Draft) => Draft) => void
}) {
  const titleId = useId()
  const reasonId = useId()
  const textId = useId()
  const choose = (position: number) => onChange(current => {
    const chosen = current.options.includes(position)
    if (multiple) {
      return { ...current, options: chosen ? current.options.filter(x => x !== position) : [...current.options, position].sort((a, b) => a - b) }
    }
    return { ...current, options: chosen ? [] : [position] }
  })

  return (
    <li className="question-card">
      <div className="flex items-start gap-2.5">
        <span className="question-number" aria-hidden="true">{formatNumber(number)}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[0.9375rem] font-extrabold leading-7 wrap-break-word" id={titleId}>{text}</h2>
          {reason && <p className="text-xs leading-6 text-text-secondary wrap-break-word" id={reasonId}>{reason}</p>}
        </div>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would add an unwanted visible legend/border here. */}
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-labelledby={titleId} aria-describedby={reason ? reasonId : undefined} hidden={options.length === 0}>
        {options.map((label, position) => (
          <button
            // Labels are unique within a question (the server's gate), so they are stable keys.
            key={label}
            className="answer-chip"
            type="button"
            aria-pressed={draft.options.includes(position)}
            disabled={disabled}
            onClick={() => choose(position)}
          >
            {label}
          </button>
        ))}
        {options.length > 0 && (
          <button
            className="answer-chip"
            data-other=""
            type="button"
            aria-pressed={draft.other}
            aria-expanded={draft.other}
            aria-controls={textId}
            disabled={disabled}
            onClick={() => onChange(current => ({ ...current, other: !current.other }))}
          >
            <Pencil size={15} aria-hidden="true" />
            {writeOwn}
          </button>
        )}
      </div>
      {multiple && options.length > 0 && <p className="mt-2 text-xs text-text-secondary">می‌توانید چند گزینه انتخاب کنید.</p>}
      <div id={textId} hidden={!draft.other}>
        {draft.other && (
          <>
            <label className="sr-only" htmlFor={`${textId}-text`}>پاسخ خودتان: {text}</label>
            <textarea
              id={`${textId}-text`}
              className="intent-input mt-3 min-h-20"
              maxLength={answerLength}
              placeholder="پاسخ خودتان را بنویسید"
              value={draft.text}
              disabled={disabled}
              // biome-ignore lint/a11y/noAutofocus: only a field the user opened with «خودت بنویس» takes the focus.
              autoFocus={options.length > 0}
              onChange={event => {
                const value = event.target.value
                onChange(current => ({ ...current, text: value }))
              }}
            />
          </>
        )}
      </div>
    </li>
  )
}
