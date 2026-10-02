import { useState } from 'react'
import { formatLocalDate, formatTime } from '../../../shared/lib/date'
import { showToast } from '../../../shared/lib/ui-store'
import { ConfirmationDialog } from '../../../shared/ui/ConfirmationDialog'
import { StatusBadge } from '../../../shared/ui/EntityUi'
import { FormError } from '../../../shared/ui/FormUi'
import { ErrorState, LoadMoreButton, LoadingState } from '../../../shared/ui/StateUi'
import { useCompleteOccurrence, useCorrectOccurrence, useRoutineOccurrences } from '../hooks/routine-hooks'
import type { OccurrenceCorrection, RoutineOccurrenceDto } from '../types/routine.types'

type Correction = { occurrence: RoutineOccurrenceDto; target: OccurrenceCorrection }

/**
 * A Routine's occurrences, newest first. A pending one can be marked done; a
 * resolved one can be corrected between done and missed after confirmation.
 * The scheduled date and time are facts and are never editable.
 */
export function RoutineOccurrenceHistory({ routineId }: { routineId: string }) {
  const occurrences = useRoutineOccurrences(routineId)
  const complete = useCompleteOccurrence()
  const correct = useCorrectOccurrence()
  const [correction, setCorrection] = useState<Correction | null>(null)
  const items = occurrences.data?.pages.flatMap(page => page.items) ?? []

  return (
    <section className="mt-8" aria-labelledby="routine-history">
      <h2 className="section-title" id="routine-history">سابقه اجرا</h2>
      <div className="mt-3">
        <FormError error={complete.error ?? correct.error} />
      </div>
      {occurrences.isPending && <LoadingState text="در حال دریافت سابقه…" />}
      {occurrences.isError && <ErrorState description="ارتباط را بررسی کنید و دوباره تلاش کنید." onRetry={() => occurrences.refetch()} />}
      {occurrences.isSuccess && items.length === 0 && (
        <p className="notice">هنوز نوبتی برای این روتین ثبت نشده است.</p>
      )}
      {items.length > 0 && (
        <ul className="divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-surface">
          {items.map(occurrence => (
            <li key={occurrence.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <time className="block font-bold" dateTime={occurrence.scheduledLocalDate}>{formatLocalDate(occurrence.scheduledLocalDate)}</time>
                {occurrence.scheduledLocalTime && (
                  <bdi className="text-xs text-text-secondary" dir="ltr">{formatTime(occurrence.scheduledLocalTime)}</bdi>
                )}
              </div>
              <StatusBadge status={occurrence.status} />
              {occurrence.status === 'PENDING' ? (
                <button
                  className="secondary-button"
                  type="button"
                  disabled={complete.isPending}
                  onClick={() => complete.mutate(
                    { occurrenceId: occurrence.id, expectedVersion: Number(occurrence.version) },
                    { onSuccess: () => showToast('نوبت انجام شد.') },
                  )}
                >
                  انجام شد
                </button>
              ) : (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => setCorrection({ occurrence, target: occurrence.status === 'DONE' ? 'MISSED' : 'DONE' })}
                >
                  اصلاح
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <LoadMoreButton
        visible={occurrences.hasNextPage}
        loading={occurrences.isFetchingNextPage}
        label="نمایش نوبت‌های قدیمی‌تر"
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
