import { addDays } from 'date-fns-jalali'
import { Flag } from '../../../shared/ui/icons'
import { useState } from 'react'
import { formatLocalDate, formatLongDate, formatNumber, parseIsoDate, toIsoDate } from '../../../shared/lib/date'
import { Calendar } from '../../../shared/ui/Calendar'
import { FormError } from '../../../shared/ui/FormUi'
import { Sheet } from '../../../shared/ui/Sheet'
import { useToday } from '../../today/hooks/today-hooks'
import { useTaskOptions } from '../hooks/task-hooks'

const dayMonth = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' })
const weekday = new Intl.DateTimeFormat('fa-IR', { weekday: 'long' })
const daysBetween = (from: string, to: string) => Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / 86_400_000)

/**
 * Asks for the new planned date of a Carry: three near days as one-press
 * tiles and a calendar that shows the deadline and how much is already
 * planned on each day. Shared by Today, the Task page and Reconcile, which
 * use it to move one Task, several Tasks or a whole sequence; `taskTitle`
 * shows the one Task being moved.
 */
export function TaskCarrySheet({ title = 'انتقال به روز دیگر', description, taskTitle, currentDate, deadline, submitLabel, pending, error, onSubmit, onClose }: {
  title?: string
  description?: string
  taskTitle?: string
  currentDate?: string | null
  deadline?: string | null
  /** Overrides the button's wording, which otherwise names the chosen day. */
  submitLabel?: string
  pending: boolean
  error: unknown
  onSubmit: (plannedDate: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState('')
  // The server's local date when it is known; the browser's until then (the pilot runs in one time zone).
  const today = useToday().data?.localDate ?? toIsoDate(new Date())
  const planned = useTaskOptions().data?.items ?? []
  const counts: Record<string, number> = {}
  for (const task of planned) {
    if (task.status === 'ACTIVE' && task.plannedDate) counts[task.plannedDate] = (counts[task.plannedDate] ?? 0) + 1
  }
  const shift = (days: number) => toIsoDate(addDays(parseIsoDate(today), days))
  // The coming Saturday starts the next week; when it is one of the first two tiles, the one after it.
  const toSaturday = (7 - ((parseIsoDate(today).getDay() + 1) % 7)) % 7 || 7
  const quick = [
    { date: shift(1), label: 'فردا' },
    { date: shift(2), label: 'پس‌فردا' },
    { date: shift(toSaturday > 2 ? toSaturday : toSaturday + 7), label: 'شنبه‌ی بعد' },
  ]
  const problem = !value ? undefined
    : value < today ? 'تاریخ جدید نمی‌تواند در گذشته باشد.'
      : value === currentDate ? 'تاریخ جدید با تاریخ فعلی یکی است.'
        : deadline && value > deadline ? `تاریخ جدید از مهلت کار (${formatLocalDate(deadline)}) می‌گذرد.`
          : undefined

  return (
    <Sheet title={title} description={description} entity="task" onClose={onClose} locked={pending}>
      <form
        className="form-stack"
        noValidate
        aria-busy={pending}
        onSubmit={event => {
          event.preventDefault()
          if (value && !problem) onSubmit(value)
        }}
      >
        {(taskTitle || currentDate) && (
          <div className="flex items-center gap-3 rounded-2xl bg-surface-sunken p-3.5">
            {taskTitle && <span className="size-6 shrink-0 rounded-full border-2 border-entity-task" aria-hidden="true" />}
            <div className="min-w-0 flex-1">
              {taskTitle && <p className="truncate font-extrabold">{taskTitle}</p>}
              {currentDate && (
                <p className="text-xs text-text-secondary">
                  الان: {currentDate === today ? `امروز، ${formatLongDate(currentDate)}` : formatLongDate(currentDate)}
                </p>
              )}
            </div>
            {deadline && (
              <span className="flex shrink-0 items-center gap-1 text-xs font-extrabold text-caution">
                <Flag size={13} aria-hidden="true" />
                مهلت {dayMonth.format(parseIsoDate(deadline))}
              </span>
            )}
          </div>
        )}

        {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would add an unwanted visible legend/border here. */}
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="روزهای نزدیک">
          {quick.map(day => (
            <button
              key={day.label}
              className="carry-tile"
              type="button"
              aria-pressed={value === day.date}
              disabled={Boolean(deadline && day.date > deadline) || day.date === currentDate}
              onClick={() => setValue(day.date)}
            >
              <span className="font-extrabold">{day.label}</span>
              <span className="text-xs opacity-80">{day.label === 'شنبه‌ی بعد' ? dayMonth.format(parseIsoDate(day.date)) : weekday.format(parseIsoDate(day.date))}</span>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface p-3">
          <Calendar value={value} today={today} min={today} deadline={deadline} counts={counts} onChange={setValue} />
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-border-subtle pt-2 text-[0.6875rem] font-semibold text-text-secondary" aria-hidden="true">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full ring-2 ring-sun" />امروز</span>
            {deadline && <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-caution" />مهلت</span>}
            <span className="flex items-center gap-1.5"><span className="flex gap-0.5"><span className="size-1 rounded-full bg-current" /><span className="size-1 rounded-full bg-current" /></span>کارهای آن روز</span>
          </p>
        </div>
        {problem && <span className="field-error" role="alert">{problem}</span>}

        <FormError error={error} />
        <div className="sheet-actions flex-wrap">
          {value && !problem && (
            <p className="basis-full text-xs font-bold text-text-secondary" aria-live="polite">
              {formatNumber(daysBetween(today, value))} روز بعد
              {deadline ? (value === deadline ? '؛ همان روز مهلت.' : '؛ پیش از مهلت.') : '.'}
            </p>
          )}
          <button className="secondary-button" type="button" disabled={pending} onClick={onClose}>انصراف</button>
          <button className="primary-button" type="submit" disabled={pending || !value || Boolean(problem)}>
            {pending ? 'در حال ثبت…' : submitLabel ?? (value ? `انتقال به ${formatLongDate(value)}` : 'انتقال کار')}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
