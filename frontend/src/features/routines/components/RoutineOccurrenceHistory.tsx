import { useState } from 'react'
import { formatLongDate, formatTime, parseIsoDate, toIsoDate } from '../../../shared/lib/date'
import { Check } from '../../../shared/ui/icons'
import { showToast } from '../../../shared/lib/ui-store'
import { ConfirmationDialog } from '../../../shared/ui/ConfirmationDialog'
import { FormError } from '../../../shared/ui/FormUi'
import { ErrorState, LoadMoreButton, LoadingState } from '../../../shared/ui/StateUi'
import { useCorrectOccurrence, useRoutineOccurrences } from '../hooks/routine-hooks'
import type { OccurrenceCorrection, RoutineOccurrenceDto } from '../types/routine.types'

type Correction = { occurrence: RoutineOccurrenceDto; target: OccurrenceCorrection }

/**
 * A Routine's occurrences, newest first. A resolved one can be corrected
 * between done and missed after confirmation; an open one is today's and is
 * completed from today's slots.
 * The scheduled date and time are facts and are never editable.
 */
export function RoutineOccurrenceHistory({ routineId, today }: {
  routineId: string
  /** The server's local date, to say «امروز» and «دیروز». */
  today?: string
}) {
  const occurrences = useRoutineOccurrences(routineId)
  const correct = useCorrectOccurrence()
  const [correction, setCorrection] = useState<Correction | null>(null)
  const items = occurrences.data?.pages.flatMap(page => page.items) ?? []

  return (
    <section className="card mt-5 p-4 sm:p-5" aria-labelledby="routine-history">
      <h2 className="font-extrabold" id="routine-history">سابقه اجرا</h2>
      <div className="mt-2">
        <FormError error={correct.error} />
      </div>
      {occurrences.isPending && <LoadingState text="در حال دریافت سابقه…" />}
      {occurrences.isError && <ErrorState description="ارتباط را بررسی کنید و دوباره تلاش کنید." onRetry={() => occurrences.refetch()} />}
      {occurrences.isSuccess && items.length === 0 && (
        <p className="notice">هنوز نوبتی برای این روتین ثبت نشده است.</p>
      )}
      {items.length > 0 && (
        <ul className="divide-y divide-border-subtle">
          {items.map(occurrence => (
            <li key={occurrence.id} className="flex min-h-14 items-center gap-3 py-2">
              {occurrence.status === 'DONE'
                ? <span className="slot-done size-6" aria-hidden="true"><Check size={14} /></span>
                : occurrence.status === 'MISSED'
                  ? <span className="slot-missed size-6" aria-hidden="true" />
                  : <span className="size-6 shrink-0 rounded-full border-2 border-entity-routine" aria-hidden="true" />}
              <time className="min-w-0 flex-1 truncate font-bold" dateTime={occurrence.scheduledLocalDate}>
                {dayWords(occurrence.scheduledLocalDate, today)}
              </time>
              {occurrence.scheduledLocalTime && (
                <bdi className="text-xs font-semibold text-text-secondary" dir="ltr">{formatTime(occurrence.scheduledLocalTime)}</bdi>
              )}
              {occurrence.status === 'PENDING' ? (
                // An open slot is always today's; it is completed from today's slots above.
                <span className="px-1 text-xs font-bold text-text-secondary">در پیش</span>
              ) : (
                // The status is also the way to correct it, after a confirmation.
                <button
                  className={`min-h-9 px-1 text-xs font-bold underline decoration-dotted underline-offset-4 ${occurrence.status === 'DONE' ? 'text-entity-routine' : 'text-text-primary'}`}
                  type="button"
                  aria-label={occurrence.status === 'DONE' ? 'انجام شد؛ اصلاح به انجام‌نشده' : 'انجام نشد؛ اصلاح به انجام‌شده'}
                  onClick={() => setCorrection({ occurrence, target: occurrence.status === 'DONE' ? 'MISSED' : 'DONE' })}
                >
                  {occurrence.status === 'DONE' ? 'انجام شد' : 'انجامش دادم'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <LoadMoreButton
        visible={occurrences.hasNextPage}
        loading={occurrences.isFetchingNextPage}
        label="نوبت‌های قدیمی‌تر"
        onClick={() => occurrences.fetchNextPage()}
      />

      {correction && (
        <ConfirmationDialog
          title="اصلاح سابقه"
          description={correction.target === 'DONE'
            ? 'این نوبت به‌عنوان «انجام‌شده» ثبت می‌شود. تاریخ و ساعت آن تغییر نمی‌کند.'
            : 'این نوبت به‌عنوان «انجام‌نشده» ثبت می‌شود. تاریخ و ساعت آن تغییر نمی‌کند.'}
          onClose={() => setCorrection(null)}
          pending={correct.isPending}
          actions={(
            <>
              <button className="secondary-button" type="button" disabled={correct.isPending} onClick={() => setCorrection(null)}>انصراف</button>
              <button
                className="primary-button"
                type="button"
                disabled={correct.isPending}
                onClick={() => correct.mutate({
                  occurrenceId: correction.occurrence.id,
                  expectedVersion: Number(correction.occurrence.version),
                  targetStatus: correction.target,
                }, {
                  onSuccess: () => showToast('سابقه اصلاح شد.'),
                  onSettled: () => setCorrection(null),
                })}
              >
                {correct.isPending ? 'در حال ثبت…' : 'تأیید اصلاح'}
              </button>
            </>
          )}
        />
      )}
    </section>
  )
}

/** A date as «امروز، …» or «دیروز، …» when it is that close, else with its weekday. */
function dayWords(date: string, today?: string) {
  if (!today) return formatLongDate(date)
  const yesterday = new Date(parseIsoDate(today))
  yesterday.setDate(yesterday.getDate() - 1)
  if (date === today) return `امروز، ${formatLongDate(date)}`
  if (date === toIsoDate(yesterday)) return `دیروز، ${formatLongDate(date)}`
  return formatLongDate(date)
}
