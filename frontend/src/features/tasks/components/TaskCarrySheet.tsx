import { useState } from 'react'
import { formatLocalDate, toIsoDate } from '../../../shared/lib/date'
import { DateField } from '../../../shared/ui/DateField'
import { FormError } from '../../../shared/ui/FormUi'
import { Sheet } from '../../../shared/ui/Sheet'

/**
 * Asks for the new planned date of a Carry. Shared by the Task page and by
 * Reconcile, which use it to move one Task, several Tasks or a whole sequence.
 */
export function TaskCarrySheet({ title = 'انتقال به تاریخ دیگر', description, currentDate, deadline, submitLabel = 'انتقال کار', pending, error, onSubmit, onClose }: {
  title?: string
  description?: string
  currentDate?: string | null
  deadline?: string | null
  submitLabel?: string
  pending: boolean
  error: unknown
  onSubmit: (plannedDate: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState('')
  const today = toIsoDate(new Date())
  const problem = !value ? undefined
    : value < today ? 'تاریخ جدید نمی‌تواند در گذشته باشد.'
      : value === currentDate ? 'تاریخ جدید با تاریخ فعلی یکی است.'
        : deadline && value > deadline ? `تاریخ جدید از مهلت کار (${formatLocalDate(deadline)}) می‌گذرد.`
          : undefined

  return (
    <Sheet title={title} description={description} onClose={onClose} locked={pending}>
      <form
        className="form-stack"
        noValidate
        aria-busy={pending}
        onSubmit={event => {
          event.preventDefault()
          if (value && !problem) onSubmit(value)
        }}
      >
        {currentDate && <p className="notice">تاریخ فعلی: {formatLocalDate(currentDate)}</p>}
        <DateField label="تاریخ جدید" value={value} onChange={setValue} error={problem} />
        <FormError error={error} />
        <div className="sheet-actions">
          <button className="secondary-button" type="button" disabled={pending} onClick={onClose}>انصراف</button>
          <button className="primary-button" type="submit" disabled={pending || !value || Boolean(problem)}>
            {pending ? 'در حال ثبت…' : submitLabel}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
